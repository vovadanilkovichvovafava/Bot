import httpx
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


def get_football_api_key() -> str:
    """Get API key at request time, not module load time"""
    return os.getenv("FOOTBALL_API_KEY", "")

# Football-Data.org API
FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4"

# League codes mapping
LEAGUE_IDS = {
    "PL": 2021,    # Premier League
    "PD": 2014,    # La Liga
    "BL1": 2002,   # Bundesliga
    "SA": 2019,    # Serie A
    "FL1": 2015,   # Ligue 1
    "CL": 2001,    # Champions League
    "EL": 2146,    # Europa League
    "ELC": 2016,   # Championship
    "DED": 2003,   # Eredivisie
    "PPL": 2017,   # Primeira Liga
    "BSA": 2013,   # Brasileirão
}

# Cache for matches (simple in-memory cache)
_cache: Dict[str, Dict] = {}
CACHE_TTL = 300  # 5 minutes


def _get_cache(key: str) -> Optional[Dict]:
    if key in _cache:
        data = _cache[key]
        if datetime.utcnow().timestamp() - data["timestamp"] < CACHE_TTL:
            return data["value"]
    return None


def _set_cache(key: str, value: any):
    _cache[key] = {
        "value": value,
        "timestamp": datetime.utcnow().timestamp()
    }


async def fetch_matches(date_from: str = None, date_to: str = None, league: str = None) -> List[Dict]:
    """Fetch scheduled matches from Football-Data.org API

    Note: date_from/date_to parameters are kept for API compatibility but not used
    for filtering since system time may differ from real API time.
    All scheduled matches are returned, sorted by date.
    """
    api_key = get_football_api_key()

    if not api_key:
        logger.warning("FOOTBALL_API_KEY not set, returning empty list")
        return []

    # Check cache
    cache_key = f"matches_scheduled_{league or 'all'}"
    cached = _get_cache(cache_key)
    if cached is not None:
        return cached

    headers = {"X-Auth-Token": api_key}
    all_matches = []

    # Determine which leagues to fetch
    if league and league in LEAGUE_IDS:
        leagues_to_fetch = [league]
    else:
        # Free tier: fetch from top leagues individually
        leagues_to_fetch = ["PL", "PD", "BL1", "SA", "FL1"]

    async with httpx.AsyncClient() as client:
        for lg_code in leagues_to_fetch:
            try:
                url = f"{FOOTBALL_DATA_BASE_URL}/competitions/{LEAGUE_IDS[lg_code]}/matches"
                # Use status=SCHEDULED to get upcoming matches
                params = {"status": "SCHEDULED"}

                response = await client.get(url, headers=headers, params=params, timeout=15.0)

                if response.status_code != 200:
                    logger.warning(f"Failed to fetch {lg_code}: {response.status_code}")
                    continue

                data = response.json()

                for match in data.get("matches", []):
                    try:
                        all_matches.append({
                            "id": match["id"],
                            "home_team": {
                                "name": match["homeTeam"]["name"],
                                "logo": match["homeTeam"].get("crest")
                            },
                            "away_team": {
                                "name": match["awayTeam"]["name"],
                                "logo": match["awayTeam"].get("crest")
                            },
                            "league": match["competition"]["name"],
                            "league_code": match["competition"].get("code", lg_code),
                            "match_date": match["utcDate"],
                            "status": match["status"].lower(),
                            "home_score": match["score"]["fullTime"]["home"],
                            "away_score": match["score"]["fullTime"]["away"],
                        })
                    except (KeyError, TypeError) as e:
                        continue

            except Exception as e:
                logger.error(f"Error fetching {lg_code}: {type(e).__name__}: {e}")
                continue

    # Sort by match date
    all_matches.sort(key=lambda x: x["match_date"])

    _set_cache(cache_key, all_matches)
    return all_matches


