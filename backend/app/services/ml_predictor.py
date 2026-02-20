"""
ML Prediction Service.
Generates predictions for ALL betting markets using trained ML models.
Finds value bets by comparing model probabilities vs bookmaker odds.
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from sqlalchemy import select, and_

from app.core.database import async_session_maker
from app.models.ml_models import MatchFeature, CachedPrediction, LearningLog
from app.services.ml_trainer import load_active_model
from app.services.feature_engineer import build_feature_vector, enrich_features_for_match

logger = logging.getLogger(__name__)

# Confidence thresholds for recommendations
HIGH_CONFIDENCE_THRESHOLD = 0.70  # Only recommend bets above this
VALUE_MARGIN = 0.05  # Model probability must exceed implied odds by this margin


async def predict_match(fixture_id: int) -> Optional[Dict]:
    """
    Generate ML predictions for all betting markets for a single fixture.
    Returns dict with probabilities for each market, or None if no model available.
    """
    # Check cache first
    async with async_session_maker() as db:
        cached = await db.execute(
            select(CachedPrediction).where(CachedPrediction.fixture_id == fixture_id)
        )
        cache_hit = cached.scalar_one_or_none()
        if cache_hit and cache_hit.ml_prediction_json:
            # Check if cache is still valid (less than 6 hours old)
            if cache_hit.created_at and (datetime.utcnow() - cache_hit.created_at).total_seconds() < 6 * 3600:
                try:
                    return json.loads(cache_hit.ml_prediction_json)
                except Exception:
                    pass

    # Get match feature data
    async with async_session_maker() as db:
        result = await db.execute(
            select(MatchFeature).where(MatchFeature.fixture_id == fixture_id)
        )
        feature = result.scalar_one_or_none()

        if not feature:
            logger.warning(f"No feature data for fixture {fixture_id}")
            return None

        # Ensure features are computed
        if feature.home_elo is None:
            await enrich_features_for_match(db, feature)
            await db.commit()

    # Build feature vector
    vec = await build_feature_vector(feature)
    if vec is None:
        logger.warning(f"Could not build feature vector for fixture {fixture_id}")
        return None

    try:
        import numpy as np
        X = np.array([vec])
    except ImportError:
        logger.error("numpy not installed")
        return None

    prediction = {
        "fixture_id": fixture_id,
        "home_team": feature.home_team_name,
        "away_team": feature.away_team_name,
        "match_date": feature.match_date.isoformat() if feature.match_date else None,
        "markets": {},
        "recommendations": [],
        "model_info": {},
    }

    # 1. Outcome (1X2)
    outcome_model = await load_active_model("outcome_3way")
    if outcome_model:
        try:
            proba = outcome_model.predict_proba(X)[0]
            home_prob = float(proba[0])
            draw_prob = float(proba[1])
            away_prob = float(proba[2])

            prediction["markets"]["1x2"] = {
                "home_win": round(home_prob, 4),
                "draw": round(draw_prob, 4),
                "away_win": round(away_prob, 4),
            }

            # Double Chance (derived)
            prediction["markets"]["double_chance"] = {
                "home_or_draw": round(home_prob + draw_prob, 4),
                "away_or_draw": round(away_prob + draw_prob, 4),
                "home_or_away": round(home_prob + away_prob, 4),
            }
        except Exception as e:
            logger.error(f"Outcome prediction error: {e}")

    # 2. Goals Over/Under
    for model_name, market_key, threshold in [
        ("goals_ou25", "over_under_25", 2.5),
        ("goals_ou15", "over_under_15", 1.5),
        ("goals_ou35", "over_under_35", 3.5),
    ]:
        model = await load_active_model(model_name)
        if model:
            try:
                proba = model.predict_proba(X)[0]
                under_prob = float(proba[0])
                over_prob = float(proba[1])
                prediction["markets"][market_key] = {
                    f"over_{threshold}": round(over_prob, 4),
                    f"under_{threshold}": round(under_prob, 4),
                }
            except Exception as e:
                logger.error(f"{model_name} prediction error: {e}")

    # 3. BTTS
    btts_model = await load_active_model("btts")
    if btts_model:
        try:
            proba = btts_model.predict_proba(X)[0]
            prediction["markets"]["btts"] = {
                "yes": round(float(proba[1]), 4),
                "no": round(float(proba[0]), 4),
            }
        except Exception as e:
            logger.error(f"BTTS prediction error: {e}")

    # 4. Corners Over/Under
    corners_model = await load_active_model("corners_ou95")
    if corners_model:
        try:
            proba = corners_model.predict_proba(X)[0]
            prediction["markets"]["corners_ou"] = {
                "over_9.5": round(float(proba[1]), 4),
                "under_9.5": round(float(proba[0]), 4),
            }
        except Exception as e:
            logger.error(f"Corners prediction error: {e}")

    # 5. Cards Over/Under
    cards_model = await load_active_model("cards_ou35")
    if cards_model:
        try:
            proba = cards_model.predict_proba(X)[0]
            prediction["markets"]["cards_ou"] = {
                "over_3.5": round(float(proba[1]), 4),
                "under_3.5": round(float(proba[0]), 4),
            }
        except Exception as e:
            logger.error(f"Cards prediction error: {e}")

    # 6. Half-Time result (derived from outcome + historical patterns)
    # Simple heuristic: HT probabilities are more conservative than FT
    if "1x2" in prediction["markets"]:
        ft = prediction["markets"]["1x2"]
        prediction["markets"]["ht_result"] = {
            "home_win": round(ft["home_win"] * 0.65, 4),
            "draw": round(min(ft["draw"] * 1.6, 0.55), 4),
            "away_win": round(ft["away_win"] * 0.60, 4),
        }

    # 7. Find value bets and recommendations
    prediction["recommendations"] = _find_value_bets(prediction, feature)
    prediction["model_info"] = await _get_model_info()

    # Cache the prediction
    await _cache_prediction(fixture_id, prediction)

    return prediction


def _find_value_bets(prediction: Dict, feature: MatchFeature) -> List[Dict]:
    """
    Compare model probabilities vs bookmaker odds to find value.
    Returns sorted list of recommended bets.
    """
    recommendations = []

    def check_value(bet_name: str, model_prob: float, odds: Optional[float], bet_type: str):
        if odds is None or odds <= 1.0 or model_prob <= 0:
            return
        implied_prob = 1.0 / odds
        edge = model_prob - implied_prob
        ev = (model_prob * odds) - 1.0  # Expected Value

        if model_prob >= HIGH_CONFIDENCE_THRESHOLD and edge >= VALUE_MARGIN:
            recommendations.append({
                "bet_type": bet_type,
                "bet_name": bet_name,
                "model_probability": round(model_prob, 4),
                "odds": odds,
                "implied_probability": round(implied_prob, 4),
                "edge": round(edge, 4),
                "expected_value": round(ev, 4),
                "confidence": "high" if model_prob >= 0.80 else "medium",
                "stake_suggestion": _suggest_stake(model_prob, ev),
            })

    markets = prediction.get("markets", {})

    # 1X2
    if "1x2" in markets:
        m = markets["1x2"]
        check_value("Home Win", m["home_win"], feature.odds_home, "1X2")
        check_value("Draw", m["draw"], feature.odds_draw, "1X2")
        check_value("Away Win", m["away_win"], feature.odds_away, "1X2")

    # Double Chance
    if "double_chance" in markets and feature.odds_home and feature.odds_draw:
        dc = markets["double_chance"]
        # DC odds not in our DB, but we can estimate
        check_value("Home or Draw", dc["home_or_draw"], None, "Double Chance")

    # Over/Under 2.5
    if "over_under_25" in markets:
        m = markets["over_under_25"]
        check_value("Over 2.5", m["over_2.5"], feature.odds_over25, "Over/Under")
        check_value("Under 2.5", m["under_2.5"], feature.odds_under25, "Over/Under")

    # BTTS
    if "btts" in markets:
        m = markets["btts"]
        check_value("BTTS Yes", m["yes"], feature.odds_btts_yes, "BTTS")
        check_value("BTTS No", m["no"], feature.odds_btts_no, "BTTS")

    # Sort by expected value (best bets first)
    recommendations.sort(key=lambda x: x["expected_value"], reverse=True)

    # Return top 5
    return recommendations[:5]


def _suggest_stake(probability: float, ev: float) -> str:
    """Suggest stake size based on Kelly criterion (fractional)."""
    if ev <= 0:
        return "skip"
    if probability >= 0.85:
        return "high (3-5%)"
    elif probability >= 0.75:
        return "medium (2-3%)"
    else:
        return "low (1-2%)"


async def _get_model_info() -> Dict:
    """Get info about active models."""
    info = {}
    async with async_session_maker() as db:
        result = await db.execute(
            select(MLModel).where(MLModel.is_active == True)
        )
        for model in result.scalars().all():
            info[model.model_name] = {
                "version": model.version,
                "accuracy": model.accuracy,
                "training_samples": model.training_samples,
                "trained_at": model.training_date.isoformat() if model.training_date else None,
            }
    return info


async def _cache_prediction(fixture_id: int, prediction: Dict):
    """Save prediction to cache."""
    try:
        async with async_session_maker() as db:
            existing = await db.execute(
                select(CachedPrediction).where(CachedPrediction.fixture_id == fixture_id)
            )
            cached = existing.scalar_one_or_none()

            pred_json = json.dumps(prediction)

            if cached:
                cached.ml_prediction_json = pred_json
                cached.recommendations_json = json.dumps(prediction.get("recommendations", []))
                cached.created_at = datetime.utcnow()
                cached.expires_at = datetime.utcnow() + timedelta(hours=6)
            else:
                cached = CachedPrediction(
                    fixture_id=fixture_id,
                    ml_prediction_json=pred_json,
                    recommendations_json=json.dumps(prediction.get("recommendations", [])),
                    expires_at=datetime.utcnow() + timedelta(hours=6),
                )
                db.add(cached)

            await db.commit()
    except Exception as e:
        logger.error(f"Error caching prediction: {e}")


async def batch_predict_today() -> int:
    """Generate predictions for all today's matches that don't have ML predictions yet."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")

    async with async_session_maker() as db:
        result = await db.execute(
            select(MatchFeature.fixture_id).where(
                and_(
                    MatchFeature.match_date >= today,
                    MatchFeature.match_date < tomorrow,
                    MatchFeature.is_verified == False,
                )
            )
        )
        fixture_ids = [r[0] for r in result.all()]

    predicted = 0
    for fid in fixture_ids:
        try:
            pred = await predict_match(fid)
            if pred:
                predicted += 1
        except Exception as e:
            logger.error(f"Error predicting fixture {fid}: {e}")

    logger.info(f"Batch prediction complete: {predicted}/{len(fixture_ids)} matches predicted")
    return predicted


