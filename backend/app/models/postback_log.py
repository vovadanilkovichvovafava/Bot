from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.sql import func
from app.core.database import Base


class PostbackLog(Base):
    __tablename__ = "postback_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Which user this postback is for
    user_id = Column(String, index=True, nullable=True)  # public_id (usr_xxxx) or raw value
    user_db_id = Column(Integer, nullable=True)  # Resolved internal user id

    # Postback source and identifiers
    source = Column(String, index=True, nullable=False)  # "generic", "1win", "keitaro"
    click_id = Column(String, nullable=True)
    transaction_id = Column(String, nullable=True)

    # Event info
    event = Column(String, index=True, nullable=True)  # deposit, ftd, registration, etc.
    amount = Column(Float, nullable=True)
    currency = Column(String, nullable=True)
    country = Column(String, nullable=True)

    # Processing result
    premium_activated = Column(Boolean, default=False)
    error = Column(Text, nullable=True)

    # Raw query string for debugging
    raw_params = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), index=True)
