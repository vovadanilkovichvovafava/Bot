from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.core.security import get_current_user

router = APIRouter()


class UserResponse(BaseModel):
    id: int = 1
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


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        email=current_user.get("sub", "user@example.com"),
        username=current_user.get("sub", "user").split("@")[0],
        created_at=datetime.utcnow()
    )


@router.patch("/me")
async def update_user(current_user: dict = Depends(get_current_user)):
    return {"message": "User updated"}
