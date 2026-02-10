"""
API-Football proxy endpoints with server-side caching.
Frontend calls these endpoints instead of API-Football directly.
"""
import logging
from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any, Optional

from app.services.api_football import api_football, get_cache_stats, clear_expired_cache

router = APIRouter()
logger = logging.getLogger(__name__)


# === Fixtures ===

@router.get("/fixtures/date/{date}")
async def get_fixtures_by_date(date: str) -> List[Dict]:
    """Get all fixtures for a specific date (YYYY-MM-DD)"""
    try:
        return await api_football.get_fixtures_by_date(date)
    except Exception as e:
        logger.error(f"Error fetching fixtures for date {date}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch fixtures")


@router.get("/fixtures/live")
async def get_live_fixtures() -> List[Dict]:
    """Get all currently live fixtures"""
    try:
        return await api_football.get_live_fixtures()
    except Exception as e:
        logger.error(f"Error fetching live fixtures: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch live fixtures")


@router.get("/fixtures/{fixture_id}")
async def get_fixture(fixture_id: int) -> Optional[Dict]:
    """Get single fixture by ID"""
    try:
        return await api_football.get_fixture(fixture_id)
    except Exception as e:
        logger.error(f"Error fetching fixture {fixture_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch fixture")


@router.get("/fixtures/{fixture_id}/enriched")
async def get_fixture_enriched(fixture_id: int) -> Dict:
    """Get all enriched data for a fixture (stats, events, lineups, prediction, odds)"""
    try:
        return await api_football.get_match_enriched(fixture_id)
    except Exception as e:
        logger.error(f"Error fetching enriched fixture {fixture_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch match data")


# === Statistics ===

@router.get("/fixtures/{fixture_id}/statistics")
async def get_fixture_statistics(fixture_id: int) -> List[Dict]:
    """Get match statistics"""
    try:
        return await api_football.get_fixture_statistics(fixture_id)
    except Exception as e:
        logger.error(f"Error fetching statistics for fixture {fixture_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch statistics")


@router.get("/fixtures/{fixture_id}/events")
async def get_fixture_events(fixture_id: int) -> List[Dict]:
    """Get match events (goals, cards, substitutions)"""
    try:
        return await api_football.get_fixture_events(fixture_id)
    except Exception as e:
        logger.error(f"Error fetching events for fixture {fixture_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch events")


@router.get("/fixtures/{fixture_id}/lineups")
async def get_fixture_lineups(fixture_id: int) -> List[Dict]:
    """Get match lineups"""
    try:
        return await api_football.get_fixture_lineups(fixture_id)
    except Exception as e:
        logger.error(f"Error fetching lineups for fixture {fixture_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch lineups")


# === Predictions & Odds ===

@router.get("/fixtures/{fixture_id}/prediction")
async def get_prediction(fixture_id: int) -> Optional[Dict]:
    """Get AI prediction for fixture"""
    try:
        return await api_football.get_prediction(fixture_id)
    except Exception as e:
        logger.error(f"Error fetching prediction for fixture {fixture_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch prediction")


@router.get("/fixtures/{fixture_id}/odds")
async def get_odds(fixture_id: int) -> List[Dict]:
    """Get betting odds for fixture"""
    try:
        return await api_football.get_odds(fixture_id)
    except Exception as e:
        logger.error(f"Error fetching odds for fixture {fixture_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch odds")


# === Teams ===

@router.get("/teams/{team_id}")
async def get_team(team_id: int) -> Optional[Dict]:
    """Get team info"""
    try:
        return await api_football.get_team(team_id)
    except Exception as e:
        logger.error(f"Error fetching team {team_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch team")


@router.get("/teams/search")
async def search_teams(name: str = Query(..., min_length=2)) -> List[Dict]:
    """Search teams by name"""
    try:
        return await api_football.search_teams(name)
    except Exception as e:
        logger.error(f"Error searching teams for '{name}': {e}")
        raise HTTPException(status_code=502, detail="Failed to search teams")


# === Injuries ===

@router.get("/fixtures/{fixture_id}/injuries")
async def get_injuries(fixture_id: int) -> List[Dict]:
    """Get injuries for fixture"""
    try:
        return await api_football.get_injuries(fixture_id)
    except Exception as e:
        logger.error(f"Error fetching injuries for fixture {fixture_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch injuries")


# === Standings ===

@router.get("/standings/{league_id}/{season}")
async def get_standings(league_id: int, season: int) -> List[Dict]:
    """Get league standings"""
    try:
        return await api_football.get_standings(league_id, season)
    except Exception as e:
        logger.error(f"Error fetching standings for league {league_id}, season {season}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch standings")


# === Head to Head ===

@router.get("/h2h/{team1_id}/{team2_id}")
async def get_head_to_head(
    team1_id: int,
    team2_id: int,
    last: int = Query(10, ge=1, le=20)
) -> List[Dict]:
    """Get head-to-head matches"""
    try:
        return await api_football.get_head_to_head(team1_id, team2_id, last)
    except Exception as e:
        logger.error(f"Error fetching H2H for teams {team1_id} vs {team2_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch head-to-head data")


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
