import secrets
import string

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


def generate_public_id():
    """Generate a unique public ID like usr_a7f3k9x2m5p8"""
    chars = string.ascii_lowercase + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(12))
    return f"usr_{random_part}"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False, default=generate_public_id)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=True)
    username = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    registration_ip = Column(String, index=True, nullable=True)
    # Browser/device fingerprint captured at signup. Distinguishes one PERSON
    # from one NETWORK: hundreds of real users share a carrier IP, but not a
    # device profile. Used to withhold the free trial from repeat signups
    # instead of blocking them outright — see auth.register.
    device_fingerprint = Column(String, index=True, nullable=True)
    country = Column(String, nullable=True, index=True)  # ISO 3166-1 alpha-2 (IT, PL, DE, etc.)
    traffic_source = Column(String, nullable=True, index=True)  # e.g. "prescoreai_com", "sportscoreai_com"
    utm_source = Column(String, nullable=True, index=True)      # рекламный источник: google, facebook, tiktok
    utm_campaign = Column(String, nullable=True, index=True)    # название кампании

    # Откуда пришёл: кампании передают данные в sub_id_*, а не в utm_*.
    # click_params — весь набор из ссылки как есть (JSON-строка), остальные
    # поля вынесены отдельно, чтобы по ним можно было группировать и искать.
    click_params = Column(Text, nullable=True)
    ad_campaign = Column(String, nullable=True, index=True)     # sub_id_6: "BR/bot_leads_3"
    ad_set = Column(String, nullable=True)                      # sub_id_4: "New_Leads_Ad_Set"
    ad_placement = Column(String, nullable=True)                # sub_id_7: "Instagram_Stories"
    ad_source = Column(String, nullable=True, index=True)       # sub_id_8: "ig"

    # A/B funnel: "funnel-1" (degressive+Pro), "funnel-2" (all free, no paywall), "funnel-3" (fixed 7/day), "funnel-4" (express-first)
    funnel = Column(String, nullable=True, index=True, default="funnel-1")

    language = Column(String, default="en")
    timezone = Column(String, default="UTC")

    is_premium = Column(Boolean, default=False)
    premium_until = Column(DateTime, nullable=True)
    is_banned = Column(Boolean, default=False)
    use_deeplink = Column(Boolean, default=False)  # Old users=True (go to match), New users=False (go to offer)

    daily_requests = Column(Integer, default=0)
    daily_limit = Column(Integer, default=10)
    bonus_predictions = Column(Integer, default=3)

    # Degressive AI chat limits (Day1=3, Day2=2, Day3+=1)
    daily_chat_requests = Column(Integer, default=0)
    last_chat_request_date = Column(DateTime, nullable=True)
    account_day_number = Column(Integer, default=1)  # Tracks which "day" of usage

    min_odds = Column(Float, default=1.5)
    max_odds = Column(Float, default=3.0)
    risk_level = Column(String, default="medium")

    total_predictions = Column(Integer, default=0)
    correct_predictions = Column(Integer, default=0)
    predictions_data = Column(Text, nullable=True)  # JSON array of predictions

    # Referral system
    referral_code = Column(String, unique=True, index=True, nullable=True)
    referred_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    referral_bonus_requests = Column(Integer, default=0)  # Free AI requests earned

    # Fantasy rewards: spendable balance + lifetime total (for rank/level)
    fantasy_points = Column(Integer, default=0)
    fantasy_points_lifetime = Column(Integer, default=0)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    referred_by = relationship("User", remote_side=[id], backref="referrals")

    @property
    def accuracy(self) -> float:
        if self.total_predictions == 0:
            return 0.0
        return round((self.correct_predictions / self.total_predictions) * 100, 1)
