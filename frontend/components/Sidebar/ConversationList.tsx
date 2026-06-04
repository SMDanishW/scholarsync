"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, Plus, Trash2, FlaskConical } from "lucide-react"
import type { Conversation } from "@/lib/types"

interface Props {
  conversations: Conversation[]
  activeId: string
  onNew: () => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  // Compare calendar days in UTC to avoid timezone-driven off-by-one errors
  const dayMs = 86_400_000
  const dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const nowUTC  = Date.UTC(now.getUTCFullYear(),  now.getUTCMonth(),  now.getUTCDate())
  const diffDays = Math.floor((nowUTC - dateUTC) / dayMs)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7)  return `${diffDays}d ago`
  // Locale-independent fallback — avoids server/client mismatch
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`
}

export default function ConversationList({
  conversations,
  activeId,
  onNew,
  onDelete,
}: Props) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleNew = async () => {
    setIsCreating(true)
    try {
      await onNew()
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-slate-100 text-sm tracking-tight">
            Research Portal
          </span>
        </div>
        <button
          onClick={handleNew}
          disabled={isCreating}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isCreating ? "Creating…" : "New Chat"}
        </button>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-slate-600 text-xs px-3 py-4 text-center">
            No conversations yet.
          </p>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => router.push(`/chat/${conv.id}`)}
            className={`group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
              conv.id === activeId
                ? "bg-slate-700 text-slate-100"
                : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {conv.title || "New Conversation"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5" suppressHydrationWarning>
                {conv.paper_count} paper{conv.paper_count !== 1 ? "s" : ""} ·{" "}
                {formatDate(conv.updated_at)}
              </p>
            </div>
            <button
              onClick={(e) => handleDelete(e, conv.id)}
              disabled={deletingId === conv.id}
              className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-all"
              title="Delete conversation"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </nav>
    </aside>
  )
}
