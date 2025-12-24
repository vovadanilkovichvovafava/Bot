from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.security import get_password_hash, verify_password, create_access_token

router = APIRouter()

# Simple in-memory storage (replace with database in production)
users_db = {}


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


@router.post("/register", response_model=TokenResponse)
async def register(user: UserRegister):
    if user.email in users_db:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    users_db[user.email] = {
        "email": user.email,
        "username": user.username or user.email.split("@")[0],
        "password_hash": get_password_hash(user.password),
        "is_premium": False,
    }

    access_token = create_access_token({"sub": user.email})
    refresh_token = create_access_token({"sub": user.email, "refresh": True})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/login", response_model=TokenResponse)
async def login(user: UserLogin):
    db_user = users_db.get(user.email)

    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    access_token = create_access_token({"sub": user.email})
    refresh_token = create_access_token({"sub": user.email, "refresh": True})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str):
    # Simplified refresh logic
    access_token = create_access_token({"sub": "user"})
    new_refresh_token = create_access_token({"sub": "user", "refresh": True})

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token
    )
