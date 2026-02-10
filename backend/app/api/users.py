from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.user import User

# Internal secret for server-to-server calls
INTERNAL_SECRET = os.getenv("POSTBACK_SECRET", "your_postback_secret_key")

router = APIRouter()


class UserResponse(BaseModel):
    id: int
    email: str
    username: Optional[str]
    language: str = "en"
    timezone: str = "UTC"
    is_premium: bool = False
    premium_until: Optional[datetime] = None
    daily_requests: int = 0
    daily_limit: int = 10
    bonus_predictions: int = 3
    min_odds: float = 1.5
    max_odds: float = 3.0
    risk_level: str = "medium"
    total_predictions: int = 0
    correct_predictions: int = 0
    accuracy: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    username: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    min_odds: Optional[float] = None
    max_odds: Optional[float] = None
    risk_level: Optional[str] = None


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

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
        is_premium=user.is_premium,
        premium_until=user.premium_until,
        daily_requests=user.daily_requests,
        daily_limit=user.daily_limit,
        bonus_predictions=user.bonus_predictions,
        min_odds=user.min_odds,
        max_odds=user.max_odds,
        risk_level=user.risk_level,
        total_predictions=user.total_predictions,
        correct_predictions=user.correct_predictions,
        accuracy=user.accuracy,
        created_at=user.created_at
    )


@router.patch("/me")
async def update_user(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.get("user_id")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update only provided fields
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    return {"message": "User updated successfully"}


class PremiumActivation(BaseModel):
    premium: bool
    source: str
    depositAmount: Optional[str] = None
    currency: Optional[str] = None
    expiresAt: Optional[str] = None


@router.post("/{user_id}/premium")
async def activate_premium(
    user_id: int,
    activation: PremiumActivation,
    x_internal_secret: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """Activate premium for user (internal endpoint for postback server)"""

    # Verify internal secret
    if x_internal_secret != INTERNAL_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal secret"
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Activate premium
    user.is_premium = activation.premium

    if activation.expiresAt:
        user.premium_until = datetime.fromisoformat(activation.expiresAt.replace('Z', '+00:00'))
    else:
        # Default 15 days
        user.premium_until = datetime.utcnow() + timedelta(days=15)

    await db.commit()

    return {
        "success": True,
        "user_id": user_id,
        "is_premium": user.is_premium,
        "premium_until": user.premium_until.isoformat() if user.premium_until else None,
        "source": activation.source
    }
