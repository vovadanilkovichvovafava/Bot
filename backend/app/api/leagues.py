"""Leagues endpoints"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List

from app.core.security import get_current_user_id
from app.config import COMPETITIONS
from app.services.football_api import FootballAPIService

router = APIRouter()
football_api = FootballAPIService()


class LeagueResponse(BaseModel):
    code: str
    name: str
    country: str | None = None
    emblem: str | None = None


class StandingEntry(BaseModel):
    position: int
    team: str
    played: int
    won: int
    draw: int
    lost: int
    goals_for: int
    goals_against: int
    goal_difference: int
    points: int
    form: str | None = None


@router.get("", response_model=List[LeagueResponse])
async def get_leagues(
    user_id: int = Depends(get_current_user_id)
):
    """Get all available leagues"""
    return [
        LeagueResponse(code=code, name=name)
        for code, name in COMPETITIONS.items()
    ]


@router.get("/{code}/standings", response_model=List[StandingEntry])
async def get_league_standings(
    code: str,
    user_id: int = Depends(get_current_user_id)
):
    """Get league standings/table"""
    if code not in COMPETITIONS:
        return []

    standings = await football_api.get_standings(code)

    return [
        StandingEntry(
            position=s.get("position", 0),
            team=s.get("team", {}).get("name", "Unknown"),
            played=s.get("playedGames", 0),
            won=s.get("won", 0),
            draw=s.get("draw", 0),
            lost=s.get("lost", 0),
            goals_for=s.get("goalsFor", 0),
            goals_against=s.get("goalsAgainst", 0),
            goal_difference=s.get("goalDifference", 0),
            points=s.get("points", 0),
            form=s.get("form"),
        )
        for s in standings
    ]
