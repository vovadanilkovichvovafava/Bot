import json
import logging
from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


class AnalyticsEvent(BaseModel):
    event: str
    page: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    country: Optional[str] = None
    referrer: Optional[str] = None
    metadata: Optional[dict] = None


@router.post("/event")
async def track_event(
    event: AnalyticsEvent,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Fire-and-forget analytics event — never fails, never blocks"""
    try:
        # Get client IP
        forwarded = request.headers.get("X-Forwarded-For")
        ip = forwarded.split(",")[0].strip() if forwarded else (
            request.client.host if request.client else "unknown"
        )
        user_agent = request.headers.get("User-Agent", "")[:500]

        await db.execute(
            text("""
                INSERT INTO analytics_events
                (event, page, user_id, session_id, ip, country, user_agent, referrer, metadata)
                VALUES (:event, :page, :user_id, :session_id, :ip, :country, :user_agent, :referrer, CAST(:metadata AS jsonb))
            """),
            {
                "event": event.event,
                "page": event.page,
                "user_id": event.user_id,
                "session_id": event.session_id,
                "ip": ip,
                "country": event.country,
                "user_agent": user_agent,
                "referrer": event.referrer,
                "metadata": json.dumps(event.metadata or {}),
            },
        )
        await db.commit()
    except Exception as e:
        logger.warning(f"Analytics event failed: {e}")

    return {"ok": True}
