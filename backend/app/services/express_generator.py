"""
Express Bet Generator — Pre-generated Menu approach.

Background job generates a batch of express bets with different configurations
every 30 minutes. Users browse and pick from ready-made expresses.
No real-time Fonbet API calls during user requests.

Menu presets:
  - daily_safe:    5 legs, low odds (~1.3-1.6 avg), high confidence
  - daily_value:   5 legs, mid odds (~1.6-2.2 avg), balanced
  - daily_risky:   5 legs, high odds (~2.0-3.0 avg), higher payout
  - custom_3:      3 legs, various odds — PRO
  - custom_5:      5 legs, various odds — PRO
  - custom_7:      7 legs, various odds — PRO
  - league-specific variants for each top league — PRO
"""
import json
import logging
import math
import random
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import select, and_, desc, or_

from app.core.database import async_session_maker
from app.models.express_bet import ExpressBet

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lazy imports
# ---------------------------------------------------------------------------

def _get_fonbet():
    from app.services.fonbet_api import get_football_events, TOP_LEAGUE_IDS
    return get_football_events, TOP_LEAGUE_IDS


def _get_available_leagues():
    _, TOP_LEAGUE_IDS = _get_fonbet()
    return [info["code"] for info in TOP_LEAGUE_IDS.values()]


AVAILABLE_LEAGUES = None


def get_available_leagues():
    global AVAILABLE_LEAGUES
    if AVAILABLE_LEAGUES is None:
        AVAILABLE_LEAGUES = _get_available_leagues()
    return AVAILABLE_LEAGUES


# ---------------------------------------------------------------------------
# Bet labels & priorities (unchanged logic)
# ---------------------------------------------------------------------------

_BET_LABELS = {
    "1": "1 (Home Win)",
    "X": "X (Draw)",
    "2": "2 (Away Win)",
    "1X": "1X (Home or Draw)",
    "X2": "X2 (Draw or Away)",
    "12": "12 (Home or Away)",
    "over_1.5": "Total Over 1.5",
    "under_1.5": "Total Under 1.5",
    "over_2.5": "Total Over 2.5",
    "under_2.5": "Total Under 2.5",
    "over_3.5": "Total Over 3.5",
    "under_3.5": "Total Under 3.5",
    "btts_yes": "Both Teams Score — Yes",
    "btts_no": "Both Teams Score — No",
    "ht_1": "1st Half — Home",
    "ht_X": "1st Half — Draw",
    "ht_2": "1st Half — Away",
}

_DYNAMIC_PREFIXES = {
    "handicap_1_": "Handicap Home ({})",
    "handicap_2_": "Handicap Away ({})",
    "ht_over_": "1st Half Over {}",
    "ht_under_": "1st Half Under {}",
}


def _get_bet_label(key: str) -> Optional[str]:
    if key in _BET_LABELS:
        return _BET_LABELS[key]
    for prefix, template in _DYNAMIC_PREFIXES.items():
        if key.startswith(prefix):
            return template.format(key[len(prefix):])
    return None


_BET_PRIORITY = {
    "1": 1.0, "2": 1.0,
    "handicap_1": 0.95, "handicap_2": 0.95,
    "over_2.5": 0.9, "under_2.5": 0.85,
    "1X": 0.7, "X2": 0.7, "12": 0.65,
    "over_1.5": 0.6, "over_3.5": 0.6,
    "under_1.5": 0.5, "under_3.5": 0.5,
    "ht_1": 0.55, "ht_2": 0.55,
    "ht_over": 0.5, "ht_under": 0.45,
    "X": 0.3, "ht_X": 0.25,
    "btts_yes": 0.4, "btts_no": 0.2,
}


def _get_bet_priority(key: str) -> float:
    if key in _BET_PRIORITY:
        return _BET_PRIORITY[key]
    if key.startswith("handicap_1"):
        return _BET_PRIORITY["handicap_1"]
    if key.startswith("handicap_2"):
        return _BET_PRIORITY["handicap_2"]
    if key.startswith("ht_over"):
        return _BET_PRIORITY["ht_over"]
    if key.startswith("ht_under"):
        return _BET_PRIORITY["ht_under"]
    return 0.1


def _bet_category(bet_key: str) -> str:
    if bet_key.startswith("handicap"):
        return "handicap"
    if bet_key.startswith("ht_over") or bet_key.startswith("ht_under"):
        return "ht_total"
    if bet_key.startswith("ht_"):
        return "ht_result"
    if bet_key.startswith("over") or bet_key.startswith("under"):
        return "total"
    if bet_key in ("1X", "X2", "12"):
        return "double_chance"
    if bet_key.startswith("btts"):
        return "btts"
    if bet_key in ("1", "X", "2"):
        return "result"
    return bet_key


