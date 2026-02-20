"""
API-Football proxy endpoints with server-side caching.
Frontend calls these endpoints instead of API-Football directly.
"""
import json
import logging
import time
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any, Optional

import anthropic
import os

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


@router.get("/fixtures/league/{league_id}")
async def get_league_fixtures(league_id: int, next_count: int = Query(20, ge=1, le=50)) -> List[Dict]:
    """Get upcoming fixtures for a league"""
    try:
        return await api_football.get_league_fixtures(league_id, next_count)
    except Exception as e:
        logger.error(f"Error fetching fixtures for league {league_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch league fixtures")


@router.get("/fixtures/team/{team_id}")
async def get_fixtures_by_team(
    team_id: int,
    season: int = Query(2026, ge=2000, le=2030),
    next: int = Query(10, ge=1, le=30, alias="next")
) -> List[Dict]:
    """Get upcoming fixtures for a specific team"""
    try:
        return await api_football.get_fixtures_by_team(team_id, season, next)
    except Exception as e:
        logger.error(f"Error fetching fixtures for team {team_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch team fixtures")


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

@router.get("/teams/search")
async def search_teams(name: str = Query(..., min_length=2)) -> List[Dict]:
    """Search teams by name"""
    try:
        return await api_football.search_teams(name)
    except Exception as e:
        logger.error(f"Error searching teams for '{name}': {e}")
        raise HTTPException(status_code=502, detail="Failed to search teams")


@router.get("/teams/{team_id}")
async def get_team(team_id: int) -> Optional[Dict]:
    """Get team info"""
    try:
        return await api_football.get_team(team_id)
    except Exception as e:
        logger.error(f"Error fetching team {team_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch team")


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


# === Smart Bet (AI-powered best bet for PRO users) ===

# Top league IDs for prioritization
_SMART_BET_TOP_LEAGUES = {39, 140, 135, 78, 61, 2, 3, 848}  # PL, LaLiga, SerieA, Bundesliga, Ligue1, UCL, UEL, EFL

# Cache: shared between all users, 45 minutes TTL
_smart_bet_cache: Dict[str, Any] = {}
_SMART_BET_TTL = 45 * 60  # 45 minutes


@router.get("/smart-bet")
async def get_smart_bet() -> Dict:
    """
    Get AI-recommended best bet for PRO users' home banner.
    Priority: LIVE top teams > LIVE any teams > best upcoming match today.
    Cached for 45 minutes.
    """
    now = time.time()

    # Check cache
    if _smart_bet_cache.get("data") and now - _smart_bet_cache.get("ts", 0) < _SMART_BET_TTL:
        logger.info("Smart bet cache HIT")
        return _smart_bet_cache["data"]

    logger.info("Smart bet cache MISS — computing...")

    try:
        result = await _compute_smart_bet()
        _smart_bet_cache["data"] = result
        _smart_bet_cache["ts"] = now
        return result
    except Exception as e:
        logger.error(f"Smart bet error: {e}")
        # Return cached data even if expired, as fallback
        if _smart_bet_cache.get("data"):
            return _smart_bet_cache["data"]
        raise HTTPException(status_code=502, detail="Failed to compute smart bet")


async def _compute_smart_bet() -> Dict:
    """Find the best match and use AI to pick the best market."""

    # Step 1: Get LIVE fixtures
    live_fixtures = []
    try:
        live_fixtures = await api_football.get_live_fixtures()
    except Exception as e:
        logger.warning(f"Failed to fetch live fixtures: {e}")

    # Step 2: Get today's fixtures (for fallback)
    today_fixtures = []
    try:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        today_fixtures = await api_football.get_fixtures_by_date(today)
    except Exception as e:
        logger.warning(f"Failed to fetch today fixtures: {e}")

    # Step 3: Pick the best match by priority
    chosen_fixture = None
    source = "none"

    # Priority 1: LIVE matches from top leagues
    live_top = [f for f in live_fixtures if f.get("league", {}).get("id") in _SMART_BET_TOP_LEAGUES]
    if live_top:
        chosen_fixture = live_top[0]
        source = "live_top"
    # Priority 2: Any LIVE match
    elif live_fixtures:
        chosen_fixture = live_fixtures[0]
        source = "live_any"
    # Priority 3: Best upcoming match today (top league, not started)
    else:
        upcoming = [
            f for f in today_fixtures
            if f.get("fixture", {}).get("status", {}).get("short") == "NS"
            and f.get("teams", {}).get("home") and f.get("teams", {}).get("away")
        ]
        # Sort: top leagues first, then by time
        upcoming.sort(key=lambda f: (
            0 if f.get("league", {}).get("id") in _SMART_BET_TOP_LEAGUES else 1,
            f.get("fixture", {}).get("date", "")
        ))
        if upcoming:
            chosen_fixture = upcoming[0]
            source = "today"

    if not chosen_fixture:
        return {"found": False}

    fixture_id = chosen_fixture.get("fixture", {}).get("id")
    home = chosen_fixture.get("teams", {}).get("home", {})
    away = chosen_fixture.get("teams", {}).get("away", {})
    league = chosen_fixture.get("league", {})
    goals = chosen_fixture.get("goals", {})
    status = chosen_fixture.get("fixture", {}).get("status", {})
    is_live = status.get("short") in ("1H", "2H", "HT")

    # Step 4: Get prediction data from API-Football
    prediction = None
    try:
        prediction = await api_football.get_prediction(fixture_id)
    except Exception:
        pass

    # Step 5: Ask Claude AI for the best bet recommendation
    bet_recommendation = await _ai_pick_best_bet(
        home_team=home.get("name", ""),
        away_team=away.get("name", ""),
        league_name=league.get("name", ""),
        is_live=is_live,
        score=f"{goals.get('home', 0)}-{goals.get('away', 0)}" if is_live else None,
        minute=status.get("elapsed"),
        prediction=prediction,
    )

    return {
        "found": True,
        "source": source,
        "is_live": is_live,
        "fixture_id": fixture_id,
        "home": {
            "name": home.get("name", ""),
            "logo": home.get("logo", ""),
            "id": home.get("id"),
        },
        "away": {
            "name": away.get("name", ""),
            "logo": away.get("logo", ""),
            "id": away.get("id"),
        },
        "league": {
            "name": league.get("name", ""),
            "logo": league.get("logo", ""),
        },
        "score": f"{goals.get('home', 0)}-{goals.get('away', 0)}" if is_live else None,
        "minute": status.get("elapsed") if is_live else None,
        "kick_off": chosen_fixture.get("fixture", {}).get("date"),
        "bet": bet_recommendation,
    }


