"""
Fonbet API endpoints.

All data is public (no bookmaker auth needed).
Requires our app JWT auth.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict

from app.core.security import get_current_user
from app.services.fonbet_api import fonbet_api, get_cache_stats as _get_fonbet_cache_stats

router = APIRouter()


# === Models ===

class LiveInfo(BaseModel):
    timer: str = ""
    timer_seconds: int = 0
    score_home: int = 0
    score_away: int = 0
    period: str = ""
    periods: List[Dict] = []


class FonbetEvent(BaseModel):
    id: int
    team1: str
    team2: str
    tournament_id: int
    tournament_name: str
    country: str
    league_code: str
    priority: int = 99
    start_time: Optional[str] = None
    start_timestamp: Optional[int] = None
    is_live: bool = False
    live_info: Optional[LiveInfo] = None
    odds: Dict = {}
    total_markets: int = 0
    deeplink: str


class FonbetMatchResponse(BaseModel):
    events: List[FonbetEvent]
    total: int
    live_count: int = 0


class MatchLookupRequest(BaseModel):
    home_team: str
    away_team: str
    match_date: Optional[str] = None


class CacheStatsResponse(BaseModel):
    total: int
    active: int
    expired: int


# === Endpoints ===

@router.get("/football", response_model=FonbetMatchResponse)
async def get_football_events(
    lang: str = Query("en", description="Language: en, it, de, pl"),
    current_user: dict = Depends(get_current_user),
):
    """All football events with odds and deeplinks (~500-800 matches)."""
    events = await fonbet_api.get_football_events(lang=lang)
    live_count = sum(1 for ev in events if ev.get("is_live"))
    return FonbetMatchResponse(
        events=[FonbetEvent(**ev) for ev in events],
        total=len(events),
        live_count=live_count,
    )


@router.get("/live", response_model=FonbetMatchResponse)
async def get_live_football(
    lang: str = Query("en"),
    current_user: dict = Depends(get_current_user),
):
    """
    Only LIVE football matches with scores, timers, and odds.

    Live info includes:
    - timer: "44:18" (current match minute)
    - score_home / score_away: current score
    - period: "1st half", "2nd half"
    - periods: per-half scores
    - odds: live odds (updated every 30 sec)
    """
    events = await fonbet_api.get_live_football(lang=lang)
    return FonbetMatchResponse(
        events=[FonbetEvent(**ev) for ev in events],
        total=len(events),
        live_count=len(events),
    )


@router.get("/top-leagues", response_model=FonbetMatchResponse)
async def get_top_leagues(
    lang: str = Query("en"),
    current_user: dict = Depends(get_current_user),
):
    """Top leagues: Serie A, PL, Bundesliga, La Liga, Ligue 1, CL, EL."""
    events = await fonbet_api.get_top_leagues_events(lang=lang)
    live_count = sum(1 for ev in events if ev.get("is_live"))
    return FonbetMatchResponse(
        events=[FonbetEvent(**ev) for ev in events],
        total=len(events),
        live_count=live_count,
    )


@router.get("/serie-a", response_model=FonbetMatchResponse)
async def get_serie_a(
    current_user: dict = Depends(get_current_user),
):
    """Only Serie A (Italian market, 78% of users)."""
    events = await fonbet_api.get_serie_a_events(lang="it")
    live_count = sum(1 for ev in events if ev.get("is_live"))
    return FonbetMatchResponse(
        events=[FonbetEvent(**ev) for ev in events],
        total=len(events),
        live_count=live_count,
    )


@router.get("/event/{event_id}")
async def get_event_detail(
    event_id: int,
    lang: str = Query("en"),
    current_user: dict = Depends(get_current_user),
):
    """Single event with all markets."""
    data = await fonbet_api.get_event_detail(event_id, lang=lang)
    if not data:
        raise HTTPException(status_code=404, detail="Event not found")
    return data


@router.post("/find-match", response_model=Optional[FonbetEvent])
async def find_match_by_teams(
    request: MatchLookupRequest,
    lang: str = Query("en"),
    current_user: dict = Depends(get_current_user),
):
    """
    Find Fonbet event by team names (fuzzy match).

    Use cases:
    - AI Chat: "odds for Milan vs Inter" -> deeplink
    - Match Detail: "Bet on Fonbet" button
    - Value Finder: compare API-Football vs Fonbet odds
    """
    if request.match_date:
        result = await fonbet_api.match_api_football_to_fonbet(
            request.home_team, request.away_team, request.match_date, lang
        )
    else:
        result = await fonbet_api.find_event_by_teams(
            request.home_team, request.away_team, lang
        )

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No Fonbet event found for {request.home_team} vs {request.away_team}"
        )
    return FonbetEvent(**result)


@router.get("/deeplink/{tournament_id}/{event_id}")
async def get_deeplink(tournament_id: int, event_id: int):
    """Generate deeplink (no auth required)."""
    return {
        "url": fonbet_api.generate_deeplink(tournament_id, event_id),
        "proxy_url": fonbet_api.generate_proxy_deeplink(tournament_id, event_id),
        "tournament_id": tournament_id,
        "event_id": event_id,
    }


@router.get("/cache-stats", response_model=CacheStatsResponse)
async def get_cache_stats():
    """Cache statistics (debug)."""
    return CacheStatsResponse(**_get_fonbet_cache_stats())
