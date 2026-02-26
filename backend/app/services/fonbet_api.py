"""
Fonbet API Service — fetches real odds, live scores, and deeplinks from Fonbet
via iframe-proxy (Node.js on Railway with Italian residential proxy).

Architecture:
  Frontend → Our Backend (this service) → iframe-proxy → Fonbet API
  Caching: 120s pre-match, 30s live, 60s event detail
"""

import os
import time
import logging
import re
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

FONBET_PROXY_URL = os.getenv(
    "FONBET_PROXY_URL",
    "https://iframe-proxy-poc-production.up.railway.app",
)

FONBET_EVENTS_ENDPOINT = f"{FONBET_PROXY_URL}/fline2/events/list"

DEEPLINK_BASE = "https://fonbet001.com/sports/football"

# ---------------------------------------------------------------------------
# Factor ID → market name mapping
# ---------------------------------------------------------------------------

FACTOR_MAP = {
    921: ("1", None),        # Home Win
    922: ("X", None),        # Draw
    923: ("2", None),        # Away Win
    924: ("1X", None),       # Double Chance: Home or Draw
    925: ("12", None),       # Double Chance: Home or Away
    926: ("X2", None),       # Double Chance: Draw or Away
    927: ("handicap_1", "pt"),  # Handicap Home (pt = parameter)
    928: ("handicap_2", "pt"),  # Handicap Away
    930: ("over", "pt"),     # Total Over (pt = "2.5", "1.5", etc.)
    931: ("under", "pt"),    # Total Under
    937: ("ht_1", None),     # 1st Half Home Win
    938: ("ht_X", None),     # 1st Half Draw
    939: ("ht_2", None),     # 1st Half Away Win
    940: ("ht_over", "pt"),  # 1st Half Total Over
    941: ("ht_under", "pt"), # 1st Half Total Under
    1571: ("btts_yes", None),  # Both Teams To Score — Yes
    1572: ("btts_no", None),   # Both Teams To Score — No
}

# Top leagues: Fonbet sportId → API-Football league_id / code
TOP_LEAGUE_IDS = {
    11960: {"league_id": 135, "code": "SA", "name": "Serie A"},
    11918: {"league_id": 39, "code": "PL", "name": "Premier League"},
    11916: {"league_id": 78, "code": "BL1", "name": "Bundesliga"},
    11906: {"league_id": 140, "code": "PD", "name": "La Liga"},
    11962: {"league_id": 61, "code": "FL1", "name": "Ligue 1"},
    11914: {"league_id": 2, "code": "CL", "name": "Champions League"},
    11915: {"league_id": 3, "code": "EL", "name": "Europa League"},
    12028: {"league_id": 106, "code": "EKS", "name": "Ekstraklasa"},
    12112: {"league_id": 136, "code": "SB", "name": "Serie B"},
    11919: {"league_id": 40, "code": "ELC", "name": "Championship"},
}

# ---------------------------------------------------------------------------
# In-memory cache
# ---------------------------------------------------------------------------

_cache: dict[str, dict] = {}


def _get_cache(key: str, ttl: int) -> Optional[dict]:
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < ttl:
        return entry["data"]
    return None


def _set_cache(key: str, data):
    _cache[key] = {"data": data, "ts": time.time()}


def get_cache_stats() -> dict:
    now = time.time()
    stats = {}
    for key, entry in _cache.items():
        age = round(now - entry["ts"], 1)
        stats[key] = {
            "age_seconds": age,
            "items": len(entry["data"]) if isinstance(entry["data"], list) else 1,
        }
    return {"entries": len(_cache), "keys": stats}


# ---------------------------------------------------------------------------
# Team name normalization for fuzzy matching
# ---------------------------------------------------------------------------

_STRIP_TOKENS = re.compile(
    r"\b(FC|AC|AS|SS|US|SC|CF|CD|RC|SL|SK|SD|SE|IF|BV|BSC|TSG|VfB|VfL|RB|"
    r"Calcio|Club|Sportif|Foot|United|City)\b",
    re.IGNORECASE,
)
_MULTI_SPACE = re.compile(r"\s+")


def _normalize_team(name: str) -> str:
    """Normalize team name for fuzzy comparison."""
    n = _STRIP_TOKENS.sub("", name)
    n = _MULTI_SPACE.sub(" ", n).strip().lower()
    return n


def _teams_match(a: str, b: str) -> bool:
    """Check if two team names refer to the same team (fuzzy)."""
    na, nb = _normalize_team(a), _normalize_team(b)
    if na == nb:
        return True
    # Substring match (e.g. "Milan" in "AC Milan", "Inter" in "Inter Milan")
    if na in nb or nb in na:
        return True
    return False


# ---------------------------------------------------------------------------
# Raw data fetching
# ---------------------------------------------------------------------------

