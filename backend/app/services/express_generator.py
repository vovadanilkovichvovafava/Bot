"""
Express Bet Generator — creates multi-leg accumulator bets.

Two modes:
  1. Daily Express: 5 legs from today's matches, best value odds >= 1.5
  2. Custom Express (PRO): user picks leagues, leg count, target avg odds

Works directly with Fonbet API for real odds.
Optionally uses ML predictions for smarter selection when available.
"""
import json
import logging
import math
import random
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import select, and_, desc

from app.core.database import async_session_maker
from app.models.express_bet import ExpressBet

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lazy imports — avoid crashing if fonbet_api has issues at import time
# ---------------------------------------------------------------------------

def _get_fonbet():
    from app.services.fonbet_api import get_football_events, TOP_LEAGUE_IDS
    return get_football_events, TOP_LEAGUE_IDS


def _get_available_leagues():
    _, TOP_LEAGUE_IDS = _get_fonbet()
    return [info["code"] for info in TOP_LEAGUE_IDS.values()]


AVAILABLE_LEAGUES = None  # populated lazily


def get_available_leagues():
    """Get available league codes (lazy-loaded)."""
    global AVAILABLE_LEAGUES
    if AVAILABLE_LEAGUES is None:
        AVAILABLE_LEAGUES = _get_available_leagues()
    return AVAILABLE_LEAGUES


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Odds keys we understand and their user-friendly labels
_BET_LABELS = {
    "1": "1 (Home)",
    "X": "X (Draw)",
    "2": "2 (Away)",
    "1X": "1X",
    "X2": "X2",
    "12": "12",
    "over_1.5": "Over 1.5",
    "under_1.5": "Under 1.5",
    "over_2.5": "Over 2.5",
    "under_2.5": "Under 2.5",
    "over_3.5": "Over 3.5",
    "under_3.5": "Under 3.5",
    "btts_yes": "BTTS Yes",
    "btts_no": "BTTS No",
}

# Priority tiers — prefer interesting, mainstream bet types
_BET_PRIORITY = {
    # Tier 1: Main 1X2 markets — most interesting for users
    "1": 1.0, "2": 1.0,
    # Tier 2: Over/Under 2.5 — popular and easy to understand
    "over_2.5": 0.9, "under_2.5": 0.85,
    # Tier 3: Double chance — safe but less exciting
    "1X": 0.7, "X2": 0.7, "12": 0.65,
    # Tier 4: Other totals
    "over_1.5": 0.6, "over_3.5": 0.6,
    "under_1.5": 0.5, "under_3.5": 0.5,
    # Tier 5: Draw — rare outcome, avoid in express
    "X": 0.3,
    # Tier 6: BTTS — boring for express, deprioritize
    "btts_yes": 0.4, "btts_no": 0.2,
}


def _find_best_bet(odds: dict, min_odds: float = 1.5, target_odds: float = None) -> Optional[Dict]:
    """
    Pick the best single bet from a Fonbet event's odds.

    Strategy:
    - Prioritize 1X2 and Over/Under markets (most interesting for users)
    - Avoid boring BTTS No / Under 1.5 unless nothing else fits
    - For daily: prefer odds in 1.5-3.0 range (value + excitement)
    - For custom: prefer odds closest to target_odds
    """
    candidates = []

    for key, value in odds.items():
        if key not in _BET_LABELS:
            continue
        if not isinstance(value, (int, float)) or value < min_odds:
            continue
        # Skip very high odds (long shots not suitable for express)
        if value > 5.0:
            continue

        implied_prob = 1.0 / value
        priority = _BET_PRIORITY.get(key, 0.3)

        if target_odds:
            # Custom: balance priority with proximity to target odds
            distance_penalty = abs(value - target_odds) * 0.15
            score = priority * 0.6 + implied_prob * 0.3 - distance_penalty
        else:
            # Daily: value sweet spot 1.6-3.0 with priority weighting
            if 1.6 <= value <= 3.0:
                range_bonus = 0.15
            elif 1.5 <= value <= 4.0:
                range_bonus = 0.05
            else:
                range_bonus = -0.1
            score = priority * 0.5 + implied_prob * 0.3 + range_bonus

        candidates.append({
            "bet_key": key,
            "bet_type": _BET_LABELS[key],
            "odds": round(value, 2),
            "implied_prob": round(implied_prob, 4),
            "score": score,
        })

    if not candidates:
        return None

    # Sort by score (best first)
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[0]


