import asyncio
import json
import logging
from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, async_session_maker

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


async def _insert_analytics_event(params: dict):
    """Background task: insert analytics event using its own short-lived session."""
    try:
        async with async_session_maker() as db:
            await db.execute(
                text("""
                    INSERT INTO analytics_events
                    (event, page, user_id, session_id, ip, country, user_agent, referrer, metadata)
                    VALUES (:event, :page, :user_id, :session_id, :ip, :country, :user_agent, :referrer, CAST(:metadata AS jsonb))
                """),
                params,
            )
            await db.commit()
    except Exception as e:
        logger.warning(f"Analytics event failed: {e}")


@router.post("/event")
async def track_event(
    event: AnalyticsEvent,
    request: Request,
):
    """Fire-and-forget analytics event — returns immediately, writes in background."""
    # Get client IP
    forwarded = request.headers.get("X-Forwarded-For")
    ip = forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else "unknown"
    )
    user_agent = request.headers.get("User-Agent", "")[:500]

    params = {
        "event": event.event,
        "page": event.page,
        "user_id": event.user_id,
        "session_id": event.session_id,
        "ip": ip,
        "country": event.country,
        "user_agent": user_agent,
        "referrer": event.referrer,
        "metadata": json.dumps(event.metadata or {}),
    }

    # Fire-and-forget: don't hold the request connection
    asyncio.create_task(_insert_analytics_event(params))

    return {"ok": True}


class BannerClickEvent(BaseModel):
    user_id: str
    banner: str


@router.post("/banner-click")
async def track_banner_click(
    event: BannerClickEvent,
    db: AsyncSession = Depends(get_db),
):
    """Record a banner click for tracking which banners convert."""
    try:
        await db.execute(
            text("INSERT INTO banner_clicks (user_id, banner) VALUES (:user_id, :banner)"),
            {"user_id": event.user_id, "banner": event.banner},
        )
        await db.commit()
    except Exception as e:
        logger.warning(f"Banner click tracking failed: {e}")

    return {"ok": True}
