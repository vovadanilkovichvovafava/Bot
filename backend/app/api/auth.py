from fastapi import APIRouter, HTTPException, status, Depends, Response, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.database import get_db
from app.models.user import User
from app.config import settings

router = APIRouter()

# Cookie settings
COOKIE_SECURE = True  # Set to False for local development without HTTPS
COOKIE_HTTPONLY = True
COOKIE_SAMESITE = "lax"
COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """Set httpOnly cookies for JWT tokens"""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=COOKIE_MAX_AGE,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=COOKIE_MAX_AGE * 4,  # Refresh token lasts longer
        path="/",
    )


@router.post("/register", response_model=TokenResponse)
async def register(user: UserRegister, response: Response, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # Create new user
    new_user = User(
        email=user.email,
        username=user.username or user.email.split("@")[0],
        password_hash=get_password_hash(user.password),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    access_token = create_access_token({"sub": user.email, "user_id": new_user.id})
    refresh_token = create_access_token({"sub": user.email, "user_id": new_user.id, "refresh": True})

    # Set httpOnly cookies
    set_auth_cookies(response, access_token, refresh_token)

    # Also return in body for backwards compatibility
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/login", response_model=TokenResponse)
async def login(user: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    # Find user
    result = await db.execute(select(User).where(User.email == user.email))
    db_user = result.scalar_one_or_none()

    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    access_token = create_access_token({"sub": user.email, "user_id": db_user.id})
    refresh_token = create_access_token({"sub": user.email, "user_id": db_user.id, "refresh": True})

    # Set httpOnly cookies
    set_auth_cookies(response, access_token, refresh_token)

    # Also return in body for backwards compatibility
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookies"""
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Logged out successfully"}
