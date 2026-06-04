"use client"
import { useState } from "react"
import { FileText, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import type { Paper } from "@/lib/types"

interface Props {
  paper: Paper
  onDelete: () => Promise<void>
}

function StatusBadge({ status }: { status: Paper["status"] }) {
  if (status === "processing")
    return <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
  if (status === "ready")
    return <CheckCircle2 className="w-3 h-3 text-emerald-400" />
  return <AlertCircle className="w-3 h-3 text-red-400" />
}

export default function PaperChip({ paper, onDelete }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDeleting(true)
    try {
      await onDelete()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="group flex items-start gap-2 p-2.5 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
      <FileText className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-200 truncate" title={paper.filename}>
          {paper.filename}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <StatusBadge status={paper.status} />
          <span className="text-xs text-slate-500">
            {paper.status === "processing"
              ? "Processing…"
              : paper.status === "ready"
              ? `${paper.page_count} pages`
              : "Error"}
          </span>
        </div>
      </div>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-all disabled:cursor-not-allowed"
        title="Remove paper"
      >
        {isDeleting ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Trash2 className="w-3 h-3" />
        )}
      </button>
    </div>
  )
}
