"""Predictions endpoints - real AI analysis via Claude"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.core.security import get_current_user
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


class ChatRequest(BaseModel):
    message: str
    match_context: Optional[str] = None


class ChatResponse(BaseModel):
    response: str


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    """AI chat for football questions and analysis"""
    analyzer = MatchAnalyzer()
    response = await analyzer.ai_chat(req.message, req.match_context or "")
    return ChatResponse(response=response)


@router.get("/history", response_model=List[PredictionResponse])
async def get_prediction_history(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
):
    """Get prediction history (placeholder - needs DB integration)"""
    return []


@router.post("/{match_id}", response_model=PredictionResponse)
async def create_prediction(match_id: int, current_user: dict = Depends(get_current_user)):
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
