"""
ML Model Training Service
Ensemble of RandomForest, GradientBoosting, LogisticRegression
"""
import json
import os
import logging
from typing import Optional, Dict, List, Tuple
from datetime import datetime

import numpy as np

# Check ML availability
try:
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
    import joblib
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.ml.features import (
    ML_FEATURE_COLUMNS, ENSEMBLE_MODEL_TYPES, ML_CONFIG, BET_CATEGORIES
)

logger = logging.getLogger(__name__)


class MLTrainingService:
    """Service for training ML ensemble models"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.models_dir = ML_CONFIG["models_dir"]
        self._ensure_models_dir()

    def _ensure_models_dir(self):
        """Create models directory if not exists"""
        os.makedirs(self.models_dir, exist_ok=True)

    async def get_training_data(self, bet_category: str) -> Tuple[Optional[List], Optional[List]]:
        """
        Load training data from database for a specific category.

        Returns:
            X: list of feature vectors
            y: list of targets (0 or 1)
        """
        query = text("""
            SELECT features_json, target
            FROM ml_training_data
            WHERE bet_category = :category AND target IS NOT NULL
        """)
        result = await self.db.execute(query, {"category": bet_category})
        rows = result.fetchall()

        if not rows:
            return None, None

        X = []
        y = []
        feature_names = list(ML_FEATURE_COLUMNS.keys())

        for features_json, target in rows:
            try:
                features = json.loads(features_json)
                # Convert to vector with defaults
                feature_values = [
                    features.get(name, default)
                    for name, default in ML_FEATURE_COLUMNS.items()
                ]
                X.append(feature_values)
                y.append(target)
            except Exception as e:
                logger.warning(f"Error parsing features: {e}")
                continue

        return X, y

    def train_model(self, model_name: str, X_train: np.ndarray, y_train: np.ndarray) -> Optional[object]:
        """Train a single model"""
        if not ML_AVAILABLE:
            return None

        config = ENSEMBLE_MODEL_TYPES.get(model_name)
        if not config:
            return None

        try:
            if model_name == "random_forest":
                model = RandomForestClassifier(**config["params"])
            elif model_name == "gradient_boost":
                model = GradientBoostingClassifier(**config["params"])
            elif model_name == "logistic":
                model = LogisticRegression(**config["params"])
            else:
                return None

            model.fit(X_train, y_train)
            return model

        except Exception as e:
            logger.error(f"Error training {model_name}: {e}")
            return None

    async def train_ensemble(self, bet_category: str) -> Dict:
        """
        Train ensemble of models for a bet category.

        Returns:
            dict with training results for each model
        """
        if not ML_AVAILABLE:
            return {"error": "ML libraries not available"}

        # Load training data
        X, y = await self.get_training_data(bet_category)

        if X is None or len(X) < ML_CONFIG["min_samples"]:
            return {
                "error": f"Not enough data: {len(X) if X else 0} < {ML_CONFIG['min_samples']}"
            }

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            np.array(X), np.array(y),
            test_size=0.2,
            random_state=42
        )

        feature_names = list(ML_FEATURE_COLUMNS.keys())
        results = {}

        # Train each model in ensemble
        for model_name in ENSEMBLE_MODEL_TYPES.keys():
            try:
                model = self.train_model(model_name, X_train, y_train)

                if model is None:
                    results[model_name] = {"error": "Training failed"}
                    continue

                # Evaluate
                y_pred = model.predict(X_test)
                accuracy = accuracy_score(y_test, y_pred)
                precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
                recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
                f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)

                # Feature importance (for tree-based models)
                if hasattr(model, 'feature_importances_'):
                    importance = dict(zip(feature_names, model.feature_importances_.tolist()))
                    importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True)[:10])
                else:
                    importance = {}

                # Save model
                model_path = f"{self.models_dir}/{model_name}_{bet_category}.joblib"
                joblib.dump({
                    "model": model,
                    "feature_names": feature_names,
                    "trained_at": datetime.utcnow().isoformat()
                }, model_path)

                # Save to database
                await self._save_model_metadata(
                    model_name=model_name,
                    bet_category=bet_category,
                    accuracy=accuracy,
                    precision_val=precision,
                    recall_val=recall,
                    f1=f1,
                    samples=len(X),
                    importance=importance,
                    model_path=model_path
                )

                results[model_name] = {
                    "accuracy": round(accuracy, 4),
                    "precision": round(precision, 4),
                    "recall": round(recall, 4),
                    "f1": round(f1, 4),
                    "samples": len(X),
                    "top_features": list(importance.keys())[:5] if importance else []
                }

            except Exception as e:
                logger.error(f"Error training {model_name} for {bet_category}: {e}")
                results[model_name] = {"error": str(e)}

        # Log training event
        await self._log_event(
            "ensemble_trained",
            f"Trained ensemble for {bet_category}",
            results
        )

        return results

    async def train_all_categories(self) -> Dict:
        """Train models for all bet categories"""
        all_results = {}

        for category in BET_CATEGORIES:
            try:
                result = await self.train_ensemble(category)
                all_results[category] = result
            except Exception as e:
                logger.error(f"Error training {category}: {e}")
                all_results[category] = {"error": str(e)}

        return all_results

    async def _save_model_metadata(
        self,
        model_name: str,
        bet_category: str,
        accuracy: float,
        precision_val: float,
        recall_val: float,
        f1: float,
        samples: int,
        importance: dict,
        model_path: str
    ):
        """Save model metadata to database"""
        query = text("""
            INSERT INTO ensemble_models
            (model_name, model_type, bet_category, accuracy, precision_val, recall_val,
             f1_score, samples_count, feature_importance, model_path, trained_at)
            VALUES (:model_name, :model_type, :bet_category, :accuracy, :precision_val,
                    :recall_val, :f1, :samples, :importance, :model_path, NOW())
            ON CONFLICT (model_name, bet_category)
            DO UPDATE SET
                accuracy = :accuracy,
                precision_val = :precision_val,
                recall_val = :recall_val,
                f1_score = :f1,
                samples_count = :samples,
                feature_importance = :importance,
                model_path = :model_path,
                trained_at = NOW()
        """)

        await self.db.execute(query, {
            "model_name": model_name,
            "model_type": ENSEMBLE_MODEL_TYPES[model_name]["class"],
            "bet_category": bet_category,
            "accuracy": accuracy,
            "precision_val": precision_val,
            "recall_val": recall_val,
            "f1": f1,
            "samples": samples,
            "importance": json.dumps(importance),
            "model_path": model_path
        })
        await self.db.commit()

    async def _log_event(self, event_type: str, description: str, data: dict):
        """Log ML event"""
        query = text("""
            INSERT INTO learning_log (event_type, description, data_json)
            VALUES (:event_type, :description, :data_json)
        """)
        await self.db.execute(query, {
            "event_type": event_type,
            "description": description,
            "data_json": json.dumps(data)
        })
        await self.db.commit()

    async def should_retrain(self, bet_category: str) -> bool:
        """Check if model should be retrained"""
        # Get model info
        query = text("""
            SELECT samples_count, trained_at
            FROM ensemble_models
            WHERE bet_category = :category
            ORDER BY trained_at DESC
            LIMIT 1
        """)
        result = await self.db.execute(query, {"category": bet_category})
        model = result.fetchone()

        if not model:
            return True

        model_samples, trained_at = model

        # Count current samples
        query = text("""
            SELECT COUNT(*) FROM ml_training_data
            WHERE bet_category = :category AND target IS NOT NULL
        """)
        result = await self.db.execute(query, {"category": bet_category})
        current_samples = result.scalar()

        # Retrain if 20% more data available
        if current_samples and model_samples and current_samples > model_samples * 1.2:
            return True

        return False

    async def get_stats(self) -> Dict:
        """Get ML system statistics"""
        stats = {}

        # Training data stats
        query = text("""
            SELECT bet_category,
                   COUNT(*) as total,
                   SUM(CASE WHEN target IS NOT NULL THEN 1 ELSE 0 END) as verified,
                   SUM(CASE WHEN target = 1 THEN 1 ELSE 0 END) as correct
            FROM ml_training_data
            GROUP BY bet_category
        """)
        result = await self.db.execute(query)
        stats["training_data"] = {
            row[0]: {"total": row[1], "verified": row[2], "correct": row[3]}
            for row in result.fetchall()
        }

        # Model stats
        query = text("""
            SELECT bet_category, model_name, accuracy, samples_count, trained_at
            FROM ensemble_models
            ORDER BY trained_at DESC
        """)
        result = await self.db.execute(query)
        stats["models"] = [
            {
                "category": row[0],
                "name": row[1],
                "accuracy": row[2],
                "samples": row[3],
                "trained": row[4].isoformat() if row[4] else None
            }
            for row in result.fetchall()
        ]

        # ROI stats
        query = text("""
            SELECT bet_category, total_bets, roi_percent
            FROM roi_analytics
            WHERE condition_key = 'overall'
        """)
        result = await self.db.execute(query)
        stats["roi"] = {
            row[0]: {"bets": row[1], "roi": row[2]}
            for row in result.fetchall()
        }

        return stats
