import json
import shutil
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.db_models import Conversation, Paper, Message
from models.schemas import (
    ConversationSummary,
    ConversationDetail,
    PaperResponse,
    MessageResponse,
    Citation,
)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


def _parse_citations(raw: str) -> list:
    try:
        return json.loads(raw or "[]")
    except Exception:
        return []


@router.post("", response_model=ConversationSummary, status_code=201)
def create_conversation(db: Session = Depends(get_db)):
    conv = Conversation()
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        paper_count=0,
    )


@router.get("", response_model=list[ConversationSummary])
def list_conversations(db: Session = Depends(get_db)):
    convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    return [
        ConversationSummary(
            id=c.id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at,
            paper_count=len(c.papers),
        )
        for c in convs
    ]


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    papers = [
        PaperResponse(
            id=p.id,
            conversation_id=p.conversation_id,
            filename=p.filename,
            page_count=p.page_count,
            status=p.status,
            uploaded_at=p.uploaded_at,
        )
        for p in conv.papers
    ]

    messages = [
        MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            content=m.content,
            citations=[Citation(**c) for c in _parse_citations(m.citations_json)],
            created_at=m.created_at,
        )
        for m in conv.messages
    ]

    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        papers=papers,
        messages=messages,
    )


@router.delete("/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    try:
        from services.pinecone_service import delete_namespace
        delete_namespace(conversation_id)
    except Exception:
        pass

    upload_dir = os.path.join("uploads", conversation_id)
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)

    db.delete(conv)
    db.commit()
