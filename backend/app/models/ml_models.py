"""
ML Pipeline database models.
Covers training data, Elo ratings, model versioning, predictions cache,
learning logs, and ROI analytics.
"""
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.sql import func
from app.core.database import Base


class MatchFeature(Base):
    """
    Training data for ML models.
    Each row = one match with pre-computed features + actual result.
    """
    __tablename__ = "ml_training_data"

    id = Column(Integer, primary_key=True, index=True)
    fixture_id = Column(Integer, unique=True, nullable=False, index=True)
    league_id = Column(Integer, nullable=False, index=True)
    league_name = Column(String(100), nullable=True)
    season = Column(Integer, nullable=True)

    # Teams
    home_team_id = Column(Integer, nullable=False, index=True)
    home_team_name = Column(String(150), nullable=False)
    away_team_id = Column(Integer, nullable=False, index=True)
    away_team_name = Column(String(150), nullable=False)

    # Pre-match features (computed before kick-off)
    # Elo ratings
    home_elo = Column(Float, nullable=True, default=1500.0)
    away_elo = Column(Float, nullable=True, default=1500.0)
    elo_diff = Column(Float, nullable=True, default=0.0)

    # Form (last 5 matches)
    home_form_points = Column(Float, nullable=True)   # 0-15 scale
    away_form_points = Column(Float, nullable=True)
    home_form_goals_scored = Column(Float, nullable=True)  # avg per match
    home_form_goals_conceded = Column(Float, nullable=True)
    away_form_goals_scored = Column(Float, nullable=True)
    away_form_goals_conceded = Column(Float, nullable=True)
    home_form_wins = Column(Integer, nullable=True)
    home_form_draws = Column(Integer, nullable=True)
    home_form_losses = Column(Integer, nullable=True)
    away_form_wins = Column(Integer, nullable=True)
    away_form_draws = Column(Integer, nullable=True)
    away_form_losses = Column(Integer, nullable=True)

    # League position
    home_position = Column(Integer, nullable=True)
    away_position = Column(Integer, nullable=True)
    position_diff = Column(Integer, nullable=True)

    # H2H (last 10 meetings)
    h2h_home_wins = Column(Integer, nullable=True, default=0)
    h2h_draws = Column(Integer, nullable=True, default=0)
    h2h_away_wins = Column(Integer, nullable=True, default=0)
    h2h_total_goals_avg = Column(Float, nullable=True)

    # Odds (pre-match)
    odds_home = Column(Float, nullable=True)
    odds_draw = Column(Float, nullable=True)
    odds_away = Column(Float, nullable=True)
    odds_over25 = Column(Float, nullable=True)
    odds_under25 = Column(Float, nullable=True)
    odds_btts_yes = Column(Float, nullable=True)
    odds_btts_no = Column(Float, nullable=True)

    # Advanced stats (if available from API)
    home_xg = Column(Float, nullable=True)  # expected goals
    away_xg = Column(Float, nullable=True)
    home_shots_avg = Column(Float, nullable=True)
    away_shots_avg = Column(Float, nullable=True)
    home_shots_on_target_avg = Column(Float, nullable=True)
    away_shots_on_target_avg = Column(Float, nullable=True)
    home_corners_avg = Column(Float, nullable=True)
    away_corners_avg = Column(Float, nullable=True)
    home_cards_avg = Column(Float, nullable=True)
    away_cards_avg = Column(Float, nullable=True)

    # Home advantage
    home_home_win_rate = Column(Float, nullable=True)  # win rate at home
    away_away_win_rate = Column(Float, nullable=True)  # win rate away

    # API-Football prediction (if available)
    api_pred_home_pct = Column(Float, nullable=True)
    api_pred_draw_pct = Column(Float, nullable=True)
    api_pred_away_pct = Column(Float, nullable=True)

    # ========== ADVANCED FEATURES ==========

    # Referee stats (avg per match for this referee)
    referee_name = Column(String(150), nullable=True)
    referee_avg_fouls = Column(Float, nullable=True)
    referee_avg_yellow = Column(Float, nullable=True)
    referee_avg_red = Column(Float, nullable=True)
    referee_avg_penalties = Column(Float, nullable=True)

    # Injuries & suspensions (count of unavailable players)
    home_injuries_count = Column(Integer, nullable=True, default=0)
    away_injuries_count = Column(Integer, nullable=True, default=0)
    home_key_injuries = Column(Integer, nullable=True, default=0)  # key players (GK, CF, CAM)
    away_key_injuries = Column(Integer, nullable=True, default=0)

    # Rest days (days since last match)
    home_rest_days = Column(Integer, nullable=True)
    away_rest_days = Column(Integer, nullable=True)
    rest_days_diff = Column(Integer, nullable=True)  # home - away

    # Weather conditions (at kick-off)
    temperature_c = Column(Float, nullable=True)
    wind_speed_kmh = Column(Float, nullable=True)
    humidity_pct = Column(Float, nullable=True)
    weather_condition = Column(String(50), nullable=True)  # clear, rain, snow, etc.

    # Match date/time
    match_date = Column(DateTime, nullable=False, index=True)

    # ========== ACTUAL RESULTS (filled after match) ==========
    home_goals = Column(Integer, nullable=True)
    away_goals = Column(Integer, nullable=True)
    result = Column(String(1), nullable=True)  # H=Home, D=Draw, A=Away
    total_goals = Column(Integer, nullable=True)
    btts = Column(Boolean, nullable=True)  # Both teams scored?

    # HT results
    ht_home_goals = Column(Integer, nullable=True)
    ht_away_goals = Column(Integer, nullable=True)
    ht_result = Column(String(1), nullable=True)

    # Stats results
    home_corners = Column(Integer, nullable=True)
    away_corners = Column(Integer, nullable=True)
    total_corners = Column(Integer, nullable=True)
    home_cards_yellow = Column(Integer, nullable=True)
    away_cards_yellow = Column(Integer, nullable=True)
    total_cards = Column(Integer, nullable=True)
    home_shots = Column(Integer, nullable=True)
    away_shots = Column(Integer, nullable=True)
    home_shots_on_target = Column(Integer, nullable=True)
    away_shots_on_target = Column(Integer, nullable=True)

    # Verification
    is_verified = Column(Boolean, default=False, index=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('ix_ml_training_league_date', 'league_id', 'match_date'),
        Index('ix_ml_training_verified', 'is_verified', 'match_date'),
    )


