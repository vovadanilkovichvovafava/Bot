import httpx
import asyncio
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

FOOTBALL_API_KEY = os.getenv("FOOTBALL_API_KEY", "")

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

# Smart in-memory cache with per-type TTL
_cache: Dict[str, Dict] = {}

# TTL per data type (seconds)
CACHE_TTLS = {
    "matches":    900,   # 15 min — scheduled matches don't change often
    "match":      1800,  # 30 min — single match + H2H is mostly static
    "standings":  7200,  # 2 hours — only changes after matches finish
    "leagues":    86400, # 24 hours — static list
    "form":       1800,  # 30 min — team form changes rarely
    "result":     3600,  # 1 hour — finished match result is final
}
DEFAULT_TTL = 300  # 5 min fallback

_cache_hits = 0
_cache_misses = 0


def _get_ttl(key: str) -> int:
    """Get TTL based on cache key prefix"""
    for prefix, ttl in CACHE_TTLS.items():
        if key.startswith(prefix):
            return ttl
    return DEFAULT_TTL


def _get_cache(key: str) -> Optional[any]:
    global _cache_hits, _cache_misses
    if key in _cache:
        data = _cache[key]
        ttl = _get_ttl(key)
        age = datetime.utcnow().timestamp() - data["timestamp"]
        if age < ttl:
            _cache_hits += 1
            return data["value"]
        else:
            # Expired — remove
            del _cache[key]
    _cache_misses += 1
    return None


def _set_cache(key: str, value: any):
    _cache[key] = {
        "value": value,
        "timestamp": datetime.utcnow().timestamp()
    }
    # Periodic cleanup: every 50 writes, purge expired entries
    if len(_cache) % 50 == 0:
        _cleanup_cache()


def _cleanup_cache():
    """Remove expired entries to prevent memory leaks"""
    now = datetime.utcnow().timestamp()
    expired = [
        k for k, v in _cache.items()
        if now - v["timestamp"] > _get_ttl(k)
    ]
    for k in expired:
        del _cache[k]
    if expired:
        logger.info(f"Cache cleanup: removed {len(expired)} expired entries, {len(_cache)} remaining")


def get_cache_stats() -> Dict:
    """Get cache statistics for monitoring"""
    return {
        "entries": len(_cache),
        "hits": _cache_hits,
        "misses": _cache_misses,
        "hit_rate": round(_cache_hits / max(_cache_hits + _cache_misses, 1) * 100, 1),
    }


async def _fetch_league_matches(client: httpx.AsyncClient, lg_code: str, headers: dict, params: dict) -> List[Dict]:
    """Fetch matches for a single league"""
    try:
        url = f"{FOOTBALL_DATA_BASE_URL}/competitions/{LEAGUE_IDS[lg_code]}/matches"
        response = await client.get(url, headers=headers, params=params, timeout=10.0)

        if response.status_code != 200:
            logger.warning(f"Failed to fetch {lg_code}: {response.status_code}")
            return []

        data = response.json()
        matches = []

        for match in data.get("matches", []):
            try:
                matches.append({
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
                    "matchday": match.get("matchday"),
                    "status": match["status"].lower(),
                    "home_score": match["score"]["fullTime"]["home"],
                    "away_score": match["score"]["fullTime"]["away"],
                })
            except (KeyError, TypeError):
                continue

        return matches

    except Exception as e:
        logger.error(f"Error fetching {lg_code}: {type(e).__name__}: {e}")
        return []


