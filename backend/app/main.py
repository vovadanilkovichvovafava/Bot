from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import auth, matches, predictions, users

app = FastAPI(
    title="AI Betting Bot API",
    description="Backend API for AI Football Betting Predictions",
    version="1.0.0",
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
    return {"status": "healthy", "version": "1.0.0"}
