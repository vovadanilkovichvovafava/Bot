"""
ML Module for Football Betting Predictions
"""
from app.ml.features import (
    ML_FEATURE_COLUMNS,
    ENSEMBLE_MODEL_TYPES,
    ML_CONFIG,
    BET_CATEGORIES,
    ELITE_TEAMS,
    features_to_vector,
    get_confidence_band,
    calculate_ev,
    calculate_kelly_stake,
)
from app.ml.training import MLTrainingService
from app.ml.predictor import MLPredictorService, clear_model_cache
from app.ml.extractor import FeatureExtractor
from app.ml.data_collector import MLDataCollector

__all__ = [
    "ML_FEATURE_COLUMNS",
    "ENSEMBLE_MODEL_TYPES",
    "ML_CONFIG",
    "BET_CATEGORIES",
    "ELITE_TEAMS",
    "features_to_vector",
    "get_confidence_band",
    "calculate_ev",
    "calculate_kelly_stake",
    "MLTrainingService",
    "MLPredictorService",
    "clear_model_cache",
    "FeatureExtractor",
    "MLDataCollector",
]
