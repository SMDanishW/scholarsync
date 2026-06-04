"use client"
import { useState, useCallback } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/TextLayer.css"
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ScanText,
} from "lucide-react"
import type { Citation } from "@/lib/types"

// Use CDN worker so we don't need a custom webpack worker config
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// Common words excluded from highlight matching
const STOP_WORDS = new Set([
  "about", "after", "also", "been", "both", "each", "even", "from",
  "have", "into", "just", "more", "most", "only", "other", "show",
  "showed", "some", "such", "than", "that", "their", "them", "then",
  "there", "these", "they", "this", "used", "using", "were", "when",
  "which", "will", "with", "well",
])

interface Props {
  citation: Citation
  conversationId: string
  onClose: () => void
}

export default function PDFViewerPanel({ citation, conversationId, onClose }: Props) {
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(citation.page_number)
  const [scale, setScale] = useState(1.2)

  const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/conversations/${conversationId}/papers/${citation.paper_id}/file`

  /**
   * For each PDF text item, check whether it contains enough significant
   * words from the cited excerpt to be considered part of the citation.
   * If so, wrap it in an inline <mark> so it glows in the text layer.
   */
  const customTextRenderer = useCallback(
    ({ str }: { str: string }) => {
      if (!citation.quoted_text || str.trim().length < 4) return str

      const sigWords = citation.quoted_text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 4 && !STOP_WORDS.has(w))
        .slice(0, 14)

      if (sigWords.length === 0) return str

      const strWords = str
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)

      const hits = strWords.filter(
        (w) => w.length > 4 && sigWords.includes(w)
      ).length

      if (hits >= Math.min(2, sigWords.length)) {
        return `<mark style="background:rgba(99,102,241,0.38);border-radius:2px;padding:1px 0;color:inherit">${str}</mark>`
      }
      return str
    },
    [citation.quoted_text]
  )

  const adjustScale = (delta: number) =>
    setScale((s) => Math.max(0.5, Math.min(2.5, +(s + delta).toFixed(1))))

  return (
    <>
      {/* Dimmed backdrop — click to close */}
      <div
        className="fixed inset-0 bg-black/50 z-30"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div className="fixed top-0 right-0 h-screen w-[52vw] min-w-[500px] bg-slate-900 border-l border-slate-700 shadow-2xl z-40 flex flex-col">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">
              {citation.paper_name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Page {citation.page_number} &middot; {citation.section_heading}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Cited excerpt banner ────────────────────────────────── */}
        <div className="px-4 py-3 bg-indigo-950/60 border-b border-indigo-800/30 flex-shrink-0">
          <p className="text-xs font-medium text-indigo-400 mb-1.5 flex items-center gap-1.5">
            <ScanText className="w-3.5 h-3.5" />
            Cited excerpt &mdash; highlighted in the document below
          </p>
          <p className="text-xs text-indigo-200 italic leading-relaxed line-clamp-3">
            &ldquo;{citation.quoted_text}&rdquo;
          </p>
        </div>

        {/* ── Toolbar ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 flex-shrink-0">
          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 px-1 tabular-nums">
              {currentPage} / {numPages || "—"}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => adjustScale(-0.2)}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 w-10 text-center tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => adjustScale(0.2)}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── PDF canvas ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-slate-800 flex justify-center py-6 px-4">
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            loading={
              <div className="flex items-center justify-center h-48 w-full">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-500" />
              </div>
            }
            error={
              <div className="flex items-center justify-center h-48 px-8 text-center">
                <p className="text-sm text-red-400">
                  Could not load the PDF. The file may have been removed.
                </p>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              customTextRenderer={customTextRenderer}
              renderAnnotationLayer={false}
              className="shadow-2xl"
            />
          </Document>
        </div>
      </div>
    </>
  )
}