async def _ai_pick_best_bet(
    home_team: str, away_team: str, league_name: str,
    is_live: bool, score: str | None, minute: int | None,
    prediction: dict | None,
) -> Dict:
    """Use Claude AI to pick the single most attractive bet."""

    claude_key = os.getenv("CLAUDE_API_KEY", "")
    if not claude_key:
        # Fallback without AI
        return _fallback_bet(prediction, home_team, away_team)

    # Build context from prediction data
    ctx_parts = [f"Match: {home_team} vs {away_team}", f"League: {league_name}"]
    if is_live:
        ctx_parts.append(f"LIVE: {score} (minute {minute}')")
    if prediction:
        winner = prediction.get("predictions", {}).get("winner", {})
        if winner.get("name"):
            ctx_parts.append(f"API prediction winner: {winner['name']} (comment: {prediction.get('predictions', {}).get('comment', '')})")
        pct = prediction.get("predictions", {}).get("percent", {})
        if pct:
            ctx_parts.append(f"Win probabilities: Home {pct.get('home', '?')} Draw {pct.get('draw', '?')} Away {pct.get('away', '?')}")
        comparison = prediction.get("comparison", {})
        if comparison:
            for key, vals in comparison.items():
                ctx_parts.append(f"{key}: Home {vals.get('home', '?')} vs Away {vals.get('away', '?')}")

    context = "\n".join(ctx_parts)

    prompt = f"""You are a professional sports betting analyst. Based on this match data, pick THE SINGLE BEST bet.

{context}

Respond in this exact JSON format only:
{{"market": "short market name (e.g. Over 2.5, BTTS Yes, Home Win, Draw, Away Win, 1X, X2, Under 3.5)", "odds": estimated fair odds as number (e.g. 1.85), "confidence": confidence 50-95 as number, "reason": "one short sentence why this bet is good"}}

Pick a bet that is ATTRACTIVE — good value with reasonable confidence. Only respond with JSON."""

    try:
        client = anthropic.Anthropic(api_key=claude_key)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(text[start:end])
            if "market" in parsed:
                return {
                    "market": str(parsed.get("market", "")),
                    "odds": float(parsed.get("odds", 1.80)),
                    "confidence": int(parsed.get("confidence", 65)),
                    "reason": str(parsed.get("reason", "")),
                }
    except Exception as e:
        logger.error(f"Smart bet AI error: {e}")

    return _fallback_bet(prediction, home_team, away_team)


def _fallback_bet(prediction: dict | None, home_team: str, away_team: str) -> Dict:
    """Fallback bet when AI is unavailable."""
    if prediction:
        pct = prediction.get("predictions", {}).get("percent", {})
        home_pct = int((pct.get("home") or "0").replace("%", "") or 0)
        away_pct = int((pct.get("away") or "0").replace("%", "") or 0)
        if home_pct >= 55:
            return {"market": "Home Win", "odds": round(100 / max(home_pct, 1), 2), "confidence": home_pct, "reason": f"{home_team} are strong favourites"}
        elif away_pct >= 55:
            return {"market": "Away Win", "odds": round(100 / max(away_pct, 1), 2), "confidence": away_pct, "reason": f"{away_team} are strong favourites"}
    return {"market": "Over 2.5", "odds": 1.85, "confidence": 62, "reason": "Competitive match, goals expected"}


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
