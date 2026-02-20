"""Predictions endpoints - real AI analysis via Claude + degressive limits"""
import json
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel
from typing import List, Optional, Union
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.prediction import Prediction
from app.models.user import User
from app.services.match_analyzer import MatchAnalyzer
from app.services.prediction_verifier import get_accuracy_stats, get_learning_context

logger = logging.getLogger(__name__)
router = APIRouter()

BET_NAMES = {
    "П1": "Home Win", "П2": "Away Win", "Х": "Draw",
    "ТБ2.5": "Over 2.5", "ТМ2.5": "Under 2.5", "BTTS": "Both Teams Score",
    "1X": "Home or Draw", "X2": "Away or Draw",
}

# Degressive limits: day_number -> max_requests
DEGRESSIVE_LIMITS = {
    1: 3,  # First day of usage: 3 free requests
    2: 2,  # Second day: 2 free requests
    3: 1,  # Third day+: 1 free request per day
}


def get_daily_limit(day_number: int) -> int:
    """Get the daily limit based on which day of usage this is."""
    if day_number <= 0:
        day_number = 1
    if day_number in DEGRESSIVE_LIMITS:
        return DEGRESSIVE_LIMITS[day_number]
    return DEGRESSIVE_LIMITS[3]  # Day 3+ = 1 request/day


async def check_and_update_limits(user_id: int, db: AsyncSession) -> dict:
    """
    Check user's AI chat limits and update day tracking.
    Returns: {remaining, limit, day_number, resets_at, is_premium}
    """
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"DB error in check_and_update_limits (select): {e}")
        await db.rollback()
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Premium users have unlimited access
    if user.is_premium:
        return {
            "remaining": 999,
            "limit": 999,
            "day_number": 0,
            "resets_at": None,
            "is_premium": True,
        }

    now = datetime.utcnow()
    today = now.date()

    # Check if it's a new day since last request
    if user.last_chat_request_date is None:
        # First ever request — day 1
        user.account_day_number = 1
        user.daily_chat_requests = 0
        user.last_chat_request_date = now
    elif user.last_chat_request_date.date() < today:
        # New day! Advance day_number and reset counter
        user.account_day_number = (user.account_day_number or 1) + 1
        user.daily_chat_requests = 0
        user.last_chat_request_date = now

    day_number = user.account_day_number or 1
    limit = get_daily_limit(day_number)
    used = user.daily_chat_requests or 0

    # Add bonus from referrals
    bonus = user.referral_bonus_requests or 0
    total_limit = limit + bonus

    remaining = max(0, total_limit - used)

    # Calculate when the limit resets (next midnight UTC)
    tomorrow = datetime.combine(today + timedelta(days=1), datetime.min.time())

    try:
        await db.commit()
    except Exception as e:
        logger.error(f"DB error in check_and_update_limits (commit): {e}")
        await db.rollback()

    return {
        "remaining": remaining,
        "limit": total_limit,
        "base_limit": limit,
        "bonus": bonus,
        "day_number": day_number,
        "used": used,
        "resets_at": tomorrow.isoformat() + "Z",
        "is_premium": False,
    }


async def increment_chat_usage(user_id: int, db: AsyncSession):
    """Increment the user's daily chat request counter after successful response."""
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return

        now = datetime.utcnow()
        today = now.date()

        # Safety: if somehow date changed between check and increment
        if user.last_chat_request_date and user.last_chat_request_date.date() < today:
            user.account_day_number = (user.account_day_number or 1) + 1
            user.daily_chat_requests = 1
        else:
            user.daily_chat_requests = (user.daily_chat_requests or 0) + 1

        user.last_chat_request_date = now
        await db.commit()

        logger.info(
            f"User {user_id} chat usage: {user.daily_chat_requests} requests, "
            f"day {user.account_day_number}"
        )
    except Exception as e:
        logger.error(f"DB error in increment_chat_usage: {e}")
        await db.rollback()


# === Response models ===

class PredictionResponse(BaseModel):
    id: int
    match_id: int
    home_team: str
    away_team: str
    league: str
    bet_type: str
    bet_name: str
    confidence: float
    odds: Optional[float] = None
    reasoning: str
    analysis: Optional[str] = None
    alt_bet_type: Optional[str] = None
    alt_confidence: Optional[float] = None
    created_at: datetime


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    match_context: Optional[str] = None
    history: Optional[List[ChatMessage]] = None
    locale: Optional[str] = "en"


class ChatResponse(BaseModel):
    response: str
    remaining: Optional[int] = None
    limit: Optional[int] = None
    day_number: Optional[int] = None
    resets_at: Optional[str] = None


class ChatLimitResponse(BaseModel):
    remaining: int
    limit: int
    base_limit: int
    bonus: int
    day_number: int
    used: int
    resets_at: Optional[str] = None
    is_premium: bool


# === Endpoints ===

