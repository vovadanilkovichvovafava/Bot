"""
Express Bet API — daily and custom accumulator endpoints.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.user import User
from app.services.express_generator import (
    generate_daily_express,
    generate_custom_express,
    get_today_daily_express,
    get_user_expresses,
    AVAILABLE_LEAGUES,
)

logger = logging.getLogger(__name__)
router = APIRouter()


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
    express = await get_today_daily_express()

    if not express:
        # Try to generate on-demand if not exists yet
        express = await generate_daily_express()

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
    # Check PRO status
    is_premium = user.is_premium or (user.funnel == "funnel-2")
    if not is_premium:
        raise HTTPException(status_code=403, detail="PRO subscription required")

    # Validate leagues
    valid_leagues = [code for code in req.leagues if code in AVAILABLE_LEAGUES]
    if not valid_leagues and req.leagues:
        raise HTTPException(status_code=400, detail=f"Invalid league codes. Available: {AVAILABLE_LEAGUES}")

    # Use all leagues if none specified
    leagues = valid_leagues if valid_leagues else AVAILABLE_LEAGUES

    express = await generate_custom_express(
        user_id=user.id,
        league_codes=leagues,
        leg_count=req.leg_count,
        target_avg_odds=req.target_avg_odds,
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
    return await get_user_expresses(user.id, limit=limit)


@router.get("/leagues")
async def available_leagues(user: User = Depends(get_current_user)):
    """Get available leagues for custom express."""
    from app.services.fonbet_api import TOP_LEAGUE_IDS
    return {
        "leagues": [
            {"code": info["code"], "name": info["name"], "league_id": info["league_id"]}
            for info in TOP_LEAGUE_IDS.values()
        ]
    }