async def _fetch_raw_events(lang: str = "en") -> dict:
    """Fetch raw Fonbet events list via iframe-proxy (~8 MB JSON)."""
    cache_key = f"raw_events_{lang}"
    cached = _get_cache(cache_key, ttl=120)
    if cached is not None:
        return cached

    params = {"lang": lang, "version": "0", "scopeMarket": "3100"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(FONBET_EVENTS_ENDPOINT, params=params)
            resp.raise_for_status()
            data = resp.json()
            _set_cache(cache_key, data)
            logger.info(
                "Fonbet raw: %d events, %d factors, %d live",
                len(data.get("events", [])),
                len(data.get("customFactors", [])),
                len(data.get("liveEventInfos", [])),
            )
            return data
    except httpx.TimeoutException:
        logger.warning("Fonbet proxy timeout (30s)")
        raise
    except Exception as e:
        logger.error("Fonbet proxy error: %s", e)
        raise


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def _build_factors_map(custom_factors: list) -> dict[int, dict]:
    """Build eventId → odds dict from customFactors array."""
    result: dict[int, dict] = {}

    for cf in custom_factors:
        event_id = cf.get("e")
        if event_id is None:
            continue

        odds = {}
        count_all = cf.get("countAll", 0)

        for f in cf.get("factors", []):
            fid = f.get("f")
            value = f.get("v")
            pt = f.get("pt")

            if fid not in FACTOR_MAP or value is None:
                continue

            market_name, pt_field = FACTOR_MAP[fid]

            if pt_field and pt:
                key = f"{market_name}_{pt}"
            else:
                key = market_name

            odds[key] = round(value, 2)

        result[event_id] = {"odds": odds, "total_markets": count_all}

    return result


def _build_live_map(live_infos: list) -> dict[int, dict]:
    """Build eventId → live info dict from liveEventInfos array."""
    result: dict[int, dict] = {}

    for li in live_infos:
        event_id = li.get("id")
        if event_id is None:
            continue

        timer = li.get("timer")
        timer_seconds = li.get("timerSeconds")
        score = li.get("score", {})
        periods = []

        for p in li.get("periods", []):
            periods.append({
                "name": p.get("name", ""),
                "home": p.get("s1", 0),
                "away": p.get("s2", 0),
            })

        # Determine period name
        period_name = ""
        if periods:
            period_name = periods[-1].get("name", "")

        result[event_id] = {
            "timer": timer,
            "timer_seconds": timer_seconds,
            "score_home": score.get("s1", 0),
            "score_away": score.get("s2", 0),
            "period": period_name,
            "periods": periods,
        }

    return result


def _build_tournament_map(sports: list) -> dict[int, str]:
    """Build sportId → tournament name from sports array."""
    result: dict[int, str] = {}
    for s in sports:
        sid = s.get("id")
        name = s.get("name", "")
        if sid:
            result[sid] = name
    return result


def _make_deeplink(sport_id: int, event_id: int) -> str:
    return f"{DEEPLINK_BASE}/{sport_id}/{event_id}"


def _make_proxy_deeplink(sport_id: int, event_id: int) -> str:
    return f"{FONBET_PROXY_URL}/fonbet/sports/football/{sport_id}/{event_id}"


# ---------------------------------------------------------------------------
# Main parsing: raw → structured football events
# ---------------------------------------------------------------------------

def _parse_football_events(raw: dict) -> list[dict]:
    """Parse raw Fonbet JSON into structured football event dicts."""
    events = raw.get("events", [])
    custom_factors = raw.get("customFactors", [])
    live_infos = raw.get("liveEventInfos", [])
    sports = raw.get("sports", [])

    factors_map = _build_factors_map(custom_factors)
    live_map = _build_live_map(live_infos)
    tournament_map = _build_tournament_map(sports)

    result = []

    for ev in events:
        # Only football (rootKind=1) and actual matches (level=1)
        if ev.get("rootKind") != 1 or ev.get("level") != 1:
            continue

        event_id = ev.get("id")
        team1 = ev.get("team1", "")
        team2 = ev.get("team2", "")
        sport_id = ev.get("sportId")
        place = ev.get("place", "")
        start_time = ev.get("startTime")

        if not event_id or not team1 or not team2:
            continue

        is_live = place == "live"

        # Get odds
        factor_data = factors_map.get(event_id, {})
        odds = factor_data.get("odds", {})
        total_markets = factor_data.get("total_markets", 0)

        # Get live info
        live_info = live_map.get(event_id) if is_live else None

        # Get tournament name
        tournament_name = tournament_map.get(sport_id, "")

        # Tournament code from our mapping
        league_info = TOP_LEAGUE_IDS.get(sport_id, {})
        tournament_code = league_info.get("code", "")

        result.append({
            "id": event_id,
            "team1": team1,
            "team2": team2,
            "sport_id": sport_id,
            "tournament_name": tournament_name,
            "tournament_code": tournament_code,
            "start_timestamp": start_time,
            "is_live": is_live,
            "live_info": live_info,
            "odds": odds,
            "deeplink": _make_deeplink(sport_id, event_id),
            "total_markets": total_markets,
        })

    return result


# ---------------------------------------------------------------------------
# Public API functions
# ---------------------------------------------------------------------------

async def get_football_events(lang: str = "en") -> dict:
    """All football events with odds and deeplinks."""
    cache_key = f"football_events_{lang}"
    cached = _get_cache(cache_key, ttl=120)
    if cached is not None:
        return cached

    raw = await _fetch_raw_events(lang)
    events = _parse_football_events(raw)

    live_count = sum(1 for e in events if e["is_live"])
    result = {"events": events, "total": len(events), "live_count": live_count}

    _set_cache(cache_key, result)
    return result


async def get_live_events(lang: str = "en") -> dict:
    """Only live football events with scores and odds."""
    cache_key = f"live_events_{lang}"
    cached = _get_cache(cache_key, ttl=30)
    if cached is not None:
        return cached

    raw = await _fetch_raw_events(lang)
    all_events = _parse_football_events(raw)
    live_events = [e for e in all_events if e["is_live"]]

    result = {
        "events": live_events,
        "total": len(live_events),
        "live_count": len(live_events),
    }

    _set_cache(cache_key, result)
    return result


async def get_top_leagues(lang: str = "en") -> dict:
    """Football events from top leagues only."""
    cache_key = f"top_leagues_{lang}"
    cached = _get_cache(cache_key, ttl=120)
    if cached is not None:
        return cached

    raw = await _fetch_raw_events(lang)
    all_events = _parse_football_events(raw)

    top_ids = set(TOP_LEAGUE_IDS.keys())
    top_events = [e for e in all_events if e["sport_id"] in top_ids]
    live_count = sum(1 for e in top_events if e["is_live"])

    result = {"events": top_events, "total": len(top_events), "live_count": live_count}

    _set_cache(cache_key, result)
    return result


async def get_serie_a(lang: str = "en") -> dict:
    """Serie A events only (sportId=11960)."""
    cache_key = f"serie_a_{lang}"
    cached = _get_cache(cache_key, ttl=120)
    if cached is not None:
        return cached

    raw = await _fetch_raw_events(lang)
    all_events = _parse_football_events(raw)

    sa_events = [e for e in all_events if e["sport_id"] == 11960]
    live_count = sum(1 for e in sa_events if e["is_live"])

    result = {"events": sa_events, "total": len(sa_events), "live_count": live_count}

    _set_cache(cache_key, result)
    return result


async def get_event_detail(event_id: int, lang: str = "en") -> Optional[dict]:
    """Get a single event by ID with all available data."""
    cache_key = f"event_{event_id}_{lang}"
    cached = _get_cache(cache_key, ttl=60)
    if cached is not None:
        return cached

    raw = await _fetch_raw_events(lang)
    all_events = _parse_football_events(raw)

    for ev in all_events:
        if ev["id"] == event_id:
            _set_cache(cache_key, ev)
            return ev

    return None


async def find_match(
    home_team: str,
    away_team: str,
    match_date: Optional[str] = None,
    lang: str = "en",
) -> Optional[dict]:
    """
    Find a Fonbet event matching the given team names.
    Used to link API-Football fixtures to Fonbet deeplinks.

    Args:
        home_team: Home team name (e.g. "AC Milan")
        away_team: Away team name (e.g. "Inter")
        match_date: Optional ISO date string for filtering (e.g. "2026-03-01")
        lang: Language code

    Returns:
        Fonbet event dict with odds + deeplink, or None
    """
    raw = await _fetch_raw_events(lang)
    all_events = _parse_football_events(raw)

    # Optional: filter by date
    target_day = None
    if match_date:
        try:
            # Accept ISO format "2026-03-01" or "2026-03-01T20:45:00+00:00"
            target_day = match_date[:10]
        except (ValueError, IndexError):
            pass

    best_match = None
    best_score = 0

    for ev in all_events:
        # Date filter
        if target_day and ev.get("start_timestamp"):
            import datetime
            try:
                ev_date = datetime.datetime.fromtimestamp(
                    ev["start_timestamp"], tz=datetime.timezone.utc
                ).strftime("%Y-%m-%d")
                if ev_date != target_day:
                    continue
            except (OSError, ValueError):
                pass

        # Team matching
        home_ok = _teams_match(home_team, ev["team1"])
        away_ok = _teams_match(away_team, ev["team2"])

        if home_ok and away_ok:
            # Both teams match — perfect
            score = 10
            # Prefer events with more odds
            if ev.get("odds"):
                score += len(ev["odds"])
            if score > best_score:
                best_score = score
                best_match = ev
        elif home_ok or away_ok:
            # Partial match — check reversed order
            rev_home = _teams_match(home_team, ev["team2"])
            rev_away = _teams_match(away_team, ev["team1"])
            if rev_home and rev_away:
                score = 8
                if ev.get("odds"):
                    score += len(ev["odds"])
                if score > best_score:
                    best_score = score
                    best_match = ev

    return best_match


def generate_deeplink(tournament_id: int, event_id: int) -> dict:
    """Generate deeplink URLs without fetching from Fonbet."""
    return {
        "deeplink": _make_deeplink(tournament_id, event_id),
        "proxy_url": _make_proxy_deeplink(tournament_id, event_id),
    }