async def fetch_match_details(match_id: int) -> Optional[Dict]:
    """Fetch single match details with head-to-head"""
    api_key = get_football_api_key()

    if not api_key:
        logger.warning("FOOTBALL_API_KEY not set for match details")
        return None

    cache_key = f"match_{match_id}"
    cached = _get_cache(cache_key)
    if cached:
        return cached

    try:
        headers = {"X-Auth-Token": api_key}

        async with httpx.AsyncClient() as client:
            # Get match details
            response = await client.get(
                f"{FOOTBALL_DATA_BASE_URL}/matches/{match_id}",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            match = response.json()

            # Get head-to-head
            h2h_response = await client.get(
                f"{FOOTBALL_DATA_BASE_URL}/matches/{match_id}/head2head",
                headers=headers,
                params={"limit": 10},
                timeout=10.0
            )
            h2h_data = h2h_response.json() if h2h_response.status_code == 200 else {}

        # Process head-to-head
        h2h = h2h_data.get("aggregates", {})

        result = {
            "id": match["id"],
            "home_team": {
                "name": match["homeTeam"]["name"],
                "logo": match["homeTeam"].get("crest")
            },
            "away_team": {
                "name": match["awayTeam"]["name"],
                "logo": match["awayTeam"].get("crest")
            },
            "league": match["competition"]["name"],
            "league_code": match["competition"]["code"],
            "match_date": match["utcDate"],
            "status": match["status"].lower(),
            "head_to_head": {
                "total_matches": h2h.get("numberOfMatches", 0),
                "home_wins": h2h.get("homeTeam", {}).get("wins", 0),
                "away_wins": h2h.get("awayTeam", {}).get("wins", 0),
                "draws": h2h.get("homeTeam", {}).get("draws", 0),
            },
            "home_score": match["score"]["fullTime"]["home"],
            "away_score": match["score"]["fullTime"]["away"],
        }

        _set_cache(cache_key, result)
        return result

    except Exception as e:
        logger.error(f"Error fetching match {match_id}: {e}")
        return None


async def fetch_standings(league_code: str) -> List[Dict]:
    """Fetch league standings"""
    api_key = get_football_api_key()

    if not api_key:
        logger.warning("FOOTBALL_API_KEY not set for standings")
        return []

    if league_code not in LEAGUE_IDS:
        logger.warning(f"Unknown league code: {league_code}")
        return []

    cache_key = f"standings_{league_code}"
    cached = _get_cache(cache_key)
    if cached:
        return cached

    try:
        headers = {"X-Auth-Token": api_key}
        league_id = LEAGUE_IDS[league_code]

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{FOOTBALL_DATA_BASE_URL}/competitions/{league_id}/standings",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()

        standings = []
        for standing in data.get("standings", []):
            if standing["type"] == "TOTAL":
                for team in standing["table"]:
                    standings.append({
                        "position": team["position"],
                        "team": team["team"]["name"],
                        "team_logo": team["team"].get("crest"),
                        "played": team["playedGames"],
                        "won": team["won"],
                        "drawn": team["draw"],
                        "lost": team["lost"],
                        "goals_for": team["goalsFor"],
                        "goals_against": team["goalsAgainst"],
                        "goal_difference": team["goalDifference"],
                        "points": team["points"],
                    })

        _set_cache(cache_key, standings)
        return standings

    except Exception as e:
        logger.error(f"Error fetching standings for {league_code}: {e}")
        return []


async def fetch_leagues() -> List[Dict]:
    """Fetch available competitions"""

    cache_key = "leagues"
    cached = _get_cache(cache_key)
    if cached:
        return cached

    leagues = [
        {"code": "PL", "name": "Premier League", "country": "England", "icon": "england"},
        {"code": "PD", "name": "La Liga", "country": "Spain", "icon": "spain"},
        {"code": "BL1", "name": "Bundesliga", "country": "Germany", "icon": "germany"},
        {"code": "SA", "name": "Serie A", "country": "Italy", "icon": "italy"},
        {"code": "FL1", "name": "Ligue 1", "country": "France", "icon": "france"},
        {"code": "CL", "name": "Champions League", "country": "Europe", "icon": "champions"},
        {"code": "EL", "name": "Europa League", "country": "Europe", "icon": "europa"},
    ]

    _set_cache(cache_key, leagues)
    return leagues
