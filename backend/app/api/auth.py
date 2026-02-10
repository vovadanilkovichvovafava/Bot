from fastapi import APIRouter, HTTPException, status, Depends, Response, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.database import get_db
from app.core.email import generate_verification_code, get_verification_expiry, send_verification_email
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


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


class ResendCodeRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    message: str
    email: str
    requires_verification: bool = True


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


@router.post("/register", response_model=RegisterResponse)
async def register(user: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        if existing_user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )
        else:
            # User exists but not verified - update password and resend code
            verification_code = generate_verification_code()
            existing_user.password_hash = get_password_hash(user.password)
            existing_user.verification_code = verification_code
            existing_user.verification_code_expires = get_verification_expiry()
            await db.commit()
            await send_verification_email(user.email, verification_code)
            return RegisterResponse(
                message="Verification code sent to your email",
                email=user.email,
                requires_verification=True
            )

    # Generate verification code
    verification_code = generate_verification_code()

    # Create new user (unverified)
    new_user = User(
        email=user.email,
        username=user.username or user.email.split("@")[0],
        password_hash=get_password_hash(user.password),
        email_verified=False,
        verification_code=verification_code,
        verification_code_expires=get_verification_expiry(),
    )
    db.add(new_user)
    await db.commit()

    # Send verification email
    await send_verification_email(user.email, verification_code)

    return RegisterResponse(
        message="Verification code sent to your email",
        email=user.email,
        requires_verification=True
    )


@router.post("/verify-email", response_model=TokenResponse)
async def verify_email(data: VerifyEmailRequest, response: Response, db: AsyncSession = Depends(get_db)):
    # Find user
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )

    # Check code
    if user.verification_code != data.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )

    # Check expiry
    if user.verification_code_expires and user.verification_code_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired. Please request a new one."
        )

    # Verify user
    user.email_verified = True
    user.verification_code = None
    user.verification_code_expires = None
    await db.commit()

    # Generate tokens
    access_token = create_access_token({"sub": user.email, "user_id": user.id})
    refresh_token = create_access_token({"sub": user.email, "user_id": user.id, "refresh": True})

    # Set cookies
    set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/resend-code")
async def resend_verification_code(data: ResendCodeRequest, db: AsyncSession = Depends(get_db)):
    # Find user
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a new code has been sent"}

    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )

    # Generate new code
    verification_code = generate_verification_code()
    user.verification_code = verification_code
    user.verification_code_expires = get_verification_expiry()
    await db.commit()

    # Send email
    await send_verification_email(data.email, verification_code)

    return {"message": "Verification code sent"}


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

    # Check if email is verified
    if not db_user.email_verified:
        # Send new verification code
        verification_code = generate_verification_code()
        db_user.verification_code = verification_code
        db_user.verification_code_expires = get_verification_expiry()
        await db.commit()
        await send_verification_email(user.email, verification_code)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. A new verification code has been sent."
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