class EloRating(Base):
    """
    Elo ratings for each team. Updated incrementally after every match.
    K=20 for established teams, K=40 for teams with < 10 matches.
    """
    __tablename__ = "league_learning"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, nullable=False, index=True)
    team_name = Column(String(150), nullable=False)
    league_id = Column(Integer, nullable=False, index=True)
    league_name = Column(String(100), nullable=True)

    elo_rating = Column(Float, nullable=False, default=1500.0)
    matches_played = Column(Integer, nullable=False, default=0)
    wins = Column(Integer, nullable=False, default=0)
    draws = Column(Integer, nullable=False, default=0)
    losses = Column(Integer, nullable=False, default=0)
    goals_scored = Column(Integer, nullable=False, default=0)
    goals_conceded = Column(Integer, nullable=False, default=0)

    # Streaks
    current_streak = Column(Integer, default=0)  # positive=wins, negative=losses
    home_matches = Column(Integer, default=0)
    home_wins = Column(Integer, default=0)
    away_matches = Column(Integer, default=0)
    away_wins = Column(Integer, default=0)

    last_updated = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint('team_id', 'league_id', name='uq_team_league'),
    )


class MLModel(Base):
    """
    Trained model versions. Tracks accuracy, training samples, file path.
    Only one model per model_name can be is_active=True at a time.
    """
    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(50), nullable=False, index=True)
    # outcome_3way, goals_ou25, goals_ou15, goals_ou35, btts,
    # corners_ou, cards_ou, correct_score, ht_result
    model_type = Column(String(30), nullable=False)  # xgboost, lgbm, ensemble
    version = Column(Integer, nullable=False, default=1)

    # Performance metrics
    accuracy = Column(Float, nullable=True)
    brier_score = Column(Float, nullable=True)
    log_loss_val = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)

    # Feature importance (JSON)
    feature_importance_json = Column(Text, nullable=True)

    # Model file
    model_path = Column(String(255), nullable=True)  # path to .joblib file
    model_binary = Column(Text, nullable=True)  # base64 encoded model (for Railway)

    # Training info
    training_samples = Column(Integer, nullable=True)
    training_date = Column(DateTime, server_default=func.now())
    training_duration_sec = Column(Float, nullable=True)

    # Active flag
    is_active = Column(Boolean, default=False, index=True)

    created_at = Column(DateTime, server_default=func.now())


class LearningLog(Base):
    """
    Log of all ML pipeline events: training, predictions, verifications, Elo updates.
    """
    __tablename__ = "learning_log"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(30), nullable=False, index=True)
    # Types: data_collect, elo_update, train_start, train_complete,
    #        predict, verify, model_deploy, error
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)


