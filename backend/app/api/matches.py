"""Matches endpoints"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional

from app.core.security import get_current_user_id
from app.services.football_api import FootballAPIService
from app.config import COMPETITIONS

router = APIRouter()
football_api = FootballAPIService()


class TeamInfo(BaseModel):
    name: str
    crest: str | None = None


class MatchResponse(BaseModel):
    id: int
    home_team: TeamInfo
    away_team: TeamInfo
    competition: str
    competition_code: str
    utc_date: datetime
    status: str
    home_score: int | None = None
    away_score: int | None = None


class MatchDetailResponse(MatchResponse):
    venue: str | None = None
    referee: str | None = None
    home_form: List[str] = []
    away_form: List[str] = []
    h2h: List[dict] = []
    standings: dict | None = None


class MatchAnalysisResponse(BaseModel):
    match_id: int
    home_team: str
    away_team: str
    competition: str
    analysis: str
    bet_type: str
    confidence: float
    odds: float | None = None
    reasoning: str
    alt_bet_type: str | None = None
    alt_confidence: float | None = None
    kelly_stake: float | None = None
    expected_value: float | None = None


@router.get("", response_model=List[MatchResponse])
async def get_matches(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    league: Optional[str] = Query(None, description="League code (PL, PD, etc)"),
    user_id: int = Depends(get_current_user_id)
):
    """Get matches for a specific date or league"""
    matches = await football_api.get_matches(date=date, competition=league)
    return [
        MatchResponse(
            id=m.get("id"),
            home_team=TeamInfo(
                name=m.get("homeTeam", {}).get("name", "Unknown"),
                crest=m.get("homeTeam", {}).get("crest")
            ),
            away_team=TeamInfo(
                name=m.get("awayTeam", {}).get("name", "Unknown"),
                crest=m.get("awayTeam", {}).get("crest")
            ),
            competition=m.get("competition", {}).get("name", "Unknown"),
            competition_code=m.get("competition", {}).get("code", ""),
            utc_date=m.get("utcDate"),
            status=m.get("status", "SCHEDULED"),
            home_score=m.get("score", {}).get("fullTime", {}).get("home"),
            away_score=m.get("score", {}).get("fullTime", {}).get("away"),
        )
        for m in matches
    ]


@router.get("/today", response_model=List[MatchResponse])
async def get_today_matches(
    user_id: int = Depends(get_current_user_id)
):
    """Get today's matches"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return await get_matches(date=today, user_id=user_id)


@router.get("/tomorrow", response_model=List[MatchResponse])
async def get_tomorrow_matches(
    user_id: int = Depends(get_current_user_id)
):
    """Get tomorrow's matches"""
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    return await get_matches(date=tomorrow, user_id=user_id)


@router.get("/{match_id}", response_model=MatchDetailResponse)
async def get_match_detail(
    match_id: int,
    user_id: int = Depends(get_current_user_id)
):
    """Get detailed match information"""
    match = await football_api.get_match(match_id)

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Get additional data
    home_team = match.get("homeTeam", {}).get("name", "")
    away_team = match.get("awayTeam", {}).get("name", "")
    competition = match.get("competition", {}).get("code", "")

    home_form = await football_api.get_team_form(home_team, competition)
    away_form = await football_api.get_team_form(away_team, competition)
    h2h = await football_api.get_h2h(match_id)

    return MatchDetailResponse(
        id=match.get("id"),
        home_team=TeamInfo(
            name=home_team,
            crest=match.get("homeTeam", {}).get("crest")
        ),
        away_team=TeamInfo(
            name=away_team,
            crest=match.get("awayTeam", {}).get("crest")
        ),
        competition=match.get("competition", {}).get("name", "Unknown"),
        competition_code=competition,
        utc_date=match.get("utcDate"),
        status=match.get("status", "SCHEDULED"),
        home_score=match.get("score", {}).get("fullTime", {}).get("home"),
        away_score=match.get("score", {}).get("fullTime", {}).get("away"),
        venue=match.get("venue"),
        referee=match.get("referees", [{}])[0].get("name") if match.get("referees") else None,
        home_form=home_form,
        away_form=away_form,
        h2h=h2h,
    )


@router.get("/{match_id}/analysis", response_model=MatchAnalysisResponse)
async def get_match_analysis(
    match_id: int,
    user_id: int = Depends(get_current_user_id)
):
    """Get AI analysis for a match"""
    # This will use the MatchAnalyzer service
    # For now, return a placeholder
    from app.services.match_analyzer import MatchAnalyzer
    analyzer = MatchAnalyzer()

    analysis = await analyzer.analyze_match(match_id)

    if not analysis:
        raise HTTPException(status_code=404, detail="Could not analyze match")

    return analysis
