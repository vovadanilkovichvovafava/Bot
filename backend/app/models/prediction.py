from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)

    # Match info — match_id is VARCHAR in real DB (created by Bot service)
    match_id = Column(String, index=True, nullable=False)
    home_team = Column(String, nullable=False)
    away_team = Column(String, nullable=False)

    # Original Bot service columns (league_code, match_time, etc.)
    league_code = Column(String, nullable=True)
    match_time = Column(DateTime, nullable=True)
    bet_category = Column(String, nullable=True)
    odds = Column(Float, nullable=True)
    bet_rank = Column(Integer, nullable=True)
    ml_features_json = Column(Text, nullable=True)
    expected_value = Column(Float, nullable=True)
    stake_percent = Column(Float, nullable=True)
    result = Column(String, nullable=True)
    checked_at = Column(DateTime, nullable=True)

    # PWA backend columns (added via migration)
    league = Column(String, nullable=True)
    match_date = Column(DateTime, nullable=True)

    # Prediction details — bet_type NOT NULL in DB, confidence NOT NULL in DB
    bet_type = Column(String, nullable=False, default="")
    predicted_odds = Column(Float, nullable=True)
    confidence = Column(Float, nullable=False, default=0.0)

    # AI analysis
    ai_analysis = Column(Text, nullable=True)
    api_prediction = Column(Text, nullable=True)  # JSON string from API-Football

    # Actual result (filled after match)
    actual_home_score = Column(Integer, nullable=True)
    actual_away_score = Column(Integer, nullable=True)
    is_correct = Column(Boolean, nullable=True)  # null = pending, true/false = verified

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    verified_at = Column(DateTime, nullable=True)

    # Relationship
    user = relationship("User", backref="predictions")