async def _get_fonbet_matches(league_codes: List[str] = None) -> List[Dict]:
    """
    Get all upcoming (non-live) Fonbet events with odds.
    Optionally filter by league codes.
    """
    get_football_events, TOP_LEAGUE_IDS = _get_fonbet()

    try:
        data = await get_football_events()
        events = data.get("events", [])
    except Exception as e:
        logger.error(f"Failed to fetch Fonbet events: {e}")
        return []

    # Build code → sportId mapping for filtering
    code_to_sportid = {v["code"]: k for k, v in TOP_LEAGUE_IDS.items()}
    allowed_sportids = None
    if league_codes:
        allowed_sportids = {code_to_sportid[c] for c in league_codes if c in code_to_sportid}

    matches = []
    for ev in events:
        # Skip live matches
        if ev.get("is_live"):
            continue

        # Skip if no odds
        odds = ev.get("odds", {})
        if not odds:
            continue

        # Filter by league
        sport_id = ev.get("sport_id")
        if allowed_sportids and sport_id not in allowed_sportids:
            continue

        # Find league code from sport_id
        league_code = None
        for sid, info in TOP_LEAGUE_IDS.items():
            if sid == sport_id:
                league_code = info["code"]
                break

        matches.append({
            "event_id": ev.get("id"),
            "team1": ev.get("team1", ""),
            "team2": ev.get("team2", ""),
            "sport_id": sport_id,
            "league_code": league_code,
            "start_time": ev.get("start_time"),
            "odds": odds,
            "deeplink": ev.get("deeplink"),
        })

    logger.info(f"Fonbet: {len(matches)} upcoming matches (filtered from {len(events)} events)")
    return matches


# ---------------------------------------------------------------------------
# ML prediction enrichment (optional)
# ---------------------------------------------------------------------------

async def _try_get_ml_confidence(matches: List[Dict]) -> Dict[str, float]:
    """
    Try to get ML confidence for matches. Returns empty dict if ML unavailable.
    Key = "team1 vs team2" normalized, Value = confidence 0-1.
    """
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
                # Get max confidence across all markets
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
    """Try to find ML confidence for a Fonbet match."""
    if not confidence_map:
        return 0.0

    from app.services.fonbet_api import _teams_match

    for key, conf in confidence_map.items():
        parts = key.split("|")
        if len(parts) != 2:
            continue
        ml_home, ml_away = parts
        if (_teams_match(team1, ml_home) and _teams_match(team2, ml_away)) or \
           (_teams_match(team1, ml_away) and _teams_match(team2, ml_home)):
            return conf
    return 0.0


# ---------------------------------------------------------------------------
# Generation functions
# ---------------------------------------------------------------------------

