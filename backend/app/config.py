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

    # External APIs (optional)
    FOOTBALL_API_KEY: str = os.getenv("FOOTBALL_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # Firebase (for push notifications)
    # Set GOOGLE_APPLICATION_CREDENTIALS env var to Firebase service account JSON path
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
