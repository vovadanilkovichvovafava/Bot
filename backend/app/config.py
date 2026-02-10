from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    APP_NAME: str = "AI Betting Bot API"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # External APIs
    FOOTBALL_API_KEY: str = os.getenv("FOOTBALL_API_KEY", "")
    FOOTBALL_API_URL: str = "https://api.football-data.org/v4"
    CLAUDE_API_KEY: str = os.getenv("CLAUDE_API_KEY", "")

    # Email (SMTP)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "AI Betting Bot")

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
