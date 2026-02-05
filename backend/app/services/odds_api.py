"""
Service for fetching betting odds from The Odds API
https://the-odds-api.com/
"""
import httpx
import logging
from typing import List, Optional, Dict
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)

# Map football-data.org league codes to odds-api sport keys
LEAGUE_TO_SPORT = {
    "PL": "soccer_epl",
    "PD": "soccer_spain_la_liga",
    "BL1": "soccer_germany_bundesliga",
    "SA": "soccer_italy_serie_a",
    "FL1": "soccer_france_ligue_one",
    "CL": "soccer_uefa_champs_league",
}

# Odds cache — 10 min TTL (odds change, but not every second)
_odds_cache: Dict[str, Dict] = {}
ODDS_CACHE_TTL = 600  # 10 minutes


def _get_odds_cache(key: str) -> Optional[any]:
    if key in _odds_cache:
        data = _odds_cache[key]
        if datetime.utcnow().timestamp() - data["ts"] < ODDS_CACHE_TTL:
            logger.debug(f"Odds cache HIT: {key}")
            return data["value"]
        del _odds_cache[key]
    return None


def _set_odds_cache(key: str, value: any):
    _odds_cache[key] = {"value": value, "ts": datetime.utcnow().timestamp()}
    # Cleanup every 20 writes
    if len(_odds_cache) % 20 == 0:
        now = datetime.utcnow().timestamp()
        expired = [k for k, v in _odds_cache.items() if now - v["ts"] > ODDS_CACHE_TTL]
        for k in expired:
            del _odds_cache[k]


async def fetch_odds(
    sport_key: str = "soccer_epl",
    regions: str = "eu",
    markets: str = "h2h,totals",
) -> Optional[List[Dict]]:
    """
    Fetch odds for a specific sport/league.
    Cached for 10 minutes to save API quota.
    """
    if not settings.ODDS_API_KEY:
        return None

    cache_key = f"odds_{sport_key}_{regions}_{markets}"
    cached = _get_odds_cache(cache_key)
    if cached is not None:
        return cached

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds",
                params={
                    "apiKey": settings.ODDS_API_KEY,
                    "regions": regions,
                    "markets": markets,
                    "oddsFormat": "decimal",
                },
                timeout=15.0,
            )

            if response.status_code == 200:
                data = response.json()
                # Log remaining API quota
                remaining = response.headers.get("x-requests-remaining", "?")
                logger.info(f"Odds API OK for {sport_key}, quota remaining: {remaining}")
                _set_odds_cache(cache_key, data)
                return data
            else:
                logger.warning(f"Odds API error: {response.status_code} - {response.text[:200]}")
                return None

    except Exception as e:
        logger.error(f"Odds API fetch error: {e}")
        return None


async def get_match_odds(home_team: str, away_team: str, league_code: str = "PL") -> Optional[Dict]:
    """
    Get odds for a specific match

    Args:
        home_team: Home team name
        away_team: Away team name
        league_code: League code (PL, PD, etc.)

    Returns:
        Odds data for the match
    """
    sport_key = LEAGUE_TO_SPORT.get(league_code, "soccer_epl")
    odds_data = await fetch_odds(sport_key=sport_key)

    if not odds_data:
        return None

    # Find matching game
    home_lower = home_team.lower()
    away_lower = away_team.lower()

    for game in odds_data:
        game_home = game.get("home_team", "").lower()
        game_away = game.get("away_team", "").lower()

        # Fuzzy match - check if team names contain each other
        if (home_lower in game_home or game_home in home_lower) and \
           (away_lower in game_away or game_away in away_lower):
            return _format_odds(game)

    return None


def _format_odds(game: Dict) -> Dict:
    """Format odds data for a game"""
    result = {
        "home_team": game.get("home_team"),
        "away_team": game.get("away_team"),
        "commence_time": game.get("commence_time"),
        "bookmakers": [],
    }

    for bookmaker in game.get("bookmakers", [])[:3]:  # Top 3 bookmakers
        bm_data = {
            "name": bookmaker.get("title"),
            "markets": {},
        }

        for market in bookmaker.get("markets", []):
            market_key = market.get("key")
            outcomes = {}

            for outcome in market.get("outcomes", []):
                name = outcome.get("name")
                price = outcome.get("price")
                point = outcome.get("point")

                if point:
                    outcomes[f"{name} {point}"] = price
                else:
                    outcomes[name] = price

            bm_data["markets"][market_key] = outcomes

        result["bookmakers"].append(bm_data)

    return result


async def get_odds_summary(home_team: str, away_team: str, league_code: str = "PL") -> str:
    """
    Get a formatted odds summary for AI context

    Returns:
        Formatted string with odds information
    """
    odds = await get_match_odds(home_team, away_team, league_code)

    if not odds or not odds.get("bookmakers"):
        return ""

    summary = "\n\n**📈 Актуальные коэффициенты:**\n"

    for bm in odds["bookmakers"][:2]:
        summary += f"\n*{bm['name']}:*\n"

        # H2H odds
        h2h = bm["markets"].get("h2h", {})
        if h2h:
            home_odds = h2h.get(odds["home_team"], "-")
            draw_odds = h2h.get("Draw", "-")
            away_odds = h2h.get(odds["away_team"], "-")
            summary += f"• П1: {home_odds} | X: {draw_odds} | П2: {away_odds}\n"

        # Totals
        totals = bm["markets"].get("totals", {})
        if totals:
            over = next((v for k, v in totals.items() if "Over" in k), None)
            under = next((v for k, v in totals.items() if "Under" in k), None)
            if over and under:
                summary += f"• ТБ 2.5: {over} | ТМ 2.5: {under}\n"

    return summary
