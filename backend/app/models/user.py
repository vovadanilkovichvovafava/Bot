from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    registration_ip = Column(String, index=True, nullable=True)

    language = Column(String, default="en")
    timezone = Column(String, default="UTC")

    is_premium = Column(Boolean, default=False)
    premium_until = Column(DateTime, nullable=True)

    daily_requests = Column(Integer, default=0)
    daily_limit = Column(Integer, default=10)
    bonus_predictions = Column(Integer, default=3)

    min_odds = Column(Float, default=1.5)
    max_odds = Column(Float, default=3.0)
    risk_level = Column(String, default="medium")

    total_predictions = Column(Integer, default=0)
    correct_predictions = Column(Integer, default=0)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    @property
    def accuracy(self) -> float:
        if self.total_predictions == 0:
            return 0.0
        return round((self.correct_predictions / self.total_predictions) * 100, 1)
