import os
import re
import random
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends, Response, Request
from pydantic import BaseModel, EmailStr, field_validator
import json
from typing import Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import get_password_hash, verify_password, create_access_token, verify_token
from app.core.phone_country import detect_country_from_phone
from app.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.fantasy import FantasyLedger

# Fantasy points granted to every new account so they can start staking predictions.
WELCOME_FANTASY_POINTS = 100

logger = logging.getLogger(__name__)

router = APIRouter()


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password meets minimum requirements"""
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    return True, "Password is valid"

# Cookie settings
COOKIE_SECURE = True  # Set to False for local development without HTTPS
COOKIE_HTTPONLY = True
COOKIE_SAMESITE = "lax"
COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


def get_client_ip(request: Request) -> str:
    """
    Real client IP for anti-abuse (per-IP registration cap).

    Behind Cloudflare, CF-Connecting-IP is authoritative — Cloudflare strips any
    client-supplied value, so it cannot be spoofed. We deliberately do NOT trust
    the leftmost X-Forwarded-For entry (attacker-controlled), which would let a
    farmer bypass the 5-accounts/IP limit by sending a fresh fake IP each time.
    """
    cf = request.headers.get("CF-Connecting-IP")
    if cf and cf.strip():
        return cf.strip()
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        # Use the LAST hop (added by the trusted proxy), not the spoofable first.
        parts = [p.strip() for p in xff.split(",") if p.strip()]
        if parts:
            return parts[-1]
    return request.client.host if request.client else "unknown"


VALID_FUNNELS = {"funnel-1", "funnel-2", "funnel-3", "funnel-4",
                 "funnel-5", "funnel-6", "funnel-7"}
# A/B engagement funnels — all clone funnel-1 monetization (backend gating
# special-cases 2/3/4 and defaults everything else to funnel-1), differing only
# in our engagement features: 5 = control, 6 = missed-win modal, 7 = wins slider.
#
# Call of 28.07: keep exactly two funnels live — funnel-1 (main, untouched) and
# funnel-6 (missed-win), which carries every experiment. funnel-5 (a duplicate of
# funnel-1) and funnel-7 (wins slider, barely any requests) are switched off for
# NEW signups but deliberately NOT deleted — Vlad asked to keep the option to
# bring the slider back. Existing users keep whatever funnel they were assigned.
EXPERIMENT_FUNNELS = ["funnel-6"]
# Retired variants — kept for history/stats, never assigned to new users again.
RETIRED_FUNNELS = ["funnel-2", "funnel-5", "funnel-7"]
# What a fresh lead can land in: the untouched baseline vs the experiment funnel.
LIVE_FUNNELS = ["funnel-1"] + EXPERIMENT_FUNNELS

# Geos launched WITHOUT an A/B split — everyone goes into the main funnel.
# Vlad on the 28.07 call about Brazil: "I don't want to test there yet, the
# branches would spread thin and burn more budget."
NO_AB_COUNTRIES = {"BR"}

# Every new lead gets full PRO for this many hours (12h immersion trial).
# Expiry is enforced in users.py (premium_until < now → is_premium=False).
PRO_TRIAL_HOURS = 12

# Anti-multi-accounting: max registrations allowed from one IP. Env-tunable —
# raise it if you serve carrier/CGNAT traffic where many users share an IP.
MAX_ACCOUNTS_PER_IP = int(os.getenv("MAX_ACCOUNTS_PER_IP", "1"))

# Geos where the per-IP cap is NOT applied. Brazilian mobile carriers run
# large-scale CGNAT — hundreds of real subscribers share one address, so the cap
# rejects genuine users rather than farmers. Device fingerprinting is the defence
# there instead. Other geos keep the cap unchanged.
NO_IP_LIMIT_COUNTRIES = {"BR"}


def normalize_funnel(raw) -> str:
    """Map an incoming utm_funnel value ('2', 'funnel-2', etc.) to a valid funnel."""
    if not raw:
        return "funnel-1"
    r = str(raw).strip().lower()
    if r in VALID_FUNNELS:
        return r
    if r in {"1", "2", "3", "4"}:
        return f"funnel-{r}"
    return "funnel-1"


class UserRegister(BaseModel):
    phone: str
    password: str
    email: Optional[EmailStr] = None  # Optional, for password recovery
    username: Optional[str] = None
    referral_code: Optional[str] = None
    source: Optional[str] = None  # Traffic source: "prescoreai_com", "sportscoreai_com", etc.
    utm_source: Optional[str] = None  # Рекламный источник: google, facebook, tiktok
    utm_campaign: Optional[str] = None  # Название рекламной кампании
    utm_funnel: Optional[str] = None  # Воронка: "1","2","3","4" или "funnel-1","funnel-2" etc.
    language: Optional[str] = None  # UI language the user registered in (e.g. "pt")
    device_fingerprint: Optional[str] = None  # Browser/device hash — anti multi-account
    # Всё, что пришло в рекламной ссылке: sub_id_1..15, external_id, fbclid, offer.
    # Кампании кладут кампанию и креатив именно сюда, а не в utm_*.
    click_params: Optional[Dict[str, str]] = None

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v):
        cleaned = v.strip()
        if cleaned.startswith("+"):
            cleaned = "+" + re.sub(r"[^\d]", "", cleaned[1:])
        else:
            cleaned = re.sub(r"[^\d]", "", cleaned)
        if not cleaned or len(cleaned) < 7:
            raise ValueError("Phone number too short")
        return cleaned


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
    try:
        client_ip = get_client_ip(request)
        from sqlalchemy import func
        count = (await db.execute(
            select(func.count()).select_from(User).where(User.registration_ip == client_ip)
        )).scalar() or 0
        return {"exists": count > 0, "count": count}
    except Exception as e:
        logger.error(f"check-ip failed: {e}")
        return {"exists": False, "count": 0}


@router.post("/register", response_model=TokenResponse)
async def register(
    user: UserRegister,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    # Validate password strength (6+ characters)
    is_valid, message = validate_password_strength(user.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

    client_ip = get_client_ip(request)

    # Country is needed here (not just later) to decide whether the per-IP cap
    # applies to this signup at all.
    signup_country = (detect_country_from_phone(user.phone) or "").upper()

    # Per-IP registration cap. Skipped in geos where carrier CGNAT puts hundreds
    # of real subscribers behind one address — there the cap blocks genuine leads
    # instead of farmers (every Brazilian after the first was getting
    # "já existe uma conta"). Elsewhere it stays as it was.
    from sqlalchemy import func
    accounts_on_ip = (await db.execute(
        select(func.count()).where(User.registration_ip == client_ip)
    )).scalar() or 0
    if signup_country not in NO_IP_LIMIT_COUNTRIES and accounts_on_ip >= MAX_ACCOUNTS_PER_IP:
        logger.warning("Blocked multi-account registration from IP=%s (already %s)", client_ip, accounts_on_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Já existe uma conta associada a este dispositivo/rede."
        )

    # Check if phone already exists
    phone_result = await db.execute(select(User).where(User.phone == user.phone))
    if phone_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered"
        )

    # Generate email from phone if not provided (for DB unique constraint)
    email = user.email or f"{user.phone.replace('+', '')}@phone.local"

    # Check if email exists (in case user provided one)
    if user.email:
        email_result = await db.execute(select(User).where(User.email == user.email))
        if email_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )

    # Auto-generate username from phone last 4 digits
    phone_suffix = re.sub(r"[^\d]", "", user.phone)[-4:]
    username = user.username or f"User_{phone_suffix}"

    # Check if referral code is valid and get referrer
    referrer = None
    if user.referral_code:
        ref_result = await db.execute(
            select(User).where(User.referral_code == user.referral_code)
        )
        referrer = ref_result.scalar_one_or_none()

    # Country from phone prefix — already resolved above for the per-IP rule.
    country = signup_country or None

    # Language: prefer the UI language the user actually registered in; fall back
    # to the country's primary language; then English. (Previously every user was
    # silently stored as "en" because registration never captured the language.)
    _SUPPORTED_LANGS = {"en", "pt", "es", "fr", "it", "de", "pl", "ru", "ro", "tr", "ar", "hi", "zh"}
    _COUNTRY_LANG = {
        "PT": "pt", "BR": "pt", "AO": "pt", "MZ": "pt",
        "ES": "es", "MX": "es", "AR": "es", "CO": "es", "CL": "es", "PE": "es",
        "FR": "fr", "IT": "it", "DE": "de", "AT": "de", "PL": "pl",
        "RU": "ru", "BY": "ru", "UA": "ru", "RO": "ro", "TR": "tr",
        "CN": "zh", "IN": "hi", "SA": "ar", "AE": "ar", "EG": "ar",
    }
    _lang_in = (user.language or "").strip().lower()[:2]
    language = _lang_in if _lang_in in _SUPPORTED_LANGS else _COUNTRY_LANG.get((country or "").upper(), "en")

    # Funnel assignment:
    #  - friend from a referral link -> inherits the referrer's funnel
    #  - campaign link with utm_funnel -> that funnel (existing behaviour)
    #  - launch geo with no A/B (Brazil) -> always the main funnel
    #  - fresh random lead -> 50/50 between the main funnel and the experiment one,
    #    so Vlad can compare "untouched baseline" vs "everything we changed"
    #    (call of 28.07: exactly two funnels in play).
    if referrer and referrer.funnel:
        funnel = referrer.funnel
    elif user.utm_funnel:
        funnel = normalize_funnel(user.utm_funnel)
    elif (country or "").upper() in NO_AB_COUNTRIES:
        funnel = "funnel-1"
    else:
        funnel = random.choice(LIVE_FUNNELS)

    # Has this exact device signed up before? Unlike the IP, a device profile
    # separates one PERSON from one NETWORK — which is what actually matters on
    # carrier-grade NAT, where hundreds of genuine users share an address.
    device_seen_before = False
    fingerprint = (user.device_fingerprint or "").strip()[:128] or None
    if fingerprint:
        device_seen_before = bool((await db.execute(
            select(User.id).where(User.device_fingerprint == fingerprint).limit(1)
        )).first())

    # 12h full-PRO trial. Withheld — never the registration itself — when this
    # device already has an account: fingerprints do collide (same phone model,
    # fresh OS, default settings), and refusing a real lead costs far more than a
    # farmer getting three free predictions. Accounts denied the trial get
    # premium_until in the past: a sentinel that also stops the retroactive grant
    # in users.py, which only fires when premium_until IS NULL.
    #
    # Where the fingerprint is missing (old client, blocked APIs) we fall back to
    # the previous IP rule, except in CGNAT geos where that rule punishes real users.
    if device_seen_before:
        grant_trial = False
    elif fingerprint:
        grant_trial = True
    else:
        grant_trial = accounts_on_ip == 0 or signup_country in NO_IP_LIMIT_COUNTRIES

    if device_seen_before:
        logger.info("Trial withheld: device %s already registered (ip=%s)", fingerprint, client_ip)

    trial_is_premium = grant_trial
    trial_until = (datetime.utcnow() + timedelta(hours=PRO_TRIAL_HOURS)) if grant_trial \
        else (datetime.utcnow() - timedelta(seconds=1))

    # Откуда пришёл. Кампании раскладывают данные по sub_id, причём номера у
    # каждой свои, поэтому сырой набор сохраняем целиком, а в отдельные поля
    # выносим ту раскладку, что используется сейчас — по ней удобно
    # группировать в админке.
    click_params_json, ad_campaign, ad_set, ad_placement, ad_source = None, None, None, None, None
    if user.click_params:
        clean = {k: str(v)[:300] for k, v in user.click_params.items() if v}
        if clean:
            click_params_json = json.dumps(clean, ensure_ascii=False)[:4000]
            ad_campaign = clean.get("sub_id_6")
            ad_set = clean.get("sub_id_4")
            ad_placement = clean.get("sub_id_7")
            ad_source = clean.get("sub_id_8")

    # Create new user
    new_user = User(
        email=email,
        phone=user.phone,
        username=username,
        password_hash=get_password_hash(user.password),
        registration_ip=client_ip,
        device_fingerprint=fingerprint,
        country=country,
        language=language,
        referred_by_id=referrer.id if referrer else None,
        traffic_source=user.source,
        utm_source=user.utm_source,
        utm_campaign=user.utm_campaign,
        click_params=click_params_json,
        ad_campaign=ad_campaign,
        ad_set=ad_set,
        ad_placement=ad_placement,
        ad_source=ad_source,
        funnel=funnel,
        is_premium=trial_is_premium,
        premium_until=trial_until,
    )
    db.add(new_user)
    try:
        await db.commit()
    except Exception:
        # Fallback: if funnel column doesn't exist yet, retry without it
        await db.rollback()
        new_user = User(
            email=email,
            phone=user.phone,
            username=username,
            password_hash=get_password_hash(user.password),
            registration_ip=client_ip,
            device_fingerprint=fingerprint,
            country=country,
            language=language,
            referred_by_id=referrer.id if referrer else None,
            traffic_source=user.source,
            is_premium=trial_is_premium,
            premium_until=trial_until,
        )
        db.add(new_user)
        await db.commit()
    await db.refresh(new_user)

    # Generate unique referral code for new user
    new_user.referral_code = f"PS{new_user.id:04X}{int(new_user.created_at.timestamp()) % 10000:04X}"

    # Welcome bonus — 100 starting fantasy points (the signup_bonus ledger row also
    # makes the existing-user backfill idempotent: it skips anyone who already has one).
    new_user.fantasy_points = WELCOME_FANTASY_POINTS
    db.add(FantasyLedger(user_id=new_user.id, kind="signup_bonus", points=WELCOME_FANTASY_POINTS, reason="welcome_bonus"))

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
            referrer.is_premium = True
            referrer.premium_until = datetime.utcnow() + timedelta(days=3)

    await db.commit()
    await db.refresh(new_user)

    # Use phone as JWT subject identifier, include both internal id and public_id
    access_token = create_access_token({"sub": new_user.phone, "user_id": new_user.id, "public_id": new_user.public_id})
    refresh_token = create_access_token(
        {"sub": new_user.phone, "user_id": new_user.id, "public_id": new_user.public_id, "refresh": True},
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )

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
            detail="Phone number is required"
        )

    # Find user by phone (primary) or email (legacy fallback)
    if user.phone:
        result = await db.execute(select(User).where(User.phone == user.phone))
    else:
        result = await db.execute(select(User).where(User.email == user.email))
    db_user = result.scalar_one_or_none()

    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if db_user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended"
        )

    identifier = db_user.phone or db_user.email
    access_token = create_access_token({"sub": identifier, "user_id": db_user.id, "public_id": db_user.public_id})
    refresh_token = create_access_token(
        {"sub": identifier, "user_id": db_user.id, "public_id": db_user.public_id, "refresh": True},
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )

    # Set httpOnly cookies
    set_auth_cookies(response, access_token, refresh_token)

    # Also return in body for backwards compatibility
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token_endpoint(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token"""
    # Get refresh token from body, localStorage header, or cookie
    token = None

    # Try Authorization header first (Bearer <refresh_token>)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]

    # Try cookie
    if not token:
        token = request.cookies.get("refresh_token")

    # Try request body
    if not token:
        try:
            body = await request.json()
            token = body.get("refresh_token")
        except Exception:
            pass

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required"
        )

    # Verify the refresh token
    try:
        payload = verify_token(token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    # Must be a refresh token (has "refresh": True)
    if not payload.get("refresh"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not a refresh token"
        )

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    # Verify user still exists
    result = await db.execute(select(User).where(User.id == user_id))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if db_user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended"
        )

    # Issue new tokens
    identifier = db_user.phone or db_user.email
    new_access_token = create_access_token({"sub": identifier, "user_id": db_user.id, "public_id": db_user.public_id})
    new_refresh_token = create_access_token(
        {"sub": identifier, "user_id": db_user.id, "public_id": db_user.public_id, "refresh": True},
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )

    set_auth_cookies(response, new_access_token, new_refresh_token)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token
    )


class ResetPasswordRequest(BaseModel):
    phone: str
    new_password: str

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v):
        cleaned = v.strip()
        if cleaned.startswith("+"):
            cleaned = "+" + re.sub(r"[^\d]", "", cleaned[1:])
        else:
            cleaned = re.sub(r"[^\d]", "", cleaned)
        if not cleaned or len(cleaned) < 7:
            raise ValueError("Phone number too short")
        return cleaned


@router.post("/reset-password")
async def reset_password(
    req: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Reset user password — called by support bot only.
    Protected by internal secret header to prevent abuse.
    """
    # Verify internal secret (support bot must send this header)
    import os
    internal_secret = os.getenv("INTERNAL_API_SECRET", "")
    request_secret = request.headers.get("X-Internal-Secret", "")
    if not internal_secret or request_secret != internal_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden"
        )

    # Validate new password
    is_valid, message = validate_password_strength(req.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

    # Find user by phone
    result = await db.execute(select(User).where(User.phone == req.phone))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update password
    db_user.password_hash = get_password_hash(req.new_password)
    await db.commit()

    return {"message": "Password reset successfully", "username": db_user.username}


@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookies"""
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Logged out successfully"}