# ---------------------------------------------------------------------------
# Candidate extraction
# ---------------------------------------------------------------------------

def _find_best_bets(odds: dict, min_odds: float = 1.3, target_odds: float = None,
                     top_n: int = 3) -> List[Dict]:
    candidates = []
    for key, value in odds.items():
        label = _get_bet_label(key)
        if not label:
            continue
        if not isinstance(value, (int, float)) or value < min_odds:
            continue
        if value > 5.0:
            continue

        implied_prob = 1.0 / value
        priority = _get_bet_priority(key)

        if target_odds:
            distance_penalty = abs(value - target_odds) * 0.15
            score = priority * 0.6 + implied_prob * 0.3 - distance_penalty
        else:
            if 1.8 <= value <= 3.5:
                range_bonus = 0.2
            elif 1.5 <= value <= 4.0:
                range_bonus = 0.1
            elif 1.3 <= value < 1.5:
                range_bonus = 0.0
            else:
                range_bonus = -0.1
            score = priority * 0.5 + implied_prob * 0.3 + range_bonus

        candidates.append({
            "bet_key": key,
            "bet_type": label,
            "odds": round(value, 2),
            "implied_prob": round(implied_prob, 4),
            "score": score,
        })

    if not candidates:
        return []
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[:top_n]


# ---------------------------------------------------------------------------
# Fonbet data fetching (used only by background job)
# ---------------------------------------------------------------------------

async def _get_fonbet_matches(league_codes: List[str] = None) -> List[Dict]:
    get_football_events, TOP_LEAGUE_IDS = _get_fonbet()

    try:
        data = await get_football_events()
        events = data.get("events", [])
    except Exception as e:
        logger.error(f"Failed to fetch Fonbet events: {e}")
        return []

    code_to_sportid = {v["code"]: k for k, v in TOP_LEAGUE_IDS.items()}
    top_sportids = set(TOP_LEAGUE_IDS.keys())

    if league_codes:
        allowed_sportids = {code_to_sportid[c] for c in league_codes if c in code_to_sportid}
    else:
        allowed_sportids = top_sportids

    matches = []
    for ev in events:
        if ev.get("is_live"):
            continue
        odds = ev.get("odds", {})
        if not odds:
            continue
        sport_id = ev.get("sport_id")
        if allowed_sportids and sport_id not in allowed_sportids:
            continue

        league_info = TOP_LEAGUE_IDS.get(sport_id, {})
        league_code = league_info.get("code")

        matches.append({
            "event_id": ev.get("id"),
            "team1": ev.get("team1", ""),
            "team2": ev.get("team2", ""),
            "sport_id": sport_id,
            "league_code": league_code,
            "start_time": ev.get("start_timestamp"),
            "odds": odds,
            "deeplink": ev.get("deeplink"),
        })

    logger.info(f"Fonbet: {len(matches)} upcoming matches (from {len(events)} events)")
    return matches


# ---------------------------------------------------------------------------
# ML confidence (optional, unchanged)
# ---------------------------------------------------------------------------

async def _try_get_ml_confidence(matches: List[Dict]) -> Dict[str, float]:
    try:
        from app.models.ml_models import MatchFeature, CachedPrediction
        from datetime import timedelta

        today = datetime.utcnow().strftime("%Y-%m-%d")
        tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")

        async with async_session_maker() as db:
            result = await db.execute(
                select(MatchFeature, CachedPrediction).outerjoin(
                    CachedPrediction,
                    MatchFeature.fixture_id == CachedPrediction.fixture_id,
                ).where(
                    and_(
                        MatchFeature.match_date >= today,
                        MatchFeature.match_date < tomorrow,
                    )
                )
            )
            rows = result.all()

        confidence_map = {}
        for feature, cached in rows:
            if not cached or not cached.ml_prediction_json:
                continue
            try:
                pred = json.loads(cached.ml_prediction_json)
                max_conf = 0
                for market_data in pred.get("markets", {}).values():
                    if isinstance(market_data, dict):
                        for prob in market_data.values():
                            if isinstance(prob, (int, float)) and prob > max_conf:
                                max_conf = prob
                key = f"{feature.home_team_name}|{feature.away_team_name}".lower()
                confidence_map[key] = max_conf
            except Exception:
                continue

        if confidence_map:
            logger.info(f"ML predictions available for {len(confidence_map)} matches")
        return confidence_map
    except Exception as e:
        logger.debug(f"ML predictions not available: {e}")
        return {}


