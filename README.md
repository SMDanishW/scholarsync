# Scholarsync

An AI-powered research paper analysis tool. Upload up to 5 PDF papers per conversation, ask questions in natural language, and get answers grounded strictly in your uploaded documents — complete with inline citations, PDF highlighting, and a transparent agent trace for every response.

---

## Features

- **Multi-paper RAG** — Upload up to 5 PDFs per conversation. Each paper is chunked, embedded, and stored in a private Pinecone namespace.
- **4-agent pipeline** — Router → Retrieval → Synthesis → Guard Rail, orchestrated with LangGraph.
- **Guard rail agent** — Checks every response for unsupported claims before streaming begins. Corrects or removes any claim not grounded in the uploaded PDFs. Verdict (PASS / FAIL / SKIP) is shown in the agent trace.
- **Streaming responses** — Answers stream token-by-token via Server-Sent Events.
- **Cited sources** — Every response lists quoted text snippets with page numbers and section headings.
- **PDF viewer** — Click any citation to open the source PDF with the cited passage highlighted.
- **Agent trace** — A collapsible panel on each response shows the Router intent, retrieved chunks with similarity scores, and the Guard Rail verdict (PASS / FAIL / SKIP).
- **Duplicate detection** — SHA-256 hash check blocks re-uploading the same PDF to the same conversation.
- **Conversation history** — All conversations, papers, and messages are persisted in a local SQLite database.

---

## Tech Stack

