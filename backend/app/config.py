"""
Configuration settings for the backend
"""
from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # App
    APP_NAME: str = "AI Betting Bot API"
    DEBUG: bool = False

    # Database - Railway provides DATABASE_URL
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/betting_bot"

    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # External APIs
    FOOTBALL_API_KEY: str = ""
    FOOTBALL_API_URL: str = "https://api.football-data.org/v4"
    CLAUDE_API_KEY: str = ""
    ODDS_API_KEY: str = ""

    # Limits
    FREE_DAILY_LIMIT: int = 3
    HTTP_TIMEOUT: int = 15

    # CORS - allow all for mobile app
    CORS_ORIGINS: List[str] = ["*"]

    # ML
    ML_MODELS_DIR: str = "ml_models"
    ML_MIN_SAMPLES: int = 50

    # Port (Railway sets this)
    PORT: int = 8000

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra env vars from Railway

    def get_database_url(self) -> str:
        """Convert DATABASE_URL for asyncpg if needed"""
        url = self.DATABASE_URL
        # Railway uses postgres://, asyncpg needs postgresql+asyncpg://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()


# Competitions (from bot)
COMPETITIONS = {
    "PL": "Premier League",
    "PD": "La Liga",
    "BL1": "Bundesliga",
    "SA": "Serie A",
    "FL1": "Ligue 1",
    "CL": "Champions League",
    "EL": "Europa League",
    "ELC": "Championship",
    "DED": "Eredivisie",
    "PPL": "Primeira Liga",
    "BSA": "Brasileirão",
    "BL2": "Bundesliga 2",
    "SB": "Serie B",
    "FL2": "Ligue 2",
    "SD": "Segunda División",
    "SPL": "Scottish Premier",
    "BJL": "Jupiler Pro League",
    "ASL": "Liga Argentina",
    "EL1": "League One",
    "FAC": "FA Cup",
    "DFB": "DFB-Pokal",
    "MLS": "MLS",
}

TOP_CLUBS = [
    "Real Madrid", "Barcelona", "Bayern Munich", "Bayern München",
    "Manchester City", "Liverpool", "Arsenal", "Chelsea",
    "Manchester United", "Paris Saint-Germain", "PSG",
    "Juventus", "Inter Milan", "AC Milan", "Borussia Dortmund",
    "Atlético Madrid", "Napoli"
]
