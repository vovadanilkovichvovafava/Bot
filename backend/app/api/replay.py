"""Session replay ingest — receive rrweb chunks from the client (append-only)."""

import json
import logging
from datetime import datetime
from typing import List, Any, Optional

from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_token
from app.models.session_replay import SessionReplay, ReplayChunk

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_TOTAL_SIZE = 2 * 1024 * 1024  # 2MB per session (sum of all chunks)


class ReplayChunkRequest(BaseModel):
    session_id: str
    events: List[Any] = []  # raw rrweb event dicts
    is_final: bool = False


def _extract_user_id(request: Request) -> Optional[str]:
    """Best-effort public_id from the auth header (replay works without it too)."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        payload = verify_token(auth.split(" ", 1)[1])
        return payload.get("public_id")
    except Exception:
        return None


@router.post("/replay")
async def store_replay_chunk(
    body: ReplayChunkRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Receive a chunk of rrweb events. Each flush is one append-only row."""
    if not body.events or not body.session_id:
        return {"ok": True, "events_total": 0, "capped": False}

    try:
        replay = (await db.execute(
            select(SessionReplay).where(SessionReplay.session_id == body.session_id)
        )).scalar_one_or_none()

        if replay and (replay.total_size or 0) >= MAX_TOTAL_SIZE:
            return {"ok": True, "events_total": replay.total_events, "capped": True}

        chunk_json = json.dumps(body.events, separators=(",", ":"))
        chunk_size = len(chunk_json.encode("utf-8"))
        chunk_events = len(body.events)

        current_size = replay.total_size if replay else 0
        if current_size + chunk_size > MAX_TOTAL_SIZE:
            return {"ok": True, "events_total": replay.total_events if replay else 0, "capped": True}

        chunk_index = replay.chunks_count if replay else 0
        db.add(ReplayChunk(
            session_id=body.session_id,
            chunk_index=chunk_index,
            events_json=chunk_json,
            events_count=chunk_events,
            size_bytes=chunk_size,
        ))

        if replay:
            # Сессия начинается анонимной — на странице регистрации токена ещё
            # нет. Как только он появился, привязываем запись к юзеру, иначе
            # визит, в котором человек и зарегистрировался, навсегда остаётся
            # ничьим.
            if not replay.user_id:
                replay.user_id = _extract_user_id(request)
            replay.chunks_count = (replay.chunks_count or 0) + 1
            replay.total_events = (replay.total_events or 0) + chunk_events
            replay.total_size = (replay.total_size or 0) + chunk_size
            replay.updated_at = datetime.utcnow()
            if body.is_final:
                replay.is_complete = True
            total = replay.total_events
        else:
            db.add(SessionReplay(
                session_id=body.session_id,
                user_id=_extract_user_id(request),
                chunks_count=1,
                total_events=chunk_events,
                total_size=chunk_size,
                is_complete=body.is_final,
            ))
            total = chunk_events

        await db.commit()
        return {"ok": True, "events_total": total, "capped": False}

    except Exception as e:
        logger.warning(f"Failed to store replay chunk: {e}")
        await db.rollback()
        return {"ok": False, "error": "store_failed"}
