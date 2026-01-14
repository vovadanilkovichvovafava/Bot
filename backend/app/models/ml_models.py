"""
ML System Database Models
Based on ML_SYSTEM_DOCUMENTATION.md
"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.core.database import Base


class MLTrainingData(Base):
    """Training data for ML models"""
    __tablename__ = "ml_training_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=True)
    bet_category = Column(String(50), nullable=False, index=True)  # outcomes_home, totals_over, btts...
    features_json = Column(Text, nullable=False)  # JSON with all 93+ features
    target = Column(Integer, nullable=True, index=True)  # 1=correct, 0=incorrect, NULL=not verified
    bet_rank = Column(Integer, default=1)  # 1=MAIN bet, 2+=ALT bets
    created_at = Column(DateTime, server_default=func.now())


class MLModel(Base):
    """Metadata for individual trained models"""
    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_type = Column(String(50), nullable=False)
    accuracy = Column(Float)
    precision_score = Column(Float)
    recall_score = Column(Float)
    f1_score = Column(Float)
    samples_count = Column(Integer)
    model_path = Column(String(255))
    trained_at = Column(DateTime, server_default=func.now())


class EnsembleModel(Base):
    """Metadata for ensemble models (RandomForest, GradientBoosting, Logistic)"""
    __tablename__ = "ensemble_models"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(50), nullable=False)  # random_forest, gradient_boost, logistic
    model_type = Column(String(100))  # sklearn class name
    bet_category = Column(String(50), nullable=False)
    accuracy = Column(Float)
    precision_val = Column(Float)
    recall_val = Column(Float)
    f1_score = Column(Float)
    samples_count = Column(Integer)
    feature_importance = Column(Text)  # JSON with top features
    model_path = Column(String(255))
    trained_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint('model_name', 'bet_category', name='uq_model_category'),
    )


class ConfidenceCalibration(Base):
    """Calibration factors for confidence adjustment"""
    __tablename__ = "confidence_calibration"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bet_category = Column(String(50), nullable=False)
    confidence_band = Column(String(10), nullable=False)  # "30-40", "40-50", etc.
    predicted_count = Column(Integer, default=0)
    actual_wins = Column(Integer, default=0)
    calibration_factor = Column(Float, default=1.0)  # Range: 0.65-1.35
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('bet_category', 'confidence_band', name='uq_category_band'),
    )


class ROIAnalytics(Base):
    """ROI tracking for self-learning"""
    __tablename__ = "roi_analytics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bet_category = Column(String(50), nullable=False)
    condition_key = Column(String(100), nullable=False)  # "overall" or condition like "high_injuries"
    total_bets = Column(Integer, default=0)
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    total_staked = Column(Float, default=0)
    total_returned = Column(Float, default=0)
    roi_percent = Column(Float, default=0)
    avg_odds = Column(Float, default=0)
    avg_ev = Column(Float, default=0)
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('bet_category', 'condition_key', name='uq_category_condition'),
    )


class LearningPattern(Base):
    """Detected success/failure patterns"""
    __tablename__ = "learning_patterns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pattern_type = Column(String(20), nullable=False)  # "success" or "failure"
    pattern_key = Column(String(100), nullable=False)
    bet_category = Column(String(50), nullable=False)
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    total_predictions = Column(Integer, default=0)
    avg_confidence = Column(Float, default=0)
    description = Column(Text)
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('pattern_type', 'pattern_key', 'bet_category', name='uq_pattern'),
    )


class FeatureErrorPattern(Base):
    """Error patterns based on feature conditions"""
    __tablename__ = "feature_error_patterns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bet_category = Column(String(50), nullable=False)
    condition_key = Column(String(200), nullable=False)  # "high_injuries&away_favorite"
    total_predictions = Column(Integer, default=0)
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    avg_confidence_when_failed = Column(Float)
    suggested_adjustment = Column(Integer, default=0)  # Confidence adjustment
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('bet_category', 'condition_key', name='uq_error_pattern'),
    )


class LeagueLearning(Base):
    """Learning statistics per league"""
    __tablename__ = "league_learning"

    id = Column(Integer, primary_key=True, autoincrement=True)
    league_code = Column(String(20), nullable=False)  # "EPL", "LALIGA", etc.
    bet_category = Column(String(50), nullable=False)
    total_predictions = Column(Integer, default=0)
    correct_predictions = Column(Integer, default=0)
    accuracy = Column(Float, default=0)
    avg_confidence = Column(Float, default=0)
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('league_code', 'bet_category', name='uq_league_category'),
    )


class LearningLog(Base):
    """Event log for ML system"""
    __tablename__ = "learning_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(50), nullable=False)  # model_trained, calibration_updated, etc.
    description = Column(Text)
    data_json = Column(Text)  # Additional JSON data
    created_at = Column(DateTime, server_default=func.now())


class Prediction(Base):
    """Match predictions with ML data"""
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    match_id = Column(String(100), nullable=False)
    home_team = Column(String(150), nullable=False)
    away_team = Column(String(150), nullable=False)
    league_code = Column(String(20))
    bet_type = Column(String(50), nullable=False)  # "П1", "ТБ2.5", etc.
    bet_category = Column(String(50))  # ML category
    confidence = Column(Float, nullable=False)
    odds = Column(Float)
    bet_rank = Column(Integer, default=1)

    # ML features
    ml_features_json = Column(Text)
    expected_value = Column(Float)
    stake_percent = Column(Float)

    # Result
    result = Column(String(50))  # Actual match result
    is_correct = Column(Boolean)

    # Timestamps
    match_time = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    checked_at = Column(DateTime)
