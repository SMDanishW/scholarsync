"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import type { Conversation, Paper, LocalMessage, Citation, AgentTrace } from "@/lib/types"
import ConversationList from "@/components/Sidebar/ConversationList"
import ChatWindow from "@/components/Chat/ChatWindow"
import PapersSidebar from "@/components/Papers/PapersSidebar"
import LimitWarningToast from "@/components/UI/LimitWarningToast"

// Loaded client-side only — PDF.js uses browser Canvas APIs
const PDFViewerPanel = dynamic(
  () => import("@/components/Papers/PDFViewerPanel"),
  { ssr: false }
)

const MAX_PAPERS = 5

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.conversationId as string

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingConv, setIsLoadingConv] = useState(true)
  const [showLimitWarning, setShowLimitWarning] = useState(false)
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null)

  // Stable ref so callbacks don't need conversations in their dep arrays
  const conversationsRef = useRef<Conversation[]>([])
  conversationsRef.current = conversations

  // ── Conversations ────────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      const convs = await api.conversations.list()
      setConversations(convs)
    } catch {}
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const createConversation = useCallback(async () => {
    const conv = await api.conversations.create()
    setConversations((prev) => [conv, ...prev])
    router.push(`/chat/${conv.id}`)
  }, [router])

  const deleteConversation = useCallback(
    async (id: string) => {
      await api.conversations.delete(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (id === conversationId) {
        const remaining = conversationsRef.current.filter((c) => c.id !== id)
        if (remaining.length > 0) {
          router.push(`/chat/${remaining[0].id}`)
        } else {
          const newConv = await api.conversations.create()
          setConversations([newConv])
          router.push(`/chat/${newConv.id}`)
        }
      }
    },
    [conversationId, router]
  )

  // ── Current conversation ─────────────────────────────────────────────────────

  useEffect(() => {
    setIsLoadingConv(true)
    setMessages([])
    setPapers([])

    api.conversations
      .get(conversationId)
      .then((conv) => {
        setPapers(conv.papers)
        setMessages(
          conv.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            citations: m.citations ?? [],
          }))
        )
      })
      .catch(() => router.push("/"))
      .finally(() => setIsLoadingConv(false))
  }, [conversationId, router])

  // ── Papers ───────────────────────────────────────────────────────────────────

  const uploadPaper = useCallback(
    async (file: File): Promise<Paper> => {
      const paper = await api.papers.upload(conversationId, file)
      setPapers((prev) => {
        const next = [...prev, paper]
        if (next.length >= MAX_PAPERS) setShowLimitWarning(true)
        return next
      })
      loadConversations()
      return paper
    },
    [conversationId, loadConversations]
  )

  const deletePaper = useCallback(
    async (paperId: string) => {
      await api.papers.delete(conversationId, paperId)
      setPapers((prev) => prev.filter((p) => p.id !== paperId))
      loadConversations()
    },
    [conversationId, loadConversations]
  )

  // ── Chat / streaming ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsgId = `user_${Date.now()}`
      const assistantMsgId = `assistant_${Date.now()}`

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content, citations: [] },
        { id: assistantMsgId, role: "assistant", content: "", citations: [], isStreaming: true },
      ])
      setIsGenerating(true)

      try {
        const response = await api.chat.send(conversationId, content)
        if (!response.body) throw new Error("No response body")

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let sseBuffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          sseBuffer += decoder.decode(value, { stream: true })
          const parts = sseBuffer.split("\n\n")
          sseBuffer = parts.pop() ?? ""

          for (const part of parts) {
            if (!part.startsWith("data: ")) continue
            try {
              const event = JSON.parse(part.slice(6))
              if (event.type === "trace") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, trace: event.trace as AgentTrace }
                      : m
                  )
                )
              } else if (event.type === "token") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: m.content + (event.content as string) }
                      : m
                  )
                )
              } else if (event.type === "citations") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, citations: event.citations as Citation[], isStreaming: false }
                      : m
                  )
                )
              }
            } catch {}
          }
        }

        // Refresh sidebar title after first message
        loadConversations()
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: "Something went wrong. Please try again.",
                  isStreaming: false,
                }
              : m
          )
        )
      } finally {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, isStreaming: false } : m
          )
        )
        setIsGenerating(false)
      }
    },
    [conversationId, loadConversations]
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  const readyPapers = papers.filter((p) => p.status === "ready")

  return (
    <div className="flex h-screen overflow-hidden">
      <ConversationList
        conversations={conversations}
        activeId={conversationId}
        onNew={createConversation}
        onDelete={deleteConversation}
      />

      <ChatWindow
        messages={messages}
        isGenerating={isGenerating}
        isLoading={isLoadingConv}
        onSend={sendMessage}
        onCitationClick={setActiveCitation}
        conversationId={conversationId}
        hasPapers={readyPapers.length > 0}
      />

      <PapersSidebar
        papers={papers}
        onUpload={uploadPaper}
        onDelete={deletePaper}
        maxPapers={MAX_PAPERS}
      />

      {showLimitWarning && (
        <LimitWarningToast onDismiss={() => setShowLimitWarning(false)} />
      )}

      {activeCitation && (
        <PDFViewerPanel
          citation={activeCitation}
          conversationId={conversationId}
          onClose={() => setActiveCitation(null)}
        />
      )}
    </div>
  )
}
