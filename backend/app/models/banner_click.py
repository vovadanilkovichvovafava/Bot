from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class BannerClick(Base):
    __tablename__ = "banner_clicks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True)  # public_id (usr_xxxx)
    banner = Column(String, index=True, nullable=False)   # e.g. "aichat_bet_card", "home_featured_match"
    created_at = Column(DateTime, server_default=func.now(), index=True)
