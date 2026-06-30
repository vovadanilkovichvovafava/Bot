"""
Admin authentication API — completely separate from user auth.
Uses its own JWT claims (type=admin) so tokens can't be mixed.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.models.admin import AdminUser, AdminInvite

logger = logging.getLogger(__name__)

router = APIRouter()
admin_security = HTTPBearer(auto_error=False)

# ── JWT helpers (admin-specific) ──────────────────────────────

ADMIN_TOKEN_EXPIRE_HOURS = 24
ADMIN_REFRESH_EXPIRE_DAYS = 30


def create_admin_token(admin_id: int, email: str, role: str, *, is_refresh: bool = False) -> str:
    expire = datetime.utcnow() + (
        timedelta(days=ADMIN_REFRESH_EXPIRE_DAYS) if is_refresh
        else timedelta(hours=ADMIN_TOKEN_EXPIRE_HOURS)
    )
    payload = {
        "sub": email,
        "admin_id": admin_id,
        "role": role,
        "type": "admin_refresh" if is_refresh else "admin",
        "exp": expire,
    }
    return jwt.encode(payload, settings.ADMIN_SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_admin_token(token: str, *, allow_refresh: bool = False) -> dict:
    try:
        payload = jwt.decode(token, settings.ADMIN_SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_type = payload.get("type", "")
        valid_types = {"admin"}
        if allow_refresh:
            valid_types.add("admin_refresh")
        if token_type not in valid_types:
            raise HTTPException(status_code=401, detail="Not an admin token")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid admin token")


async def get_current_admin(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(admin_security),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Dependency: extract & verify admin JWT, then re-load the admin on every
    request to enforce that the account still exists and is active. The role
    is taken from the database (not the token) so deactivation/role changes
    take effect immediately rather than at token expiry.
    """
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        token = request.cookies.get("admin_token")
    if not token:
        raise HTTPException(status_code=401, detail="Admin auth required")

    payload = verify_admin_token(token)

    admin = (await db.execute(
        select(AdminUser).where(AdminUser.id == payload.get("admin_id"))
    )).scalar_one_or_none()
    if not admin or not admin.is_active:
        raise HTTPException(status_code=401, detail="Admin not found or deactivated")

    # Authoritative claims come from the DB row, not the (possibly stale) token.
    payload["role"] = admin.role
    payload["email"] = admin.email
    return payload


def require_admin_role(*roles: str):
    """Dependency factory: enforce that the current admin has one of `roles`."""
    async def _checker(admin: dict = Depends(get_current_admin)) -> dict:
        if admin.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient admin role")
        return admin
    return _checker


# ── Pydantic schemas ─────────────────────────────────────────

class RegisterRequest(BaseModel):
    invite_code: str
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class InviteCreateRequest(BaseModel):
    role: str = "admin"
    expires_hours: int = 72


# ── Endpoints ─────────────────────────────────────────────────

@router.post("/bootstrap")
async def bootstrap_invite(db: AsyncSession = Depends(get_db)):
    """
    One-time bootstrap: creates an owner invite code.
    Only works when there are ZERO admin users in the database.
    After the first admin registers, this endpoint stops working forever.
    """
    result = await db.execute(select(AdminUser).limit(1))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Bootstrap disabled — admins already exist")

    invite = AdminInvite(
        created_by_id=None,
        role="owner",
        expires_at=datetime.utcnow() + timedelta(hours=72),
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)

    logger.info(f"Bootstrap invite created: {invite.code}")

    return {
        "code": invite.code,
        "role": invite.role,
        "expires_at": invite.expires_at.isoformat(),
        "message": "Use this code to register as the first owner. This endpoint will stop working after registration.",
    }


