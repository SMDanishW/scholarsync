"use client"
import { useState } from "react"
import { User, Bot, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
import type { LocalMessage, Citation } from "@/lib/types"
import CitationCard from "./CitationCard"
import AgentTraceView from "./AgentTraceView"

interface Props {
  message: LocalMessage
  onCitationClick: (citation: Citation) => void
}

export default function MessageBubble({ message, onCitationClick }: Props) {
  const [showCitations, setShowCitations] = useState(false)
  const isUser = message.role === "user"

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
          isUser ? "bg-indigo-600" : "bg-slate-700"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-slate-300" />
        )}
      </div>

      {/* Content */}
      <div
        className={`max-w-[72%] flex flex-col gap-2 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-indigo-600 text-white rounded-tr-sm"
              : "bg-slate-800 text-slate-100 rounded-tl-sm"
          }`}
        >
          {message.content || (message.isStreaming ? "" : "…")}
          {message.isStreaming && (
            <span className="inline-flex gap-0.5 ml-1 align-middle">
              <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          )}
        </div>

        {/* Guard rail correction badge */}
        {!isUser && message.trace?.guardrail?.verdict === "fail" && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-900/30 border border-amber-700/40 text-amber-400 text-xs">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>Response corrected by guard rail — unsupported claims removed</span>
          </div>
        )}

        {/* Agent trace */}
        {!isUser && message.trace && (
          <AgentTraceView trace={message.trace} />
        )}

        {/* Citations */}
        {!isUser && message.citations.length > 0 && (
          <div className="w-full space-y-2">
            <button
              onClick={() => setShowCitations((s) => !s)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              {showCitations ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {message.citations.length} source{message.citations.length !== 1 ? "s" : ""}
            </button>
            {showCitations && (
              <div className="space-y-2 w-full">
                {message.citations.map((citation, i) => (
                  <CitationCard
                    key={i}
                    citation={citation}
                    onClick={() => onCitationClick(citation)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
