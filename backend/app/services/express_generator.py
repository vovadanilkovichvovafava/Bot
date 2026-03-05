"""
Express Bet Generator — simplified.

Express generation is now frontend-driven (reuses Value Finder logic from
API-Football data). This module only provides:
  - DB queries for express history
  - Available leagues list
  - Background loop kept for optional daily express pre-generation
"""
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import select, and_, desc

from app.core.database import async_session_maker
from app.models.express_bet import ExpressBet

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lazy imports
# ---------------------------------------------------------------------------

def _get_fonbet():
    from app.services.fonbet_api import get_football_events, TOP_LEAGUE_IDS
    return get_football_events, TOP_LEAGUE_IDS


AVAILABLE_LEAGUES = None


def get_available_leagues():
    """Get available league codes (lazy-loaded)."""
    global AVAILABLE_LEAGUES
    if AVAILABLE_LEAGUES is None:
        _, TOP_LEAGUE_IDS = _get_fonbet()
        AVAILABLE_LEAGUES = [info["code"] for info in TOP_LEAGUE_IDS.values()]
    return AVAILABLE_LEAGUES


# ---------------------------------------------------------------------------
# DB queries
# ---------------------------------------------------------------------------

async def get_today_daily_express() -> Optional[Dict]:
    """Get today's daily express (if any exists in DB)."""
    today = datetime.utcnow().strftime("%Y-%m-%d")

    try:
        async with async_session_maker() as db:
            result = await db.execute(
                select(ExpressBet).where(
                    and_(
                        ExpressBet.express_type.in_(["daily", "menu"]),
                        ExpressBet.created_at >= today,
                    )
                ).order_by(desc(ExpressBet.created_at)).limit(1)
            )
            express = result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"Failed to query daily express: {e}")
        return None

    if not express:
        return None

    return _express_to_dict(express)


async def get_user_expresses(user_id: int, limit: int = 10) -> List[Dict]:
    """Get user's express history."""
    try:
        async with async_session_maker() as db:
            result = await db.execute(
                select(ExpressBet).where(
                    ExpressBet.user_id == user_id,
                ).order_by(desc(ExpressBet.created_at)).limit(limit)
            )
            expresses = result.scalars().all()
    except Exception as e:
        logger.error(f"Failed to query express history: {e}")
        return []

    return [_express_to_dict(e) for e in expresses]


def _express_to_dict(e: ExpressBet) -> Dict:
    """Convert ExpressBet model to API dict."""
    legs = json.loads(e.legs_json) if e.legs_json else []

    return {
        "id": e.id,
        "type": e.express_type,
        "legs": legs,
        "total_odds": e.total_odds,
        "leg_count": e.leg_count,
        "avg_confidence": e.avg_confidence,
        "status": e.status,
        "correct_legs": e.correct_legs,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


# ---------------------------------------------------------------------------
# Background worker (optional — kept for backward compat)
# ---------------------------------------------------------------------------

async def express_generation_loop():
    """
    Background task — kept as a no-op placeholder.
    Express is now generated client-side using Value Finder logic.
    """
    import asyncio

    logger.info("Express generation loop started (frontend-driven mode — no server generation)")

    # Just keep alive, do nothing
    while True:
        await asyncio.sleep(3600)
