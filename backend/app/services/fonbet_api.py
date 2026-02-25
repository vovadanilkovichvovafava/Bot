"""
Fonbet API Service — direct access to Fonbet betting line.

API is public (no auth required), but geo-blocked (works through Italian proxy).

Architecture:
  Primary:  iframe-proxy-poc on Railway (already deployed, Italian NodeMaven residential IP)
  Fallback: direct NodeMaven proxy from Python backend

Endpoints:
  - line11.fm41d5-resources.com/events/list — all events + odds + live scores
  - line01.fm41d5-resources.com/events/list — mirror
  - events/event?id=X — single event detail

Data structure (one GET = everything):
  - events[]           — 8800+ events (line + live)
  - customFactors[]    — nested: {e: eventId, factors: [{f: 921, v: 2.3}, ...]}
  - liveEventInfos[]   — live scores, timers, periods
  - sports[]           — tournament tree (kind=1 → football)
  - tournamentInfos[]  — tournament metadata

Deeplinks:
  - fonbet001.com/sports/football/{tournamentId}/{eventId}

Key discovery: customFactors have NESTED structure:
  {"e": 62510832, "countAll": 727, "factors": [{"f": 921, "v": 2.3}, {"f": 922, "v": 3.4}, ...]}
  NOT flat: {"e": 62510832, "f": 921, "v": 2.3}
"""

import httpx
import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

# === CONFIG ===

FONBET_LINE_URL = "https://line11.fm41d5-resources.com"
FONBET_LINE_URL_BACKUP = "https://line01.fm41d5-resources.com"
FONBET_CLIENT_API = "https://clientsapi01.fm41d5-resources.com"
FONBET_SITE = "https://fonbet001.com"

# Primary: our Railway reverse proxy (already deployed, uses Italian NodeMaven IP)
IFRAME_PROXY_URL = os.getenv(
    "FONBET_PROXY_URL",
    "https://iframe-proxy-poc-production.up.railway.app"
)

# Fallback: direct NodeMaven proxy
NODEMAVEN_USER = os.getenv("NODEMAVEN_USER", "igorseglov60_gmail_com-country-it-ipv4-true")
NODEMAVEN_PASS = os.getenv("NODEMAVEN_PASS", "i2x07zuhsl")
NODEMAVEN_GATE = os.getenv("NODEMAVEN_GATE", "gate.nodemaven.com:8080")

# Sport kinds in Fonbet
SPORT_KIND_FOOTBALL = 1
SPORT_KIND_HOCKEY = 2
SPORT_KIND_BASKETBALL = 3

