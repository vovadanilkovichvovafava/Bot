"""
Fonbet API Routes — real odds, live scores, deeplinks, match finding.

All endpoints proxy through our backend → iframe-proxy → Fonbet.
Frontend never talks to Fonbet directly.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.fonbet_api import (
    get_football_events,
    get_live_events,
    get_top_leagues,
    get_serie_a,
    get_event_detail,
    find_match,
    generate_deeplink,
    get_cache_stats,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class FindMatchRequest(BaseModel):
    home_team: str
    away_team: str
    match_date: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/football")
async def football_events(lang: str = "en"):
    """All football events (~3000) with odds and deeplinks."""
    try:
        return await get_football_events(lang)
    except Exception as e:
        logger.error("Fonbet football error: %s", e)
        raise HTTPException(status_code=502, detail="Fonbet proxy unavailable")


@router.get("/live")
async def live_events(lang: str = "en"):
    """Live football events with scores, timer, and odds."""
    try:
        return await get_live_events(lang)
    except Exception as e:
        logger.error("Fonbet live error: %s", e)
        raise HTTPException(status_code=502, detail="Fonbet proxy unavailable")


@router.get("/top-leagues")
async def top_leagues_events(lang: str = "en"):
    """Events from top leagues: Serie A, PL, Bundesliga, La Liga, Ligue 1, CL, EL, Ekstraklasa."""
    try:
        return await get_top_leagues(lang)
    except Exception as e:
        logger.error("Fonbet top-leagues error: %s", e)
        raise HTTPException(status_code=502, detail="Fonbet proxy unavailable")


@router.get("/serie-a")
async def serie_a_events(lang: str = "en"):
    """Serie A events only (primary market — 78% users are Italian)."""
    try:
        return await get_serie_a(lang)
    except Exception as e:
        logger.error("Fonbet serie-a error: %s", e)
        raise HTTPException(status_code=502, detail="Fonbet proxy unavailable")


@router.get("/event/{event_id}")
async def event_detail(event_id: int, lang: str = "en"):
    """Single event detail with all available markets."""
    try:
        event = await get_event_detail(event_id, lang)
    except Exception as e:
        logger.error("Fonbet event detail error: %s", e)
        raise HTTPException(status_code=502, detail="Fonbet proxy unavailable")

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return event


@router.post("/find-match")
async def find_match_endpoint(req: FindMatchRequest, lang: str = "en"):
    """
    Find a Fonbet event by team names. Key endpoint for linking
    API-Football fixtures to Fonbet deeplinks + real odds.
    """
    try:
        result = await find_match(
            home_team=req.home_team,
            away_team=req.away_team,
            match_date=req.match_date,
            lang=lang,
        )
    except Exception as e:
        logger.error("Fonbet find-match error: %s", e)
        raise HTTPException(status_code=502, detail="Fonbet proxy unavailable")

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No match found for {req.home_team} vs {req.away_team}",
        )

    return result


@router.get("/deeplink/{tournament_id}/{event_id}")
async def deeplink(tournament_id: int, event_id: int):
    """Generate deeplink URLs without fetching from Fonbet (instant)."""
    return generate_deeplink(tournament_id, event_id)


@router.get("/cache-stats")
async def cache_stats():
    """Server-side cache statistics (debug)."""
    return get_cache_stats()
