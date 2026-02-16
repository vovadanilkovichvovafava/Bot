import re
from fastapi import APIRouter, HTTPException, status, Depends, Response, Request
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.database import get_db
from app.models.user import User

router = APIRouter()


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password meets security requirements"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"
    return True, "Password is strong"

# Cookie settings
COOKIE_SECURE = True  # Set to False for local development without HTTPS
COOKIE_HTTPONLY = True
COOKIE_SAMESITE = "lax"
COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


def get_client_ip(request: Request) -> str:
    """Get client IP from request, considering proxies"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    phone: Optional[str] = None
    username: Optional[str] = None
    referral_code: Optional[str] = None  # Code of the user who referred them

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v):
        if v is None:
            return v
        # Keep only digits and leading +
        cleaned = v.strip()
        if cleaned.startswith("+"):
            cleaned = "+" + re.sub(r"[^\d]", "", cleaned[1:])
        else:
            cleaned = re.sub(r"[^\d]", "", cleaned)
        if cleaned and len(cleaned) < 7:
            raise ValueError("Phone number too short")
        return cleaned or None


class UserLogin(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v):
        if v is None:
            return v
        cleaned = v.strip()
        if cleaned.startswith("+"):
            cleaned = "+" + re.sub(r"[^\d]", "", cleaned[1:])
        else:
            cleaned = re.sub(r"[^\d]", "", cleaned)
        return cleaned or None


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


@router.get("/check-ip")
async def check_ip(request: Request, db: AsyncSession = Depends(get_db)):
    """Check if an account already exists for the client's IP address"""
    client_ip = get_client_ip(request)
    result = await db.execute(select(User).where(User.registration_ip == client_ip))
    exists = result.scalar_one_or_none() is not None
    return {"exists": exists}


@router.post("/register", response_model=TokenResponse)
async def register(
    user: UserRegister,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    # Validate password strength
    is_valid, message = validate_password_strength(user.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

    client_ip = get_client_ip(request)

    # Check if IP already registered (max 5 accounts per IP)
    from sqlalchemy import func
    ip_count = await db.execute(select(func.count()).where(User.registration_ip == client_ip))
    if ip_count.scalar() >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Registration limit reached"
        )

    # Check if email exists
    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # Check if phone exists (if provided)
    if user.phone:
        phone_result = await db.execute(select(User).where(User.phone == user.phone))
        if phone_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phone number already registered"
            )

    # Check if referral code is valid and get referrer
    referrer = None
    if user.referral_code:
        ref_result = await db.execute(
            select(User).where(User.referral_code == user.referral_code)
        )
        referrer = ref_result.scalar_one_or_none()

    # Create new user with IP
    new_user = User(
        email=user.email,
        phone=user.phone,
        username=user.username or user.email.split("@")[0],
        password_hash=get_password_hash(user.password),
        registration_ip=client_ip,
        referred_by_id=referrer.id if referrer else None,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Generate unique referral code for new user
    new_user.referral_code = f"PVA{new_user.id:04X}{int(new_user.created_at.timestamp()) % 10000:04X}"

    # Award referrer with bonus
    if referrer:
        referrer.referral_bonus_requests += 1  # +1 free AI request

        # Count total referrals for this referrer
        referral_count_result = await db.execute(
            select(User).where(User.referred_by_id == referrer.id)
        )
        total_referrals = len(referral_count_result.scalars().all())

        # Give PRO for 3 days when reaching 3 referrals
        if total_referrals >= 3 and not referrer.is_premium:
            from datetime import datetime, timedelta
            referrer.is_premium = True
            referrer.premium_until = datetime.utcnow() + timedelta(days=3)

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
    # Must provide either email or phone
    if not user.email and not user.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or phone number is required"
        )

    # Find user by email or phone
    if user.email:
        result = await db.execute(select(User).where(User.email == user.email))
    else:
        result = await db.execute(select(User).where(User.phone == user.phone))
    db_user = result.scalar_one_or_none()

    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    identifier = db_user.email
    access_token = create_access_token({"sub": identifier, "user_id": db_user.id})
    refresh_token = create_access_token({"sub": identifier, "user_id": db_user.id, "refresh": True})

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
