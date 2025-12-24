from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import random

from app.core.security import get_current_user

router = APIRouter()


class Team(BaseModel):
    name: str
    logo: Optional[str] = None


class Match(BaseModel):
    id: int
    home_team: Team
    away_team: Team
    league: str
    league_code: str
    match_date: datetime
    status: str = "scheduled"
    home_score: Optional[int] = None
    away_score: Optional[int] = None


# Demo matches data
DEMO_MATCHES = [
    {"home": "Manchester City", "away": "Liverpool", "league": "Premier League", "code": "PL"},
    {"home": "Real Madrid", "away": "Barcelona", "league": "La Liga", "code": "PD"},
    {"home": "Bayern Munich", "away": "Borussia Dortmund", "league": "Bundesliga", "code": "BL1"},
    {"home": "PSG", "away": "Marseille", "league": "Ligue 1", "code": "FL1"},
    {"home": "Juventus", "away": "Inter Milan", "league": "Serie A", "code": "SA"},
    {"home": "Arsenal", "away": "Chelsea", "league": "Premier League", "code": "PL"},
    {"home": "Atletico Madrid", "away": "Sevilla", "league": "La Liga", "code": "PD"},
    {"home": "AC Milan", "away": "Napoli", "league": "Serie A", "code": "SA"},
    {"home": "Tottenham", "away": "Manchester United", "league": "Premier League", "code": "PL"},
    {"home": "RB Leipzig", "away": "Bayer Leverkusen", "league": "Bundesliga", "code": "BL1"},
]


def generate_matches(date_offset: int = 0) -> List[Match]:
    matches = []
    base_date = datetime.utcnow() + timedelta(days=date_offset)

    for i, m in enumerate(DEMO_MATCHES):
        match_time = base_date.replace(
            hour=random.choice([15, 17, 19, 21]),
            minute=random.choice([0, 30]),
            second=0,
            microsecond=0
        )
        matches.append(Match(
            id=1000 + i + (date_offset * 100),
            home_team=Team(name=m["home"]),
            away_team=Team(name=m["away"]),
            league=m["league"],
            league_code=m["code"],
            match_date=match_time,
        ))

    return matches


@router.get("/today", response_model=List[Match])
async def get_today_matches():
    return generate_matches(0)


@router.get("/tomorrow", response_model=List[Match])
async def get_tomorrow_matches():
    return generate_matches(1)


@router.get("/{match_id}")
async def get_match_detail(match_id: int, current_user: dict = Depends(get_current_user)):
    # Return demo match with stats
    return {
        "id": match_id,
        "home_team": {"name": "Manchester City"},
        "away_team": {"name": "Liverpool"},
        "league": "Premier League",
        "league_code": "PL",
        "match_date": datetime.utcnow().isoformat(),
        "head_to_head": {
            "total_matches": 10,
            "home_wins": 4,
            "away_wins": 3,
            "draws": 3
        },
        "home_form": ["W", "W", "D", "W", "L"],
        "away_form": ["W", "D", "W", "W", "W"],
        "home_goals_scored_avg": 2.5,
        "home_goals_conceded_avg": 0.8,
        "away_goals_scored_avg": 2.2,
        "away_goals_conceded_avg": 1.0
    }
