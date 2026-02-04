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


@router.get("/live", response_model=List[Match])
async def get_live_matches():
    """Get currently live matches"""
    from datetime import timedelta

    today = datetime.utcnow().strftime("%Y-%m-%d")
    tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")

    # Fetch today's matches
    all_matches = await fetch_matches(date_from=today, date_to=tomorrow)

    if all_matches:
        # Filter to live matches only
        live_matches = [
            m for m in all_matches
            if m.get("status", "").lower() in ("in_play", "live", "paused", "halftime")
        ]
        return [Match(**m) for m in live_matches]

    return []


def _get_upcoming_matchday_matches(all_matches: List[dict], exclude_matchdays: set = None) -> List[dict]:
    """
    Get all matches from the next upcoming matchday.
    Groups by league+matchday and returns the earliest complete matchday.
    """
    if not all_matches:
        return []

    exclude_matchdays = exclude_matchdays or set()

    # Group matches by league_code + matchday
    matchday_groups = {}
    for m in all_matches:
        league_code = m.get("league_code", "")
        matchday = m.get("matchday")
        if matchday is None:
            continue

        key = (league_code, matchday)
        if key in exclude_matchdays:
            continue

        if key not in matchday_groups:
            matchday_groups[key] = []
        matchday_groups[key].append(m)

    if not matchday_groups:
        # Fallback: return sorted matches if no matchday info
        sorted_matches = sorted(all_matches, key=lambda m: m.get("match_date", ""))
        return sorted_matches[:20]

    # Find the earliest matchday (by first match date in each group)
    earliest_date = None
    earliest_keys = []

    for key, matches in matchday_groups.items():
        first_match_date = min(m.get("match_date", "") for m in matches)
        if earliest_date is None or first_match_date < earliest_date:
            earliest_date = first_match_date
            earliest_keys = [key]
        elif first_match_date == earliest_date:
            earliest_keys.append(key)

    # Collect all matches from the earliest matchdays (across all leagues)
    # Get all matchdays that start within same day as the earliest
    result = []
    earliest_day = earliest_date[:10] if earliest_date else ""

    for key, matches in matchday_groups.items():
        first_match_date = min(m.get("match_date", "") for m in matches)
        # Include matchdays that start within 3 days of the earliest
        if first_match_date[:10] <= (datetime.fromisoformat(earliest_day) + timedelta(days=3)).strftime("%Y-%m-%d"):
            result.extend(matches)

    # Sort by date
    result.sort(key=lambda m: m.get("match_date", ""))
    return result


@router.get("/today", response_model=List[Match])
async def get_today_matches(league: Optional[str] = Query(None)):
    """Get current matchday matches (all matches from the upcoming round)"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    # Fetch 14 days ahead to capture full matchweek
    two_weeks = (datetime.utcnow() + timedelta(days=14)).strftime("%Y-%m-%d")

    all_matches = await fetch_matches(date_from=today, date_to=two_weeks, league=league)

    if all_matches:
        # Get all matches from the upcoming matchday
        matchday_matches = _get_upcoming_matchday_matches(all_matches)
        if matchday_matches:
            return [Match(**m) for m in matchday_matches]

    return []


@router.get("/tomorrow", response_model=List[Match])
async def get_tomorrow_matches(league: Optional[str] = Query(None)):
    """Get next matchday matches (the round after current)"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    three_weeks = (datetime.utcnow() + timedelta(days=21)).strftime("%Y-%m-%d")

    all_matches = await fetch_matches(date_from=today, date_to=three_weeks, league=league)

    if all_matches:
        # First get current matchday to exclude it
        current_matchday_matches = _get_upcoming_matchday_matches(all_matches)

        # Build set of matchdays to exclude
        exclude_matchdays = set()
        for m in current_matchday_matches:
            key = (m.get("league_code", ""), m.get("matchday"))
            exclude_matchdays.add(key)

        # Get the next matchday
        next_matchday_matches = _get_upcoming_matchday_matches(all_matches, exclude_matchdays)
        if next_matchday_matches:
            return [Match(**m) for m in next_matchday_matches]

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


class MatchResult(BaseModel):
    id: int
    status: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None


class MatchResultsRequest(BaseModel):
    match_ids: List[int]


@router.post("/results", response_model=List[MatchResult])
async def get_match_results(request: MatchResultsRequest):
    """Get results for multiple matches by their IDs"""
    results = []

    for match_id in request.match_ids[:20]:  # Limit to 20 matches per request
        try:
            details = await fetch_match_details(match_id)
            if details:
                results.append(MatchResult(
                    id=details["id"],
                    status=details["status"],
                    home_score=details.get("home_score"),
                    away_score=details.get("away_score"),
                ))
        except Exception:
            continue

    return results


@router.get("/{match_id}", response_model=MatchDetail)
async def get_match_detail(match_id: int, current_user: dict = Depends(get_current_user)):
    """Get match details with head-to-head stats"""
    details = await fetch_match_details(match_id)

    if details:
        return MatchDetail(**details)

    raise HTTPException(status_code=404, detail="Match not found")
