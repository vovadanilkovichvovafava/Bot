from contextlib import asynccontextmanager
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import auth, matches, predictions, users, chat, social, ml
from app.core.database import init_db

# Import all models to register them with SQLAlchemy metadata
from app.models import (  # noqa: F401
    User, MLTrainingData, MLModel, EnsembleModel,
    ConfidenceCalibration, ROIAnalytics, LearningPattern,
    FeatureErrorPattern, LeagueLearning, LearningLog, Prediction
)

logger = logging.getLogger(__name__)

# Background task handles
_training_task = None
_verification_task = None
_daily_reset_task = None


async def daily_limit_reset_loop():
    """Background task to reset daily AI limits at midnight"""
    from app.core.database import async_session_maker
    from sqlalchemy import update
    from datetime import datetime, date
    import pytz

    # Calculate time until next midnight (UTC)
    async def get_seconds_until_midnight():
        now = datetime.utcnow()
        tomorrow = datetime(now.year, now.month, now.day) + timedelta(days=1)
        return (tomorrow - now).total_seconds()

    from datetime import timedelta

    while True:
        try:
            # Wait until midnight UTC
            wait_seconds = await get_seconds_until_midnight()
            logger.info(f"Daily reset scheduled in {wait_seconds/3600:.1f} hours")
            await asyncio.sleep(wait_seconds)

            # Reset all users' daily limits
            async with async_session_maker() as db:
                today = date.today()
                result = await db.execute(
                    update(User)
                    .where(User.last_request_date != today)
                    .values(daily_requests=0, last_request_date=today)
                )
                await db.commit()
                logger.info(f"Daily AI limits reset for {result.rowcount} users")

            # Wait a bit before next check to avoid double execution
            await asyncio.sleep(60)

        except Exception as e:
            logger.error(f"Daily limit reset error: {e}")
            # Wait 1 hour before retrying on error
            await asyncio.sleep(3600)


async def ml_training_loop():
    """Background task to periodically check and retrain ML models"""
    from app.core.database import async_session_maker
    from app.ml import MLTrainingService, BET_CATEGORIES

    # Wait for initial startup
    await asyncio.sleep(60)

    while True:
        try:
            async with async_session_maker() as db:
                service = MLTrainingService(db)

                # Check each category for retraining
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
    from app.core.database import async_session_maker
    from app.ml import MLDataCollector

    # Wait for initial startup (2 minutes after training task)
    await asyncio.sleep(120)

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _training_task, _verification_task, _daily_reset_task

    # Startup: Initialize database tables
    await init_db()
    logger.info("Database tables initialized")

    # Start background ML training task
    _training_task = asyncio.create_task(ml_training_loop())
    logger.info("ML background training task started")

    # Start background result verification task
    _verification_task = asyncio.create_task(result_verification_loop())
    logger.info("ML result verification task started")

    # Start daily limit reset task
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

# Routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(matches.router, prefix="/api/v1/matches", tags=["matches"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["predictions"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(social.router, prefix="/api/v1/social", tags=["social"])
app.include_router(ml.router, prefix="/api/v1/ml", tags=["ml"])


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
