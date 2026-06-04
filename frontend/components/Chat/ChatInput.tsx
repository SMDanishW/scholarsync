"use client"
import { useState, useRef, KeyboardEvent } from "react"
import { Send } from "lucide-react"

interface Props {
  onSend: (message: string) => Promise<void>
  isGenerating: boolean
  disabled: boolean
}

export default function ChatInput({ onSend, isGenerating, disabled }: Props) {
  const [value, setValue] = useState("")
  const taRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async () => {
    const text = value.trim()
    if (!text || isGenerating || disabled) return
    setValue("")
    if (taRef.current) taRef.current.style.height = "auto"
    await onSend(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    const ta = e.target
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px"
  }

  return (
    <div className="border-t border-slate-800 p-4">
      <div className="flex items-end gap-3 bg-slate-800 rounded-xl px-4 py-3 border border-slate-700 focus-within:border-indigo-600 transition-colors">
        <textarea
          ref={taRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isGenerating || disabled}
          placeholder={
            disabled
              ? "Select or create a conversation…"
              : "Ask about your papers… (Enter to send, Shift+Enter for newline)"
          }
          rows={1}
          className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none outline-none disabled:cursor-not-allowed min-h-[24px] max-h-40"
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || isGenerating || disabled}
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          title="Send"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
      <p className="text-xs text-slate-600 text-center mt-2">
        AI responses may contain errors. Always verify against source papers.
      </p>
    </div>
  )
}