def _get_ml_confidence_for_match(confidence_map: Dict, team1: str, team2: str) -> float:
    if not confidence_map:
        return 0.0
    try:
        from app.services.fonbet_api import _teams_match
        for key, conf in confidence_map.items():
            parts = key.split("|")
            if len(parts) != 2:
                continue
            ml_home, ml_away = parts
            if (_teams_match(team1, ml_home) and _teams_match(team2, ml_away)) or \
               (_teams_match(team1, ml_away) and _teams_match(team2, ml_home)):
                return conf
    except Exception:
        pass
    return 0.0


# ---------------------------------------------------------------------------
# Core: build one express from candidates
# ---------------------------------------------------------------------------

def _select_legs(candidates: List[Dict], leg_count: int,
                 max_per_cat: int = 2, max_per_bucket: int = 2) -> List[Dict]:
    """Select diverse legs from scored candidates."""

    def _odds_bucket(odds: float) -> str:
        if odds < 1.5:
            return "low"
        elif odds < 2.0:
            return "mid"
        elif odds < 3.0:
            return "high"
        return "very_high"

    selected = []
    used_matches = set()
    bet_cat_count = {}
    odds_bucket_count = {}

    for cand in candidates:
        match_key = (cand["home_team"], cand["away_team"])
        if match_key in used_matches:
            continue

        cat = _bet_category(cand["bet_name"])
        bucket = _odds_bucket(cand["odds"])

        if bet_cat_count.get(cat, 0) >= max_per_cat:
            continue
        if odds_bucket_count.get(bucket, 0) >= max_per_bucket:
            continue

        selected.append(cand)
        used_matches.add(match_key)
        bet_cat_count[cat] = bet_cat_count.get(cat, 0) + 1
        odds_bucket_count[bucket] = odds_bucket_count.get(bucket, 0) + 1

        if len(selected) >= leg_count:
            break

    # Relax constraints if not enough
    if len(selected) < leg_count:
        for cand in candidates:
            match_key = (cand["home_team"], cand["away_team"])
            if match_key in used_matches:
                continue
            selected.append(cand)
            used_matches.add(match_key)
            if len(selected) >= leg_count:
                break

    return selected


def _build_express_from_matches(
    matches: List[Dict],
    ml_conf: Dict[str, float],
    leg_count: int,
    min_odds: float,
    target_odds: float = None,
    shuffle_seed: int = None,
) -> Optional[List[Dict]]:
    """Build one express from matches. Returns legs list or None."""
    # Collect candidates
    all_candidates = []
    for match in matches:
        bets = _find_best_bets(match["odds"], min_odds=min_odds,
                                target_odds=target_odds, top_n=2)
        if not bets:
            continue

        confidence = _get_ml_confidence_for_match(ml_conf, match["team1"], match["team2"])

        for bet in bets:
            conf = confidence if confidence > 0 else bet["implied_prob"]
            all_candidates.append({
                "home_team": match["team1"],
                "away_team": match["team2"],
                "league": match["league_code"],
                "match_date": match.get("start_time"),
                "bet_type": bet["bet_type"],
                "bet_name": bet["bet_key"],
                "odds": bet["odds"],
                "confidence": round(conf, 4),
                "score": bet["score"],
                "fonbet_event_id": match.get("event_id"),
                "fonbet_deeplink": match.get("deeplink"),
                "fonbet_sport_id": match.get("sport_id"),
            })

    if len(all_candidates) < 2:
        return None

    # Optional shuffle for variety between presets
    if shuffle_seed is not None:
        rng = random.Random(shuffle_seed)
        # Group by score tier, shuffle within tiers
        all_candidates.sort(key=lambda x: x["score"], reverse=True)
        # Slight random perturbation to score
        for c in all_candidates:
            c["score"] += rng.uniform(-0.15, 0.15)
        all_candidates.sort(key=lambda x: x["score"], reverse=True)
    else:
        all_candidates.sort(key=lambda x: x["score"], reverse=True)

    selected = _select_legs(all_candidates, leg_count)

    # Remove internal score
    for leg in selected:
        leg.pop("score", None)

    if len(selected) < 2:
        return None

    return selected


# ---------------------------------------------------------------------------
# Menu preset definitions
# ---------------------------------------------------------------------------