async def generate_daily_express(leg_count: int = 5, min_odds: float = 1.5) -> Optional[Dict]:
    """
    Generate the daily express bet from Fonbet events.
    Picks best value bets across all top leagues.
    """
    matches = await _get_fonbet_matches()
    if not matches:
        logger.warning("No Fonbet matches available for daily express")
        return None

    # Try to get ML confidence (optional enrichment)
    ml_conf = await _try_get_ml_confidence(matches)

    # Find best bet for each match
    legs = []
    for match in matches:
        best = _find_best_bet(match["odds"], min_odds=min_odds)
        if not best:
            continue

        # Get ML confidence if available
        confidence = _get_ml_confidence_for_match(ml_conf, match["team1"], match["team2"])
        if confidence == 0:
            confidence = best["implied_prob"]  # fallback to implied probability

        legs.append({
            "home_team": match["team1"],
            "away_team": match["team2"],
            "league": match["league_code"],
            "match_date": match.get("start_time"),
            "bet_type": best["bet_type"],
            "bet_name": best["bet_key"],
            "odds": best["odds"],
            "confidence": round(confidence, 4),
            "fonbet_event_id": match.get("event_id"),
            "fonbet_deeplink": match.get("deeplink"),
            "fonbet_sport_id": match.get("sport_id"),
        })

    # Sort by confidence (highest first)
    legs.sort(key=lambda x: x["confidence"], reverse=True)

    # Select diverse legs — avoid repeating same bet type too much
    selected = []
    bet_type_count = {}
    max_per_type = 2  # max 2 legs with same bet type

    for leg in legs:
        bt = leg["bet_type"]
        if bet_type_count.get(bt, 0) >= max_per_type:
            continue
        selected.append(leg)
        bet_type_count[bt] = bet_type_count.get(bt, 0) + 1
        if len(selected) >= leg_count:
            break

    # If not enough diverse legs, fill from remaining
    if len(selected) < leg_count:
        for leg in legs:
            if leg not in selected:
                selected.append(leg)
                if len(selected) >= leg_count:
                    break

    if len(selected) < 2:
        logger.warning(f"Not enough legs for daily express: {len(selected)}")
        return None

    return await _save_express("daily", None, selected)


async def generate_custom_express(
    user_id: int,
    league_codes: List[str],
    leg_count: int = 5,
    target_avg_odds: float = 1.8,
) -> Optional[Dict]:
    """
    Generate a custom express for PRO users.
    Filters by selected leagues and targets specific avg odds per leg.
    """
    matches = await _get_fonbet_matches(league_codes=league_codes)
    if not matches:
        return None

    # Try ML confidence
    ml_conf = await _try_get_ml_confidence(matches)

    min_odds = max(1.2, target_avg_odds - 0.5)

    legs = []
    for match in matches:
        best = _find_best_bet(match["odds"], min_odds=min_odds, target_odds=target_avg_odds)
        if not best:
            continue

        confidence = _get_ml_confidence_for_match(ml_conf, match["team1"], match["team2"])
        if confidence == 0:
            confidence = best["implied_prob"]

        legs.append({
            "home_team": match["team1"],
            "away_team": match["team2"],
            "league": match["league_code"],
            "match_date": match.get("start_time"),
            "bet_type": best["bet_type"],
            "bet_name": best["bet_key"],
            "odds": best["odds"],
            "confidence": round(confidence, 4),
            "fonbet_event_id": match.get("event_id"),
            "fonbet_deeplink": match.get("deeplink"),
            "fonbet_sport_id": match.get("sport_id"),
        })

    # Sort: prefer higher confidence, then odds closer to target
    legs.sort(key=lambda x: (-x["confidence"], abs(x["odds"] - target_avg_odds)))

    # Diversity: max 2 same bet types
    selected = []
    bt_count = {}
    for leg in legs:
        bt = leg["bet_type"]
        if bt_count.get(bt, 0) >= 2:
            continue
        selected.append(leg)
        bt_count[bt] = bt_count.get(bt, 0) + 1
        if len(selected) >= leg_count:
            break
    if len(selected) < leg_count:
        for leg in legs:
            if leg not in selected:
                selected.append(leg)
                if len(selected) >= leg_count:
                    break

    if len(selected) < 2:
        return None

    return await _save_express("custom", user_id, selected, target_avg_odds, league_codes)


