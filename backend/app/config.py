from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import hashlib
import os


class Settings(BaseSettings):
    APP_NAME: str = "AI Betting Bot API"
    DEBUG: bool = False

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v):
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.strip().lower() in ("true", "1", "yes")
        return bool(v)

    # JWT - SECRET_KEY is required in production
    @property
    def SECRET_KEY(self) -> str:
        key = os.getenv("SECRET_KEY", "")
        if not key or key == "your-secret-key-change-in-production":
            if not self.DEBUG:
                raise ValueError("SECRET_KEY environment variable is required in production!")
            # Allow insecure default only in DEBUG mode
            return "dev-only-insecure-key-do-not-use-in-production"
        return key

    @property
    def ADMIN_SECRET_KEY(self) -> str:
        """
        Signing key for ADMIN tokens — a cryptographically distinct realm from
        user tokens. Uses ADMIN_SECRET_KEY if set, otherwise derives a separate
        key from SECRET_KEY so admin and user tokens can never be interchanged
        even when only SECRET_KEY is configured.
        """
        explicit = os.getenv("ADMIN_SECRET_KEY", "")
        if explicit:
            return explicit
        return hashlib.sha256(f"admin-realm:{self.SECRET_KEY}".encode()).hexdigest()

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 365  # 1 year

    @property
    def CLAUDE_API_KEY(self) -> str:
        """Read at access time, not at module load"""
        return os.getenv("CLAUDE_API_KEY", "")

    # Limits
    FREE_DAILY_LIMIT: int = 10
    HTTP_TIMEOUT: int = 15

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

TOP_CLUBS = [
    "Real Madrid", "Barcelona", "Bayern Munich", "Bayern München",
    "Manchester City", "Liverpool", "Arsenal", "Chelsea",
    "Manchester United", "Paris Saint-Germain", "PSG",
    "Juventus", "Inter Milan", "AC Milan", "Borussia Dortmund",
    "Atlético Madrid", "Napoli",
]
