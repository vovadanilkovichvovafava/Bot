from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import random

from app.core.security import get_current_user
from app.services.football_api import fetch_matches, fetch_match_details, fetch_standings, fetch_leagues

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


class HeadToHead(BaseModel):
    total_matches: int = 0
    home_wins: int = 0
    away_wins: int = 0
    draws: int = 0


class MatchDetail(BaseModel):
    id: int
    home_team: Team
    away_team: Team
    league: str
    league_code: str
    match_date: datetime
    status: str = "scheduled"
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    head_to_head: HeadToHead = HeadToHead()


class Standing(BaseModel):
    position: int
    team: str
    team_logo: Optional[str] = None
    played: int
    won: int
    drawn: int
    lost: int
    goals_for: int
    goals_against: int
    goal_difference: int
    points: int


class League(BaseModel):
    code: str
    name: str
    country: str
    icon: Optional[str] = None


# Demo matches data (fallback)
DEMO_MATCHES = [
    {"home": "Manchester City", "away": "Arsenal", "league": "Premier League", "code": "PL",
     "home_logo": "https://media.api-sports.io/football/teams/50.png",
     "away_logo": "https://media.api-sports.io/football/teams/42.png"},
    {"home": "Real Madrid", "away": "Barcelona", "league": "La Liga", "code": "PD",
     "home_logo": "https://media.api-sports.io/football/teams/541.png",
     "away_logo": "https://media.api-sports.io/football/teams/529.png"},
    {"home": "Bayern Munich", "away": "Dortmund", "league": "Bundesliga", "code": "BL1",
     "home_logo": "https://media.api-sports.io/football/teams/157.png",
     "away_logo": "https://media.api-sports.io/football/teams/165.png"},
    {"home": "PSG", "away": "Marseille", "league": "Ligue 1", "code": "FL1",
     "home_logo": "https://media.api-sports.io/football/teams/85.png",
     "away_logo": "https://media.api-sports.io/football/teams/81.png"},
    {"home": "Juventus", "away": "Inter Milan", "league": "Serie A", "code": "SA",
     "home_logo": "https://media.api-sports.io/football/teams/496.png",
     "away_logo": "https://media.api-sports.io/football/teams/505.png"},
]


@router.get("/today", response_model=List[Match])
async def get_today_matches(league: Optional[str] = Query(None)):
    """Get today's matches"""
    today = datetime.utcnow().strftime("%Y-%m-%d")

    matches = await fetch_matches(date_from=today, date_to=today, league=league)

    if matches:
        return [Match(**m) for m in matches]

    # Fallback to demo data
    return _generate_demo_matches(0)


@router.get("/tomorrow", response_model=List[Match])
async def get_tomorrow_matches(league: Optional[str] = Query(None)):
    """Get tomorrow's matches"""
    tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")

    matches = await fetch_matches(date_from=tomorrow, date_to=tomorrow, league=league)

    if matches:
        return [Match(**m) for m in matches]

    return _generate_demo_matches(1)


@router.get("/upcoming", response_model=List[Match])
async def get_upcoming_matches(
    days: int = Query(7, ge=1, le=14),
    league: Optional[str] = Query(None)
):
    """Get upcoming matches for next N days"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    end_date = (datetime.utcnow() + timedelta(days=days)).strftime("%Y-%m-%d")

    matches = await fetch_matches(date_from=today, date_to=end_date, league=league)

    if matches:
        return [Match(**m) for m in matches]

    return _generate_demo_matches(0) + _generate_demo_matches(1)


@router.get("/leagues", response_model=List[League])
async def get_leagues():
    """Get available leagues"""
    leagues = await fetch_leagues()
    return [League(**lg) for lg in leagues]


@router.get("/standings/{league_code}", response_model=List[Standing])
async def get_league_standings(league_code: str):
    """Get league standings"""
    standings = await fetch_standings(league_code)

    if standings:
        return [Standing(**s) for s in standings]

    return _get_demo_standings()


@router.get("/{match_id}", response_model=MatchDetail)
async def get_match_detail(match_id: int, current_user: dict = Depends(get_current_user)):
    """Get match details with head-to-head stats"""
    details = await fetch_match_details(match_id)

    if details:
        return MatchDetail(**details)

    return _get_demo_match_detail(match_id)


# Demo data generators
def _generate_demo_matches(day_offset: int) -> List[Match]:
    """Generate demo matches for fallback"""
    base_date = datetime.utcnow() + timedelta(days=day_offset)
    matches = []

    for i, m in enumerate(DEMO_MATCHES):
        match_time = base_date.replace(
            hour=random.choice([15, 17, 19, 21]),
            minute=random.choice([0, 30]),
            second=0,
            microsecond=0
        )
        matches.append(Match(
            id=1000 + i + (day_offset * 100),
            home_team=Team(name=m["home"], logo=m.get("home_logo")),
            away_team=Team(name=m["away"], logo=m.get("away_logo")),
            league=m["league"],
            league_code=m["code"],
            match_date=match_time,
        ))

    return matches


def _get_demo_match_detail(match_id: int) -> MatchDetail:
    """Generate demo match detail"""
    return MatchDetail(
        id=match_id,
        home_team=Team(name="Manchester City", logo="https://media.api-sports.io/football/teams/50.png"),
        away_team=Team(name="Arsenal", logo="https://media.api-sports.io/football/teams/42.png"),
        league="Premier League",
        league_code="PL",
        match_date=datetime.utcnow(),
        head_to_head=HeadToHead(
            total_matches=10,
            home_wins=4,
            away_wins=3,
            draws=3
        )
    )


def _get_demo_standings() -> List[Standing]:
    """Generate demo standings"""
    teams = [
        "Manchester City", "Arsenal", "Liverpool", "Aston Villa",
        "Tottenham", "Manchester United", "Newcastle", "Brighton"
    ]

    standings = []
    for i, team in enumerate(teams):
        standings.append(Standing(
            position=i + 1,
            team=team,
            played=20,
            won=15 - i,
            drawn=3,
            lost=2 + i,
            goals_for=50 - i * 3,
            goals_against=20 + i * 2,
            goal_difference=30 - i * 5,
            points=48 - i * 3
        ))

    return standings