@router.post("/register")
async def admin_register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register as admin using an invite code."""

    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Validate invite
    result = await db.execute(
        select(AdminInvite).where(AdminInvite.code == body.invite_code)
    )
    invite = result.scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    if not invite.is_valid:
        raise HTTPException(status_code=400, detail="Invite code expired or already used")

    # Check email uniqueness
    existing = await db.execute(
        select(AdminUser).where(AdminUser.email == body.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create admin user
    admin = AdminUser(
        email=body.email,
        password_hash=get_password_hash(body.password),
        name=body.name,
        role=invite.role,
        invited_by_id=invite.created_by_id,
        last_login=datetime.utcnow(),
    )
    db.add(admin)
    await db.flush()

    # Mark invite as used
    invite.used_by_id = admin.id
    invite.used_at = datetime.utcnow()

    await db.commit()
    await db.refresh(admin)

    logger.info(f"Admin registered: {admin.email} (role={admin.role}, invited_by={invite.created_by_id})")

    return {
        "access_token": create_admin_token(admin.id, admin.email, admin.role),
        "refresh_token": create_admin_token(admin.id, admin.email, admin.role, is_refresh=True),
        "admin": {
            "id": admin.id,
            "email": admin.email,
            "name": admin.name,
            "role": admin.role,
        },
    }


@router.post("/login")
async def admin_login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login as admin."""
    result = await db.execute(
        select(AdminUser).where(AdminUser.email == body.email)
    )
    admin = result.scalar_one_or_none()

    if not admin or not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not admin.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    admin.last_login = datetime.utcnow()
    await db.commit()

    logger.info(f"Admin login: {admin.email}")

    return {
        "access_token": create_admin_token(admin.id, admin.email, admin.role),
        "refresh_token": create_admin_token(admin.id, admin.email, admin.role, is_refresh=True),
        "admin": {
            "id": admin.id,
            "email": admin.email,
            "name": admin.name,
            "role": admin.role,
        },
    }


@router.post("/refresh")
async def admin_refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh admin access token."""
    payload = verify_admin_token(body.refresh_token, allow_refresh=True)

    admin_id = payload.get("admin_id")
    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = result.scalar_one_or_none()

    if not admin or not admin.is_active:
        raise HTTPException(status_code=401, detail="Admin not found or deactivated")

    return {
        "access_token": create_admin_token(admin.id, admin.email, admin.role),
        "refresh_token": create_admin_token(admin.id, admin.email, admin.role, is_refresh=True),
    }


@router.get("/me")
async def admin_me(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get current admin profile."""
    result = await db.execute(select(AdminUser).where(AdminUser.id == admin["admin_id"]))
    adm = result.scalar_one_or_none()
    if not adm:
        raise HTTPException(status_code=404, detail="Admin not found")

    return {
        "id": adm.id,
        "email": adm.email,
        "name": adm.name,
        "role": adm.role,
        "last_login": adm.last_login.isoformat() if adm.last_login else None,
        "created_at": adm.created_at.isoformat() if adm.created_at else None,
    }


# ── Invite management ────────────────────────────────────────

@router.post("/invites")
async def create_invite(
    body: InviteCreateRequest,
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new invite code. Only owner/admin can do this."""
    if admin["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can create invites")

    # Admins can only invite viewers; owners can invite any role
    if admin["role"] == "admin" and body.role not in ("viewer",):
        raise HTTPException(status_code=403, detail="Admins can only invite viewers")

    invite = AdminInvite(
        created_by_id=admin["admin_id"],
        role=body.role,
        expires_at=datetime.utcnow() + timedelta(hours=body.expires_hours),
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)

    logger.info(f"Admin invite created: {invite.code} (role={invite.role}, by={admin['admin_id']})")

    return {
        "code": invite.code,
        "role": invite.role,
        "expires_at": invite.expires_at.isoformat(),
    }


@router.get("/invites")
async def list_invites(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all invites (owner/admin only)."""
    if admin["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Not allowed")

    result = await db.execute(
        select(AdminInvite).order_by(AdminInvite.created_at.desc())
    )
    invites = result.scalars().all()

    return [
        {
            "id": inv.id,
            "code": inv.code,
            "role": inv.role,
            "created_by_id": inv.created_by_id,
            "used_by_id": inv.used_by_id,
            "used_at": inv.used_at.isoformat() if inv.used_at else None,
            "expires_at": inv.expires_at.isoformat(),
            "is_valid": inv.is_valid,
        }
        for inv in invites
    ]


@router.get("/team")
async def list_admins(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all admin users."""
    result = await db.execute(
        select(AdminUser).order_by(AdminUser.created_at.asc())
    )
    admins = result.scalars().all()

    return [
        {
            "id": a.id,
            "email": a.email,
            "name": a.name,
            "role": a.role,
            "is_active": a.is_active,
            "last_login": a.last_login.isoformat() if a.last_login else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in admins
    ]
