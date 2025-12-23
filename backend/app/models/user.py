"""User model"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    """User model for authentication and profile"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    username = Column(String(100), unique=True, index=True)

    # Profile
    language = Column(String(10), default="en")
    timezone = Column(String(50), default="UTC")

    # Premium
    is_premium = Column(Boolean, default=False)
    premium_until = Column(DateTime(timezone=True), nullable=True)

    # Limits
    daily_requests = Column(Integer, default=0)
    last_request_date = Column(String(10), nullable=True)
    bonus_predictions = Column(Integer, default=0)

    # Settings
    min_odds = Column(Float, default=1.5)
    max_odds = Column(Float, default=3.0)
    risk_level = Column(String(20), default="medium")

    # Stats
    total_predictions = Column(Integer, default=0)
    correct_predictions = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_active = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Status
    is_active = Column(Boolean, default=True)

    # Relationships
    predictions = relationship("Prediction", back_populates="user")
    favorite_teams = relationship("FavoriteTeam", back_populates="user")
    favorite_leagues = relationship("FavoriteLeague", back_populates="user")

    @property
    def accuracy(self) -> float:
        """Calculate prediction accuracy"""
        if self.total_predictions == 0:
            return 0.0
        return round(self.correct_predictions / self.total_predictions * 100, 1)

    @property
    def has_premium(self) -> bool:
        """Check if user has active premium"""
        if not self.is_premium:
            return False
        if self.premium_until is None:
            return True
        return self.premium_until > datetime.now(timezone.utc)
