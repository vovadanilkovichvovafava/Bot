from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

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
    matchday: Optional[int] = None
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


@router.get("/today", response_model=List[Match])
async def get_today_matches(league: Optional[str] = Query(None)):
    """Get today's matches"""
    today = datetime.utcnow().strftime("%Y-%m-%d")

    matches = await fetch_matches(date_from=today, date_to=today, league=league)

    if matches:
        return [Match(**m) for m in matches]

    # No matches found - return empty list, not fake data
    return []


@router.get("/tomorrow", response_model=List[Match])
async def get_tomorrow_matches(league: Optional[str] = Query(None)):
    """Get tomorrow's matches"""
    tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")

    matches = await fetch_matches(date_from=tomorrow, date_to=tomorrow, league=league)

    if matches:
        return [Match(**m) for m in matches]

    return []


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

    return []


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

    return []


@router.get("/{match_id}", response_model=MatchDetail)
async def get_match_detail(match_id: int, current_user: dict = Depends(get_current_user)):
    """Get match details with head-to-head stats"""
    details = await fetch_match_details(match_id)

    if details:
        return MatchDetail(**details)

    raise HTTPException(status_code=404, detail="Match not found")
