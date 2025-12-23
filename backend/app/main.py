"""
AI Betting Bot - Backend API
FastAPI application for mobile app
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.database import init_db, close_db
from app.api import auth, matches, predictions, users, stats, leagues, favorites


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()


app = FastAPI(
    title="AI Betting Bot API",
    description="Backend API for AI Football Betting Predictions Mobile App",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(matches.router, prefix="/api/v1/matches", tags=["matches"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["predictions"])
app.include_router(leagues.router, prefix="/api/v1/leagues", tags=["leagues"])
app.include_router(stats.router, prefix="/api/v1/stats", tags=["stats"])
app.include_router(favorites.router, prefix="/api/v1/favorites", tags=["favorites"])


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Betting Bot API",
        "docs": "/docs",
        "health": "/health"
    }