class CachedPrediction(Base):
    """
    Cache of ML predictions for fixtures. Avoids re-computing for same match.
    """
    __tablename__ = "cached_ai_responses"

    id = Column(Integer, primary_key=True, index=True)
    fixture_id = Column(Integer, nullable=False, unique=True, index=True)

    # ML model predictions (JSON with all markets)
    ml_prediction_json = Column(Text, nullable=True)
    # Claude analysis text
    claude_analysis = Column(Text, nullable=True)
    # Combined recommendations
    recommendations_json = Column(Text, nullable=True)

    model_version = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)


class ROIAnalytics(Base):
    """
    Track model performance and ROI over time periods.
    """
    __tablename__ = "roi_analytics"

    id = Column(Integer, primary_key=True, index=True)
    model_version = Column(Integer, nullable=True)
    period = Column(String(20), nullable=False)  # daily, weekly, monthly
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)

    # Betting metrics
    total_predictions = Column(Integer, default=0)
    total_recommended = Column(Integer, default=0)  # filtered by confidence
    correct_predictions = Column(Integer, default=0)
    accuracy = Column(Float, nullable=True)
    brier_score = Column(Float, nullable=True)

    # ROI
    total_staked = Column(Float, default=0.0)
    total_returned = Column(Float, default=0.0)
    roi_percent = Column(Float, nullable=True)

    # Breakdown (JSON)
    by_bet_type_json = Column(Text, nullable=True)
    by_league_json = Column(Text, nullable=True)
    by_confidence_json = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('ix_roi_period', 'period', 'period_start'),
    )


class ConfidenceCalibration(Base):
    """
    Calibration data: maps model output scores to actual probabilities.
    Used for Platt scaling / isotonic regression.
    """
    __tablename__ = "confidence_calibration"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(50), nullable=False, index=True)
    model_version = Column(Integer, nullable=False)

    # Calibration bins
    predicted_probability = Column(Float, nullable=False)
    actual_frequency = Column(Float, nullable=False)
    bin_count = Column(Integer, nullable=False)

    created_at = Column(DateTime, server_default=func.now())


class FeatureErrorPattern(Base):
    """
    Track which features/conditions lead to prediction errors.
    Helps identify weak spots in the model.
    """
    __tablename__ = "feature_error_patterns"

    id = Column(Integer, primary_key=True, index=True)
    pattern_type = Column(String(50), nullable=False)
    # Types: league_weakness, bet_type_weakness, feature_correlation,
    #        elo_range_error, form_misleading, h2h_anomaly
    description = Column(Text, nullable=True)
    affected_league_id = Column(Integer, nullable=True)
    affected_bet_type = Column(String(50), nullable=True)

    error_rate = Column(Float, nullable=True)
    sample_size = Column(Integer, nullable=True)
    details_json = Column(Text, nullable=True)

    discovered_at = Column(DateTime, server_default=func.now())
    is_active = Column(Boolean, default=True)


class LearningPattern(Base):
    """
    Discovered patterns from historical data analysis.
    E.g. 'Serie A home teams win 52% more on weekends'
    """
    __tablename__ = "learning_patterns"

    id = Column(Integer, primary_key=True, index=True)
    pattern_name = Column(String(100), nullable=False)
    pattern_type = Column(String(50), nullable=False)
    # Types: home_advantage, league_trend, team_pattern,
    #        seasonal, h2h_pattern, goals_pattern

    league_id = Column(Integer, nullable=True)
    team_id = Column(Integer, nullable=True)

    confidence = Column(Float, nullable=True)  # How reliable is this pattern
    sample_size = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    details_json = Column(Text, nullable=True)

    discovered_at = Column(DateTime, server_default=func.now())
    last_validated = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)


class EnsembleModel(Base):
    """
    Ensemble configuration: which base models to combine, what weights.
    """
    __tablename__ = "ensemble_models"

    id = Column(Integer, primary_key=True, index=True)
    ensemble_name = Column(String(50), nullable=False, unique=True)

    # Component models (JSON array of model_ids + weights)
    components_json = Column(Text, nullable=False)
    # e.g. [{"model_id": 1, "weight": 0.4}, {"model_id": 2, "weight": 0.3}, ...]

    meta_learner_type = Column(String(30), nullable=True)  # logistic, linear
    meta_learner_path = Column(String(255), nullable=True)

    accuracy = Column(Float, nullable=True)
    is_active = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())
