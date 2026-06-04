import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=_uuid)
    title = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    papers = relationship(
        "Paper",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Paper.uploaded_at",
    )
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Paper(Base):
    __tablename__ = "papers"

    id = Column(String, primary_key=True, default=_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    filename = Column(String, nullable=False)
    page_count = Column(Integer, default=0)
    file_hash = Column(String(64), nullable=False)        # SHA-256 for dedup
    vector_ids_json = Column(Text, default="[]")          # Pinecone vector IDs
    status = Column(String, default="processing")         # processing | ready | error
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="papers")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    role = Column(String, nullable=False)                 # user | assistant
    content = Column(Text, nullable=False)
    citations_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