async def _save_express(
    express_type: str,
    user_id: Optional[int],
    legs: List[Dict],
    target_avg_odds: float = None,
    selected_leagues: List[str] = None,
) -> Dict:
    """Save express bet to DB and return result dict."""
    total_odds = 1.0
    for leg in legs:
        total_odds *= leg["odds"]
    total_odds = round(total_odds, 2)

    avg_confidence = sum(l["confidence"] for l in legs) / len(legs)

    express = ExpressBet(
        express_type=express_type,
        user_id=user_id,
        legs_json=json.dumps(legs),
        total_odds=total_odds,
        leg_count=len(legs),
        avg_confidence=round(avg_confidence, 4),
        target_avg_odds=target_avg_odds,
        selected_leagues=json.dumps(selected_leagues) if selected_leagues else None,
        status="pending",
    )

    try:
        async with async_session_maker() as db:
            db.add(express)
            await db.commit()
            await db.refresh(express)

        express_id = express.id
        created_at = express.created_at.isoformat() if express.created_at else None
    except Exception as e:
        logger.error(f"Failed to save express to DB: {e}")
        # Return result anyway even if DB save fails
        express_id = None
        created_at = datetime.utcnow().isoformat()

    result = {
        "id": express_id,
        "type": express_type,
        "legs": legs,
        "total_odds": total_odds,
        "leg_count": len(legs),
        "avg_confidence": round(avg_confidence, 4),
        "created_at": created_at,
    }

    if target_avg_odds:
        result["target_avg_odds"] = target_avg_odds
    if selected_leagues:
        result["selected_leagues"] = selected_leagues

    logger.info(f"{express_type.title()} express: {len(legs)} legs, total odds {total_odds}")
    return result


# ---------------------------------------------------------------------------
# DB queries
# ---------------------------------------------------------------------------

async def get_today_daily_express() -> Optional[Dict]:
    """Get today's daily express (or None if not yet generated)."""
    today = datetime.utcnow().strftime("%Y-%m-%d")

    try:
        async with async_session_maker() as db:
            result = await db.execute(
                select(ExpressBet).where(
                    and_(
                        ExpressBet.express_type == "daily",
                        ExpressBet.created_at >= today,
                    )
                ).order_by(desc(ExpressBet.created_at)).limit(1)
            )
            express = result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"Failed to query daily express: {e}")
        return None

    if not express:
        return None

    legs = json.loads(express.legs_json) if express.legs_json else []

    return {
        "id": express.id,
        "type": "daily",
        "legs": legs,
        "total_odds": express.total_odds,
        "leg_count": express.leg_count,
        "avg_confidence": express.avg_confidence,
        "status": express.status,
        "correct_legs": express.correct_legs,
        "created_at": express.created_at.isoformat() if express.created_at else None,
    }


async def get_user_expresses(user_id: int, limit: int = 10) -> List[Dict]:
    """Get user's custom express history."""
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

    return [
        {
            "id": e.id,
            "type": e.express_type,
            "legs": json.loads(e.legs_json) if e.legs_json else [],
            "total_odds": e.total_odds,
            "leg_count": e.leg_count,
            "avg_confidence": e.avg_confidence,
            "status": e.status,
            "correct_legs": e.correct_legs,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in expresses
    ]


# ---------------------------------------------------------------------------
# Background worker
# ---------------------------------------------------------------------------

async def express_generation_loop():
    """
    Background task: generate daily express at 15:00 London time.
    Runs every 30 minutes, checks if it's time.
    """
    import asyncio
    from zoneinfo import ZoneInfo

    london_tz = ZoneInfo("Europe/London")

    # Wait 2 minutes on startup
    await asyncio.sleep(120)

    while True:
        try:
            now = datetime.now(london_tz)

            # Generate at 15:00 London (or shortly after)
            if now.hour == 15 and now.minute < 30:
                existing = await get_today_daily_express()
                if not existing:
                    logger.info("Generating daily express at 15:00 London")
                    result = await generate_daily_express()
                    if result:
                        logger.info(f"Daily express ready: {result['leg_count']} legs, odds {result['total_odds']}")
                    else:
                        logger.warning("Failed to generate daily express — no suitable matches")

            await asyncio.sleep(30 * 60)
        except Exception as e:
            logger.error(f"Express generation loop error: {e}")
            await asyncio.sleep(30 * 60)
