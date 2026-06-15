"""Session replay storage — rrweb event recordings for admin playback."""

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from app.core.database import Base


class SessionReplay(Base):
    """Metadata for a session replay. Actual events stored in ReplayChunk rows."""
    __tablename__ = "session_replays"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(String, index=True, nullable=True)  # public_id (usr_xxx) if known
    chunks_count = Column(Integer, default=0)
    total_events = Column(Integer, default=0)
    total_size = Column(Integer, default=0)  # uncompressed bytes across all chunks
    is_complete = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))


class ReplayChunk(Base):
    """One chunk of rrweb events (one flush from frontend). Append-only."""
    __tablename__ = "replay_chunks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), index=True, nullable=False)
    chunk_index = Column(Integer, default=0)  # order within session
    events_json = Column(Text, nullable=False)  # JSON array of rrweb events
    events_count = Column(Integer, default=0)
    size_bytes = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
