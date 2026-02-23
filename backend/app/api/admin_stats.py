"""
Admin stats API — dashboard data, user analytics, predictions overview.
All endpoints require admin authentication.
"""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.admin_auth import get_current_admin
from app.models.user import User
from app.models.prediction import Prediction
from app.models.support_chat import SupportChatMessage
from app.models.ml_models import MLModel, ROIAnalytics, LearningLog

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/overview")
async def get_overview(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Main dashboard overview — key metrics."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # Users stats
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    pro_users = (await db.execute(
        select(func.count(User.id)).where(
            and_(User.is_premium == True, User.premium_until > now)
        )
    )).scalar() or 0
    new_today = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= today_start)
    )).scalar() or 0
    new_week = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    )).scalar() or 0

    # Predictions stats
    total_predictions = (await db.execute(select(func.count(Prediction.id)))).scalar() or 0
    verified = (await db.execute(
        select(func.count(Prediction.id)).where(Prediction.is_correct.isnot(None))
    )).scalar() or 0
    correct = (await db.execute(
        select(func.count(Prediction.id)).where(Prediction.is_correct == True)
    )).scalar() or 0
    today_predictions = (await db.execute(
        select(func.count(Prediction.id)).where(Prediction.created_at >= today_start)
    )).scalar() or 0

    # AI chats today
    ai_chats_today = (await db.execute(
        select(func.count(SupportChatMessage.id)).where(
            and_(
                SupportChatMessage.created_at >= today_start,
                SupportChatMessage.role == "user",
            )
        )
    )).scalar() or 0

    # Support total unique sessions
    total_support_sessions = (await db.execute(
        select(func.count(func.distinct(SupportChatMessage.session_id)))
    )).scalar() or 0

    accuracy = round((correct / verified * 100), 1) if verified > 0 else 0.0

    return {
        "users": {
            "total": total_users,
            "pro": pro_users,
            "new_today": new_today,
            "new_week": new_week,
        },
        "predictions": {
            "total": total_predictions,
            "verified": verified,
            "correct": correct,
            "accuracy": accuracy,
            "today": today_predictions,
        },
        "ai_chats_today": ai_chats_today,
        "support_sessions": total_support_sessions,
    }


