"""Predictions endpoints - real AI analysis via Claude"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.prediction import Prediction
from app.services.match_analyzer import MatchAnalyzer

router = APIRouter()

BET_NAMES = {
    "П1": "Home Win", "П2": "Away Win", "Х": "Draw",
    "ТБ2.5": "Over 2.5", "ТМ2.5": "Under 2.5", "BTTS": "Both Teams Score",
    "1X": "Home or Draw", "X2": "Away or Draw",
}


class PredictionResponse(BaseModel):
    id: int
    match_id: int
    home_team: str
    away_team: str
    league: str
    bet_type: str
    bet_name: str
    confidence: float
    odds: Optional[float] = None
    reasoning: str
    analysis: Optional[str] = None
    alt_bet_type: Optional[str] = None
    alt_confidence: Optional[float] = None
    created_at: datetime


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    match_context: Optional[str] = None
    history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    response: str


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    """AI chat for football questions and analysis"""
    analyzer = MatchAnalyzer()
    history = [{"role": m.role, "content": m.content} for m in (req.history or [])]
    response = await analyzer.ai_chat(req.message, req.match_context or "", history)
    return ChatResponse(response=response)


class SavePredictionRequest(BaseModel):
    match_id: int
    home_team: str
    away_team: str
    league: Optional[str] = None
    match_date: Optional[datetime] = None
    bet_type: Optional[str] = None
    predicted_odds: Optional[float] = None
    confidence: Optional[float] = None
    ai_analysis: Optional[str] = None
    api_prediction: Optional[dict] = None


class SavedPredictionResponse(BaseModel):
    id: int
    match_id: int
    home_team: str
    away_team: str
    league: Optional[str]
    match_date: Optional[datetime]
    bet_type: Optional[str]
    predicted_odds: Optional[float]
    confidence: Optional[float]
    ai_analysis: Optional[str]
    is_correct: Optional[bool]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/save", response_model=SavedPredictionResponse)
async def save_prediction(
    req: SavePredictionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a prediction to the database"""
    prediction = Prediction(
        user_id=current_user["id"],
        match_id=req.match_id,
        home_team=req.home_team,
        away_team=req.away_team,
        league=req.league,
        match_date=req.match_date,
        bet_type=req.bet_type,
        predicted_odds=req.predicted_odds,
        confidence=req.confidence,
        ai_analysis=req.ai_analysis,
        api_prediction=json.dumps(req.api_prediction) if req.api_prediction else None,
    )
    db.add(prediction)
    await db.commit()
    await db.refresh(prediction)
    return prediction


@router.get("/saved", response_model=List[SavedPredictionResponse])
async def get_saved_predictions(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's saved predictions from database"""
    result = await db.execute(
        select(Prediction)
        .where(Prediction.user_id == current_user["id"])
        .order_by(desc(Prediction.created_at))
        .offset(offset)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/history", response_model=List[PredictionResponse])
async def get_prediction_history(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
):
    """Get prediction history (legacy endpoint - use /saved instead)"""
    return []


@router.post("/{match_id:int}", response_model=PredictionResponse)
async def create_prediction(
    match_id: int = Path(..., gt=0, description="Match ID must be a positive integer"),
    current_user: dict = Depends(get_current_user)
):
    """Get AI prediction for a specific match"""
    analyzer = MatchAnalyzer()
    result = await analyzer.analyze_match(match_id)

    if not result:
        raise HTTPException(status_code=404, detail="Could not analyze match. Match not found or API unavailable.")

    bet_type = result.get("bet_type", "1X")

    return PredictionResponse(
        id=match_id,
        match_id=match_id,
        home_team=result.get("home_team", ""),
        away_team=result.get("away_team", ""),
        league=result.get("competition", ""),
        bet_type=bet_type,
        bet_name=BET_NAMES.get(bet_type, bet_type),
        confidence=result.get("confidence", 60),
        odds=result.get("odds"),
        reasoning=result.get("reasoning", ""),
        analysis=result.get("analysis"),
        alt_bet_type=result.get("alt_bet_type"),
        alt_confidence=result.get("alt_confidence"),
        created_at=datetime.utcnow(),
    )
