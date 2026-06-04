import { FileText, BookOpen, ArrowUpRight } from "lucide-react"
import type { Citation } from "@/lib/types"

interface Props {
  citation: Citation
  onClick: () => void
}

export default function CitationCard({ citation, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group bg-slate-800/70 border border-slate-700 rounded-lg p-3 text-xs space-y-2 cursor-pointer hover:border-indigo-500/60 hover:bg-slate-800 transition-colors"
    >
      {/* Paper name + page badge */}
      <div className="flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
        <span className="font-medium text-slate-300 truncate flex-1">
          {citation.paper_name}
        </span>
        <span className="flex-shrink-0 px-1.5 py-0.5 bg-slate-700 rounded text-slate-400 font-mono">
          p.&nbsp;{citation.page_number}
        </span>
      </div>

      {/* Section heading */}
      <div className="flex items-center gap-1 text-slate-500">
        <BookOpen className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{citation.section_heading}</span>
      </div>

      {/* Quoted text */}
      <p className="text-slate-400 italic leading-relaxed border-l-2 border-indigo-600/50 pl-2">
        &ldquo;{citation.quoted_text}&rdquo;
      </p>

      {/* "View in paper" hint — visible on hover */}
      <div className="flex items-center gap-1 text-slate-600 group-hover:text-indigo-400 transition-colors pt-0.5">
        <ArrowUpRight className="w-3 h-3" />
        <span>View in paper</span>
      </div>
    </div>
  )
}