@router.get("/users")
async def get_users_stats(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Detailed user analytics."""
    now = datetime.utcnow()

    # Users by country (top 10)
    country_rows = (await db.execute(
        select(User.country, func.count(User.id).label("cnt"))
        .where(User.country.isnot(None))
        .group_by(User.country)
        .order_by(func.count(User.id).desc())
        .limit(10)
    )).all()
    by_country = [{"country": r[0], "count": r[1]} for r in country_rows]

    # Users by language
    lang_rows = (await db.execute(
        select(User.language, func.count(User.id).label("cnt"))
        .group_by(User.language)
        .order_by(func.count(User.id).desc())
    )).all()
    by_language = [{"language": r[0], "count": r[1]} for r in lang_rows]

    # Registration growth — last 30 days
    growth_rows = (await db.execute(
        select(
            func.date(User.created_at).label("day"),
            func.count(User.id).label("cnt"),
        )
        .where(User.created_at >= now - timedelta(days=30))
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
    )).all()
    daily_registrations = [{"date": str(r[0]), "count": r[1]} for r in growth_rows]

    # Referral stats
    total_referred = (await db.execute(
        select(func.count(User.id)).where(User.referred_by_id.isnot(None))
    )).scalar() or 0

    # Recent users
    recent_rows = (await db.execute(
        select(User).order_by(User.created_at.desc()).limit(20)
    )).scalars().all()
    recent_users = [
        {
            "id": u.id,
            "public_id": u.public_id,
            "phone": u.phone,
            "email": u.email,
            "country": u.country,
            "language": u.language,
            "is_premium": u.is_premium,
            "total_predictions": u.total_predictions,
            "correct_predictions": u.correct_predictions,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in recent_rows
    ]

    return {
        "by_country": by_country,
        "by_language": by_language,
        "daily_registrations": daily_registrations,
        "total_referred": total_referred,
        "recent_users": recent_users,
    }


@router.get("/predictions")
async def get_predictions_stats(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Prediction analytics."""
    now = datetime.utcnow()

    # By bet type
    bet_rows = (await db.execute(
        select(
            Prediction.bet_type,
            func.count(Prediction.id).label("total"),
            func.count(case((Prediction.is_correct == True, 1))).label("correct"),
        )
        .where(Prediction.bet_type != "")
        .group_by(Prediction.bet_type)
        .order_by(func.count(Prediction.id).desc())
        .limit(10)
    )).all()
    by_bet_type = [
        {
            "bet_type": r[0],
            "total": r[1],
            "correct": r[2],
            "accuracy": round(r[2] / r[1] * 100, 1) if r[1] > 0 else 0,
        }
        for r in bet_rows
    ]

    # Daily predictions — last 30 days
    daily_rows = (await db.execute(
        select(
            func.date(Prediction.created_at).label("day"),
            func.count(Prediction.id).label("cnt"),
        )
        .where(Prediction.created_at >= now - timedelta(days=30))
        .group_by(func.date(Prediction.created_at))
        .order_by(func.date(Prediction.created_at))
    )).all()
    daily_predictions = [{"date": str(r[0]), "count": r[1]} for r in daily_rows]

    # By league (top 10)
    league_rows = (await db.execute(
        select(
            Prediction.league,
            func.count(Prediction.id).label("total"),
            func.count(case((Prediction.is_correct == True, 1))).label("correct"),
        )
        .where(Prediction.league.isnot(None))
        .group_by(Prediction.league)
        .order_by(func.count(Prediction.id).desc())
        .limit(10)
    )).all()
    by_league = [
        {
            "league": r[0],
            "total": r[1],
            "correct": r[2],
            "accuracy": round(r[2] / r[1] * 100, 1) if r[1] > 0 else 0,
        }
        for r in league_rows
    ]

    # ROI data
    roi_rows = (await db.execute(
        select(ROIAnalytics)
        .order_by(ROIAnalytics.period_start.desc())
        .limit(10)
    )).scalars().all()
    roi_data = [
        {
            "period": r.period,
            "start": str(r.period_start) if r.period_start else None,
            "predictions": r.total_predictions,
            "accuracy": float(r.accuracy) if r.accuracy else 0,
            "roi": float(r.roi_percent) if r.roi_percent else 0,
        }
        for r in roi_rows
    ]

    return {
        "by_bet_type": by_bet_type,
        "by_league": by_league,
        "daily_predictions": daily_predictions,
        "roi": roi_data,
    }


@router.get("/ml")
async def get_ml_stats(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """ML pipeline stats."""
    # Active models
    model_rows = (await db.execute(
        select(MLModel).order_by(MLModel.created_at.desc()).limit(10)
    )).scalars().all()
    models = [
        {
            "id": m.id,
            "name": m.model_name,
            "type": m.model_type,
            "version": m.version,
            "accuracy": float(m.accuracy) if m.accuracy else None,
            "f1_score": float(m.f1_score) if m.f1_score else None,
            "training_samples": m.training_samples,
            "is_active": m.is_active,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in model_rows
    ]

    # Recent learning events
    log_rows = (await db.execute(
        select(LearningLog).order_by(LearningLog.created_at.desc()).limit(20)
    )).scalars().all()
    learning_log = [
        {
            "event": l.event_type,
            "details": l.details_json,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in log_rows
    ]

    return {
        "models": models,
        "learning_log": learning_log,
    }


@router.get("/support")
async def get_support_stats(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Support chat analytics."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    total_messages = (await db.execute(
        select(func.count(SupportChatMessage.id))
    )).scalar() or 0

    total_sessions = (await db.execute(
        select(func.count(func.distinct(SupportChatMessage.session_id)))
    )).scalar() or 0

    unique_users = (await db.execute(
        select(func.count(func.distinct(SupportChatMessage.user_id)))
    )).scalar() or 0

    today_messages = (await db.execute(
        select(func.count(SupportChatMessage.id)).where(
            SupportChatMessage.created_at >= today_start
        )
    )).scalar() or 0

    # By locale
    locale_rows = (await db.execute(
        select(
            SupportChatMessage.locale,
            func.count(SupportChatMessage.id).label("cnt"),
        )
        .group_by(SupportChatMessage.locale)
        .order_by(func.count(SupportChatMessage.id).desc())
    )).all()
    by_locale = [{"locale": r[0], "count": r[1]} for r in locale_rows]

    # Recent sessions
    recent_sessions = (await db.execute(
        select(
            SupportChatMessage.session_id,
            SupportChatMessage.user_id,
            SupportChatMessage.locale,
            SupportChatMessage.was_pro,
            func.min(SupportChatMessage.created_at).label("started"),
            func.count(SupportChatMessage.id).label("messages"),
        )
        .group_by(
            SupportChatMessage.session_id,
            SupportChatMessage.user_id,
            SupportChatMessage.locale,
            SupportChatMessage.was_pro,
        )
        .order_by(func.min(SupportChatMessage.created_at).desc())
        .limit(20)
    )).all()
    sessions = [
        {
            "session_id": r[0],
            "user_id": r[1],
            "locale": r[2],
            "was_pro": r[3],
            "started": r[4].isoformat() if r[4] else None,
            "messages": r[5],
        }
        for r in recent_sessions
    ]

    return {
        "total_messages": total_messages,
        "total_sessions": total_sessions,
        "unique_users": unique_users,
        "today_messages": today_messages,
        "by_locale": by_locale,
        "recent_sessions": sessions,
    }