# Factor IDs → market names
# Source: reverse-engineered from Fonbet SPA network requests
FACTOR_MAP = {
    # 1X2 (Match Result)
    921: {"market": "1X2", "outcome": "1", "name": "Home Win"},
    922: {"market": "1X2", "outcome": "X", "name": "Draw"},
    923: {"market": "1X2", "outcome": "2", "name": "Away Win"},
    # Double Chance
    924: {"market": "Double Chance", "outcome": "1X", "name": "Home or Draw"},
    925: {"market": "Double Chance", "outcome": "12", "name": "Home or Away"},
    926: {"market": "Double Chance", "outcome": "X2", "name": "Draw or Away"},
    # Handicap
    927: {"market": "Handicap", "outcome": "1", "name": "Handicap Home"},
    928: {"market": "Handicap", "outcome": "2", "name": "Handicap Away"},
    # Total (Over/Under)
    930: {"market": "Total", "outcome": "Over", "name": "Over"},
    931: {"market": "Total", "outcome": "Under", "name": "Under"},
    # Individual Total Home
    932: {"market": "Home Total", "outcome": "Over", "name": "Home Over"},
    933: {"market": "Home Total", "outcome": "Under", "name": "Home Under"},
    # Individual Total Away
    934: {"market": "Away Total", "outcome": "Over", "name": "Away Over"},
    935: {"market": "Away Total", "outcome": "Under", "name": "Away Under"},
    # Half-time 1X2
    937: {"market": "1X2 HT", "outcome": "1", "name": "HT Home Win"},
    938: {"market": "1X2 HT", "outcome": "X", "name": "HT Draw"},
    939: {"market": "1X2 HT", "outcome": "2", "name": "HT Away Win"},
    # Half-time Total
    940: {"market": "Total HT", "outcome": "Over", "name": "HT Over"},
    941: {"market": "Total HT", "outcome": "Under", "name": "HT Under"},
    # Both Teams to Score
    1571: {"market": "BTTS", "outcome": "Yes", "name": "BTTS Yes"},
    1572: {"market": "BTTS", "outcome": "No", "name": "BTTS No"},
    # Asian Handicap (additional)
    974: {"market": "Asian Total Home", "outcome": "Over", "name": "Home Asian Over"},
    976: {"market": "Asian Total Away", "outcome": "Over", "name": "Away Asian Over"},
    978: {"market": "Asian Total Home", "outcome": "Under", "name": "Home Asian Under"},
    980: {"market": "Asian Total Away", "outcome": "Under", "name": "Away Asian Under"},
    # Alternative Handicaps
    1672: {"market": "Alt Handicap", "outcome": "1", "name": "Alt Handicap Home"},
    1675: {"market": "Alt Handicap", "outcome": "2", "name": "Alt Handicap Away"},
    1683: {"market": "Alt Handicap", "outcome": "2+", "name": "Alt Handicap Away+"},
    1684: {"market": "Alt Handicap", "outcome": "1+", "name": "Alt Handicap Home+"},
    # Alt Totals
    1736: {"market": "Alt Total", "outcome": "Over", "name": "Alt Over"},
    1737: {"market": "Alt Total", "outcome": "Under", "name": "Alt Under"},
    1796: {"market": "Alt Total", "outcome": "Over2", "name": "Alt Over 2"},
    1797: {"market": "Alt Total", "outcome": "Under2", "name": "Alt Under 2"},
}

# Known football tournaments (Fonbet sportId → metadata)
TOURNAMENT_MAP = {
    # Italy (78% of users)
    11960: {"name": "Serie A", "country": "IT", "code": "SA", "priority": 1},
    12112: {"name": "Serie B", "country": "IT", "code": "SB", "priority": 2},
    12113: {"name": "Coppa Italia", "country": "IT", "code": "CI", "priority": 2},
    # England
    11918: {"name": "Premier League", "country": "EN", "code": "PL", "priority": 1},
    11919: {"name": "Championship", "country": "EN", "code": "ELC", "priority": 2},
    12085: {"name": "FA Cup", "country": "EN", "code": "FAC", "priority": 2},
    12086: {"name": "League Cup", "country": "EN", "code": "LC", "priority": 3},
    # Germany
    11916: {"name": "Bundesliga", "country": "DE", "code": "BL1", "priority": 1},
    11917: {"name": "2. Bundesliga", "country": "DE", "code": "BL2", "priority": 2},
    # Spain
    11906: {"name": "La Liga", "country": "ES", "code": "PD", "priority": 1},
    11907: {"name": "La Liga 2", "country": "ES", "code": "PD2", "priority": 3},
    # France
    11962: {"name": "Ligue 1", "country": "FR", "code": "FL1", "priority": 1},
    # Europe
    11914: {"name": "Champions League", "country": "EU", "code": "CL", "priority": 1},
    11915: {"name": "Europa League", "country": "EU", "code": "EL", "priority": 1},
    12096: {"name": "Conference League", "country": "EU", "code": "ECL", "priority": 2},
    # Poland (17% of users)
    12028: {"name": "Ekstraklasa", "country": "PL", "code": "EKS", "priority": 1},
    # Netherlands, Portugal
    12018: {"name": "Eredivisie", "country": "NL", "code": "DED", "priority": 2},
    12044: {"name": "Primeira Liga", "country": "PT", "code": "PPL", "priority": 2},
}


# === CACHE ===

