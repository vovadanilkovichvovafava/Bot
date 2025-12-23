"""User endpoints"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user import User
from app.models.prediction import Prediction
from app.config import settings

router = APIRouter()


class UserResponse(BaseModel):
    id: int
    email: str
    username: str | None
    language: str
    timezone: str
    is_premium: bool
    premium_until: datetime | None
    daily_requests: int
    daily_limit: int
    bonus_predictions: int
    min_odds: float
    max_odds: float
    risk_level: str
    total_predictions: int
    correct_predictions: int
    accuracy: float
    created_at: datetime

    class Config:
        from_attributes = True


class UpdateUserRequest(BaseModel):
    language: str | None = None
    timezone: str | None = None
    min_odds: float | None = None
    max_odds: float | None = None
    risk_level: str | None = None


class UserStatsResponse(BaseModel):
    total_predictions: int
    correct_predictions: int
    accuracy: float
    streak: int
    best_streak: int
    predictions_today: int
    wins_today: int
    roi: float


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get current user profile"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        language=user.language,
        timezone=user.timezone,
        is_premium=user.has_premium,
        premium_until=user.premium_until,
        daily_requests=user.daily_requests,
        daily_limit=settings.FREE_DAILY_LIMIT,
        bonus_predictions=user.bonus_predictions,
        min_odds=user.min_odds,
        max_odds=user.max_odds,
        risk_level=user.risk_level,
        total_predictions=user.total_predictions,
        correct_predictions=user.correct_predictions,
        accuracy=user.accuracy,
        created_at=user.created_at,
    )


@router.patch("/me", response_model=UserResponse)
async def update_user(
    request: UpdateUserRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update user profile"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if request.language:
        user.language = request.language
    if request.timezone:
        user.timezone = request.timezone
    if request.min_odds:
        user.min_odds = request.min_odds
    if request.max_odds:
        user.max_odds = request.max_odds
    if request.risk_level:
        user.risk_level = request.risk_level

    user.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(user)

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        language=user.language,
        timezone=user.timezone,
        is_premium=user.has_premium,
        premium_until=user.premium_until,
        daily_requests=user.daily_requests,
        daily_limit=settings.FREE_DAILY_LIMIT,
        bonus_predictions=user.bonus_predictions,
        min_odds=user.min_odds,
        max_odds=user.max_odds,
        risk_level=user.risk_level,
        total_predictions=user.total_predictions,
        correct_predictions=user.correct_predictions,
        accuracy=user.accuracy,
        created_at=user.created_at,
    )


@router.get("/me/stats", response_model=UserStatsResponse)
async def get_user_stats(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get user statistics"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get today's predictions
    today = datetime.now(timezone.utc).date()
    today_result = await db.execute(
        select(func.count(Prediction.id))
        .where(Prediction.user_id == user_id)
        .where(func.date(Prediction.created_at) == today)
    )
    predictions_today = today_result.scalar() or 0

    wins_today_result = await db.execute(
        select(func.count(Prediction.id))
        .where(Prediction.user_id == user_id)
        .where(func.date(Prediction.created_at) == today)
        .where(Prediction.result == "win")
    )
    wins_today = wins_today_result.scalar() or 0

    # TODO: Calculate streak and ROI from predictions
    streak = 0
    best_streak = 0
    roi = 0.0

    return UserStatsResponse(
        total_predictions=user.total_predictions,
        correct_predictions=user.correct_predictions,
        accuracy=user.accuracy,
        streak=streak,
        best_streak=best_streak,
        predictions_today=predictions_today,
        wins_today=wins_today,
        roi=roi,
    )
