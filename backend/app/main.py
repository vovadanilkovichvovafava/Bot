from contextlib import asynccontextmanager
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.database import init_db

# Core API routers (always available)
from app.api import auth, matches, predictions, users, chat

# Optional routers — gracefully handle if dependencies missing
try:
    from app.api import social
    _has_social = True
except Exception as e:
    social = None
    _has_social = False
    logging.warning(f"Social module unavailable: {e}")

try:
    from app.api import ml
    _has_ml = True
except Exception as e:
    ml = None
    _has_ml = False
    logging.warning(f"ML module unavailable: {e}")

# Import models to register with SQLAlchemy metadata
from app.models.user import User  # noqa: F401

try:
    from app.models.ml_models import (  # noqa: F401
        MLTrainingData, MLModel, EnsembleModel,
        ConfidenceCalibration, ROIAnalytics, LearningPattern,
        FeatureErrorPattern, LeagueLearning, LearningLog, Prediction,
        CachedAIResponse
    )
    _has_ml_models = True
except Exception as e:
    _has_ml_models = False
    logging.warning(f"ML models unavailable: {e}")

logger = logging.getLogger(__name__)

# Background task handles
_training_task = None
_verification_task = None
_daily_reset_task = None


async def daily_limit_reset_loop():
    """Background task to reset daily AI limits at midnight UTC"""
    from app.core.database import async_session_maker
    from sqlalchemy import update
    from datetime import datetime, timedelta

    # Calculate time until next midnight (UTC)
    def get_seconds_until_midnight_utc():
        now = datetime.utcnow()
        tomorrow_midnight = datetime(now.year, now.month, now.day) + timedelta(days=1)
        return (tomorrow_midnight - now).total_seconds()

    while True:
        try:
            wait_seconds = get_seconds_until_midnight_utc()
            logger.info(f"Daily reset scheduled in {wait_seconds/3600:.1f} hours (at 00:00 UTC)")
            await asyncio.sleep(wait_seconds)

            async with async_session_maker() as db:
                today_utc = datetime.utcnow().date()
                result = await db.execute(
                    update(User)
                    .where(User.last_request_date != today_utc)
                    .values(daily_requests=0, last_request_date=today_utc)
                )
                await db.commit()
                logger.info(f"Daily AI limits reset for {result.rowcount} users at {datetime.utcnow()} UTC")

            await asyncio.sleep(60)

        except Exception as e:
            logger.error(f"Daily limit reset error: {e}")
            await asyncio.sleep(3600)


async def ml_training_loop():
    """Background task to periodically check and retrain ML models"""
    # Wait for initial startup
    await asyncio.sleep(60)

    try:
        from app.core.database import async_session_maker
        from app.ml import MLTrainingService, BET_CATEGORIES
    except ImportError as e:
        logger.warning(f"ML training loop disabled — missing dependencies: {e}")
        return

    while True:
        try:
            async with async_session_maker() as db:
                service = MLTrainingService(db)

                for category in BET_CATEGORIES:
                    try:
                        if await service.should_retrain(category):
                            logger.info(f"Retraining ML model for {category}")
                            result = await service.train_ensemble(category)
                            logger.info(f"Training result for {category}: {result}")
                    except Exception as e:
                        logger.error(f"Error checking/training {category}: {e}")

        except Exception as e:
            logger.error(f"ML training loop error: {e}")

        # Check every 6 hours
        await asyncio.sleep(6 * 60 * 60)


async def result_verification_loop():
    """Background task to periodically verify prediction results"""
    # Wait for initial startup (2 minutes after training task)
    await asyncio.sleep(120)

    try:
        from app.core.database import async_session_maker
        from app.ml import MLDataCollector
    except ImportError as e:
        logger.warning(f"Result verification loop disabled — missing dependencies: {e}")
        return

    while True:
        try:
            async with async_session_maker() as db:
                collector = MLDataCollector(db)
                verified_count = await collector.check_pending_results()

                if verified_count > 0:
                    logger.info(f"Verified {verified_count} prediction results")

        except Exception as e:
            logger.error(f"Result verification loop error: {e}")

        # Check every 2 hours
        await asyncio.sleep(2 * 60 * 60)


async def reset_stale_daily_limits():
    """Reset daily limits for users whose last_request_date is not today UTC (on server startup)"""
    from app.core.database import async_session_maker
    from sqlalchemy import update
    from datetime import datetime

    try:
        async with async_session_maker() as db:
            today_utc = datetime.utcnow().date()
            result = await db.execute(
                update(User)
                .where((User.last_request_date != today_utc) | (User.last_request_date == None))
                .values(daily_requests=0, last_request_date=today_utc)
            )
            await db.commit()
            if result.rowcount > 0:
                logger.info(f"Reset daily AI limits for {result.rowcount} users on startup (UTC date: {today_utc})")
    except Exception as e:
        logger.error(f"Failed to reset stale daily limits: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _training_task, _verification_task, _daily_reset_task

    # Startup: Initialize database tables
    try:
        await init_db()
        logger.info("Database tables initialized")
    except Exception as e:
        logger.error(f"Database init failed (non-fatal): {e}")

    # Reset daily limits for users who haven't been reset today
    await reset_stale_daily_limits()

    # Start background tasks (only if ML is available)
    if _has_ml:
        _training_task = asyncio.create_task(ml_training_loop())
        logger.info("ML background training task started")

        _verification_task = asyncio.create_task(result_verification_loop())
        logger.info("ML result verification task started")
    else:
        logger.warning("ML not available — background training/verification disabled")

    _daily_reset_task = asyncio.create_task(daily_limit_reset_loop())
    logger.info("Daily AI limit reset task started")

    yield

    # Shutdown: cancel background tasks
    for task in [_training_task, _verification_task, _daily_reset_task]:
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass


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

# Routes — core (always registered)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(matches.router, prefix="/api/v1/matches", tags=["matches"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["predictions"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])

# Routes — optional (only if modules loaded successfully)
if _has_social:
    app.include_router(social.router, prefix="/api/v1/social", tags=["social"])
    logger.info("Social router registered")
if _has_ml:
    app.include_router(ml.router, prefix="/api/v1/ml", tags=["ml"])
    logger.info("ML router registered")


@app.get("/")
async def root():
    return {
        "message": "AI Betting Bot API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "ml_available": _has_ml,
        "social_available": _has_social,
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

    result = {
        "status": "healthy",
        "version": "1.0.0",
        "database": db_status,
        "ml_available": _has_ml,
        "social_available": _has_social,
        "ml_models_loaded": _has_ml_models,
    }

    try:
        from app.services.football_api import get_cache_stats
        result["cache"] = get_cache_stats()
    except Exception:
        pass

    return result


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
