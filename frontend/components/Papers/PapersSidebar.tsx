"use client"
import type { Paper } from "@/lib/types"
import PaperChip from "./PaperChip"
import PDFUploader from "./PDFUploader"

interface Props {
  papers: Paper[]
  onUpload: (file: File) => Promise<Paper>
  onDelete: (paperId: string) => Promise<void>
  maxPapers: number
}

export default function PapersSidebar({
  papers,
  onUpload,
  onDelete,
  maxPapers,
}: Props) {
  const atLimit = papers.length >= maxPapers

  return (
    <aside className="w-72 flex-shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Uploaded Papers</h2>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              atLimit
                ? "bg-orange-500/20 text-orange-400"
                : "bg-slate-700 text-slate-400"
            }`}
          >
            {papers.length}/{maxPapers}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {atLimit
            ? "Limit reached. Start a new chat for more."
            : `Add up to ${maxPapers - papers.length} more paper${maxPapers - papers.length !== 1 ? "s" : ""}.`}
        </p>
      </div>

      {/* Paper list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {papers.length === 0 && (
          <p className="text-slate-600 text-xs text-center py-4">
            No papers uploaded yet.
          </p>
        )}
        {papers.map((paper) => (
          <PaperChip
            key={paper.id}
            paper={paper}
            onDelete={() => onDelete(paper.id)}
          />
        ))}
      </div>

      {/* Uploader */}
      <div className="p-3 border-t border-slate-800">
        <PDFUploader onUpload={onUpload} disabled={atLimit} />
      </div>
    </aside>
  )
}
