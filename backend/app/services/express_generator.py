"""
Express Bet Generator — creates multi-leg accumulator bets.

Two modes:
  1. Daily Express: 5 legs from today's matches, highest confidence, odds >= 1.5
  2. Custom Express (PRO): user picks leagues, leg count, target avg odds

Uses real odds from Fonbet + ML model confidence for leg selection.
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from sqlalchemy import select, and_, desc

from app.core.database import async_session_maker
from app.models.ml_models import MatchFeature, CachedPrediction
from app.models.express_bet import ExpressBet
from app.services.fonbet_api import get_football_events, TOP_LEAGUE_IDS

logger = logging.getLogger(__name__)

# Fonbet sport_id → league code mapping (reverse of TOP_LEAGUE_IDS)
_SPORTID_TO_CODE = {v["code"]: k for k, v in TOP_LEAGUE_IDS.items()}
_CODE_TO_SPORTID = _SPORTID_TO_CODE  # alias

# All league codes available
AVAILABLE_LEAGUES = [info["code"] for info in TOP_LEAGUE_IDS.values()]


def _bet_type_label(bet_name: str) -> str:
    """Convert ML bet_name to user-friendly label."""
    mapping = {
        "home_win": "1",
        "draw": "X",
        "away_win": "2",
        "home_or_draw": "1X",
        "away_or_draw": "X2",
        "home_or_away": "12",
        "over_2.5": "Over 2.5",
        "under_2.5": "Under 2.5",
        "over_1.5": "Over 1.5",
        "under_1.5": "Under 1.5",
        "over_3.5": "Over 3.5",
        "under_3.5": "Under 3.5",
        "yes": "BTTS Yes",
        "no": "BTTS No",
    }
    return mapping.get(bet_name, bet_name)


def _get_fonbet_odds_for_bet(fonbet_odds: dict, bet_name: str) -> Optional[float]:
    """Map ML bet_name to Fonbet odds key and get the value."""
    mapping = {
        "home_win": "1",
        "draw": "X",
        "away_win": "2",
        "home_or_draw": "1X",
        "away_or_draw": "X2",
        "home_or_away": "12",
        "over_2.5": "over_2.5",
        "under_2.5": "under_2.5",
        "over_1.5": "over_1.5",
        "under_1.5": "under_1.5",
        "over_3.5": "over_3.5",
        "under_3.5": "under_3.5",
        "yes": "btts_yes",
        "no": "btts_no",
    }
    fonbet_key = mapping.get(bet_name)
    if fonbet_key and fonbet_key in fonbet_odds:
        return fonbet_odds[fonbet_key]
    return None


async def _get_today_predictions() -> List[Dict]:
    """Get all cached ML predictions for today's matches."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")

    async with async_session_maker() as db:
        # Get today's match features with cached predictions
        result = await db.execute(
            select(MatchFeature, CachedPrediction).outerjoin(
                CachedPrediction,
                MatchFeature.fixture_id == CachedPrediction.fixture_id,
            ).where(
                and_(
                    MatchFeature.match_date >= today,
                    MatchFeature.match_date < tomorrow,
                    MatchFeature.is_verified == False,
                )
            )
        )
        rows = result.all()

    predictions = []
    for feature, cached in rows:
        if not cached or not cached.ml_prediction_json:
            continue
        try:
            pred = json.loads(cached.ml_prediction_json)
            pred["_feature"] = feature
            predictions.append(pred)
        except Exception:
            continue

    return predictions


def _find_best_bet_for_match(prediction: Dict, min_odds: float = 1.5, fonbet_odds: dict = None) -> Optional[Dict]:
    """
    Find the single best bet for a match.
    Prefers: value bets > highest confidence.
    Filters by min_odds using real Fonbet odds when available.
    """
    markets = prediction.get("markets", {})
    feature = prediction.get("_feature")

    candidates = []

    # Scan all markets for bets above min_odds with good confidence
    market_bets = {
        "1x2": ["home_win", "draw", "away_win"],
        "over_under_25": ["over_2.5", "under_2.5"],
        "over_under_15": ["over_1.5", "under_1.5"],
        "btts": ["yes", "no"],
    }

    for market_name, bet_names in market_bets.items():
        if market_name not in markets:
            continue
        for bet_name in bet_names:
            prob = markets[market_name].get(bet_name, 0)
            if prob < 0.55:
                continue

            # Get real odds from Fonbet first, fallback to DB
            real_odds = None
            if fonbet_odds:
                real_odds = _get_fonbet_odds_for_bet(fonbet_odds, bet_name)

            if real_odds is None and feature:
                # Fallback to DB odds
                odds_map = {
                    "home_win": feature.odds_home,
                    "draw": feature.odds_draw,
                    "away_win": feature.odds_away,
                    "over_2.5": feature.odds_over25,
                    "under_2.5": feature.odds_under25,
                    "yes": feature.odds_btts_yes,
                    "no": feature.odds_btts_no,
                }
                real_odds = odds_map.get(bet_name)

            if real_odds is None or real_odds < min_odds:
                continue

            # Score = confidence * log(odds) — balances probability with payout
            import math
            score = prob * math.log(real_odds + 1)

            candidates.append({
                "bet_name": bet_name,
                "bet_type": _bet_type_label(bet_name),
                "market": market_name,
                "probability": round(prob, 4),
                "odds": round(real_odds, 2),
                "score": score,
            })

    if not candidates:
        return None

    # Sort by score (best first)
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[0]


