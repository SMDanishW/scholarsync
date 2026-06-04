export interface Conversation {
  id: string
  title: string | null
  created_at: string
  updated_at: string
  paper_count: number
}

export interface Paper {
  id: string
  conversation_id: string
  filename: string
  page_count: number
  status: "processing" | "ready" | "error"
  uploaded_at: string
}

export interface Citation {
  paper_id: string
  paper_name: string
  page_number: number
  section_heading: string
  quoted_text: string
}

export interface Message {
  id: string
  conversation_id: string
  role: "user" | "assistant"
  content: string
  citations: Citation[]
  created_at: string
}

export interface ConversationDetail extends Conversation {
  papers: Paper[]
  messages: Message[]
}

// ── Agent trace types ─────────────────────────────────────────────────────────

export interface ChunkTrace {
  paper_name: string
  page_number: number
  section_heading: string
  score: number
  preview: string
}

export interface AgentTrace {
  router: {
    intent: string
    relevant_papers: string[]
  }
  retrieval: {
    chunk_count: number
    chunks: ChunkTrace[]
  }
  guardrail: {
    verdict: "pass" | "fail" | "skip"
    issues: string[]
  }
}

/** Client-only shape used while streaming */
export interface LocalMessage {
  id: string
  role: "user" | "assistant"
  content: string
  citations: Citation[]
  trace?: AgentTrace
  isStreaming?: boolean
}
