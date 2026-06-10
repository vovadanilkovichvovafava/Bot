from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
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
