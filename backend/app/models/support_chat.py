from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class SupportChatMessage(Base):
    __tablename__ = "support_chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(String, nullable=False, index=True)  # Group messages by session
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    locale = Column(String(5), default="en", nullable=False)
    agent_name = Column(String(50), nullable=True)  # Marco, Max, Kuba, Alex
    was_pro = Column(Boolean, default=False, nullable=False)  # PRO at time of message
    created_at = Column(DateTime, server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", backref="support_messages")

    # Composite index for fast queries
    __table_args__ = (
        Index("ix_support_chat_user_created", "user_id", "created_at"),
        Index("ix_support_chat_session", "session_id", "created_at"),
    )