_cache: Dict[str, Dict] = {}
CACHE_TTL = {
    "events_list": 120,        # All events — 2 min
    "event_detail": 60,        # Single event — 1 min
    "football_events": 120,    # Parsed football — 2 min
    "live_football": 30,       # Live data — 30 sec
}


def _get_cache(key: str) -> Optional[Any]:
    if key in _cache:
        entry = _cache[key]
        if datetime.utcnow().timestamp() - entry["ts"] < entry["ttl"]:
            return entry["data"]
        del _cache[key]
    return None


def _set_cache(key: str, data: Any, cache_type: str = "events_list"):
    ttl = CACHE_TTL.get(cache_type, 120)
    _cache[key] = {"data": data, "ts": datetime.utcnow().timestamp(), "ttl": ttl}


def clear_cache():
    _cache.clear()


def get_cache_stats() -> Dict:
    now = datetime.utcnow().timestamp()
    total = len(_cache)
    active = sum(1 for v in _cache.values() if now - v["ts"] < v["ttl"])
    return {"total": total, "active": active, "expired": total - active}


# === HTTP CLIENT ===

def _get_proxy_url() -> str:
    return f"http://{NODEMAVEN_USER}:{NODEMAVEN_PASS}@{NODEMAVEN_GATE}"


async def _request_via_iframe_proxy(path: str, params: Dict = None) -> Optional[Dict]:
    """
    Primary method: request through our Railway iframe-proxy-poc.
    Already deployed, uses Italian NodeMaven residential IP.
    Cloudflare sees Italian residential IP → passes through.

    Path mapping:
      /fline2/events/list → line11.fm41d5-resources.com/events/list
      /fline1/events/list → line01.fm41d5-resources.com/events/list
      /fapi1/...          → clientsapi01.fm41d5-resources.com/...
    """
    try:
        url = f"{IFRAME_PROXY_URL}{path}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"iframe-proxy request error for {path}: {type(e).__name__}: {e}")
        return None


async def _request_via_direct_proxy(url: str, params: Dict = None) -> Optional[Dict]:
    """
    Fallback: direct request through NodeMaven Italian proxy.
    Requires NodeMaven credentials in env.
    """
    try:
        proxy_url = _get_proxy_url()
        async with httpx.AsyncClient(
            proxy=proxy_url,
            timeout=20.0,
            headers={
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                              "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 "
                              "Mobile/15E148 Safari/604.1",
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
                "Referer": f"{FONBET_SITE}/",
                "Origin": FONBET_SITE,
            },
        ) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Direct proxy error for {url}: {type(e).__name__}: {e}")
        return None


async def _request(path: str, params: Dict = None) -> Optional[Dict]:
    """
    Smart request: try iframe-proxy first, fallback to direct proxy.

    path should be the proxy path, e.g. /fline2/events/list
    """
    data = await _request_via_iframe_proxy(path, params)
    if data:
        return data

    # Fallback: map proxy path back to real URL
    path_to_domain = {
        "/fline2": FONBET_LINE_URL,
        "/fline1": FONBET_LINE_URL_BACKUP,
        "/fapi1": FONBET_CLIENT_API,
    }
    for prefix, domain in path_to_domain.items():
        if path.startswith(prefix):
            real_url = domain + path[len(prefix):]
            return await _request_via_direct_proxy(real_url, params)

    logger.error(f"Unknown proxy path: {path}")
    return None


# === MAIN SERVICE ===


