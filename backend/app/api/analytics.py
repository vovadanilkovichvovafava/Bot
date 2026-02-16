import logging
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import text

from app.core.database import engine

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
async def track_event(event: AnalyticsEvent, request: Request):
    """Fire-and-forget analytics event — never fails, never blocks"""
    try:
        # Get client IP
        forwarded = request.headers.get("X-Forwarded-For")
        ip = forwarded.split(",")[0].strip() if forwarded else (
            request.client.host if request.client else "unknown"
        )
        user_agent = request.headers.get("User-Agent", "")[:500]

        async with engine.begin() as conn:
            await conn.execute(
                text("""
                    INSERT INTO analytics_events
                    (event, page, user_id, session_id, ip, country, user_agent, referrer, metadata)
                    VALUES (:event, :page, :user_id, :session_id, :ip, :country, :user_agent, :referrer, :metadata::jsonb)
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
                    "metadata": str(event.metadata or {}).replace("'", '"'),
                },
            )
    except Exception as e:
        # Never fail — analytics should not break the app
        logger.warning(f"Analytics event failed: {e}")

    return {"ok": True}
