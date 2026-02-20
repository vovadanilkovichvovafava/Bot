"""
API-Football (api-sports.io) proxy service with server-side caching.
All requests go through this service to share cache between users.
"""
import httpx
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)

API_FOOTBALL_BASE = "https://v3.football.api-sports.io"


def get_api_football_key() -> str:
    """Get API key at request time, not module load time"""
    return os.getenv("API_FOOTBALL_KEY", "")

# In-memory cache shared between all users
_cache: Dict[str, Dict] = {}

# Different TTLs for different data types
CACHE_TTL = {
    "live": 30,           # Live fixtures - 30 seconds
    "fixtures": 300,      # Fixtures by date - 5 minutes
    "fixture": 60,        # Single fixture - 1 minute
    "statistics": 30,     # Match stats - 30 seconds (live updates)
    "events": 30,         # Match events - 30 seconds
    "lineups": 300,       # Lineups - 5 minutes (don't change during match)
    "predictions": 3600,  # Predictions - 1 hour (static data)
    "odds": 300,          # Odds - 5 minutes
    "standings": 3600,    # Standings - 1 hour
    "teams": 86400,       # Team info - 24 hours
    "injuries": 3600,     # Injuries - 1 hour
    "default": 300,       # Default - 5 minutes
}


def _get_ttl(cache_type: str) -> int:
    """Get TTL for cache type"""
    return CACHE_TTL.get(cache_type, CACHE_TTL["default"])


def _get_cache(key: str) -> Optional[Any]:
    """Get cached value if not expired"""
    if key in _cache:
        entry = _cache[key]
        if datetime.utcnow().timestamp() - entry["ts"] < entry["ttl"]:
            logger.debug(f"Cache HIT: {key}")
            return entry["data"]
        else:
            # Expired, remove from cache
            del _cache[key]
    return None


def _set_cache(key: str, data: Any, cache_type: str = "default"):
    """Set cache with appropriate TTL"""
    ttl = _get_ttl(cache_type)
    _cache[key] = {
        "data": data,
        "ts": datetime.utcnow().timestamp(),
        "ttl": ttl
    }
    logger.debug(f"Cache SET: {key} (TTL: {ttl}s)")


def get_cache_stats() -> Dict:
    """Get cache statistics for monitoring"""
    now = datetime.utcnow().timestamp()
    total = len(_cache)
    expired = sum(1 for k, v in _cache.items() if now - v["ts"] >= v["ttl"])
    return {
        "total_entries": total,
        "expired_entries": expired,
        "active_entries": total - expired,
    }


def clear_expired_cache():
    """Clean up expired cache entries"""
    now = datetime.utcnow().timestamp()
    expired_keys = [k for k, v in _cache.items() if now - v["ts"] >= v["ttl"]]
    for key in expired_keys:
        del _cache[key]
    return len(expired_keys)


