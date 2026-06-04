import json
import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models.db_models import Conversation, Paper
from models.schemas import PaperResponse
from config import MAX_PAPERS_PER_CONVERSATION, UPLOAD_DIR
from services.pdf_service import compute_file_hash, extract_chunks, get_page_count
from services.embedding_service import embed_texts
from services.pinecone_service import upsert_chunks, delete_paper_vectors

router = APIRouter(prefix="/api/conversations", tags=["upload"])


@router.post("/{conversation_id}/upload", response_model=PaperResponse)
def upload_paper(
    conversation_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")

    existing = db.query(Paper).filter(Paper.conversation_id == conversation_id).all()
    if len(existing) >= MAX_PAPERS_PER_CONVERSATION:
        raise HTTPException(
            400,
            f"Maximum {MAX_PAPERS_PER_CONVERSATION} papers per conversation. "
            "Start a new conversation to analyze more papers.",
        )

    file_bytes = file.file.read()
    file_hash = compute_file_hash(file_bytes)

    duplicate = (
        db.query(Paper)
        .filter(
            Paper.conversation_id == conversation_id,
            Paper.file_hash == file_hash,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            409,
            f"'{duplicate.filename}' has already been uploaded to this conversation.",
        )

    # Persist file to disk
    save_dir = Path(UPLOAD_DIR) / conversation_id
    save_dir.mkdir(parents=True, exist_ok=True)
    save_path = save_dir / file.filename
    save_path.write_bytes(file_bytes)

    paper = Paper(
        conversation_id=conversation_id,
        filename=file.filename,
        file_hash=file_hash,
        status="processing",
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)

    try:
        chunks = extract_chunks(str(save_path))
        page_count = get_page_count(str(save_path))

        vector_ids: list = []
        if chunks:
            embeddings = embed_texts([c["text"] for c in chunks])
            vector_ids = upsert_chunks(
                conversation_id=conversation_id,
                paper_id=paper.id,
                paper_name=file.filename,
                chunks=chunks,
                embeddings=embeddings,
            )

        paper.page_count = page_count
        paper.vector_ids_json = json.dumps(vector_ids)
        paper.status = "ready"
    except Exception as exc:
        paper.status = "error"
        db.commit()
        raise HTTPException(500, f"Failed to process PDF: {exc}") from exc

    db.commit()
    db.refresh(paper)

    return PaperResponse(
        id=paper.id,
        conversation_id=paper.conversation_id,
        filename=paper.filename,
        page_count=paper.page_count,
        status=paper.status,
        uploaded_at=paper.uploaded_at,
    )


@router.get("/{conversation_id}/papers/{paper_id}/file")
def get_paper_file(
    conversation_id: str,
    paper_id: str,
    db: Session = Depends(get_db),
):
    """Serve the raw PDF so the frontend PDF viewer can render it."""
    paper = (
        db.query(Paper)
        .filter(Paper.id == paper_id, Paper.conversation_id == conversation_id)
        .first()
    )
    if not paper:
        raise HTTPException(404, "Paper not found")

    file_path = Path(UPLOAD_DIR) / conversation_id / paper.filename
    if not file_path.exists():
        raise HTTPException(404, "File not found on disk")

    return FileResponse(
        str(file_path),
        media_type="application/pdf",
        filename=paper.filename,
    )


@router.delete("/{conversation_id}/papers/{paper_id}", status_code=204)
def delete_paper(
    conversation_id: str,
    paper_id: str,
    db: Session = Depends(get_db),
):
    paper = (
        db.query(Paper)
        .filter(Paper.id == paper_id, Paper.conversation_id == conversation_id)
        .first()
    )
    if not paper:
        raise HTTPException(404, "Paper not found")

    try:
        vector_ids = json.loads(paper.vector_ids_json or "[]")
        if vector_ids:
            delete_paper_vectors(conversation_id, vector_ids)
    except Exception:
        pass

    file_path = Path(UPLOAD_DIR) / conversation_id / paper.filename
    if file_path.exists():
        file_path.unlink()

    db.delete(paper)
    db.commit()
