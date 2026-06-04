"use client"
import { useState } from "react"
import { ChevronDown, ChevronUp, Brain, FileSearch, Cpu, ShieldCheck } from "lucide-react"
import type { AgentTrace } from "@/lib/types"

interface Props {
  trace: AgentTrace
}

const INTENT_STYLES: Record<string, string> = {
  summarize:   "bg-blue-900/40 text-blue-300 border-blue-800/40",
  methodology: "bg-purple-900/40 text-purple-300 border-purple-800/40",
  findings:    "bg-emerald-900/40 text-emerald-300 border-emerald-800/40",
  limitations: "bg-orange-900/40 text-orange-300 border-orange-800/40",
  compare:     "bg-cyan-900/40 text-cyan-300 border-cyan-800/40",
  general_qa:  "bg-slate-700/60 text-slate-300 border-slate-600/40",
}

function scoreStyle(score: number) {
  if (score >= 0.85) return "text-emerald-400 bg-emerald-900/30"
  if (score >= 0.70) return "text-yellow-400 bg-yellow-900/30"
  return "text-slate-500 bg-slate-700/40"
}

function verdictStyle(verdict: "pass" | "fail" | "skip") {
  if (verdict === "pass") return "bg-emerald-900/40 text-emerald-300 border-emerald-800/40"
  if (verdict === "fail") return "bg-red-900/40 text-red-300 border-red-800/40"
  return "bg-slate-700/60 text-slate-400 border-slate-600/40"
}

function verdictLabel(verdict: "pass" | "fail" | "skip") {
  if (verdict === "pass") return "PASS"
  if (verdict === "fail") return "FAIL"
  return "SKIP"
}

export default function AgentTraceView({ trace }: Props) {
  const [open, setOpen] = useState(false)

  const intentStyle =
    INTENT_STYLES[trace.router.intent] ?? INTENT_STYLES.general_qa

  return (
    <div className="w-full">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-400 transition-colors group"
      >
        <Cpu className="w-3 h-3 group-hover:text-indigo-400" />
        <span>See agent trace</span>
        {open ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-slate-700/50 overflow-hidden text-xs divide-y divide-slate-700/50">

          {/* ── Router Agent ─────────────────────────────────────── */}
          <div className="p-3 bg-slate-900/60">
            <div className="flex items-center gap-2 mb-2.5">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-semibold text-slate-300">Router Agent</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 w-24 flex-shrink-0">Intent</span>
                <span
                  className={`px-2 py-0.5 rounded border font-medium tracking-wide ${intentStyle}`}
                >
                  {trace.router.intent}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-slate-500 w-24 flex-shrink-0 mt-0.5">
                  Papers used
                </span>
                <div className="flex flex-wrap gap-1">
                  {trace.router.relevant_papers.length === 0 ? (
                    <span className="text-slate-600">—</span>
                  ) : (
                    trace.router.relevant_papers.map((name, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-slate-700/60 rounded text-slate-400 truncate max-w-[180px]"
                        title={name}
                      >
                        {name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Retrieval Agent ───────────────────────────────────── */}
          <div className="p-3 bg-slate-900/40">
            <div className="flex items-center gap-2 mb-2.5">
              <FileSearch className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-slate-300">Retrieval Agent</span>
              <span className="text-slate-600">
                {trace.retrieval.chunk_count} chunk
                {trace.retrieval.chunk_count !== 1 ? "s" : ""} retrieved
              </span>
            </div>

            {trace.retrieval.chunks.length === 0 ? (
              <p className="text-slate-600">
                No chunks retrieved — no papers uploaded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {trace.retrieval.chunks.map((chunk, i) => (
                  <div
                    key={i}
                    className="rounded border border-slate-700/50 bg-slate-800/40 p-2 space-y-1"
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono w-4 text-right flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-medium text-slate-300 truncate flex-1" title={chunk.paper_name}>
                        {chunk.paper_name}
                      </span>
                      <span className="text-slate-600 font-mono flex-shrink-0">
                        p.{chunk.page_number}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${scoreStyle(chunk.score)}`}
                        title="Cosine similarity score"
                      >
                        {chunk.score.toFixed(3)}
                      </span>
                    </div>

                    {/* Section */}
                    <p className="text-slate-600 pl-6">{chunk.section_heading}</p>

                    {/* Preview */}
                    <p className="text-slate-500 leading-relaxed pl-6 line-clamp-2">
                      {chunk.preview}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Guard Rail Agent ──────────────────────────────────── */}
          {trace.guardrail && (
            <div className="p-3 bg-slate-900/60">
              <div className="flex items-center gap-2 mb-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold text-slate-300">Guard Rail Agent</span>
                <span
                  className={`px-2 py-0.5 rounded border font-semibold tracking-widest ${verdictStyle(trace.guardrail.verdict)}`}
                >
                  {verdictLabel(trace.guardrail.verdict)}
                </span>
              </div>

              {trace.guardrail.verdict === "skip" && (
                <p className="text-slate-600">
                  No papers uploaded — grounding check skipped.
                </p>
              )}

              {trace.guardrail.verdict === "pass" && (
                <p className="text-slate-500">
                  All claims are supported by the uploaded papers.
                </p>
              )}

              {trace.guardrail.verdict === "fail" && trace.guardrail.issues.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-slate-500 mb-1">Unsupported claims removed:</p>
                  <ul className="space-y-1">
                    {trace.guardrail.issues.map((issue, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-red-400/80 bg-red-900/10 border border-red-900/20 rounded px-2 py-1"
                      >
                        <span className="flex-shrink-0 text-red-600 font-mono">{i + 1}.</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