@router.get("/chat/limit", response_model=ChatLimitResponse)
async def get_chat_limit(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's AI chat limit info (degressive system)."""
    limits = await check_and_update_limits(current_user["user_id"], db)
    return ChatLimitResponse(**limits)


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    req: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI chat for football questions and analysis — with degressive limits."""
    user_id = current_user["user_id"]

    # Check limits BEFORE calling Claude (saves API costs)
    limits = await check_and_update_limits(user_id, db)
    if not limits["is_premium"] and limits["remaining"] <= 0:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "daily_limit_reached",
                "message": "You've used all your free AI requests for today",
                "remaining": 0,
                "limit": limits["limit"],
                "day_number": limits["day_number"],
                "resets_at": limits["resets_at"],
            }
        )

    # Enrich prompt with historical accuracy data (ML learning feedback)
    learning_ctx = ""
    try:
        learning_ctx = await get_learning_context(db)
    except Exception:
        pass  # Don't block AI if stats fail

    enriched_message = req.message
    if learning_ctx:
        enriched_message = req.message + learning_ctx

    # Call Claude AI
    analyzer = MatchAnalyzer()
    history = [{"role": m.role, "content": m.content} for m in (req.history or [])]
    locale = (req.locale or "en").lower()[:2]
    response = await analyzer.ai_chat(enriched_message, req.match_context or "", history, locale)

    # Increment counter AFTER successful response
    await increment_chat_usage(user_id, db)

    # Get updated limits to return to frontend
    updated_limits = await check_and_update_limits(user_id, db)

    return ChatResponse(
        response=response,
        remaining=updated_limits["remaining"],
        limit=updated_limits["limit"],
        day_number=updated_limits["day_number"],
        resets_at=updated_limits.get("resets_at"),
    )


class SavePredictionRequest(BaseModel):
    match_id: Union[int, str]
    home_team: str
    away_team: str
    league: Optional[str] = None
    match_date: Optional[datetime] = None
    bet_type: Optional[str] = None
    predicted_odds: Optional[float] = None
    confidence: Optional[float] = None
    ai_analysis: Optional[str] = None
    api_prediction: Optional[dict] = None


class SavedPredictionResponse(BaseModel):
    id: int
    match_id: str
    home_team: str
    away_team: str
    league: Optional[str] = None
    match_date: Optional[datetime] = None
    bet_type: Optional[str] = None
    predicted_odds: Optional[float] = None
    confidence: Optional[float] = None
    ai_analysis: Optional[str] = None
    is_correct: Optional[bool] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/save", response_model=SavedPredictionResponse)
async def save_prediction(
    req: SavePredictionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a prediction to the database"""
    # Strip timezone info — DB uses TIMESTAMP WITHOUT TIME ZONE
    match_date = req.match_date
    if match_date and match_date.tzinfo is not None:
        match_date = match_date.replace(tzinfo=None)

    prediction = Prediction(
        user_id=current_user["user_id"],
        match_id=str(req.match_id),
        home_team=req.home_team,
        away_team=req.away_team,
        league=req.league,
        match_date=match_date,
        bet_type=req.bet_type or "",
        predicted_odds=req.predicted_odds,
        confidence=req.confidence or 0.0,
        ai_analysis=req.ai_analysis,
        api_prediction=json.dumps(req.api_prediction) if req.api_prediction else None,
    )
    db.add(prediction)
    try:
        await db.commit()
        await db.refresh(prediction)
    except Exception as e:
        logger.error(f"DB error saving prediction: {e}")
        await db.rollback()
        raise HTTPException(status_code=503, detail="Database error saving prediction")
    return prediction


@router.get("/saved", response_model=List[SavedPredictionResponse])
async def get_saved_predictions(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's saved predictions from database"""
    result = await db.execute(
        select(Prediction)
        .where(Prediction.user_id == current_user["user_id"])
        .order_by(desc(Prediction.created_at))
        .offset(offset)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/stats")
async def get_prediction_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get real prediction accuracy stats from verified predictions."""
    user_stats = await get_accuracy_stats(db, user_id=current_user["user_id"])
    global_stats = await get_accuracy_stats(db)
    return {
        "user": user_stats,
        "global": global_stats,
    }


@router.get("/learning-context")
async def get_ml_learning_context(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get historical accuracy context for AI prompt enrichment."""
    context = await get_learning_context(db)
    return {"context": context}


@router.get("/history", response_model=List[PredictionResponse])
async def get_prediction_history(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
):
    """Get prediction history (legacy endpoint - use /saved instead)"""
    return []


@router.post("/{match_id:int}", response_model=PredictionResponse)
async def create_prediction(
    match_id: int = Path(..., gt=0, description="Match ID must be a positive integer"),
    current_user: dict = Depends(get_current_user)
):
    """Get AI prediction for a specific match"""
    analyzer = MatchAnalyzer()
    result = await analyzer.analyze_match(match_id)

    if not result:
        raise HTTPException(status_code=404, detail="Could not analyze match. Match not found or API unavailable.")

    bet_type = result.get("bet_type", "1X")

    return PredictionResponse(
        id=match_id,
        match_id=match_id,
        home_team=result.get("home_team", ""),
        away_team=result.get("away_team", ""),
        league=result.get("competition", ""),
        bet_type=bet_type,
        bet_name=BET_NAMES.get(bet_type, bet_type),
        confidence=result.get("confidence", 60),
        odds=result.get("odds"),
        reasoning=result.get("reasoning", ""),
        analysis=result.get("analysis"),
        alt_bet_type=result.get("alt_bet_type"),
        alt_confidence=result.get("alt_confidence"),
        created_at=datetime.utcnow(),
    )
