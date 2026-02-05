from app.models.user import User

# ML models — optional (may fail if dependencies not available)
try:
    from app.models.ml_models import (
        MLTrainingData,
        MLModel,
        EnsembleModel,
        ConfidenceCalibration,
        ROIAnalytics,
        LearningPattern,
        FeatureErrorPattern,
        LeagueLearning,
        LearningLog,
        Prediction,
        CachedAIResponse,
    )

    __all__ = [
        "User",
        "MLTrainingData",
        "MLModel",
        "EnsembleModel",
        "ConfidenceCalibration",
        "ROIAnalytics",
        "LearningPattern",
        "FeatureErrorPattern",
        "LeagueLearning",
        "LearningLog",
        "Prediction",
        "CachedAIResponse",
    ]
except ImportError:
    __all__ = ["User"]