async def get_match_recommendation(fixture_id: int) -> Optional[Dict]:
    """
    Get the best betting recommendation for a match.
    Used by the frontend to show top pick.
    """
    prediction = await predict_match(fixture_id)
    if not prediction:
        return None

    recs = prediction.get("recommendations", [])
    if not recs:
        # No value bets found, return highest probability market
        best = _get_highest_confidence_bet(prediction)
        if best:
            return {
                "fixture_id": fixture_id,
                "recommendation": best,
                "markets": prediction.get("markets", {}),
                "has_value_bet": False,
            }
        return None

    return {
        "fixture_id": fixture_id,
        "recommendation": recs[0],  # Top pick
        "all_recommendations": recs,
        "markets": prediction.get("markets", {}),
        "has_value_bet": True,
    }


def _get_highest_confidence_bet(prediction: Dict) -> Optional[Dict]:
    """Get the bet with highest model probability (even if no value vs odds)."""
    best_prob = 0
    best_bet = None

    markets = prediction.get("markets", {})

    for market_name, market_data in markets.items():
        for bet_name, prob in market_data.items():
            if isinstance(prob, (int, float)) and prob > best_prob:
                best_prob = prob
                best_bet = {
                    "bet_type": market_name,
                    "bet_name": bet_name,
                    "model_probability": round(prob, 4),
                    "confidence": "high" if prob >= 0.80 else "medium" if prob >= 0.65 else "low",
                }

    return best_bet
