import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models.db_models import Conversation, Paper, Message
from models.schemas import ChatRequest
from agents.graph import compiled_graph
from agents.synthesis_agent import build_synthesis_prompt, extract_citations
from agents.guardrail_agent import guardrail_agent
from services.groq_service import chat_completion

router = APIRouter(prefix="/api/conversations", tags=["chat"])


@router.post("/{conversation_id}/chat")
def chat(
    conversation_id: str,
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    papers = (
        db.query(Paper)
        .filter(Paper.conversation_id == conversation_id, Paper.status == "ready")
        .all()
    )
    paper_ids = [p.id for p in papers]
    paper_names = {p.id: p.filename for p in papers}

    # Persist user message
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=request.message,
        citations_json="[]",
    )
    db.add(user_msg)

    if not conv.title:
        conv.title = request.message[:60]

    db.commit()

    # ── Router → Retrieval pipeline ──────────────────────────────────────────────
    state = compiled_graph.invoke(
        {
            "conversation_id": conversation_id,
            "query": request.message,
            "paper_ids": paper_ids,
            "paper_names": paper_names,
            "intent": None,
            "relevant_paper_ids": [],
            "retrieved_chunks": [],
        }
    )

    intent: str = state.get("intent", "general_qa")
    chunks: list = state.get("retrieved_chunks", [])
    relevant_paper_ids: list = state.get("relevant_paper_ids", [])

    # ── Synthesis (non-streaming so guard rail can inspect the full response) ────
    synthesis_messages = build_synthesis_prompt(intent, request.message, chunks)
    raw_response: str = chat_completion(synthesis_messages, max_tokens=2000)

    # ── Guard rail check ─────────────────────────────────────────────────────────
    guard = guardrail_agent(raw_response, chunks)
    final_response: str = guard["corrected_response"]

    # ── Build full trace payload ─────────────────────────────────────────────────
    trace = {
        "router": {
            "intent": intent,
            "relevant_papers": [paper_names.get(pid, pid) for pid in relevant_paper_ids],
        },
        "retrieval": {
            "chunk_count": len(chunks),
            "chunks": [
                {
                    "paper_name": c["paper_name"],
                    "page_number": c["page_number"],
                    "section_heading": c["section_heading"],
                    "score": round(c["score"], 4),
                    "preview": (
                        (c["text"][:160].rstrip() + "…") if len(c["text"]) > 160 else c["text"]
                    ),
                }
                for c in chunks
            ],
        },
        "guardrail": {
            "verdict": guard["verdict"],
            "issues": guard["issues"],
        },
    }

    citations = extract_citations(chunks)

    def generate():
        # 1. Emit the full agent trace (router + retrieval + guardrail) up front
        yield f"data: {json.dumps({'type': 'trace', 'trace': trace})}\n\n"

        # 2. Stream the final (possibly corrected) response word-by-word
        words = final_response.split(" ")
        for i, word in enumerate(words):
            token = word if i == 0 else " " + word
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        # 3. Emit citations
        yield f"data: {json.dumps({'type': 'citations', 'citations': citations})}\n\n"

        # 4. Persist assistant message (fresh session — generator runs after request ends)
        session = SessionLocal()
        try:
            assistant_msg = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=final_response,
                citations_json=json.dumps(citations),
            )
            session.add(assistant_msg)
            c = session.query(Conversation).filter(Conversation.id == conversation_id).first()
            if c:
                c.updated_at = datetime.utcnow()
            session.commit()
        finally:
            session.close()

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
