"use client"
import { useEffect, useRef } from "react"
import { BookOpen } from "lucide-react"
import type { LocalMessage, Citation } from "@/lib/types"
import MessageBubble from "./MessageBubble"
import ChatInput from "./ChatInput"

interface Props {
  messages: LocalMessage[]
  isGenerating: boolean
  isLoading: boolean
  onSend: (message: string) => Promise<void>
  onCitationClick: (citation: Citation) => void
  conversationId: string
  hasPapers: boolean
}

export default function ChatWindow({
  messages,
  isGenerating,
  isLoading,
  onSend,
  onCitationClick,
  conversationId,
  hasPapers,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </main>
    )
  }

  return (
    <main className="flex-1 flex flex-col bg-slate-950 min-w-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-14 h-14 rounded-full bg-indigo-600/20 flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7 text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-200 mb-2">
              {hasPapers ? "Ask about your papers" : "Upload a paper to get started"}
            </h2>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              {hasPapers
                ? "Ask for summaries, methodology breakdowns, key findings, limitations, or compare multiple papers."
                : "Upload up to 5 PDF research papers using the panel on the right, then start asking questions."}
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onCitationClick={onCitationClick}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={onSend}
        isGenerating={isGenerating}
        disabled={conversationId === "welcome" || !conversationId}
      />
    </main>
  )
}
