"""
Express Bet API — lightweight endpoints.

Express generation is now frontend-driven (reuses Value Finder logic).
Backend only provides:
  - /history — user's saved express history
  - /leagues — available leagues list
  - /daily — backward compat (returns latest menu express if any)
"""
import logging

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_generator():
    from app.services.express_generator import (
        get_today_daily_express,
        get_user_expresses,
        get_available_leagues,
    )
    return {
        "get_today": get_today_daily_express,
        "get_user": get_user_expresses,
        "get_leagues": get_available_leagues,
    }


@router.get("/daily")
async def daily_express(
    current_user: dict = Depends(get_current_user),
):
    """Get today's daily express (backward compat)."""
    try:
        gen = _get_generator()
        express = await gen["get_today"]()
    except Exception as e:
        logger.error(f"Daily express failed: {e}")
        express = None

    if not express:
        raise HTTPException(
            status_code=404,
            detail="No daily express available. Express is now generated client-side — check the Express page.",
        )
    return express


@router.get("/history")
async def express_history(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
):
    """Get user's express bet history."""
    user_id = current_user.get("user_id")
    try:
        gen = _get_generator()
        return await gen["get_user"](user_id, limit=limit)
    except Exception as e:
        logger.error(f"Express history failed: {e}")
        return []


@router.get("/leagues")
async def available_leagues(
    current_user: dict = Depends(get_current_user),
):
    """Get available leagues."""
    try:
        from app.services.fonbet_api import TOP_LEAGUE_IDS
        return {
            "leagues": [
                {"code": info["code"], "name": info["name"], "league_id": info["league_id"]}
                for info in TOP_LEAGUE_IDS.values()
            ]
        }
    except Exception as e:
        logger.error(f"Leagues endpoint failed: {e}")
        return {"leagues": []}
