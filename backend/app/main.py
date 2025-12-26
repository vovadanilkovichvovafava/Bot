from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import auth, matches, predictions, users
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database tables
    await init_db()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="AI Betting Bot API",
    description="Backend API for AI Football Betting Predictions",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - allow mobile app to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(matches.router, prefix="/api/v1/matches", tags=["matches"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["predictions"])


@app.get("/")
async def root():
    return {
        "message": "AI Betting Bot API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    from app.core.database import async_session_maker
    from sqlalchemy import text

    db_status = "healthy"
    try:
        async with async_session_maker() as session:
            await session.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": db_status
    }


@app.get("/debug/football-api")
async def debug_football_api():
    """Debug endpoint to test Football API connection"""
    import os
    import httpx

    api_key = os.getenv("FOOTBALL_API_KEY", "")

    if not api_key:
        return {"error": "FOOTBALL_API_KEY not set", "key_exists": False}

    # Test API call - get Premier League matches for next 7 days
    try:
        headers = {"X-Auth-Token": api_key}
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.football-data.org/v4/competitions/PL/matches",
                headers=headers,
                params={"status": "SCHEDULED"},
                timeout=10.0
            )

            return {
                "key_exists": True,
                "key_preview": f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "***",
                "status_code": response.status_code,
                "response": response.json() if response.status_code == 200 else response.text
            }
    except Exception as e:
        return {
            "key_exists": True,
            "error": str(e)
        }