class FonbetApiService:
    """
    Fonbet Line API client.

    One GET request = 8MB JSON with:
    - 8800+ events (pre-match + live)
    - Odds for all events (nested customFactors)
    - Live scores and timers (liveEventInfos)
    - Tournament hierarchy (sports)

    No auth required. Italian IP required (Cloudflare geo-block).
    """

    # ==================== RAW DATA ====================

    async def get_all_events(self, lang: str = "en", scope_market: int = 3100) -> Optional[Dict]:
        """
        Fetch ALL events from Fonbet line.

        GET /fline2/events/list?lang=en&version=0&scopeMarket=3100

        Returns full response with events, customFactors, liveEventInfos, sports.
        """
        cache_key = f"all_events_{lang}_{scope_market}"
        cached = _get_cache(cache_key)
        if cached:
            return cached

        params = {"lang": lang, "version": 0, "scopeMarket": scope_market}
        data = await _request("/fline2/events/list", params)

        if data:
            _set_cache(cache_key, data, "events_list")
        return data

    async def get_event_detail(self, event_id: int, lang: str = "en") -> Optional[Dict]:
        """Fetch single event details."""
        cache_key = f"event_{event_id}_{lang}"
        cached = _get_cache(cache_key)
        if cached:
            return cached

        params = {"id": event_id, "lang": lang}
        data = await _request("/fline2/events/event", params)

        if data:
            _set_cache(cache_key, data, "event_detail")
        return data

    # ==================== PARSED DATA ====================

    async def get_football_events(self, lang: str = "en") -> List[Dict]:
        """
        All football events with parsed odds.

        Returns:
        [
            {
                "id": 62510832,
                "team1": "FC Augsburg",
                "team2": "1. FC Koln",
                "tournament_id": 11916,
                "tournament_name": "Bundesliga",
                "country": "DE",
                "league_code": "BL1",
                "priority": 1,
                "start_time": "2026-02-23T17:30:00Z",
                "start_timestamp": 1740328200,
                "is_live": false,
                "live_info": null,
                "odds": {"1": 2.3, "X": 3.4, "2": 3.05, "over_2.5": 1.85, "btts_yes": 1.72},
                "total_markets": 727,
                "deeplink": "https://fonbet001.com/sports/football/11916/62510832"
            },
            ...
        ]
        """
        cache_key = f"football_events_{lang}"
        cached = _get_cache(cache_key)
        if cached:
            return cached

        raw = await self.get_all_events(lang=lang)
        if not raw:
            return []

        events = raw.get("events", [])
        custom_factors = raw.get("customFactors", [])
        live_infos = raw.get("liveEventInfos", [])
        sports = raw.get("sports", [])

        # Index: eventId → nested factors array
        factors_by_event: Dict[int, Dict] = {}
        for cf in custom_factors:
            eid = cf.get("e")
            if eid:
                factors_by_event[eid] = cf

        # Index: eventId → live info (score, timer)
        live_info_by_event: Dict[int, Dict] = {}
        for li in live_infos:
            eid = li.get("eventId")
            if eid:
                live_info_by_event[eid] = li

        # Index: sport/tournament tree
        sport_map = {}
        for s in sports:
            sport_map[s.get("id")] = s

        football_events = []
        for ev in events:
            if ev.get("level", 0) != 1:
                continue

            team1 = ev.get("team1")
            team2 = ev.get("team2")
            if not team1 or not team2:
                continue

            tournament_id = ev.get("sportId")
            event_id = ev.get("id")
            if not event_id or not tournament_id:
                continue

            # Detect football: check rootKind field first (fastest)
            root_kind = ev.get("rootKind", 0)
            if root_kind != SPORT_KIND_FOOTBALL:
                # Fallback: check sport hierarchy
                if not self._is_football_tournament(tournament_id, sport_map):
                    continue

            # Get tournament info
            tournament_info = TOURNAMENT_MAP.get(tournament_id)
            if not tournament_info:
                sport_entry = sport_map.get(tournament_id, {})
                tournament_info = {
                    "name": sport_entry.get("name", f"Tournament {tournament_id}"),
                    "country": "??",
                    "code": "UNK",
                    "priority": 99,
                }

            # Extract odds from NESTED customFactors
            cf_entry = factors_by_event.get(event_id, {})
            inner_factors = cf_entry.get("factors", [])
            total_markets = cf_entry.get("countAll", 0)
            odds = self._extract_odds(inner_factors)

            # Live info
            is_live = ev.get("place") == "live"
            live_info = None
            if is_live:
                raw_live = live_info_by_event.get(event_id)
                if raw_live:
                    live_info = self._parse_live_info(raw_live)

            # Start time
            start_time = ev.get("startTime", 0)
            start_dt = None
            if start_time:
                try:
                    start_dt = datetime.utcfromtimestamp(start_time).isoformat() + "Z"
                except (ValueError, OSError):
                    pass

            football_events.append({
                "id": event_id,
                "team1": team1,
                "team2": team2,
                "tournament_id": tournament_id,
                "tournament_name": tournament_info["name"],
                "country": tournament_info["country"],
                "league_code": tournament_info.get("code", "UNK"),
                "priority": tournament_info.get("priority", 99),
                "start_time": start_dt,
                "start_timestamp": start_time,
                "is_live": is_live,
                "live_info": live_info,
                "odds": odds,
                "total_markets": total_markets,
                "deeplink": self.generate_deeplink(tournament_id, event_id),
            })

        # Sort: live first, then by priority, then start time
        football_events.sort(key=lambda x: (
            0 if x["is_live"] else 1,
            x["priority"],
            x.get("start_timestamp", 0),
        ))

        _set_cache(cache_key, football_events, "football_events")
        return football_events

    async def get_live_football(self, lang: str = "en") -> List[Dict]:
        """Only live football matches with scores and odds."""
        cache_key = f"live_football_{lang}"
        cached = _get_cache(cache_key)
        if cached:
            return cached

        all_football = await self.get_football_events(lang=lang)
        live = [ev for ev in all_football if ev["is_live"]]

        _set_cache(cache_key, live, "live_football")
        return live

    async def get_top_leagues_events(self, lang: str = "en") -> List[Dict]:
        """
        Top leagues only (Serie A, PL, Bundesliga, La Liga, Ligue 1, CL, EL, Ekstraklasa).
        Best for: Schedina del Giorno, Daily Pick, Value Finder.
        """
        all_football = await self.get_football_events(lang=lang)
        top_codes = {"SA", "PL", "BL1", "PD", "FL1", "CL", "EL", "ECL", "EKS"}
        return [ev for ev in all_football if ev.get("league_code") in top_codes]

    async def get_serie_a_events(self, lang: str = "it") -> List[Dict]:
        """Only Serie A — for Italian market (78% of users)."""
        all_football = await self.get_football_events(lang=lang)
        return [ev for ev in all_football if ev.get("tournament_id") == 11960]

    # ==================== SEARCH / MATCHING ====================

    async def find_event_by_teams(
        self, team1_query: str, team2_query: str, lang: str = "en"
    ) -> Optional[Dict]:
        """
        Find event by team names (fuzzy match).
        Used for: AI Chat deeplinks, Match Detail → "Bet on Fonbet" button.
        """
        all_football = await self.get_football_events(lang=lang)

        q1 = team1_query.lower().strip()
        q2 = team2_query.lower().strip()

        best_match = None
        best_score = 0

        for ev in all_football:
            t1 = ev["team1"].lower()
            t2 = ev["team2"].lower()

            score = 0
            if q1 in t1 and q2 in t2:
                score = 100
            elif q1 in t2 and q2 in t1:
                score = 90
            elif len(q1) >= 3 and len(q2) >= 3:
                if (q1[:3] in t1 or q1 in t1) and (q2[:3] in t2 or q2 in t2):
                    score = 60
                elif (q1[:3] in t2 or q1 in t2) and (q2[:3] in t1 or q2 in t1):
                    score = 50

            if score > best_score:
                best_score = score
                best_match = ev

        return best_match if best_score >= 50 else None

    async def match_api_football_to_fonbet(
        self, home_team: str, away_team: str, match_date: str, lang: str = "en"
    ) -> Optional[Dict]:
        """
        Match API-Football fixture to Fonbet event (team names + date proximity).
        Returns Fonbet event with odds and deeplink, or None.
        """
        all_football = await self.get_football_events(lang=lang)

        try:
            target_dt = datetime.fromisoformat(match_date.replace("Z", "+00:00"))
        except ValueError:
            target_dt = None

        q_home = home_team.lower().strip()
        q_away = away_team.lower().strip()
        candidates = []

        for ev in all_football:
            t1 = ev["team1"].lower()
            t2 = ev["team2"].lower()

            name_score = 0
            if q_home in t1 and q_away in t2:
                name_score = 100
            elif q_home in t2 and q_away in t1:
                name_score = 80
            elif any(w in t1 for w in q_home.split() if len(w) > 3) and \
                 any(w in t2 for w in q_away.split() if len(w) > 3):
                name_score = 50

            if name_score < 50:
                continue

            date_score = 0
            if target_dt and ev.get("start_timestamp"):
                try:
                    ev_dt = datetime.utcfromtimestamp(ev["start_timestamp"])
                    diff_hours = abs((target_dt.replace(tzinfo=None) - ev_dt).total_seconds() / 3600)
                    if diff_hours < 3:
                        date_score = 50
                    elif diff_hours < 24:
                        date_score = 30
                    elif diff_hours < 48:
                        date_score = 10
                except (ValueError, OSError):
                    pass

            candidates.append((name_score + date_score, ev))

        if candidates:
            candidates.sort(key=lambda x: x[0], reverse=True)
            return candidates[0][1]
        return None

    # ==================== DEEPLINKS ====================

    def generate_deeplink(self, tournament_id: int, event_id: int, sport: str = "football") -> str:
        """Direct link to event on Fonbet site."""
        return f"{FONBET_SITE}/sports/{sport}/{tournament_id}/{event_id}"

    def generate_proxy_deeplink(self, tournament_id: int, event_id: int, sport: str = "football") -> str:
        """Link through our proxy (for in-app webview)."""
        return f"{IFRAME_PROXY_URL}/fonbet/sports/{sport}/{tournament_id}/{event_id}"

    # ==================== VALUE BETS ====================

    async def get_value_bets(
        self, api_football_odds: List[Dict], threshold: float = 0.05, lang: str = "en"
    ) -> List[Dict]:
        """
        Compare API-Football odds vs Fonbet odds.
        Return bets where Fonbet gives better odds (edge > threshold).
        """
        value_bets = []
        for af in api_football_odds:
            fonbet_ev = await self.match_api_football_to_fonbet(
                af.get("home_team", ""), af.get("away_team", ""), af.get("match_date", ""), lang
            )
            if not fonbet_ev or not fonbet_ev.get("odds"):
                continue

            f_odds = fonbet_ev["odds"]
            af_odds = af.get("odds", {})

            for key in ["1", "X", "2"]:
                af_val = af_odds.get(key)
                f_val = f_odds.get(key)
                if af_val and f_val and f_val > af_val * (1 + threshold):
                    value_bets.append({
                        "match": f"{fonbet_ev['team1']} vs {fonbet_ev['team2']}",
                        "tournament": fonbet_ev["tournament_name"],
                        "market": f"1X2 > {key}",
                        "api_football_odds": af_val,
                        "fonbet_odds": f_val,
                        "edge_percent": round((f_val / af_val - 1) * 100, 1),
                        "deeplink": fonbet_ev["deeplink"],
                        "start_time": fonbet_ev["start_time"],
                    })

        value_bets.sort(key=lambda x: x["edge_percent"], reverse=True)
        return value_bets

    # ==================== INTERNAL ====================

    def _is_football_tournament(self, tournament_id: int, sport_map: Dict) -> bool:
        """Walk sport hierarchy to check if tournament is football (kind=1)."""
        if tournament_id in TOURNAMENT_MAP:
            return True

        visited = set()
        current_id = tournament_id
        for _ in range(5):  # max depth
            if current_id in visited:
                break
            visited.add(current_id)

            entry = sport_map.get(current_id, {})
            kind = entry.get("kind", 0)
            if kind == SPORT_KIND_FOOTBALL:
                return True

            parent_id = entry.get("parentId")
            if not parent_id:
                break
            current_id = parent_id

        return False

    def _extract_odds(self, factors: List[Dict]) -> Dict:
        """
        Extract readable odds from NESTED customFactors.

        Input (inner factors array):
            [{"f": 921, "v": 2.3}, {"f": 922, "v": 3.4}, {"f": 930, "v": 1.85, "p": 250, "pt": "2.5"}]

        Output:
            {"1": 2.3, "X": 3.4, "2": 3.05, "over_2.5": 1.85, "btts_yes": 1.72}

        Note: "p" field uses integer encoding: 250 = 2.5, 150 = 1.5, -150 = -1.5
              "pt" field has the string version: "2.5", "1.5", "-1.5"
        """
        odds = {}

        for factor in factors:
            fid = factor.get("f")
            value = factor.get("v")
            # "pt" is the readable param string, "p" is integer-encoded
            param_str = factor.get("pt")
            param_int = factor.get("p")

            if not fid or value is None:
                continue

            info = FACTOR_MAP.get(fid)
            if not info:
                continue

            market = info["market"]
            outcome = info["outcome"]

            # Parse param: prefer "pt" (string), fallback to "p" / 100
            param_display = None
            if param_str:
                param_display = param_str
            elif param_int is not None:
                param_display = str(param_int / 100)

            if market == "1X2":
                odds[outcome] = round(value, 2)

            elif market == "Double Chance":
                odds[f"dc_{outcome.lower()}"] = round(value, 2)

            elif market == "Total" and param_display:
                direction = "over" if outcome == "Over" else "under"
                odds[f"{direction}_{param_display}"] = round(value, 2)

            elif market == "Home Total" and param_display:
                direction = "over" if outcome == "Over" else "under"
                odds[f"home_{direction}_{param_display}"] = round(value, 2)

            elif market == "Away Total" and param_display:
                direction = "over" if outcome == "Over" else "under"
                odds[f"away_{direction}_{param_display}"] = round(value, 2)

            elif market == "Handicap" and param_display:
                odds[f"handicap_{outcome.lower()}_{param_display}"] = round(value, 2)

            elif market == "BTTS":
                key = "btts_yes" if outcome == "Yes" else "btts_no"
                odds[key] = round(value, 2)

            elif market == "1X2 HT":
                odds[f"ht_{outcome.lower()}"] = round(value, 2)

            elif market == "Total HT" and param_display:
                direction = "over" if outcome == "Over" else "under"
                odds[f"ht_{direction}_{param_display}"] = round(value, 2)

        return odds

    def _parse_live_info(self, raw: Dict) -> Dict:
        """
        Parse liveEventInfos entry.

        Input:
            {
                "eventId": 62683215,
                "timer": "44:18",
                "timerSeconds": 2658,
                "timerDirection": 1,
                "scoreFunction": "Football",
                "scores": [[{"c1": "2", "c2": "0"}], [{"c1": "2", "c2": "0", "title": "half"}]],
                "subscores": [{"kindName": "1st half", "c1": "2", "c2": "0"}]
            }

        Output:
            {
                "timer": "44:18",
                "timer_seconds": 2658,
                "score_home": 2,
                "score_away": 0,
                "period": "1st half",
                "periods": [{"name": "1st half", "home": 2, "away": 0}]
            }
        """
        result = {
            "timer": raw.get("timer", ""),
            "timer_seconds": raw.get("timerSeconds", 0),
            "score_home": 0,
            "score_away": 0,
            "period": "",
            "periods": [],
        }

        # Main score from scores[0][0]
        scores = raw.get("scores", [])
        if scores and scores[0]:
            main = scores[0][0] if isinstance(scores[0], list) else scores[0]
            try:
                result["score_home"] = int(main.get("c1", 0))
                result["score_away"] = int(main.get("c2", 0))
            except (ValueError, TypeError):
                pass

        # Periods from subscores
        subscores = raw.get("subscores", [])
        for sub in subscores:
            period_name = sub.get("kindName", "")
            try:
                result["periods"].append({
                    "name": period_name,
                    "home": int(sub.get("c1", 0)),
                    "away": int(sub.get("c2", 0)),
                })
            except (ValueError, TypeError):
                pass

        # Current period
        if subscores:
            result["period"] = subscores[-1].get("kindName", "")
        elif raw.get("scoreComment"):
            result["period"] = raw["scoreComment"]

        return result


# Singleton
fonbet_api = FonbetApiService()
