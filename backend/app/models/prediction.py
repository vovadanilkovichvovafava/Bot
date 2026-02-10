from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)

    # Match info
    match_id = Column(Integer, index=True, nullable=False)
    home_team = Column(String, nullable=False)
    away_team = Column(String, nullable=False)
    league = Column(String, nullable=True)
    match_date = Column(DateTime, nullable=True)

    # Prediction details
    bet_type = Column(String, nullable=True)  # e.g., "Home Win", "Over 2.5"
    predicted_odds = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)  # 0-100

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
