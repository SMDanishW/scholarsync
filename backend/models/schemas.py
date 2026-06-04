from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class PaperResponse(BaseModel):
    id: str
    conversation_id: str
    filename: str
    page_count: int
    status: str
    uploaded_at: datetime
    model_config = {"from_attributes": True}


class Citation(BaseModel):
    paper_id: str
    paper_name: str
    page_number: int
    section_heading: str
    quoted_text: str


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    citations: List[Citation] = []
    created_at: datetime
    model_config = {"from_attributes": True}


class ConversationSummary(BaseModel):
    id: str
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    paper_count: int


class ConversationDetail(BaseModel):
    id: str
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    papers: List[PaperResponse]
    messages: List[MessageResponse]


class ChatRequest(BaseModel):
    message: str