class ApiFootballService:
    """API-Football service with caching"""

    async def _request(self, endpoint: str, params: Dict = None, cache_type: str = "default") -> Any:
        """Make request to API-Football with caching"""
        api_key = get_api_football_key()

        if not api_key:
            logger.warning("API_FOOTBALL_KEY not set")
            return []

        params = params or {}
        cache_key = f"{endpoint}:{str(sorted(params.items()))}"

        # Check cache first
        cached = _get_cache(cache_key)
        if cached is not None:
            return cached

        # Make API request
        url = f"{API_FOOTBALL_BASE}{endpoint}"
        headers = {"x-apisports-key": api_key}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=headers,
                    params=params,
                    timeout=15.0
                )
                response.raise_for_status()
                data = response.json()
                result = data.get("response", [])

                # Cache the result
                _set_cache(cache_key, result, cache_type)
                return result

        except httpx.TimeoutException:
            logger.error(f"Timeout fetching {endpoint}")
            return []
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error {e.response.status_code} fetching {endpoint}")
            return []
        except Exception as e:
            logger.error(f"Error fetching {endpoint}: {e}")
            return []

    # === Fixtures ===

    async def get_fixtures_by_date(self, date: str) -> List[Dict]:
        """Get all fixtures for a specific date (YYYY-MM-DD)"""
        return await self._request("/fixtures", {"date": date}, "fixtures")

    async def get_live_fixtures(self) -> List[Dict]:
        """Get all currently live fixtures"""
        return await self._request("/fixtures", {"live": "all"}, "live")

    async def get_fixture(self, fixture_id: int) -> Optional[Dict]:
        """Get single fixture by ID"""
        result = await self._request("/fixtures", {"id": fixture_id}, "fixture")
        return result[0] if result else None

    async def get_league_fixtures(self, league_id: int, next_count: int = 20) -> List[Dict]:
        """Get upcoming fixtures for a league"""
        return await self._request("/fixtures", {"league": league_id, "next": next_count}, "fixtures")

    async def get_fixtures_by_team(self, team_id: int, season: int, next_count: int = 10) -> List[Dict]:
        """Get upcoming fixtures for a specific team"""
        return await self._request("/fixtures", {"team": team_id, "season": season, "next": next_count}, "fixtures")

    # === Statistics ===

    async def get_fixture_statistics(self, fixture_id: int) -> List[Dict]:
        """Get match statistics"""
        return await self._request("/fixtures/statistics", {"fixture": fixture_id}, "statistics")

    async def get_fixture_events(self, fixture_id: int) -> List[Dict]:
        """Get match events (goals, cards, substitutions)"""
        return await self._request("/fixtures/events", {"fixture": fixture_id}, "events")

    async def get_fixture_lineups(self, fixture_id: int) -> List[Dict]:
        """Get match lineups"""
        return await self._request("/fixtures/lineups", {"fixture": fixture_id}, "lineups")

    # === Predictions & Odds ===

    async def get_prediction(self, fixture_id: int) -> Optional[Dict]:
        """Get AI prediction for fixture"""
        result = await self._request("/predictions", {"fixture": fixture_id}, "predictions")
        return result[0] if result else None

    async def get_odds(self, fixture_id: int) -> List[Dict]:
        """Get betting odds for fixture"""
        return await self._request("/odds", {"fixture": fixture_id}, "odds")

    # === Teams ===

    async def get_team(self, team_id: int) -> Optional[Dict]:
        """Get team info"""
        result = await self._request("/teams", {"id": team_id}, "teams")
        return result[0] if result else None

    async def search_teams(self, name: str) -> List[Dict]:
        """Search teams by name"""
        return await self._request("/teams", {"search": name}, "teams")

    # === Injuries ===

    async def get_injuries(self, fixture_id: int) -> List[Dict]:
        """Get injuries for fixture"""
        return await self._request("/injuries", {"fixture": fixture_id}, "injuries")

    # === Standings ===

    async def get_standings(self, league_id: int, season: int) -> List[Dict]:
        """Get league standings"""
        return await self._request("/standings", {"league": league_id, "season": season}, "standings")

    # === Head to Head ===

    async def get_head_to_head(self, team1_id: int, team2_id: int, last: int = 10) -> List[Dict]:
        """Get head-to-head matches"""
        h2h = f"{team1_id}-{team2_id}"
        return await self._request("/fixtures/headtohead", {"h2h": h2h, "last": last}, "fixtures")

    # === Enriched Data (combines multiple calls) ===

    async def get_match_enriched(self, fixture_id: int) -> Dict:
        """Get all enriched data for a match (optimized for detail page)"""
        import asyncio

        # Parallel fetch all data
        results = await asyncio.gather(
            self.get_fixture(fixture_id),
            self.get_fixture_statistics(fixture_id),
            self.get_fixture_events(fixture_id),
            self.get_fixture_lineups(fixture_id),
            self.get_prediction(fixture_id),
            self.get_odds(fixture_id),
            self.get_injuries(fixture_id),
            return_exceptions=True
        )

        return {
            "fixture": results[0] if not isinstance(results[0], Exception) else None,
            "statistics": results[1] if not isinstance(results[1], Exception) else [],
            "events": results[2] if not isinstance(results[2], Exception) else [],
            "lineups": results[3] if not isinstance(results[3], Exception) else [],
            "prediction": results[4] if not isinstance(results[4], Exception) else None,
            "odds": results[5] if not isinstance(results[5], Exception) else [],
            "injuries": results[6] if not isinstance(results[6], Exception) else [],
        }


# Singleton instance
api_football = ApiFootballService()