async def _match_fonbet_events(predictions: List[Dict]) -> Dict[int, dict]:
    """Match ML fixtures to Fonbet events for real odds + deeplinks."""
    try:
        fonbet_data = await get_football_events()
        fonbet_events = fonbet_data.get("events", [])
    except Exception as e:
        logger.warning(f"Could not fetch Fonbet events: {e}")
        return {}

    # Build lookup by normalized team names
    from app.services.fonbet_api import _teams_match

    fixture_to_fonbet = {}

    for pred in predictions:
        feature = pred.get("_feature")
        if not feature:
            continue

        home = feature.home_team_name or ""
        away = feature.away_team_name or ""

        for ev in fonbet_events:
            if ev.get("is_live"):
                continue
            if _teams_match(home, ev["team1"]) and _teams_match(away, ev["team2"]):
                fixture_to_fonbet[feature.fixture_id] = ev
                break
            # Check reversed
            if _teams_match(home, ev["team2"]) and _teams_match(away, ev["team1"]):
                fixture_to_fonbet[feature.fixture_id] = ev
                break

    logger.info(f"Matched {len(fixture_to_fonbet)}/{len(predictions)} fixtures to Fonbet")
    return fixture_to_fonbet


async def generate_daily_express(leg_count: int = 5, min_odds: float = 1.5) -> Optional[Dict]:
    """
    Generate the daily express bet.
    Picks top N matches by confidence with real Fonbet odds >= min_odds.
    """
    predictions = await _get_today_predictions()
    if not predictions:
        logger.warning("No predictions available for daily express")
        return None

    # Match to Fonbet for real odds
    fonbet_map = await _match_fonbet_events(predictions)

    # Find best bet for each match
    legs = []
    for pred in predictions:
        feature = pred.get("_feature")
        if not feature:
            continue

        fonbet_ev = fonbet_map.get(feature.fixture_id, {})
        fonbet_odds = fonbet_ev.get("odds", {})

        best = _find_best_bet_for_match(pred, min_odds=min_odds, fonbet_odds=fonbet_odds)
        if not best:
            continue

        leg = {
            "fixture_id": feature.fixture_id,
            "home_team": feature.home_team_name,
            "away_team": feature.away_team_name,
            "league": feature.league_id,
            "match_date": feature.match_date.isoformat() if feature.match_date else None,
            "bet_type": best["bet_type"],
            "bet_name": best["bet_name"],
            "odds": best["odds"],
            "confidence": best["probability"],
            "fonbet_event_id": fonbet_ev.get("id"),
            "fonbet_deeplink": fonbet_ev.get("deeplink"),
            "fonbet_sport_id": fonbet_ev.get("sport_id"),
        }
        legs.append(leg)

    # Sort by confidence (highest first), take top N
    legs.sort(key=lambda x: x["confidence"], reverse=True)
    legs = legs[:leg_count]

    if len(legs) < 2:
        logger.warning(f"Not enough legs for daily express: {len(legs)}")
        return None

    # Calculate totals
    total_odds = 1.0
    for leg in legs:
        total_odds *= leg["odds"]
    total_odds = round(total_odds, 2)

    avg_confidence = sum(l["confidence"] for l in legs) / len(legs)

    # Save to DB
    express = ExpressBet(
        express_type="daily",
        user_id=None,
        legs_json=json.dumps(legs),
        total_odds=total_odds,
        leg_count=len(legs),
        avg_confidence=round(avg_confidence, 4),
        status="pending",
    )

    async with async_session_maker() as db:
        db.add(express)
        await db.commit()
        await db.refresh(express)

    result = {
        "id": express.id,
        "type": "daily",
        "legs": legs,
        "total_odds": total_odds,
        "leg_count": len(legs),
        "avg_confidence": round(avg_confidence, 4),
        "created_at": express.created_at.isoformat() if express.created_at else None,
    }

    logger.info(f"Daily express generated: {len(legs)} legs, total odds {total_odds}")
    return result


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
    predictions = await _get_today_predictions()
    if not predictions:
        return None

    # Filter by leagues
    # Map league codes to API-Football league IDs
    league_id_map = {info["code"]: info["league_id"] for info in TOP_LEAGUE_IDS.values()}
    selected_league_ids = set()
    for code in league_codes:
        if code in league_id_map:
            selected_league_ids.add(league_id_map[code])

    if selected_league_ids:
        predictions = [
            p for p in predictions
            if p.get("_feature") and p["_feature"].league_id in selected_league_ids
        ]

    if not predictions:
        return None

    # Match to Fonbet
    fonbet_map = await _match_fonbet_events(predictions)

    # Find best bet for each match with target odds range
    # Allow wider range: target_avg_odds ± 0.5
    min_odds = max(1.2, target_avg_odds - 0.5)

    legs = []
    for pred in predictions:
        feature = pred.get("_feature")
        if not feature:
            continue

        fonbet_ev = fonbet_map.get(feature.fixture_id, {})
        fonbet_odds = fonbet_ev.get("odds", {})

        best = _find_best_bet_for_match(pred, min_odds=min_odds, fonbet_odds=fonbet_odds)
        if not best:
            continue

        leg = {
            "fixture_id": feature.fixture_id,
            "home_team": feature.home_team_name,
            "away_team": feature.away_team_name,
            "league": feature.league_id,
            "match_date": feature.match_date.isoformat() if feature.match_date else None,
            "bet_type": best["bet_type"],
            "bet_name": best["bet_name"],
            "odds": best["odds"],
            "confidence": best["probability"],
            "fonbet_event_id": fonbet_ev.get("id"),
            "fonbet_deeplink": fonbet_ev.get("deeplink"),
            "fonbet_sport_id": fonbet_ev.get("sport_id"),
        }
        legs.append(leg)

    # Sort: prefer odds closer to target, then by confidence
    legs.sort(key=lambda x: (-x["confidence"], abs(x["odds"] - target_avg_odds)))
    legs = legs[:leg_count]

    if len(legs) < 2:
        return None

    # Calculate totals
    total_odds = 1.0
    for leg in legs:
        total_odds *= leg["odds"]
    total_odds = round(total_odds, 2)

    avg_confidence = sum(l["confidence"] for l in legs) / len(legs)

    # Save to DB
    express = ExpressBet(
        express_type="custom",
        user_id=user_id,
        legs_json=json.dumps(legs),
        total_odds=total_odds,
        leg_count=len(legs),
        avg_confidence=round(avg_confidence, 4),
        target_avg_odds=target_avg_odds,
        selected_leagues=json.dumps(league_codes),
        status="pending",
    )

    async with async_session_maker() as db:
        db.add(express)
        await db.commit()
        await db.refresh(express)

    result = {
        "id": express.id,
        "type": "custom",
        "legs": legs,
        "total_odds": total_odds,
        "leg_count": len(legs),
        "avg_confidence": round(avg_confidence, 4),
        "target_avg_odds": target_avg_odds,
        "selected_leagues": league_codes,
        "created_at": express.created_at.isoformat() if express.created_at else None,
    }

    logger.info(f"Custom express for user {user_id}: {len(legs)} legs, total odds {total_odds}")
    return result


async def get_today_daily_express() -> Optional[Dict]:
    """Get today's daily express (or None if not yet generated)."""
    today = datetime.utcnow().strftime("%Y-%m-%d")

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
    async with async_session_maker() as db:
        result = await db.execute(
            select(ExpressBet).where(
                ExpressBet.user_id == user_id,
            ).order_by(desc(ExpressBet.created_at)).limit(limit)
        )
        expresses = result.scalars().all()

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
                # Check if already generated today
                existing = await get_today_daily_express()
                if not existing:
                    logger.info("Generating daily express at 15:00 London")
                    result = await generate_daily_express()
                    if result:
                        logger.info(f"Daily express ready: {result['leg_count']} legs, odds {result['total_odds']}")
                    else:
                        logger.warning("Failed to generate daily express")

            await asyncio.sleep(30 * 60)  # Check every 30 minutes
        except Exception as e:
            logger.error(f"Express generation loop error: {e}")
            await asyncio.sleep(30 * 60)
