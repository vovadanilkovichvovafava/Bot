"""
ML Prediction Service
Ensemble prediction with calibration and ROI adjustments
"""
import json
import os
import logging
from typing import Optional, Dict, List
from collections import Counter

import numpy as np

# Check ML availability
try:
    import joblib
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.ml.features import (
    ML_FEATURE_COLUMNS, ENSEMBLE_MODEL_TYPES, ML_CONFIG,
    get_confidence_band, calculate_ev, calculate_kelly_stake
)

logger = logging.getLogger(__name__)

# Global model cache
_model_cache = {}


class MLPredictorService:
    """Service for making ML predictions with ensemble voting"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.models_dir = ML_CONFIG["models_dir"]

    def _load_model(self, model_name: str, bet_category: str) -> Optional[Dict]:
        """Load a single model from cache or file"""
        cache_key = f"{model_name}_{bet_category}"

        # Check cache
        if cache_key in _model_cache:
            return _model_cache[cache_key]

        # Load from file
        model_path = f"{self.models_dir}/{cache_key}.joblib"
        if os.path.exists(model_path):
            try:
                data = joblib.load(model_path)
                _model_cache[cache_key] = data
                return data
            except Exception as e:
                logger.error(f"Error loading model {model_path}: {e}")

        return None

    def _load_ensemble(self, bet_category: str) -> Dict:
        """Load all models for a bet category"""
        models = {}
        for model_name in ENSEMBLE_MODEL_TYPES.keys():
            model_data = self._load_model(model_name, bet_category)
            if model_data:
                models[model_name] = model_data
        return models

    async def predict(self, features: Dict, bet_category: str) -> Dict:
        """
        Get ensemble prediction with weighted voting.

        Args:
            features: dict of feature values
            bet_category: one of BET_CATEGORIES

        Returns:
            {
                "prediction": int,
                "confidence": float (0-100),
                "votes": {model_name: {pred, prob, class_name}},
                "agreement": float (0-1),
                "consensus_boost": int,
                "available": bool
            }
        """
        result = {
            "prediction": None,
            "confidence": 50,
            "votes": {},
            "agreement": 0,
            "consensus_boost": 0,
            "available": False
        }

        if not ML_AVAILABLE:
            return result

        # Load models
        models = self._load_ensemble(bet_category)
        if not models:
            return result

        # Get predictions from each model
        predictions = []
        probabilities = []

        for model_name, model_data in models.items():
            try:
                model = model_data.get("model")
                feature_names = model_data.get("feature_names", [])

                if not model or not feature_names:
                    continue

                # Prepare feature vector
                feature_vector = np.array([[
                    features.get(f, ML_FEATURE_COLUMNS.get(f, 0))
                    for f in feature_names
                ]])

                # Predict
                pred = model.predict(feature_vector)[0]
                prob = model.predict_proba(feature_vector)[0]
                pred_prob = prob[pred] if pred < len(prob) else 0.5

                # Map classes
                if bet_category in ["outcomes_home", "outcomes_away", "outcomes_draw"]:
                    class_names = {0: "away", 1: "draw", 2: "home"}
                else:
                    class_names = {0: "no", 1: "yes"}
                class_name = class_names.get(int(pred), str(pred))

                # Model weight
                weight = ENSEMBLE_MODEL_TYPES.get(model_name, {}).get("weight", 1.0)

                result["votes"][model_name] = {
                    "pred": int(pred),
                    "prob": round(pred_prob * 100, 1),
                    "class_name": class_name,
                    "weight": weight
                }

                predictions.append(int(pred))
                probabilities.append(pred_prob * weight)

            except Exception as e:
                logger.error(f"Error predicting with {model_name}: {e}")

        if not predictions:
            return result

        result["available"] = True

        # Vote counting
        vote_counts = Counter(predictions)
        most_common_pred, most_common_count = vote_counts.most_common(1)[0]

        result["prediction"] = most_common_pred
        result["agreement"] = most_common_count / len(predictions)

        # Weighted average probability
        total_weight = sum(
            ENSEMBLE_MODEL_TYPES.get(m, {}).get("weight", 1.0)
            for m in result["votes"].keys()
        )
        weighted_prob = sum(probabilities) / total_weight if total_weight > 0 else 0.5

        # Base confidence
        base_confidence = weighted_prob * 100

        # Consensus boost
        if result["agreement"] >= 1.0:
            result["consensus_boost"] = 15
        elif result["agreement"] >= 0.67:
            result["consensus_boost"] = 8
        elif result["agreement"] >= 0.5:
            result["consensus_boost"] = 0
        else:
            result["consensus_boost"] = -10

        # Final confidence (clamped)
        result["confidence"] = min(
            ML_CONFIG["max_confidence"],
            max(ML_CONFIG["min_confidence"], base_confidence + result["consensus_boost"])
        )

        return result

    async def get_calibrated_prediction(self, features: Dict, bet_category: str) -> Dict:
        """Get prediction with calibration and ROI adjustments"""
        # Base prediction
        ensemble = await self.predict(features, bet_category)

        if not ensemble["available"]:
            return ensemble

        # Apply calibration
        raw_confidence = ensemble["confidence"]
        calibrated_confidence = await self._apply_calibration(bet_category, raw_confidence)

        # Apply ROI adjustment
        roi_adjustment, roi_reason = await self._get_roi_adjustment(bet_category)

        final_confidence = min(
            ML_CONFIG["max_confidence"],
            max(ML_CONFIG["min_confidence"], calibrated_confidence + roi_adjustment)
        )

        ensemble["raw_confidence"] = raw_confidence
        ensemble["confidence"] = final_confidence
        ensemble["calibration_applied"] = True
        ensemble["roi_adjustment"] = roi_adjustment
        ensemble["roi_reason"] = roi_reason

        # Calculate EV and stake if odds available
        if "odds" in features:
            odds = features["odds"]
            ensemble["ev"] = calculate_ev(final_confidence, odds)
            ensemble["stake_percent"] = calculate_kelly_stake(final_confidence, odds)

        return ensemble

    async def _apply_calibration(self, bet_category: str, confidence: float) -> float:
        """Apply calibration factor to confidence"""
        band = get_confidence_band(confidence)

        query = text("""
            SELECT calibration_factor, predicted_count
            FROM confidence_calibration
            WHERE bet_category = :category AND confidence_band = :band
        """)
        result = await self.db.execute(query, {"category": bet_category, "band": band})
        row = result.fetchone()

        if row and row[1] >= ML_CONFIG["calibration_min_samples"]:
            factor = row[0]
        else:
            factor = 1.0

        calibrated = confidence * factor
        return max(ML_CONFIG["min_confidence"], min(ML_CONFIG["max_confidence"], calibrated))

    async def _get_roi_adjustment(self, bet_category: str) -> tuple:
        """Get ROI-based confidence adjustment"""
        query = text("""
            SELECT total_bets, roi_percent
            FROM roi_analytics
            WHERE bet_category = :category AND condition_key = 'overall'
        """)
        result = await self.db.execute(query, {"category": bet_category})
        row = result.fetchone()

        if not row or row[0] < ML_CONFIG["roi_min_bets"]:
            return 0, None

        total_bets, roi = row

        if roi < -20:
            return -12, f"ROI: {roi:.1f}% ({total_bets} bets) → -12%"
        elif roi < -10:
            return -8, f"ROI: {roi:.1f}% ({total_bets} bets) → -8%"
        elif roi < 0:
            return -4, f"ROI: {roi:.1f}% ({total_bets} bets) → -4%"
        elif roi < 10:
            return 3, f"ROI: +{roi:.1f}% ({total_bets} bets) → +3%"
        elif roi < 25:
            return 6, f"ROI: +{roi:.1f}% ({total_bets} bets) → +6%"
        else:
            return 10, f"ROI: +{roi:.1f}% ({total_bets} bets) → +10%"

    async def update_calibration(self, bet_category: str, confidence: float, is_correct: bool):
        """Update calibration after result verification"""
        band = get_confidence_band(confidence)

        # Upsert calibration
        query = text("""
            INSERT INTO confidence_calibration
            (bet_category, confidence_band, predicted_count, actual_wins, calibration_factor)
            VALUES (:category, :band, 1, :wins, 1.0)
            ON CONFLICT (bet_category, confidence_band)
            DO UPDATE SET
                predicted_count = confidence_calibration.predicted_count + 1,
                actual_wins = confidence_calibration.actual_wins + :wins,
                calibration_factor = CASE
                    WHEN confidence_calibration.predicted_count + 1 >= :min_samples
                    THEN LEAST(1.35, GREATEST(0.65,
                        (confidence_calibration.actual_wins + :wins)::float /
                        (confidence_calibration.predicted_count + 1) /
                        ((:band_mid)::float / 100)
                    ))
                    ELSE 1.0
                END,
                last_updated = NOW()
        """)

        band_mid = (int(band.split("-")[0]) + int(band.split("-")[1])) / 2

        await self.db.execute(query, {
            "category": bet_category,
            "band": band,
            "wins": 1 if is_correct else 0,
            "min_samples": ML_CONFIG["calibration_min_samples"],
            "band_mid": band_mid
        })
        await self.db.commit()

    async def update_roi(
        self,
        bet_category: str,
        condition_key: str,
        is_win: bool,
        odds: float,
        stake: float,
        ev: float
    ):
        """Update ROI analytics after result verification"""
        returned = stake * odds if is_win else 0

        query = text("""
            INSERT INTO roi_analytics
            (bet_category, condition_key, total_bets, wins, losses, total_staked,
             total_returned, roi_percent, avg_odds, avg_ev)
            VALUES (:category, :condition, 1, :wins, :losses, :stake, :returned,
                    :roi, :odds, :ev)
            ON CONFLICT (bet_category, condition_key)
            DO UPDATE SET
                total_bets = roi_analytics.total_bets + 1,
                wins = roi_analytics.wins + :wins,
                losses = roi_analytics.losses + :losses,
                total_staked = roi_analytics.total_staked + :stake,
                total_returned = roi_analytics.total_returned + :returned,
                roi_percent = CASE
                    WHEN roi_analytics.total_staked + :stake > 0
                    THEN ((roi_analytics.total_returned + :returned) -
                          (roi_analytics.total_staked + :stake)) /
                         (roi_analytics.total_staked + :stake) * 100
                    ELSE 0
                END,
                avg_odds = (roi_analytics.avg_odds * roi_analytics.total_bets + :odds) /
                          (roi_analytics.total_bets + 1),
                avg_ev = (roi_analytics.avg_ev * roi_analytics.total_bets + :ev) /
                        (roi_analytics.total_bets + 1),
                last_updated = NOW()
        """)

        roi = ((returned - stake) / stake * 100) if stake > 0 else 0

        await self.db.execute(query, {
            "category": bet_category,
            "condition": condition_key,
            "wins": 1 if is_win else 0,
            "losses": 0 if is_win else 1,
            "stake": stake,
            "returned": returned,
            "roi": roi,
            "odds": odds,
            "ev": ev
        })
        await self.db.commit()

    def extract_conditions(self, features: Dict, bet_category: str) -> List[str]:
        """Extract feature conditions for ROI tracking"""
        conditions = []

        if not features:
            return conditions

        # Injuries
        home_injuries = features.get("home_injuries", 0)
        away_injuries = features.get("away_injuries", 0)
        if home_injuries > 8:
            conditions.append("home_injury_crisis")
        if away_injuries > 8:
            conditions.append("away_injury_crisis")
        if home_injuries + away_injuries > 12:
            conditions.append("high_total_injuries")

        # Standings
        home_pos = features.get("home_position", 10)
        away_pos = features.get("away_position", 10)
        if away_pos < home_pos - 5:
            conditions.append("away_favorite")
        if home_pos < away_pos - 5:
            conditions.append("home_strong_favorite")

        # Form
        home_win_rate = features.get("home_home_win_rate", 50)
        if home_win_rate < 30:
            conditions.append("home_bad_form")
        if home_win_rate > 70:
            conditions.append("home_great_form")

        # Team class
        if features.get("elite_vs_underdog", 0) == 1:
            conditions.append("elite_vs_underdog")
        if features.get("class_mismatch", 0) > 2:
            conditions.append("class_mismatch")

        # Sharp money
        if features.get("sharp_money_detected", 0) == 1:
            conditions.append("sharp_money")

        # xG
        if features.get("both_underperforming", 0) == 1:
            conditions.append("xg_underperforming")

        # Derby
        if features.get("is_derby", 0) == 1:
            conditions.append("derby")

        # Weather (YOUR SUGGESTION!)
        if features.get("is_strong_wind", 0) == 1:
            conditions.append("strong_wind")

        return conditions


def clear_model_cache():
    """Clear the model cache"""
    global _model_cache
    _model_cache = {}