MENU_PRESETS = [
    # --- FREE daily presets ---
    {
        "preset": "daily_safe",
        "label": "Safe Express",
        "description": "Low risk, steady odds",
        "leg_count": 5,
        "min_odds": 1.2,
        "target_odds": 1.4,
        "is_pro": False,
        "leagues": None,  # all top leagues
    },
    {
        "preset": "daily_value",
        "label": "Value Express",
        "description": "Balanced risk and reward",
        "leg_count": 5,
        "min_odds": 1.3,
        "target_odds": 1.8,
        "is_pro": False,
        "leagues": None,
    },
    {
        "preset": "daily_risky",
        "label": "High Odds Express",
        "description": "Higher payout, higher risk",
        "leg_count": 5,
        "min_odds": 1.5,
        "target_odds": 2.5,
        "is_pro": False,
        "leagues": None,
    },
    # --- PRO presets: different leg counts ---
    {
        "preset": "pro_3legs",
        "label": "Quick 3",
        "description": "3 matches, quick win",
        "leg_count": 3,
        "min_odds": 1.4,
        "target_odds": 1.8,
        "is_pro": True,
        "leagues": None,
    },
    {
        "preset": "pro_5legs",
        "label": "Classic 5",
        "description": "5 matches, balanced",
        "leg_count": 5,
        "min_odds": 1.3,
        "target_odds": 1.7,
        "is_pro": True,
        "leagues": None,
    },
    {
        "preset": "pro_7legs",
        "label": "Big 7",
        "description": "7 matches, big payout",
        "leg_count": 7,
        "min_odds": 1.3,
        "target_odds": 1.6,
        "is_pro": True,
        "leagues": None,
    },
]

# League-specific PRO presets (generated dynamically)
_LEAGUE_PRESET_TEMPLATE = {
    "leg_count": 3,
    "min_odds": 1.3,
    "target_odds": 1.7,
    "is_pro": True,
}


def _get_league_presets() -> List[Dict]:
    """Generate per-league presets dynamically."""
    try:
        _, TOP_LEAGUE_IDS = _get_fonbet()
    except Exception:
        return []

    league_presets = []
    for sport_id, info in TOP_LEAGUE_IDS.items():
        code = info["code"]
        name = info["name"]
        league_presets.append({
            **_LEAGUE_PRESET_TEMPLATE,
            "preset": f"league_{code.lower()}",
            "label": f"{name} Express",
            "description": f"Best picks from {name}",
            "leagues": [code],
        })
    return league_presets


# ---------------------------------------------------------------------------
# Batch generation (called by background job)
# ---------------------------------------------------------------------------

async def generate_menu_batch() -> Dict[str, any]:
    """
    Generate all menu presets at once.
    Called by background job every 30 minutes.
    Returns dict with stats.
    """
    matches = await _get_fonbet_matches()
    if not matches:
        logger.warning("No Fonbet matches available for menu generation")
        return {"generated": 0, "error": "no_matches"}

    ml_conf = await _try_get_ml_confidence(matches)

    all_presets = MENU_PRESETS + _get_league_presets()
    generated = 0
    failed = 0
    seed_base = int(datetime.utcnow().timestamp())

    for i, preset in enumerate(all_presets):
        try:
            # Filter matches by league if specified
            if preset.get("leagues"):
                preset_matches = [m for m in matches if m["league_code"] in preset["leagues"]]
            else:
                preset_matches = matches

            if not preset_matches:
                logger.debug(f"Preset {preset['preset']}: no matches for leagues {preset.get('leagues')}")
                failed += 1
                continue

            legs = _build_express_from_matches(
                matches=preset_matches,
                ml_conf=ml_conf,
                leg_count=preset["leg_count"],
                min_odds=preset["min_odds"],
                target_odds=preset.get("target_odds"),
                shuffle_seed=seed_base + i,
            )

            if not legs:
                logger.debug(f"Preset {preset['preset']}: not enough candidates")
                failed += 1
                continue

            await _save_menu_express(preset, legs)
            generated += 1

        except Exception as e:
            logger.error(f"Preset {preset['preset']} failed: {e}")
            failed += 1

    logger.info(f"Menu batch done: {generated} generated, {failed} failed, {len(all_presets)} total presets")
    return {"generated": generated, "failed": failed, "total": len(all_presets)}


