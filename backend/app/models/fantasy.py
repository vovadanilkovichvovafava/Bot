from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class FantasyLedger(Base):
    """
    Append-only ledger of fantasy point movements (transparency + history).
    `points` is positive for earnings, negative for redemptions.
    """
    __tablename__ = "fantasy_ledger"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    kind = Column(String, nullable=False)        # 'earn' | 'redeem'
    points = Column(Integer, nullable=False)      # +earn / -redeem
    reason = Column(String, nullable=True)        # e.g. 'correct_prediction', 'redeem_pro_30d'
    ref = Column(String, nullable=True)           # match_id or tier id
    created_at = Column(DateTime, server_default=func.now())


class WcPrediction(Base):
    """A user's World Cup group-stage prediction (predicted finishing order per group)."""
    __tablename__ = "wc_predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    picks_json = Column(Text, nullable=False)     # {"A":[teamId,...], ...} api-sports ids, predicted order
    scored_groups = Column(Text, nullable=True)   # JSON list of group letters already settled
    points_awarded = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
