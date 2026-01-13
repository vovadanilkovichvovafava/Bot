"""
ML Data Collection Service
Collects training data from predictions and match results
"""
import json
import logging
from typing import Dict, Optional, List
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.ml.features import ML_FEATURE_COLUMNS, BET_CATEGORIES
from app.ml.extractor import FeatureExtractor
from app.ml.predictor import MLPredictorService

logger = logging.getLogger(__name__)


class MLDataCollector:
    """
    Collects training data by:
    1. Saving features when predictions are made
    2. Verifying results after matches finish
    3. Updating target labels for training
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.extractor = FeatureExtractor()

    async def save_prediction(
        self,
        user_id: int,
        match_id: str,
        home_team: str,
        away_team: str,
        league_code: str,
        bet_type: str,
        bet_category: str,
        confidence: float,
        odds: float = None,
        features: Dict = None,
        bet_rank: int = 1,
        match_time: datetime = None,
        expected_value: float = None,
        stake_percent: float = None,
    ) -> int:
        """
        Save a prediction with features for later training.
        Returns the prediction ID.
        """
        # Use default features if not provided
        if features is None:
            features = dict(ML_FEATURE_COLUMNS)

        # Save prediction
        query = text("""
            INSERT INTO predictions
            (user_id, match_id, home_team, away_team, league_code, bet_type,
             bet_category, confidence, odds, bet_rank, ml_features_json,
             expected_value, stake_percent, match_time, created_at)
            VALUES
            (:user_id, :match_id, :home_team, :away_team, :league_code, :bet_type,
             :bet_category, :confidence, :odds, :bet_rank, :features,
             :ev, :stake, :match_time, NOW())
            RETURNING id
        """)

        result = await self.db.execute(query, {
            "user_id": user_id,
            "match_id": match_id,
            "home_team": home_team,
            "away_team": away_team,
            "league_code": league_code,
            "bet_type": bet_type,
            "bet_category": bet_category,
            "confidence": confidence,
            "odds": odds,
            "bet_rank": bet_rank,
            "features": json.dumps(features),
            "ev": expected_value,
            "stake": stake_percent,
            "match_time": match_time,
        })
        prediction_id = result.scalar()
        await self.db.commit()

        # Also save to training data (without target - will be set after result)
        await self._save_training_record(
            prediction_id=prediction_id,
            bet_category=bet_category,
            features=features,
            bet_rank=bet_rank,
        )

        return prediction_id

    async def _save_training_record(
        self,
        prediction_id: int,
        bet_category: str,
        features: Dict,
        bet_rank: int = 1,
    ):
        """Save training data record (target will be set later)"""
        query = text("""
            INSERT INTO ml_training_data
            (prediction_id, bet_category, features_json, bet_rank, created_at)
            VALUES (:prediction_id, :category, :features, :rank, NOW())
        """)

        await self.db.execute(query, {
            "prediction_id": prediction_id,
            "category": bet_category,
            "features": json.dumps(features),
            "rank": bet_rank,
        })
        await self.db.commit()

    async def verify_prediction(
        self,
        prediction_id: int,
        actual_result: str,
        is_correct: bool,
    ):
        """
        Verify a prediction result and update training data.
        This is called after a match finishes.
        """
        # Update prediction
        query = text("""
            UPDATE predictions
            SET result = :result, is_correct = :correct, checked_at = NOW()
            WHERE id = :id
        """)
        await self.db.execute(query, {
            "id": prediction_id,
            "result": actual_result,
            "correct": is_correct,
        })

        # Update training data target
        query = text("""
            UPDATE ml_training_data
            SET target = :target
            WHERE prediction_id = :id
        """)
        await self.db.execute(query, {
            "id": prediction_id,
            "target": 1 if is_correct else 0,
        })

        await self.db.commit()

        # Update calibration and ROI
        await self._update_learning_stats(prediction_id, is_correct)

    async def _update_learning_stats(self, prediction_id: int, is_correct: bool):
        """Update calibration, ROI and pattern stats"""
        # Get prediction details
        query = text("""
            SELECT bet_category, confidence, odds, ml_features_json,
                   stake_percent, expected_value
            FROM predictions WHERE id = :id
        """)
        result = await self.db.execute(query, {"id": prediction_id})
        row = result.fetchone()

        if not row:
            return

        bet_category, confidence, odds, features_json, stake, ev = row

        if not bet_category or not confidence:
            return

        # Update calibration
        predictor = MLPredictorService(self.db)
        await predictor.update_calibration(bet_category, confidence, is_correct)

        # Update ROI if odds available
        if odds and stake:
            await predictor.update_roi(
                bet_category=bet_category,
                condition_key="overall",
                is_win=is_correct,
                odds=odds,
                stake=stake,
                ev=ev or 0,
            )

            # Also update ROI for specific conditions
            if features_json:
                try:
                    features = json.loads(features_json)
                    conditions = predictor.extract_conditions(features, bet_category)
                    for condition in conditions:
                        await predictor.update_roi(
                            bet_category=bet_category,
                            condition_key=condition,
                            is_win=is_correct,
                            odds=odds,
                            stake=stake,
                            ev=ev or 0,
                        )
                except Exception as e:
                    logger.error(f"Error updating condition ROI: {e}")

        # Update league learning
        query = text("""
            SELECT league_code FROM predictions WHERE id = :id
        """)
        result = await self.db.execute(query, {"id": prediction_id})
        row = result.fetchone()
        if row and row[0]:
            await self._update_league_learning(row[0], bet_category, is_correct, confidence)

    async def _update_league_learning(
        self,
        league_code: str,
        bet_category: str,
        is_correct: bool,
        confidence: float,
    ):
        """Update league-specific learning statistics"""
        query = text("""
            INSERT INTO league_learning
            (league_code, bet_category, total_predictions, correct_predictions,
             accuracy, avg_confidence)
            VALUES (:league, :category, 1, :correct, :accuracy, :confidence)
            ON CONFLICT (league_code, bet_category)
            DO UPDATE SET
                total_predictions = league_learning.total_predictions + 1,
                correct_predictions = league_learning.correct_predictions + :correct,
                accuracy = (league_learning.correct_predictions + :correct)::float /
                          (league_learning.total_predictions + 1) * 100,
                avg_confidence = (league_learning.avg_confidence * league_learning.total_predictions + :confidence) /
                                (league_learning.total_predictions + 1),
                last_updated = NOW()
        """)

        await self.db.execute(query, {
            "league": league_code,
            "category": bet_category,
            "correct": 1 if is_correct else 0,
            "accuracy": 100.0 if is_correct else 0.0,
            "confidence": confidence,
        })
        await self.db.commit()

    async def check_pending_results(self):
        """
        Check for predictions that need result verification.
        Call this periodically to update training data.
        """
        from app.services.football_api import get_match_result

        # Get predictions from yesterday that aren't verified yet
        yesterday = datetime.utcnow() - timedelta(days=1)

        query = text("""
            SELECT id, match_id, bet_type, bet_category
            FROM predictions
            WHERE match_time < :yesterday
              AND is_correct IS NULL
              AND match_time IS NOT NULL
            LIMIT 100
        """)

        result = await self.db.execute(query, {"yesterday": yesterday})
        pending = result.fetchall()

        verified_count = 0
        for prediction_id, match_id, bet_type, bet_category in pending:
            try:
                # Get actual result from API
                match_result = await get_match_result(match_id)

                if match_result:
                    is_correct = self._check_bet_result(
                        bet_type, bet_category, match_result
                    )
                    await self.verify_prediction(
                        prediction_id=prediction_id,
                        actual_result=json.dumps(match_result),
                        is_correct=is_correct,
                    )
                    verified_count += 1
            except Exception as e:
                logger.error(f"Error verifying prediction {prediction_id}: {e}")

        return verified_count

    def _check_bet_result(
        self,
        bet_type: str,
        bet_category: str,
        result: Dict,
    ) -> bool:
        """Check if a bet was correct based on match result"""
        home_goals = result.get("home_goals", 0)
        away_goals = result.get("away_goals", 0)
        total_goals = home_goals + away_goals

        # Determine winner
        if home_goals > away_goals:
            winner = "home"
        elif away_goals > home_goals:
            winner = "away"
        else:
            winner = "draw"

        # Check based on category
        if bet_category == "outcomes_home":
            return winner == "home"
        elif bet_category == "outcomes_away":
            return winner == "away"
        elif bet_category == "outcomes_draw":
            return winner == "draw"
        elif bet_category == "totals_over":
            # Parse total from bet_type (e.g., "ТБ2.5" or "Over 2.5")
            try:
                total_line = float(bet_type.replace("ТБ", "").replace("Over", "").replace(" ", "").replace(",", "."))
                return total_goals > total_line
            except:
                return total_goals > 2.5
        elif bet_category == "totals_under":
            try:
                total_line = float(bet_type.replace("ТМ", "").replace("Under", "").replace(" ", "").replace(",", "."))
                return total_goals < total_line
            except:
                return total_goals < 2.5
        elif bet_category == "btts":
            return home_goals > 0 and away_goals > 0

        return False

    async def get_training_stats(self) -> Dict:
        """Get statistics about collected training data"""
        stats = {}

        # Total records by category
        query = text("""
            SELECT bet_category,
                   COUNT(*) as total,
                   SUM(CASE WHEN target IS NOT NULL THEN 1 ELSE 0 END) as verified,
                   SUM(CASE WHEN target = 1 THEN 1 ELSE 0 END) as correct,
                   AVG(CASE WHEN target IS NOT NULL THEN target ELSE NULL END) as win_rate
            FROM ml_training_data
            GROUP BY bet_category
        """)
        result = await self.db.execute(query)
        stats["by_category"] = {
            row[0]: {
                "total": row[1],
                "verified": row[2] or 0,
                "correct": row[3] or 0,
                "win_rate": round(row[4] * 100, 1) if row[4] else None,
            }
            for row in result.fetchall()
        }

        # Recent collection rate
        query = text("""
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM ml_training_data
            WHERE created_at > NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        """)
        result = await self.db.execute(query)
        stats["daily_collection"] = [
            {"date": str(row[0]), "count": row[1]}
            for row in result.fetchall()
        ]

        # Pending verification
        query = text("""
            SELECT COUNT(*) FROM ml_training_data WHERE target IS NULL
        """)
        result = await self.db.execute(query)
        stats["pending_verification"] = result.scalar() or 0

        return stats
