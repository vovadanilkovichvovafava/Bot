import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import auth, matches, predictions, users, football, analytics
from app.core.database import init_db
from app.middleware import (
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    InjectionDetectionMiddleware,
)

logger = logging.getLogger(__name__)


def check_security_config():
    """Check for security misconfigurations at startup"""
    warnings = []

    # Check SECRET_KEY
    secret_key = os.getenv("SECRET_KEY", "")
    if not secret_key or secret_key == "your-secret-key-change-in-production":
        warnings.append(
            "CRITICAL: SECRET_KEY is not set or using default value! "
            "Set a secure random SECRET_KEY in environment variables."
        )

    # Check API keys
    if not os.getenv("CLAUDE_API_KEY"):
        warnings.append("WARNING: CLAUDE_API_KEY not set. AI features will be unavailable.")

    if not os.getenv("FOOTBALL_API_KEY"):
        warnings.append("WARNING: FOOTBALL_API_KEY not set. Match data may be limited.")

    if not os.getenv("API_FOOTBALL_KEY"):
        warnings.append("WARNING: API_FOOTBALL_KEY not set. Live data will be unavailable.")

    for warning in warnings:
        logger.warning(f"\n{'='*60}\n{warning}\n{'='*60}")

    return len([w for w in warnings if "CRITICAL" in w]) == 0


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Security checks
    is_secure = check_security_config()
    if not is_secure:
        logger.error("Application started with critical security issues!")

    # Initialize database tables
    await init_db()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="AI Betting Bot API",
    description="Backend API for AI Football Betting Predictions",
    version="1.0.2",
    lifespan=lifespan,
)

# Security middleware (order matters: first added = last executed)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(InjectionDetectionMiddleware)

# CORS - MUST be added LAST so it runs FIRST (LIFO order)
# Note: When allow_credentials=True, cannot use wildcard "*" for origins
# Instead, we list specific origins or use allow_origin_regex
CORS_ORIGINS = [
    "https://sportscoreai.com",
    "https://www.sportscoreai.com",
    "https://pwa-production-20b5.up.railway.app",
    "https://appbot-production-152e.up.railway.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(matches.router, prefix="/api/v1/matches", tags=["matches"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["predictions"])
app.include_router(football.router, prefix="/api/v1/football", tags=["football"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])


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
    from app.services.football_api import get_football_api_key
    from app.services.api_football import get_api_football_key
    import os

    db_status = "healthy"
    try:
        async with async_session_maker() as session:
            await session.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy",
        "version": "1.0.2",
        "database": db_status,
        "apis": {
            "football_data": "configured" if get_football_api_key() else "missing",
            "api_football": "configured" if get_api_football_key() else "missing",
            "claude": "configured" if os.getenv("CLAUDE_API_KEY") else "missing",
        }
    }


@app.get("/debug/football-api")
async def debug_football_api():
    """Debug endpoint to test Football API connection"""
    import os
    import httpx
    import traceback
    from app.services.football_api import fetch_matches, get_football_api_key
    from app.services.api_football import get_api_football_key
    from datetime import datetime

    # Check all API keys
    football_data_key = get_football_api_key()
    api_football_key = get_api_football_key()
    claude_key = os.getenv("CLAUDE_API_KEY", "")

    result = {
        "env_vars": {
            "FOOTBALL_API_KEY": {"exists": bool(football_data_key), "length": len(football_data_key)},
            "API_FOOTBALL_KEY": {"exists": bool(api_football_key), "length": len(api_football_key)},
            "CLAUDE_API_KEY": {"exists": bool(claude_key), "length": len(claude_key)},
        },
        "football_data_org": {"status": "not_tested"},
        "api_football": {"status": "not_tested"},
    }

    # Test Football-Data.org API
    if football_data_key:
        try:
            headers = {"X-Auth-Token": football_data_key}
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.football-data.org/v4/competitions/PL/matches",
                    headers=headers,
                    params={"status": "SCHEDULED"},
                    timeout=15.0
                )
                result["football_data_org"]["status_code"] = response.status_code

                if response.status_code == 200:
                    data = response.json()
                    result["football_data_org"]["status"] = "working"
                    result["football_data_org"]["matches_count"] = len(data.get("matches", []))
                    result["football_data_org"]["competition"] = data.get("competition", {}).get("name")
                else:
                    result["football_data_org"]["status"] = "error"
                    result["football_data_org"]["error"] = response.text[:300]
        except Exception as e:
            result["football_data_org"]["status"] = "error"
            result["football_data_org"]["error"] = f"{type(e).__name__}: {str(e)}"
    else:
        result["football_data_org"]["status"] = "no_key"

    # Test API-Football
    if api_football_key:
        try:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://v3.football.api-sports.io/fixtures",
                    headers={"x-apisports-key": api_football_key},
                    params={"date": today},
                    timeout=15.0
                )
                result["api_football"]["status_code"] = response.status_code

                if response.status_code == 200:
                    data = response.json()
                    fixtures = data.get("response", [])
                    result["api_football"]["status"] = "working"
                    result["api_football"]["fixtures_count"] = len(fixtures)
                    result["api_football"]["errors"] = data.get("errors", {})
                else:
                    result["api_football"]["status"] = "error"
                    result["api_football"]["error"] = response.text[:300]
        except Exception as e:
            result["api_football"]["status"] = "error"
            result["api_football"]["error"] = f"{type(e).__name__}: {str(e)}"
    else:
        result["api_football"]["status"] = "no_key"

    # Test internal fetch function
    try:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        matches = await fetch_matches(date_from=today, date_to=today)
        result["internal_fetch"] = {
            "status": "working" if matches else "empty",
            "count": len(matches),
        }
    except Exception as e:
        result["internal_fetch"] = {"status": "error", "error": str(e)}

    return result