async def fetch_matches(date_from: str = None, date_to: str = None, league: str = None) -> List[Dict]:
    """Fetch matches from Football-Data.org API - PARALLEL requests"""

    if not FOOTBALL_API_KEY:
        logger.warning("FOOTBALL_API_KEY not set, returning empty list")
        return []

    # Check cache
    cache_key = f"matches_{date_from}_{date_to}_{league}"
    cached = _get_cache(cache_key)
    if cached:
        return cached

    headers = {"X-Auth-Token": FOOTBALL_API_KEY}
    params = {}
    if date_from:
        params["dateFrom"] = date_from
    if date_to:
        params["dateTo"] = date_to

    # Determine which leagues to fetch
    if league and league in LEAGUE_IDS:
        leagues_to_fetch = [league]
    else:
        # Free tier: fetch from top leagues
        leagues_to_fetch = ["PL", "PD", "BL1", "SA", "FL1"]

    # Fetch all leagues in PARALLEL
    async with httpx.AsyncClient() as client:
        tasks = [
            _fetch_league_matches(client, lg_code, headers, params)
            for lg_code in leagues_to_fetch
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    # Combine results
    all_matches = []
    for result in results:
        if isinstance(result, list):
            all_matches.extend(result)

    # Sort by match date
    all_matches.sort(key=lambda x: x["match_date"])

    _set_cache(cache_key, all_matches)
    return all_matches


async def fetch_match_details(match_id: int) -> Optional[Dict]:
    """Fetch single match details with head-to-head"""

    if not FOOTBALL_API_KEY:
        return None

    cache_key = f"match_{match_id}"
    cached = _get_cache(cache_key)
    if cached:
        return cached

    try:
        headers = {"X-Auth-Token": FOOTBALL_API_KEY}

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

    if not FOOTBALL_API_KEY or league_code not in LEAGUE_IDS:
        return []

    cache_key = f"standings_{league_code}"
    cached = _get_cache(cache_key)
    if cached:
        return cached

    try:
        headers = {"X-Auth-Token": FOOTBALL_API_KEY}
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


async def get_match_result(match_id: str) -> Optional[Dict]:
    """Get final result for a finished match"""

    if not FOOTBALL_API_KEY:
        return None

    cache_key = f"result_{match_id}"
    cached = _get_cache(cache_key)
    if cached is not None:
        return cached

    try:
        # Convert string match_id to int if needed
        match_id_int = int(match_id) if isinstance(match_id, str) else match_id

        headers = {"X-Auth-Token": FOOTBALL_API_KEY}

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{FOOTBALL_DATA_BASE_URL}/matches/{match_id_int}",
                headers=headers,
                timeout=10.0
            )

            if response.status_code != 200:
                return None

            match = response.json()

            # Only return result if match is finished
            if match.get("status") != "FINISHED":
                return None

            result = {
                "home_team": match["homeTeam"]["name"],
                "away_team": match["awayTeam"]["name"],
                "home_goals": match["score"]["fullTime"]["home"],
                "away_goals": match["score"]["fullTime"]["away"],
                "home_ht": match["score"]["halfTime"]["home"],
                "away_ht": match["score"]["halfTime"]["away"],
                "status": "finished",
            }

            _set_cache(cache_key, result)
            return result

    except Exception as e:
        logger.error(f"Error fetching result for match {match_id}: {e}")
        return None


async def fetch_team_form(team_name: str, league_code: str = None) -> Optional[Dict]:
    """Fetch recent form for a team"""

    if not FOOTBALL_API_KEY:
        return None

    # Check form cache first (keyed by team+league)
    form_cache_key = f"form_{team_name}_{league_code}"
    cached = _get_cache(form_cache_key)
    if cached is not None:
        return cached

    # Get recent finished matches
    today = datetime.utcnow()
    date_from = (today - timedelta(days=60)).strftime("%Y-%m-%d")
    date_to = today.strftime("%Y-%m-%d")

    try:
        matches = await fetch_matches(date_from=date_from, date_to=date_to, league=league_code)

        # Filter matches for this team
        team_matches = [
            m for m in matches
            if (m["home_team"]["name"] == team_name or m["away_team"]["name"] == team_name)
            and m["status"] == "finished"
        ][-10:]  # Last 10 matches

        if not team_matches:
            return None

        # Calculate form statistics
        wins, draws, losses = 0, 0, 0
        goals_scored, goals_conceded = 0, 0
        home_wins, home_matches = 0, 0
        btts_count, over25_count = 0, 0

        for m in team_matches:
            is_home = m["home_team"]["name"] == team_name
            home_score = m["home_score"] or 0
            away_score = m["away_score"] or 0
            total = home_score + away_score

            if is_home:
                home_matches += 1
                goals_scored += home_score
                goals_conceded += away_score
                if home_score > away_score:
                    wins += 1
                    home_wins += 1
                elif home_score == away_score:
                    draws += 1
                else:
                    losses += 1
            else:
                goals_scored += away_score
                goals_conceded += home_score
                if away_score > home_score:
                    wins += 1
                elif home_score == away_score:
                    draws += 1
                else:
                    losses += 1

            if home_score > 0 and away_score > 0:
                btts_count += 1
            if total > 2.5:
                over25_count += 1

        n = len(team_matches)
        result = {
            "wins": wins,
            "draws": draws,
            "losses": losses,
            "goals_scored": round(goals_scored / n, 2) if n else 0,
            "goals_conceded": round(goals_conceded / n, 2) if n else 0,
            "home_win_rate": round(home_wins / home_matches * 100, 1) if home_matches else 50,
            "away_win_rate": round((wins - home_wins) / (n - home_matches) * 100, 1) if (n - home_matches) > 0 else 50,
            "btts_pct": round(btts_count / n * 100, 1) if n else 50,
            "over25_pct": round(over25_count / n * 100, 1) if n else 50,
            "matches_analyzed": n,
        }

        _set_cache(form_cache_key, result)
        return result

    except Exception as e:
        logger.error(f"Error fetching form for {team_name}: {e}")
        return None
