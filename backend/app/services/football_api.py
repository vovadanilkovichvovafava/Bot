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

# Football-Data.org competition ID → API-Football league ID
_FDO_TO_AF_LEAGUE = {
    2021: 39,   # Premier League
    2014: 140,  # La Liga
    2002: 78,   # Bundesliga
    2019: 135,  # Serie A
    2015: 61,   # Ligue 1
    2001: 2,    # Champions League
    2146: 3,    # Europa League
    2016: 40,   # Championship
    2003: 88,   # Eredivisie
    2017: 94,   # Primeira Liga
    2013: 71,   # Brasileirão
}

# Football-Data.org status → API-Football status
_FDO_STATUS_MAP = {
    "SCHEDULED": ("NS", "Not Started"),
    "TIMED":     ("NS", "Not Started"),
    "IN_PLAY":   ("2H", "Second Half"),
    "PAUSED":    ("HT", "Halftime"),
    "FINISHED":  ("FT", "Match Finished"),
    "POSTPONED": ("PST", "Match Postponed"),
    "CANCELLED": ("CANC", "Match Cancelled"),
    "SUSPENDED": ("SUSP", "Match Suspended"),
    "AWARDED":   ("AWD", "Match Awarded"),
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


def _convert_fdo_to_fixture(match: Dict) -> Dict:
    """Convert a Football-Data.org match to API-Football fixture format."""
    fdo_status = match.get("status", "SCHEDULED")
    af_short, af_long = _FDO_STATUS_MAP.get(fdo_status, ("NS", "Not Started"))

    comp = match.get("competition", {})
    comp_id = comp.get("id")
    af_league_id = _FDO_TO_AF_LEAGUE.get(comp_id, comp_id or 0)

    score = match.get("score", {})
    ft = score.get("fullTime", {})
    home_goals = ft.get("home")
    away_goals = ft.get("away")

    home_team = match.get("homeTeam", {})
    away_team = match.get("awayTeam", {})

    # Determine winner
    home_winner = None
    away_winner = None
    if home_goals is not None and away_goals is not None:
        if home_goals > away_goals:
            home_winner, away_winner = True, False
        elif away_goals > home_goals:
            home_winner, away_winner = False, True
        else:
            home_winner, away_winner = None, None

    return {
        "fixture": {
            "id": match.get("id", 0),
            "date": match.get("utcDate", ""),
            "timestamp": int(datetime.fromisoformat(match["utcDate"].replace("Z", "+00:00")).timestamp()) if match.get("utcDate") else 0,
            "status": {
                "short": af_short,
                "long": af_long,
                "elapsed": match.get("minute") if fdo_status == "IN_PLAY" else None,
            },
        },
        "league": {
            "id": af_league_id,
            "name": comp.get("name", ""),
            "country": match.get("area", {}).get("name", ""),
            "logo": comp.get("emblem", ""),
            "season": match.get("season", {}).get("id"),
        },
        "teams": {
            "home": {
                "id": home_team.get("id", 0),
                "name": home_team.get("name", ""),
                "logo": home_team.get("crest", ""),
                "winner": home_winner,
            },
            "away": {
                "id": away_team.get("id", 0),
                "name": away_team.get("name", ""),
                "logo": away_team.get("crest", ""),
                "winner": away_winner,
            },
        },
        "goals": {
            "home": home_goals,
            "away": away_goals,
        },
        "_fallback": True,
    }


async def fetch_fixtures_fallback(date: str) -> List[Dict]:
    """Fetch matches for a date from Football-Data.org, returned in API-Football format.
    Used as fallback when API-Football rate limit is hit.
    """
    api_key = get_football_api_key()
    if not api_key:
        logger.warning("FOOTBALL_API_KEY not set for fallback")
        return []

    cache_key = f"fdo_fixtures_{date}"
    cached = _get_cache(cache_key)
    if cached is not None:
        return cached

    headers = {"X-Auth-Token": api_key}
    all_fixtures = []
    leagues_to_fetch = ["PL", "PD", "BL1", "SA", "FL1", "CL", "EL"]

    async with httpx.AsyncClient() as client:
        for lg_code in leagues_to_fetch:
            try:
                url = f"{FOOTBALL_DATA_BASE_URL}/competitions/{LEAGUE_IDS[lg_code]}/matches"
                params = {"dateFrom": date, "dateTo": date}

                response = await client.get(url, headers=headers, params=params, timeout=15.0)
                if response.status_code != 200:
                    logger.warning(f"FDO fallback: failed to fetch {lg_code}: {response.status_code}")
                    continue

                data = response.json()
                for match in data.get("matches", []):
                    try:
                        all_fixtures.append(_convert_fdo_to_fixture(match))
                    except Exception as e:
                        logger.debug(f"FDO fallback: skip match conversion: {e}")
                        continue

            except Exception as e:
                logger.error(f"FDO fallback error for {lg_code}: {e}")
                continue

    all_fixtures.sort(key=lambda f: f["fixture"]["date"])
    logger.info(f"FDO fallback: {len(all_fixtures)} fixtures for {date}")

    _set_cache(cache_key, all_fixtures)
    return all_fixtures


async def fetch_live_fallback() -> List[Dict]:
    """Fetch live matches from Football-Data.org, returned in API-Football format.
    Used as fallback when API-Football rate limit is hit.
    """
    api_key = get_football_api_key()
    if not api_key:
        return []

    cache_key = "fdo_live"
    cached = _get_cache(cache_key)
    if cached is not None:
        return cached

    headers = {"X-Auth-Token": api_key}
    live_fixtures = []
    leagues_to_fetch = ["PL", "PD", "BL1", "SA", "FL1", "CL", "EL"]

    async with httpx.AsyncClient() as client:
        for lg_code in leagues_to_fetch:
            try:
                url = f"{FOOTBALL_DATA_BASE_URL}/competitions/{LEAGUE_IDS[lg_code]}/matches"
                params = {"status": "IN_PLAY,PAUSED"}

                response = await client.get(url, headers=headers, params=params, timeout=15.0)
                if response.status_code != 200:
                    continue

                data = response.json()
                for match in data.get("matches", []):
                    try:
                        live_fixtures.append(_convert_fdo_to_fixture(match))
                    except Exception:
                        continue

            except Exception as e:
                logger.error(f"FDO live fallback error for {lg_code}: {e}")
                continue

    logger.info(f"FDO live fallback: {len(live_fixtures)} live fixtures")

    # Short TTL for live data (60 seconds)
    _cache[cache_key] = {
        "value": live_fixtures,
        "timestamp": datetime.utcnow().timestamp()
    }
    return live_fixtures
