"""Predictions endpoints"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user import User
from app.models.prediction import Prediction
from app.config import settings

router = APIRouter()


class PredictionResponse(BaseModel):
    id: int
    match_id: int
    home_team: str
    away_team: str
    competition: str
    match_date: datetime | None
    bet_type: str
    confidence: float
    odds: float | None
    analysis: str | None
    alt_bet_type: str | None
    alt_confidence: float | None
    result: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class RecommendationResponse(BaseModel):
    match_id: int
    home_team: str
    away_team: str
    competition: str
    match_date: datetime
    bet_type: str
    confidence: float
    odds: float | None
    short_reason: str


@router.get("/recommend", response_model=List[RecommendationResponse])
async def get_recommendations(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get recommended bets for today"""
    # TODO: Implement recommendation logic using MatchAnalyzer
    # For now, return empty list
    return []


@router.get("/sure", response_model=List[RecommendationResponse])
async def get_sure_bets(
    min_confidence: float = 75.0,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get high-confidence bets (75%+)"""
    # TODO: Implement sure bets logic
    return []


@router.post("/{match_id}", response_model=PredictionResponse)
async def create_prediction(
    match_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get prediction for a specific match"""
    # Check user limits
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Reset daily counter if new day
    if user.last_request_date != today:
        user.daily_requests = 0
        user.last_request_date = today

    # Check limits (skip for premium users)
    if not user.has_premium and user.bonus_predictions <= 0:
        if user.daily_requests >= settings.FREE_DAILY_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=f"Daily limit reached ({settings.FREE_DAILY_LIMIT} predictions). Upgrade to premium for unlimited access."
            )

    # Check if prediction already exists
    existing = await db.execute(
        select(Prediction)
        .where(Prediction.user_id == user_id)
        .where(Prediction.match_id == match_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Prediction already exists for this match")

    # TODO: Get analysis from MatchAnalyzer
    from app.services.match_analyzer import MatchAnalyzer
    analyzer = MatchAnalyzer()
    analysis = await analyzer.analyze_match(match_id)

    if not analysis:
        raise HTTPException(status_code=500, detail="Could not analyze match")

    # Create prediction
    prediction = Prediction(
        user_id=user_id,
        match_id=match_id,
        home_team=analysis.get("home_team", ""),
        away_team=analysis.get("away_team", ""),
        competition=analysis.get("competition", ""),
        match_date=analysis.get("match_date"),
        bet_type=analysis.get("bet_type", ""),
        confidence=analysis.get("confidence", 0),
        odds=analysis.get("odds"),
        analysis=analysis.get("analysis", ""),
        ai_reasoning=analysis.get("reasoning", ""),
        alt_bet_type=analysis.get("alt_bet_type"),
        alt_confidence=analysis.get("alt_confidence"),
        kelly_stake=analysis.get("kelly_stake"),
        expected_value=analysis.get("expected_value"),
    )
    db.add(prediction)

    # Update user counters
    if user.bonus_predictions > 0:
        user.bonus_predictions -= 1
    else:
        user.daily_requests += 1

    user.total_predictions += 1
    user.last_active = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(prediction)

    return PredictionResponse(
        id=prediction.id,
        match_id=prediction.match_id,
        home_team=prediction.home_team,
        away_team=prediction.away_team,
        competition=prediction.competition,
        match_date=prediction.match_date,
        bet_type=prediction.bet_type,
        confidence=prediction.confidence,
        odds=prediction.odds,
        analysis=prediction.analysis,
        alt_bet_type=prediction.alt_bet_type,
        alt_confidence=prediction.alt_confidence,
        result=prediction.result,
        created_at=prediction.created_at,
    )


@router.get("/history", response_model=List[PredictionResponse])
async def get_prediction_history(
    limit: int = 50,
    offset: int = 0,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get user's prediction history"""
    result = await db.execute(
        select(Prediction)
        .where(Prediction.user_id == user_id)
        .order_by(Prediction.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    predictions = result.scalars().all()

    return [
        PredictionResponse(
            id=p.id,
            match_id=p.match_id,
            home_team=p.home_team,
            away_team=p.away_team,
            competition=p.competition,
            match_date=p.match_date,
            bet_type=p.bet_type,
            confidence=p.confidence,
            odds=p.odds,
            analysis=p.analysis,
            alt_bet_type=p.alt_bet_type,
            alt_confidence=p.alt_confidence,
            result=p.result,
            created_at=p.created_at,
        )
        for p in predictions
    ]
