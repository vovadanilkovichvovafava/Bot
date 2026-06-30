from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "AI Betting Bot API"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

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

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 365  # 1 year

    # External APIs - read at access time for Railway compatibility
    FOOTBALL_API_URL: str = "https://api.football-data.org/v4"

    @property
    def FOOTBALL_API_KEY(self) -> str:
        """Read at access time, not at module load"""
        return os.getenv("FOOTBALL_API_KEY", "")

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
