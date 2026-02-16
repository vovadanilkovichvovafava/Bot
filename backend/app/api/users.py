from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
import json

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.user import User

# Internal secret for server-to-server calls
# Falls back to default for development, but should be set in production
INTERNAL_SECRET = os.getenv("POSTBACK_SECRET") or "your_postback_secret_key"

router = APIRouter()


class UserResponse(BaseModel):
    id: str  # Now returns public_id instead of internal id
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
        id=user.public_id,  # Return public_id as 'id' for frontend compatibility
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


class PredictionsSync(BaseModel):
    predictions: List[dict]


@router.get("/me/predictions")
async def get_predictions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get saved predictions for the current user"""
    user_id = current_user.get("user_id")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    predictions = []
    if user.predictions_data:
        try:
            predictions = json.loads(user.predictions_data)
        except (json.JSONDecodeError, TypeError):
            predictions = []

    return {"predictions": predictions}


@router.put("/me/predictions")
async def save_predictions(
    body: PredictionsSync,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Save/sync predictions for the current user"""
    user_id = current_user.get("user_id")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Keep max 100 predictions
    predictions = body.predictions[:100]

    user.predictions_data = json.dumps(predictions, ensure_ascii=False)

    # Update stats counters
    verified = [p for p in predictions if p.get("result")]
    correct = [p for p in verified if p.get("result", {}).get("isCorrect")]
    user.total_predictions = len(predictions)
    user.correct_predictions = len(correct)

    await db.commit()

    return {"synced": len(predictions)}


class PremiumActivation(BaseModel):
    premium: bool
    source: str
    depositAmount: Optional[str] = None
    currency: Optional[str] = None
    expiresAt: Optional[str] = None


@router.post("/{user_id}/premium")
async def activate_premium(
    user_id: str,  # Now accepts public_id (string like usr_xxxx)
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

    # Search by public_id (new format: usr_xxxx) or fall back to integer id for backwards compatibility
    if user_id.startswith("usr_"):
        result = await db.execute(select(User).where(User.public_id == user_id))
    else:
        # Backwards compatibility: try to parse as integer id
        try:
            int_id = int(user_id)
            result = await db.execute(select(User).where(User.id == int_id))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user_id format"
            )

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
        "user_id": user.public_id,  # Return public_id
        "is_premium": user.is_premium,
        "premium_until": user.premium_until.isoformat() if user.premium_until else None,
        "source": activation.source
    }


# === Referral System ===

class ReferralStatsResponse(BaseModel):
    code: str
    total_referrals: int
    active_referrals: int
    bonus_requests: int


@router.get("/me/referral", response_model=ReferralStatsResponse)
async def get_referral_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's referral code and stats"""
    user_id = current_user.get("user_id")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Generate referral code if user doesn't have one
    if not user.referral_code:
        user.referral_code = f"PVA{user.id:04X}{int(user.created_at.timestamp()) % 10000:04X}"
        await db.commit()
        await db.refresh(user)

    # Count referrals
    referrals_result = await db.execute(
        select(User).where(User.referred_by_id == user.id)
    )
    referrals = referrals_result.scalars().all()

    total_referrals = len(referrals)
    active_referrals = sum(1 for r in referrals if r.total_predictions > 0)

    return ReferralStatsResponse(
        code=user.referral_code,
        total_referrals=total_referrals,
        active_referrals=active_referrals,
        bonus_requests=user.referral_bonus_requests
    )
