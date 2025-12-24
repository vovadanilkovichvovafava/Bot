from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import random

from app.core.security import get_current_user

router = APIRouter()


class Prediction(BaseModel):
    id: int
    match_id: int
    home_team: str
    away_team: str
    league: str
    bet_type: str
    bet_name: str
    confidence: float
    odds: float
    reasoning: str
    created_at: datetime


BET_TYPES = [
    ("П1", "Home Win"),
    ("П2", "Away Win"),
    ("Х", "Draw"),
    ("ТБ2.5", "Over 2.5"),
    ("ТМ2.5", "Under 2.5"),
    ("BTTS", "Both Teams Score"),
]


@router.post("/{match_id}", response_model=Prediction)
async def create_prediction(match_id: int, current_user: dict = Depends(get_current_user)):
    bet = random.choice(BET_TYPES)

    return Prediction(
        id=random.randint(1, 10000),
        match_id=match_id,
        home_team="Manchester City",
        away_team="Liverpool",
        league="Premier League",
        bet_type=bet[0],
        bet_name=bet[1],
        confidence=round(random.uniform(65, 85), 1),
        odds=round(random.uniform(1.5, 2.5), 2),
        reasoning=f"Based on recent form and head-to-head statistics, {bet[1]} looks promising. Home team has strong defensive record.",
        created_at=datetime.utcnow()
    )


@router.get("/history", response_model=List[Prediction])
async def get_prediction_history(
        limit: int = 10,
        current_user: dict = Depends(get_current_user)
):
    predictions = []
    for i in range(min(limit, 10)):
        bet = random.choice(BET_TYPES)
        predictions.append(Prediction(
            id=i + 1,
            match_id=1000 + i,
            home_team="Team A",
            away_team="Team B",
            league="Premier League",
            bet_type=bet[0],
            bet_name=bet[1],
            confidence=round(random.uniform(60, 90), 1),
            odds=round(random.uniform(1.4, 3.0), 2),
            reasoning="AI analysis based on statistics.",
            created_at=datetime.utcnow()
        ))
    return predictions
