"""Prediction model"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Prediction(Base):
    """Prediction model for storing match predictions"""
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Match info
    match_id = Column(Integer, index=True)
    home_team = Column(String(100), nullable=False)
    away_team = Column(String(100), nullable=False)
    competition = Column(String(100))
    match_date = Column(DateTime(timezone=True))

    # Prediction
    bet_type = Column(String(50), nullable=False)  # П1, П2, ТБ2.5, etc.
    confidence = Column(Float, nullable=False)  # 0-100
    odds = Column(Float, nullable=True)
    category = Column(String(50))  # outcomes_home, totals_over, etc.

    # AI Analysis
    analysis = Column(Text, nullable=True)
    ai_reasoning = Column(Text, nullable=True)

    # ML
    ml_confidence = Column(Float, nullable=True)
    features = Column(Text, nullable=True)  # JSON string

    # Alternative bet
    alt_bet_type = Column(String(50), nullable=True)
    alt_confidence = Column(Float, nullable=True)
    alt_odds = Column(Float, nullable=True)

    # Result
    result = Column(String(20), nullable=True)  # win, lose, push, pending
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)

    # Kelly
    kelly_stake = Column(Float, nullable=True)
    expected_value = Column(Float, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    result_checked_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship
    user = relationship("User", back_populates="predictions")
