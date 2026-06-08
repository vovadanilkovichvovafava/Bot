"""
Legacy football data module — now delegates entirely to API-Football.
Football-Data.org dependency has been removed.

Functions are kept for backward compatibility with matches.py, match_analyzer.py, and main.py.
"""
import logging
from datetime import datetime
from typing import List, Dict, Optional

from app.services.api_football import api_football

logger = logging.getLogger(__name__)

# League code → API-Football league ID
LEAGUE_CODE_TO_AF = {
    "WC": 1,      # FIFA World Cup
    "PL": 39,     # Premier League
    "PD": 140,    # La Liga
    "BL1": 78,    # Bundesliga
    "SA": 135,    # Serie A
    "FL1": 61,    # Ligue 1
    "CL": 2,      # Champions League
    "EL": 3,      # Europa League
    "ELC": 40,    # Championship
    "DED": 88,    # Eredivisie
    "PPL": 94,    # Primeira Liga
    "BSA": 71,    # Brasileirão
}


def get_football_api_key() -> str:
    """Kept for backward compat — returns empty string (no longer needed)."""
    return ""


async def fetch_matches(date_from: str = None, date_to: str = None, league: str = None) -> List[Dict]:
    """Fetch scheduled matches via API-Football."""
    try:
        date = date_from or datetime.utcnow().strftime("%Y-%m-%d")
        fixtures = await api_football.get_fixtures_by_date(date)
        if not fixtures:
            return []

        if league and league in LEAGUE_CODE_TO_AF:
            af_id = LEAGUE_CODE_TO_AF[league]
            fixtures = [f for f in fixtures if f.get("league", {}).get("id") == af_id]

        matches = []
        for f in fixtures:
            fix = f.get("fixture", {})
            teams = f.get("teams", {})
            lg = f.get("league", {})
            goals = f.get("goals", {})
            status_short = fix.get("status", {}).get("short", "NS")
            if status_short not in ("NS", "TBD"):
                continue
            matches.append({
                "id": fix.get("id"),
                "home_team": {
                    "name": teams.get("home", {}).get("name", ""),
                    "logo": teams.get("home", {}).get("logo"),
                },
                "away_team": {
                    "name": teams.get("away", {}).get("name", ""),
                    "logo": teams.get("away", {}).get("logo"),
                },
                "league": lg.get("name", ""),
                "league_code": _af_id_to_code(lg.get("id")),
                "match_date": fix.get("date", ""),
                "status": status_short.lower(),
                "home_score": goals.get("home"),
                "away_score": goals.get("away"),
            })

        matches.sort(key=lambda x: x["match_date"])
        return matches
    except Exception as e:
        logger.error(f"fetch_matches error: {e}")
        return []


async def fetch_match_details(match_id: int) -> Optional[Dict]:
    """Fetch single match details via API-Football."""
    try:
        fixture = await api_football.get_fixture(match_id)
        if not fixture:
            return None

        fix = fixture.get("fixture", {})
        teams = fixture.get("teams", {})
        lg = fixture.get("league", {})
        goals = fixture.get("goals", {})

        home_id = teams.get("home", {}).get("id")
        away_id = teams.get("away", {}).get("id")

        h2h_data = {"total_matches": 0, "home_wins": 0, "away_wins": 0, "draws": 0}
        if home_id and away_id:
            try:
                h2h_fixtures = await api_football.get_head_to_head(home_id, away_id, last=10)
                total = len(h2h_fixtures)
                home_wins = sum(
                    1 for m in h2h_fixtures
                    if m.get("teams", {}).get("home", {}).get("id") == home_id
                    and m.get("teams", {}).get("home", {}).get("winner")
                    or m.get("teams", {}).get("away", {}).get("id") == home_id
                    and m.get("teams", {}).get("away", {}).get("winner")
                )
                away_wins = sum(
                    1 for m in h2h_fixtures
                    if m.get("teams", {}).get("home", {}).get("id") == away_id
                    and m.get("teams", {}).get("home", {}).get("winner")
                    or m.get("teams", {}).get("away", {}).get("id") == away_id
                    and m.get("teams", {}).get("away", {}).get("winner")
                )
                h2h_data = {
                    "total_matches": total,
                    "home_wins": home_wins,
                    "away_wins": away_wins,
                    "draws": total - home_wins - away_wins,
                }
            except Exception as e:
                logger.debug(f"H2H fetch failed for {home_id} vs {away_id}: {e}")

        return {
            "id": fix.get("id"),
            "home_team": {
                "name": teams.get("home", {}).get("name", ""),
                "logo": teams.get("home", {}).get("logo"),
            },
            "away_team": {
                "name": teams.get("away", {}).get("name", ""),
                "logo": teams.get("away", {}).get("logo"),
            },
            "league": lg.get("name", ""),
            "league_code": _af_id_to_code(lg.get("id")),
            "match_date": fix.get("date", ""),
            "status": fix.get("status", {}).get("short", "ns").lower(),
            "head_to_head": h2h_data,
            "home_score": goals.get("home"),
            "away_score": goals.get("away"),
        }
    except Exception as e:
        logger.error(f"fetch_match_details error for {match_id}: {e}")
        return None


async def fetch_standings(league_code: str) -> List[Dict]:
    """Fetch league standings via API-Football."""
    af_id = LEAGUE_CODE_TO_AF.get(league_code)
    if not af_id:
        logger.warning(f"Unknown league code: {league_code}")
        return []

    try:
        season = datetime.utcnow().year
        raw = await api_football.get_standings(af_id, season)
        if not raw:
            return []

        standings = []
        for entry in raw:
            league_data = entry.get("league", {})
            for group in league_data.get("standings", []):
                for team in group:
                    standings.append({
                        "position": team.get("rank", 0),
                        "team": team.get("team", {}).get("name", ""),
                        "team_logo": team.get("team", {}).get("logo"),
                        "played": team.get("all", {}).get("played", 0),
                        "won": team.get("all", {}).get("win", 0),
                        "drawn": team.get("all", {}).get("draw", 0),
                        "lost": team.get("all", {}).get("lose", 0),
                        "goals_for": team.get("all", {}).get("goals", {}).get("for", 0),
                        "goals_against": team.get("all", {}).get("goals", {}).get("against", 0),
                        "goal_difference": team.get("goalsDiff", 0),
                        "points": team.get("points", 0),
                    })
        return standings
    except Exception as e:
        logger.error(f"fetch_standings error for {league_code}: {e}")
        return []


async def fetch_leagues() -> List[Dict]:
    """Return available leagues (static list)."""
    return [
        {"code": "WC", "name": "FIFA World Cup", "country": "World", "icon": "world"},
        {"code": "PL", "name": "Premier League", "country": "England", "icon": "england"},
        {"code": "PD", "name": "La Liga", "country": "Spain", "icon": "spain"},
        {"code": "BL1", "name": "Bundesliga", "country": "Germany", "icon": "germany"},
        {"code": "SA", "name": "Serie A", "country": "Italy", "icon": "italy"},
        {"code": "FL1", "name": "Ligue 1", "country": "France", "icon": "france"},
        {"code": "CL", "name": "Champions League", "country": "Europe", "icon": "champions"},
        {"code": "EL", "name": "Europa League", "country": "Europe", "icon": "europa"},
    ]


def _af_id_to_code(af_id: int) -> str:
    """Reverse-lookup: API-Football league ID → league code."""
    for code, lid in LEAGUE_CODE_TO_AF.items():
        if lid == af_id:
            return code
    return ""
