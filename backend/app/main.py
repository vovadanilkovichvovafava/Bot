from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import auth, matches, predictions, users, chat, social
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
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(social.router, prefix="/api/v1/social", tags=["social"])


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
    import traceback

    api_key = os.getenv("FOOTBALL_API_KEY", "")

    result = {
        "key_exists": bool(api_key),
        "key_length": len(api_key) if api_key else 0,
    }

    if not api_key:
        result["error"] = "FOOTBALL_API_KEY not set"
        return result

    # Test API call
    try:
        headers = {"X-Auth-Token": api_key}
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.football-data.org/v4/competitions/PL/matches",
                headers=headers,
                params={"status": "SCHEDULED"},
                timeout=15.0
            )

            result["status_code"] = response.status_code
            result["headers"] = dict(response.headers)

            if response.status_code == 200:
                data = response.json()
                result["matches_count"] = len(data.get("matches", []))
                result["competition"] = data.get("competition", {}).get("name")
                # Show first 3 matches
                matches = data.get("matches", [])[:3]
                result["sample_matches"] = [
                    {
                        "home": m.get("homeTeam", {}).get("name"),
                        "away": m.get("awayTeam", {}).get("name"),
                        "date": m.get("utcDate")
                    }
                    for m in matches
                ]
            else:
                result["response_text"] = response.text[:500]

    except Exception as e:
        result["error"] = f"{type(e).__name__}: {str(e)}"
        result["traceback"] = traceback.format_exc()[-500:]

    return result
