"""
Express Bet API — lightweight endpoints.

Express generation is now frontend-driven (reuses Value Finder logic).
Backend provides:
  - /spend-tokens — funnel-3 token deduction (costs 3 daily requests)
  - /history — user's saved express history
  - /leagues — available leagues list
  - /daily — backward compat
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

EXPRESS_TOKEN_COST = 3  # funnel-3 pays 3 daily requests


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


@router.post("/spend-tokens")
async def spend_tokens(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Spend tokens for Express access (funnel-3 only).
    Costs 3 daily chat requests.
    PRO and funnel-2 users skip this (free).
    """
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # PRO and funnel-2 don't need tokens
    if user.is_premium or user.funnel == "funnel-2":
        return {"ok": True, "cost": 0, "remaining": 999}

    # Funnel-3: check and spend 3 tokens
    if user.funnel == "funnel-3":
        from app.api.predictions import get_daily_limit
        from datetime import datetime

        # Reset daily counter if new day
        today = datetime.utcnow().date()
        if user.last_chat_request_date and user.last_chat_request_date.date() < today:
            user.daily_chat_requests = 0

        limit = get_daily_limit(user.account_day_number or 1, user.funnel)
        used = user.daily_chat_requests or 0
        remaining = max(0, limit - used)

        if remaining < EXPRESS_TOKEN_COST:
            raise HTTPException(
                status_code=402,
                detail=f"Not enough tokens. Need {EXPRESS_TOKEN_COST}, have {remaining}.",
            )

        user.daily_chat_requests = used + EXPRESS_TOKEN_COST
        user.last_chat_request_date = datetime.utcnow()
        await db.commit()

        return {
            "ok": True,
            "cost": EXPRESS_TOKEN_COST,
            "remaining": max(0, limit - user.daily_chat_requests),
        }

    # Funnel-1: free (access controlled on frontend via weekly localStorage)
    return {"ok": True, "cost": 0}


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
