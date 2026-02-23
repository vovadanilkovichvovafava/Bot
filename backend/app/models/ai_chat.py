from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class AIChatMessage(Base):
    __tablename__ = "ai_chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    locale = Column(String(5), default="en", nullable=False)
    match_context = Column(Text, nullable=True)  # match info if provided
    was_pro = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), index=True)

    user = relationship("User", backref="ai_chat_messages")

    __table_args__ = (
        Index("ix_ai_chat_user_created", "user_id", "created_at"),
        Index("ix_ai_chat_session", "session_id", "created_at"),
    )