| Layer | Technology |
|---|---|
| LLM | `qwen/qwen3-32b` via [Groq Cloud](https://console.groq.com) |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (local, free) |
| Vector DB | [Pinecone](https://www.pinecone.io) serverless (auto-created on startup) |
| Agent orchestration | [LangGraph](https://github.com/langchain-ai/langgraph) |
| Backend | FastAPI + Uvicorn |
| Database | SQLite via SQLAlchemy |
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| PDF rendering | `react-pdf` v9 + PDF.js |

---

## Project Structure

```
researchportal2.0/
├── backend/
│   ├── agents/
│   │   ├── graph.py              # LangGraph StateGraph (Router → Retrieval)
│   │   ├── guardrail_agent.py    # Grounding check — corrects unsupported claims
│   │   ├── retrieval_agent.py    # Pinecone vector search
│   │   ├── router_agent.py       # Intent classification + paper selection
│   │   ├── state.py              # Shared graph state schema
│   │   └── synthesis_agent.py    # Prompt builder + citation extractor
│   ├── api/
│   │   ├── chat.py               # POST /chat — SSE streaming endpoint
│   │   ├── conversations.py      # Conversation CRUD
│   │   └── upload.py             # PDF upload + file serving
│   ├── models/
│   │   ├── db_models.py          # SQLAlchemy ORM models
│   │   └── schemas.py            # Pydantic request/response schemas
│   ├── services/
│   │   ├── embedding_service.py  # sentence-transformers inference
│   │   ├── groq_service.py       # Groq API wrapper (streaming + sync)
│   │   ├── pdf_service.py        # pypdf text extraction + chunking
│   │   └── pinecone_service.py   # Pinecone upsert / query / delete
│   ├── config.py                 # All configuration constants
│   ├── database.py               # SQLAlchemy engine + session
│   ├── main.py                   # FastAPI app, startup hooks
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx               # Root redirect → active conversation
    │   └── chat/[conversationId]/
    │       └── page.tsx           # Main chat page (all state lives here)
    ├── components/
    │   ├── Chat/
    │   │   ├── AgentTraceView.tsx  # Collapsible Router / Retrieval / Guard Rail panel
    │   │   ├── ChatWindow.tsx
    │   │   ├── CitationCard.tsx    # Clickable citation chip
    │   │   ├── MessageBubble.tsx   # Chat bubble + guard rail warning badge
    │   │   └── MessageInput.tsx
    │   ├── Papers/
    │   │   ├── PDFViewerPanel.tsx  # Slide-in PDF viewer with text highlighting
    │   │   └── PapersSidebar.tsx
    │   ├── Sidebar/
    │   │   └── ConversationList.tsx
    │   └── UI/
    │       └── LimitWarningToast.tsx
    └── lib/
        ├── api.ts                  # Typed API client
        └── types.ts                # Shared TypeScript interfaces
```

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Groq Cloud](https://console.groq.com) API key
- A [Pinecone](https://www.pinecone.io) API key (free Starter tier is sufficient)

### 1. Clone and configure environment

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=research-portal
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
```

### 2. Backend

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

On first startup the server will:
1. Create the SQLite database and tables.
2. Auto-create the Pinecone index if it does not exist and wait until it is ready.
3. Warm up the embedding model (downloads ~90 MB on first run).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

### Agent Pipeline

```
User message
     │
     ▼
┌─────────────┐
│ Router Agent │  Classifies intent (summarize / methodology / findings /
│             │  limitations / compare / general_qa) and selects which
└──────┬──────┘  uploaded papers are relevant.
       │
       ▼ (skipped if no papers uploaded)
┌──────────────────┐
│ Retrieval Agent  │  Embeds the query, queries Pinecone (top-8 chunks),
│                  │  returns ranked text excerpts with metadata.
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Synthesis Agent  │  Builds an intent-aware prompt with source excerpts,
│  (non-streaming) │  calls the LLM, receives the complete response.
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Guard Rail Agent │  Checks every claim against source excerpts (truncated
│                  │  to 300 chars each). Returns verdict PASS / FAIL / SKIP
│                  │  + a corrected response with unsupported claims removed.
└────────┬─────────┘  Uses max_tokens=4096 to avoid JSON truncation on Groq.
         │
         ▼
  Stream final (corrected) response word-by-word → client
```

### SSE Event Types

| Event | Payload | Timing |
|---|---|---|
| `trace` | Full agent trace (router + retrieval + guardrail) | First, before any tokens |
| `token` | `{ content: string }` | One per word |
| `citations` | `Citation[]` | After last token |
| `done` | — | Stream end |

### PDF Upload Flow

1. SHA-256 hash computed server-side — duplicate rejected with HTTP 409.
2. `pypdf` extracts text page by page.
3. Text is split into 500-word chunks with 50-word overlap, preserving page/section metadata.
4. `all-MiniLM-L6-v2` produces 384-dim embeddings.
5. Vectors upserted to Pinecone under the conversation's namespace.
6. Vector IDs stored in the database for reliable per-paper deletion.

---

## Configuration

All tuneable constants are in `backend/config.py`:

| Key | Default | Description |
|---|---|---|
| `LLM_MODEL` | `qwen/qwen3-32b` | Groq model for all LLM calls |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | sentence-transformers model |
| `PINECONE_DIMENSION` | `384` | Must match embedding model output |
| `MAX_PAPERS_PER_CONVERSATION` | `5` | Hard cap; warning toast at limit |
| `CHUNK_SIZE` | `500` | Words per chunk |
| `CHUNK_OVERLAP` | `50` | Overlap between adjacent chunks |
| `TOP_K_RETRIEVAL` | `8` | Chunks retrieved per query |

---

## Known Limitations

- **Single-user** — no authentication; designed as a local tool.
- **PDF text extraction** — scanned/image-only PDFs will produce empty chunks.
- **Guard rail latency** — the guard rail adds one extra synchronous LLM call per message; expect ~2–5 s of additional overhead before streaming begins. Synthesis is also non-streaming (full response generated first so the guard rail can inspect it), which contributes to this delay.
- **Groq JSON mode** — Groq enforces a token budget on JSON-mode responses. The guard rail works around this by truncating source excerpts to 300 chars and setting `max_tokens=4096` explicitly on that call.
- **Pinecone free tier** — limited to one index; the app uses one shared index with per-conversation namespaces.
