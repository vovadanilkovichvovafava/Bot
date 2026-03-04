"""
Express Bet API — daily and custom accumulator endpoints.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Lazy imports — avoid crashing the whole app if express_generator has issues
# ---------------------------------------------------------------------------

def _get_generator():
    """Import express_generator lazily so import errors don't block the app."""
    from app.services.express_generator import (
        generate_daily_express,
        generate_custom_express,
        get_today_daily_express,
        get_user_expresses,
        get_available_leagues,
    )
    return {
        "generate_daily": generate_daily_express,
        "generate_custom": generate_custom_express,
        "get_today": get_today_daily_express,
        "get_user": get_user_expresses,
        "get_leagues": get_available_leagues,
    }


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CustomExpressRequest(BaseModel):
    leagues: List[str] = Field(default_factory=list, description="League codes (e.g. ['SA', 'PL'])")
    leg_count: int = Field(default=5, ge=2, le=10, description="Number of legs")
    target_avg_odds: float = Field(default=1.8, ge=1.2, le=5.0, description="Target average odds per leg")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/daily")
async def daily_express(user: User = Depends(get_current_user)):
    """Get today's daily express bet (auto-generated at 15:00 London)."""
    try:
        gen = _get_generator()
    except Exception as e:
        logger.error(f"Express generator import failed: {e}")
        raise HTTPException(status_code=503, detail="Express service temporarily unavailable")

    try:
        express = await gen["get_today"]()
    except Exception as e:
        logger.error(f"Failed to fetch daily express: {e}")
        express = None

    if not express:
        try:
            express = await gen["generate_daily"]()
        except Exception as e:
            logger.error(f"Failed to generate daily express on-demand: {e}")
            raise HTTPException(
                status_code=404,
                detail="No daily express available yet. Matches may not be scheduled for today.",
            )

    if not express:
        raise HTTPException(
            status_code=404,
            detail="No daily express available yet. Matches may not be scheduled for today.",
        )

    return express


@router.post("/custom")
async def custom_express(
    req: CustomExpressRequest,
    user: User = Depends(get_current_user),
):
    """Generate a custom express bet (PRO only)."""
    import traceback

    # Check PRO status
    is_premium = user.is_premium or (user.funnel == "funnel-2")
    if not is_premium:
        raise HTTPException(status_code=403, detail="PRO subscription required")

    try:
        gen = _get_generator()
    except Exception as e:
        logger.error(f"Express generator import failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=503, detail="Express service temporarily unavailable")

    try:
        available = gen["get_leagues"]()
    except Exception as e:
        logger.error(f"get_leagues() failed: {e}\n{traceback.format_exc()}")
        # Fallback: use requested leagues as-is
        available = req.leagues if req.leagues else []

    logger.info(f"Custom express request: leagues={req.leagues}, leg_count={req.leg_count}, "
                f"target_odds={req.target_avg_odds}, available={available}, user_id={user.id}")

    # Validate leagues
    if available:
        valid_leagues = [code for code in req.leagues if code in available]
    else:
        valid_leagues = req.leagues

    if not valid_leagues and req.leagues:
        raise HTTPException(status_code=400, detail=f"Invalid league codes. Available: {available}")

    # Use all leagues if none specified
    leagues = valid_leagues if valid_leagues else available

    try:
        express = await gen["generate_custom"](
            user_id=user.id,
            league_codes=leagues,
            leg_count=req.leg_count,
            target_avg_odds=req.target_avg_odds,
        )
    except Exception as e:
        logger.error(f"Custom express generation failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate express: {type(e).__name__}: {str(e)[:200]}",
        )

    if not express:
        raise HTTPException(
            status_code=404,
            detail="Not enough matches found for your criteria. Try different leagues or lower odds.",
        )

    return express


@router.get("/history")
async def express_history(
    limit: int = 10,
    user: User = Depends(get_current_user),
):
    """Get user's express bet history."""
    try:
        gen = _get_generator()
        return await gen["get_user"](user.id, limit=limit)
    except Exception as e:
        logger.error(f"Express history failed: {e}")
        return []


@router.get("/leagues")
async def available_leagues(user: User = Depends(get_current_user)):
    """Get available leagues for custom express."""
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
