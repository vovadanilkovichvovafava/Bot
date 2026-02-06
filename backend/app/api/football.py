"""
API-Football proxy endpoints with server-side caching.
Frontend calls these endpoints instead of API-Football directly.
"""
from fastapi import APIRouter, Query
from typing import List, Dict, Any, Optional

from app.services.api_football import api_football, get_cache_stats, clear_expired_cache

router = APIRouter()


# === Fixtures ===

@router.get("/fixtures/date/{date}")
async def get_fixtures_by_date(date: str) -> List[Dict]:
    """Get all fixtures for a specific date (YYYY-MM-DD)"""
    return await api_football.get_fixtures_by_date(date)


@router.get("/fixtures/live")
async def get_live_fixtures() -> List[Dict]:
    """Get all currently live fixtures"""
    return await api_football.get_live_fixtures()


@router.get("/fixtures/{fixture_id}")
async def get_fixture(fixture_id: int) -> Optional[Dict]:
    """Get single fixture by ID"""
    return await api_football.get_fixture(fixture_id)


@router.get("/fixtures/{fixture_id}/enriched")
async def get_fixture_enriched(fixture_id: int) -> Dict:
    """Get all enriched data for a fixture (stats, events, lineups, prediction, odds)"""
    return await api_football.get_match_enriched(fixture_id)


# === Statistics ===

@router.get("/fixtures/{fixture_id}/statistics")
async def get_fixture_statistics(fixture_id: int) -> List[Dict]:
    """Get match statistics"""
    return await api_football.get_fixture_statistics(fixture_id)


@router.get("/fixtures/{fixture_id}/events")
async def get_fixture_events(fixture_id: int) -> List[Dict]:
    """Get match events (goals, cards, substitutions)"""
    return await api_football.get_fixture_events(fixture_id)


@router.get("/fixtures/{fixture_id}/lineups")
async def get_fixture_lineups(fixture_id: int) -> List[Dict]:
    """Get match lineups"""
    return await api_football.get_fixture_lineups(fixture_id)


# === Predictions & Odds ===

@router.get("/fixtures/{fixture_id}/prediction")
async def get_prediction(fixture_id: int) -> Optional[Dict]:
    """Get AI prediction for fixture"""
    return await api_football.get_prediction(fixture_id)


@router.get("/fixtures/{fixture_id}/odds")
async def get_odds(fixture_id: int) -> List[Dict]:
    """Get betting odds for fixture"""
    return await api_football.get_odds(fixture_id)


# === Teams ===

@router.get("/teams/{team_id}")
async def get_team(team_id: int) -> Optional[Dict]:
    """Get team info"""
    return await api_football.get_team(team_id)


@router.get("/teams/search")
async def search_teams(name: str = Query(..., min_length=2)) -> List[Dict]:
    """Search teams by name"""
    return await api_football.search_teams(name)


# === Injuries ===

@router.get("/fixtures/{fixture_id}/injuries")
async def get_injuries(fixture_id: int) -> List[Dict]:
    """Get injuries for fixture"""
    return await api_football.get_injuries(fixture_id)


# === Standings ===

@router.get("/standings/{league_id}/{season}")
async def get_standings(league_id: int, season: int) -> List[Dict]:
    """Get league standings"""
    return await api_football.get_standings(league_id, season)


# === Head to Head ===

@router.get("/h2h/{team1_id}/{team2_id}")
async def get_head_to_head(
    team1_id: int,
    team2_id: int,
    last: int = Query(10, ge=1, le=20)
) -> List[Dict]:
    """Get head-to-head matches"""
    return await api_football.get_head_to_head(team1_id, team2_id, last)


# === Cache Management (admin) ===

@router.get("/cache/stats")
async def cache_stats() -> Dict:
    """Get cache statistics"""
    return get_cache_stats()


@router.post("/cache/clear")
async def cache_clear() -> Dict:
    """Clear expired cache entries"""
    cleared = clear_expired_cache()
    return {"cleared_entries": cleared}
