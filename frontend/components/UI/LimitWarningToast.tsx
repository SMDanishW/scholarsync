"use client"
import { useEffect, useState } from "react"
import { AlertTriangle, X } from "lucide-react"

const DURATION_MS = 6000

interface Props {
  onDismiss: () => void
}

export default function LimitWarningToast({ onDismiss }: Props) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / DURATION_MS) * 100)
      setProgress(remaining)
      if (remaining === 0) {
        clearInterval(interval)
        onDismiss()
      }
    }, 50)
    return () => clearInterval(interval)
  }, [onDismiss])

  return (
    <div className="fixed top-4 right-4 z-50 w-80 bg-amber-950 border border-amber-700/60 rounded-xl shadow-2xl overflow-hidden slide-in-right">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-200">Paper Limit Reached</p>
            <p className="text-xs text-amber-400/80 mt-1 leading-relaxed">
              You&apos;ve uploaded 5 papers. Start a new conversation to analyze
              additional papers.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-amber-500 hover:text-amber-300 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-0.5 bg-amber-900">
        <div
          className="h-full bg-amber-500 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