async def _save_menu_express(preset: Dict, legs: List[Dict]) -> ExpressBet:
    """Save a pre-generated express to DB."""
    total_odds = 1.0
    for leg in legs:
        total_odds *= leg["odds"]
    total_odds = round(total_odds, 2)

    avg_confidence = sum(l["confidence"] for l in legs) / len(legs) if legs else 0

    express = ExpressBet(
        express_type="menu",
        preset_name=preset["preset"],
        preset_label=preset["label"],
        preset_description=preset.get("description", ""),
        is_pro_only=preset.get("is_pro", False),
        user_id=None,
        legs_json=json.dumps(legs, default=str),
        total_odds=total_odds,
        leg_count=len(legs),
        avg_confidence=round(avg_confidence, 4),
        target_avg_odds=preset.get("target_odds"),
        selected_leagues=json.dumps(preset.get("leagues"), default=str) if preset.get("leagues") else None,
        status="pending",
    )

    try:
        async with async_session_maker() as db:
            db.add(express)
            await db.commit()
            await db.refresh(express)
        return express
    except Exception as e:
        logger.error(f"Failed to save menu express: {e}")
        return None


# ---------------------------------------------------------------------------
# Query functions (used by API — fast DB reads, no Fonbet calls)
# ---------------------------------------------------------------------------

async def get_menu_expresses(include_pro: bool = False) -> List[Dict]:
    """Get today's pre-generated menu expresses."""
    today = datetime.utcnow().strftime("%Y-%m-%d")

    try:
        async with async_session_maker() as db:
            query = select(ExpressBet).where(
                and_(
                    ExpressBet.express_type == "menu",
                    ExpressBet.created_at >= today,
                )
            )
            if not include_pro:
                query = query.where(ExpressBet.is_pro_only == False)

            query = query.order_by(ExpressBet.preset_name)
            result = await db.execute(query)
            expresses = result.scalars().all()
    except Exception as e:
        logger.error(f"Failed to query menu expresses: {e}")
        return []

    return [_express_to_dict(e) for e in expresses]


async def get_menu_express_by_preset(preset_name: str) -> Optional[Dict]:
    """Get a specific preset express (latest today)."""
    today = datetime.utcnow().strftime("%Y-%m-%d")

    try:
        async with async_session_maker() as db:
            result = await db.execute(
                select(ExpressBet).where(
                    and_(
                        ExpressBet.express_type == "menu",
                        ExpressBet.preset_name == preset_name,
                        ExpressBet.created_at >= today,
                    )
                ).order_by(desc(ExpressBet.created_at)).limit(1)
            )
            express = result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"Failed to query preset {preset_name}: {e}")
        return None

    if not express:
        return None
    return _express_to_dict(express)


async def get_today_daily_express() -> Optional[Dict]:
    """Get today's daily express (the 'daily_value' preset for backward compat)."""
    return await get_menu_express_by_preset("daily_value")


async def get_user_expresses(user_id: int, limit: int = 10) -> List[Dict]:
    """Get user's saved/bookmarked expresses."""
    try:
        async with async_session_maker() as db:
            result = await db.execute(
                select(ExpressBet).where(
                    ExpressBet.user_id == user_id,
                ).order_by(desc(ExpressBet.created_at)).limit(limit)
            )
            expresses = result.scalars().all()
    except Exception as e:
        logger.error(f"Failed to query express history: {e}")
        return []

    return [_express_to_dict(e) for e in expresses]


def _express_to_dict(e: ExpressBet) -> Dict:
    """Convert ExpressBet model to API dict."""
    legs = json.loads(e.legs_json) if e.legs_json else []
    leagues = json.loads(e.selected_leagues) if e.selected_leagues else None

    return {
        "id": e.id,
        "type": e.express_type,
        "preset": getattr(e, "preset_name", None),
        "preset_label": getattr(e, "preset_label", None),
        "preset_description": getattr(e, "preset_description", None),
        "is_pro_only": getattr(e, "is_pro_only", False),
        "legs": legs,
        "total_odds": e.total_odds,
        "leg_count": e.leg_count,
        "avg_confidence": e.avg_confidence,
        "target_avg_odds": e.target_avg_odds,
        "selected_leagues": leagues,
        "status": e.status,
        "correct_legs": e.correct_legs,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


# ---------------------------------------------------------------------------
# Background worker — generates menu every 30 minutes
# ---------------------------------------------------------------------------

async def express_generation_loop():
    """
    Background task: regenerate menu every 30 minutes.
    First run after 60s startup delay.
    """
    import asyncio
    from zoneinfo import ZoneInfo

    # Wait 60s on startup
    await asyncio.sleep(60)

    while True:
        try:
            logger.info("Starting express menu batch generation...")
            stats = await generate_menu_batch()
            logger.info(f"Express menu batch: {stats}")
        except Exception as e:
            logger.error(f"Express generation loop error: {e}")

        # Regenerate every 30 minutes
        await asyncio.sleep(30 * 60)
