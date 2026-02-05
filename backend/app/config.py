from pydantic_settings import BaseSettings
from typing import List
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
    ODDS_API_KEY: str = os.getenv("ODDS_API_KEY", "")

    # Limits
    FREE_DAILY_LIMIT: int = 10
    HTTP_TIMEOUT: int = 15

    # CORS
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "*").split(",") if os.getenv("CORS_ORIGINS") else ["*"]

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
