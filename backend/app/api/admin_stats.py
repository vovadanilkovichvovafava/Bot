"""
Admin stats API — dashboard data, user analytics, predictions overview.
All endpoints require admin authentication.
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy import select, func, case, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.admin_auth import get_current_admin
from app.models.user import User
from app.models.prediction import Prediction
from app.models.support_chat import SupportChatMessage
from app.models.ai_chat import AIChatMessage
from app.models.ml_models import MLModel, ROIAnalytics, LearningLog
from app.models.postback_log import PostbackLog
from app.models.banner_click import BannerClick

logger = logging.getLogger(__name__)

router = APIRouter()

LOCALE_NAMES = {
    "en": "English", "ru": "Russian", "es": "Spanish", "de": "German",
    "fr": "French", "pt": "Portuguese", "it": "Italian", "tr": "Turkish",
    "uk": "Ukrainian", "pl": "Polish", "ar": "Arabic", "zh": "Chinese",
    "ja": "Japanese", "ko": "Korean", "hi": "Hindi",
}


async def _translate_admin_reply(text: str, target_locale: str) -> str:
    """Translate admin reply to the user's language using Claude Haiku."""
    if not text.strip() or target_locale in ("ru", ""):
        return text  # admin writes in Russian, no translation needed

    api_key = os.getenv("CLAUDE_API_KEY")
    if not api_key:
        logger.warning("CLAUDE_API_KEY not set — skipping reply translation")
        return text

    lang = LOCALE_NAMES.get(target_locale, target_locale)
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=api_key)
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": (
                    f"Translate the following message to {lang}. "
                    f"Keep the same tone, do not add anything extra. "
                    f"Return ONLY the translated text, nothing else.\n\n"
                    f"{text}"
                ),
            }],
        )
        translated = resp.content[0].text.strip()
        if translated:
            return translated
    except Exception as e:
        logger.error(f"Reply translation failed ({target_locale}): {e}")

    return text  # fallback: send original


async def _get_football_api_status() -> dict:
    """Fetch API-Football account status (requests used today / daily limit)."""
    import httpx, os
    api_key = os.getenv("API_FOOTBALL_KEY", "")
    if not api_key:
        return {"used": 0, "limit": 0}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://v3.football.api-sports.io/status",
                headers={"x-apisports-key": api_key},
                timeout=10.0,
            )
            data = resp.json()
            req = data.get("response", {}).get("requests", {})
            return {
                "used": req.get("current", 0),
                "limit": req.get("limit_day", 0),
            }
    except Exception as e:
        logger.warning(f"Failed to fetch API-Football status: {e}")
        return {"used": 0, "limit": 0}


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

    # New PRO users today — premium_until set to ~now+15d on activation,
    # so today's activations have premium_until in [today+15d, tomorrow+15d)
    tomorrow_start = today_start + timedelta(days=1)
    pro_new_today = (await db.execute(
        select(func.count(User.id)).where(
            and_(
                User.is_premium == True,
                User.premium_until >= today_start + timedelta(days=15),
                User.premium_until < tomorrow_start + timedelta(days=15),
            )
        )
    )).scalar() or 0

    # Predictions yesterday (for comparison)
    yesterday_start = today_start - timedelta(days=1)
    yesterday_predictions = (await db.execute(
        select(func.count(Prediction.id)).where(
            and_(
                Prediction.created_at >= yesterday_start,
                Prediction.created_at < today_start,
            )
        )
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

    # AI chats yesterday (for comparison)
    ai_chats_yesterday = (await db.execute(
        select(func.count(SupportChatMessage.id)).where(
            and_(
                SupportChatMessage.created_at >= yesterday_start,
                SupportChatMessage.created_at < today_start,
                SupportChatMessage.role == "user",
            )
        )
    )).scalar() or 0

    # Support total unique sessions
    total_support_sessions = (await db.execute(
        select(func.count(func.distinct(SupportChatMessage.session_id)))
    )).scalar() or 0

    # Support sessions today
    support_sessions_today = (await db.execute(
        select(func.count(func.distinct(SupportChatMessage.session_id))).where(
            SupportChatMessage.created_at >= today_start
        )
    )).scalar() or 0

    accuracy = round((correct / verified * 100), 1) if verified > 0 else 0.0

    # Online users (active in last 15 minutes)
    online_cutoff = now - timedelta(minutes=15)
    online_users = (await db.execute(
        select(func.count(User.id)).where(User.updated_at >= online_cutoff)
    )).scalar() or 0

    # Football API usage today
    football_api_today = await _get_football_api_status()

    return {
        "users": {
            "total": total_users,
            "pro": pro_users,
            "pro_new_today": pro_new_today,
            "new_today": new_today,
            "new_week": new_week,
            "online": online_users,
        },
        "predictions": {
            "total": total_predictions,
            "verified": verified,
            "correct": correct,
            "accuracy": accuracy,
            "today": today_predictions,
            "yesterday": yesterday_predictions,
        },
        "ai_chats_today": ai_chats_today,
        "ai_chats_yesterday": ai_chats_yesterday,
        "support_sessions": total_support_sessions,
        "support_sessions_today": support_sessions_today,
        "football_api": football_api_today,
    }


@router.get("/online-history")
async def get_online_history(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Unique active users per hour for the last 24 hours (from analytics_events)."""
    now = datetime.utcnow()
    day_ago = now - timedelta(hours=24)

    try:
        rows = (await db.execute(text("""
            SELECT
                date_trunc('hour', created_at) AS hour,
                COUNT(DISTINCT user_id) AS unique_users,
                COUNT(*) AS total_events
            FROM analytics_events
            WHERE created_at >= :since
              AND user_id IS NOT NULL
            GROUP BY date_trunc('hour', created_at)
            ORDER BY hour
        """), {"since": day_ago})).all()

        hours = []
        peak_users = 0
        peak_hour = None

        for r in rows:
            h = r[0]
            users = r[1]
            events = r[2]
            hours.append({
                "hour": h.strftime("%H:%M") if h else "?",
                "hour_full": h.isoformat() if h else None,
                "unique_users": users,
                "total_events": events,
            })
            if users > peak_users:
                peak_users = users
                peak_hour = h.strftime("%H:%M") if h else None

        return {
            "hours": hours,
            "peak_users": peak_users,
            "peak_hour": peak_hour,
            "current_online": (await db.execute(
                select(func.count(User.id)).where(User.updated_at >= now - timedelta(minutes=15))
            )).scalar() or 0,
        }
    except Exception as e:
        logger.error(f"Online history error: {e}")
        return {"hours": [], "peak_users": 0, "peak_hour": None, "current_online": 0}


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

    # Daily registrations by country — last 30 days
    daily_country_rows = (await db.execute(
        select(
            func.date(User.created_at).label("day"),
            User.country,
            func.count(User.id).label("cnt"),
        )
        .where(User.created_at >= now - timedelta(days=30))
        .group_by(func.date(User.created_at), User.country)
        .order_by(func.date(User.created_at).desc(), func.count(User.id).desc())
    )).all()
    daily_by_country = [
        {"date": str(r[0]), "country": r[1] or "Unknown", "count": r[2]}
        for r in daily_country_rows
    ]

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
        "daily_by_country": daily_by_country,
        "total_referred": total_referred,
        "recent_users": recent_users,
    }


@router.get("/retention")
async def get_retention_stats(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retention cohorts and Free->PRO conversion metrics."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Weekly retention cohorts (last 8 weeks)
    cohorts = []
    for weeks_ago in range(8):
        cohort_start = today_start - timedelta(days=7 * (weeks_ago + 1))
        cohort_end = today_start - timedelta(days=7 * weeks_ago)

        # Users registered in this week
        total_in_cohort = (await db.execute(
            select(func.count(User.id)).where(
                and_(User.created_at >= cohort_start, User.created_at < cohort_end)
            )
        )).scalar() or 0

        if total_in_cohort == 0:
            cohorts.append({
                "week": cohort_start.strftime("%m/%d"),
                "registered": 0,
                "returned_week1": 0,
                "converted_pro": 0,
                "made_prediction": 0,
            })
            continue

        # How many came back (had activity after first week = updated_at > cohort_end)
        returned = (await db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.created_at >= cohort_start,
                    User.created_at < cohort_end,
                    User.updated_at >= cohort_end,
                )
            )
        )).scalar() or 0

        # How many converted to PRO
        converted = (await db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.created_at >= cohort_start,
                    User.created_at < cohort_end,
                    User.is_premium == True,
                )
            )
        )).scalar() or 0

        # How many made at least one prediction
        made_prediction = (await db.execute(
            select(func.count(func.distinct(Prediction.user_id))).where(
                and_(
                    Prediction.user_id.in_(
                        select(User.id).where(
                            and_(User.created_at >= cohort_start, User.created_at < cohort_end)
                        )
                    )
                )
            )
        )).scalar() or 0

        cohorts.append({
            "week": cohort_start.strftime("%m/%d"),
            "registered": total_in_cohort,
            "returned_week1": returned,
            "retention_pct": round(returned / total_in_cohort * 100, 1) if total_in_cohort > 0 else 0,
            "converted_pro": converted,
            "conversion_pct": round(converted / total_in_cohort * 100, 1) if total_in_cohort > 0 else 0,
            "made_prediction": made_prediction,
            "activation_pct": round(made_prediction / total_in_cohort * 100, 1) if total_in_cohort > 0 else 0,
        })

    cohorts.reverse()  # oldest first

    # Overall conversion stats
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_pro = (await db.execute(
        select(func.count(User.id)).where(and_(User.is_premium == True, User.premium_until > now))
    )).scalar() or 0
    total_with_predictions = (await db.execute(
        select(func.count(User.id)).where(User.total_predictions > 0)
    )).scalar() or 0

    # 30-day conversion funnel
    month_ago = now - timedelta(days=30)
    new_30d = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= month_ago)
    )).scalar() or 0
    activated_30d = (await db.execute(
        select(func.count(func.distinct(Prediction.user_id))).where(
            Prediction.user_id.in_(
                select(User.id).where(User.created_at >= month_ago)
            )
        )
    )).scalar() or 0
    pro_30d = (await db.execute(
        select(func.count(User.id)).where(
            and_(User.created_at >= month_ago, User.is_premium == True)
        )
    )).scalar() or 0

    return {
        "cohorts": cohorts,
        "overall": {
            "total_users": total_users,
            "total_pro": total_pro,
            "conversion_rate": round(total_pro / total_users * 100, 1) if total_users > 0 else 0,
            "activation_rate": round(total_with_predictions / total_users * 100, 1) if total_users > 0 else 0,
        },
        "funnel_30d": {
            "registered": new_30d,
            "activated": activated_30d,
            "converted_pro": pro_30d,
        },
    }


@router.get("/users/search")
async def search_users(
    q: str = Query("", max_length=100),
    status: Optional[str] = Query(None),  # pro, free
    country: Optional[str] = Query(None),
    sort: str = Query("created_at"),  # created_at, total_predictions
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Search users by phone, email, public_id, username."""
    now = datetime.utcnow()
    query = select(User)
    count_query = select(func.count(User.id))

    # Search filter
    if q.strip():
        search = f"%{q.strip()}%"
        search_filter = User.phone.ilike(search) | User.email.ilike(search) | User.public_id.ilike(search) | User.username.ilike(search)
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # Status filter
    if status == "pro":
        f = and_(User.is_premium == True, User.premium_until > now)
        query = query.where(f)
        count_query = count_query.where(f)
    elif status == "free":
        f = (User.is_premium == False) | (User.premium_until <= now) | (User.premium_until.is_(None))
        query = query.where(f)
        count_query = count_query.where(f)

    # Country filter
    if country:
        query = query.where(User.country == country)
        count_query = count_query.where(User.country == country)

    # Sorting
    if sort == "total_predictions":
        query = query.order_by(User.total_predictions.desc())
    else:
        query = query.order_by(User.created_at.desc())

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * per_page
    rows = (await db.execute(query.limit(per_page).offset(offset))).scalars().all()

    users = [
        {
            "id": u.id,
            "public_id": u.public_id,
            "phone": u.phone,
            "email": u.email,
            "username": u.username,
            "country": u.country,
            "language": u.language,
            "is_premium": u.is_premium,
            "premium_until": u.premium_until.isoformat() if u.premium_until else None,
            "total_predictions": u.total_predictions,
            "correct_predictions": u.correct_predictions,
            "daily_requests": u.daily_requests,
            "daily_limit": u.daily_limit,
            "referral_code": u.referral_code,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in rows
    ]

    return {"total": total, "page": page, "per_page": per_page, "users": users}


@router.get("/users/{user_id}/profile")
async def get_user_profile(
    user_id: int,
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Detailed user profile with activity stats."""
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.utcnow()

    # Predictions by this user
    user_predictions = (await db.execute(
        select(
            func.count(Prediction.id).label("total"),
            func.count(case((Prediction.is_correct == True, 1))).label("correct"),
            func.count(case((Prediction.is_correct.isnot(None), 1))).label("verified"),
        ).where(Prediction.user_id == user.id)
    )).first()

    # Recent predictions
    recent_preds = (await db.execute(
        select(Prediction)
        .where(Prediction.user_id == user.id)
        .order_by(Prediction.created_at.desc())
        .limit(10)
    )).scalars().all()
    preds_list = [
        {
            "id": p.id,
            "home_team": p.home_team,
            "away_team": p.away_team,
            "bet_type": p.bet_type,
            "league": p.league,
            "is_correct": p.is_correct,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in recent_preds
    ]

    # Support chat sessions count
    support_sessions = (await db.execute(
        select(func.count(func.distinct(SupportChatMessage.session_id)))
        .where(SupportChatMessage.user_id == user.id)
    )).scalar() or 0

    # AI chat sessions count
    ai_sessions = (await db.execute(
        select(func.count(func.distinct(AIChatMessage.session_id)))
        .where(AIChatMessage.user_id == user.id)
    )).scalar() or 0

    # Referrals count
    referrals_count = (await db.execute(
        select(func.count(User.id)).where(User.referred_by_id == user.id)
    )).scalar() or 0

    # Activity: days since registration
    days_since_reg = (now - user.created_at).days if user.created_at else 0

    return {
        "user": {
            "id": user.id,
            "public_id": user.public_id,
            "phone": user.phone,
            "email": user.email,
            "username": user.username,
            "country": user.country,
            "language": user.language,
            "is_premium": user.is_premium,
            "premium_until": user.premium_until.isoformat() if user.premium_until else None,
            "daily_requests": user.daily_requests,
            "daily_limit": user.daily_limit,
            "daily_chat_requests": user.daily_chat_requests,
            "bonus_predictions": user.bonus_predictions,
            "referral_code": user.referral_code,
            "referral_bonus_requests": user.referral_bonus_requests,
            "registration_ip": user.registration_ip,
            "risk_level": user.risk_level,
            "min_odds": user.min_odds,
            "max_odds": user.max_odds,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        },
        "stats": {
            "total_predictions": user_predictions[0] if user_predictions else 0,
            "correct_predictions": user_predictions[1] if user_predictions else 0,
            "verified_predictions": user_predictions[2] if user_predictions else 0,
            "accuracy": round(user_predictions[1] / user_predictions[2] * 100, 1) if user_predictions and user_predictions[2] > 0 else 0,
            "support_sessions": support_sessions,
            "ai_sessions": ai_sessions,
            "referrals_count": referrals_count,
            "days_since_registration": days_since_reg,
        },
        "recent_predictions": preds_list,
    }


@router.post("/users/{user_id}/toggle-premium")
async def toggle_user_premium(
    user_id: int,
    days: int = Body(15, embed=False),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Toggle premium status for a user (admin action)."""
    from fastapi import HTTPException
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_premium and user.premium_until and user.premium_until > datetime.utcnow():
        # Deactivate
        user.is_premium = False
        user.premium_until = None
        action = "deactivated"
    else:
        # Activate
        user.is_premium = True
        user.premium_until = datetime.utcnow() + timedelta(days=days)
        action = "activated"

    await db.commit()

    return {
        "success": True,
        "action": action,
        "user_id": user.id,
        "public_id": user.public_id,
        "is_premium": user.is_premium,
        "premium_until": user.premium_until.isoformat() if user.premium_until else None,
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
    """ML pipeline stats with feature importance and training data overview."""
    import json as json_mod
    from app.models.ml_models import MatchFeature

    # Active models
    model_rows = (await db.execute(
        select(MLModel).order_by(MLModel.created_at.desc()).limit(20)
    )).scalars().all()

    # Parse feature importance for active model
    active_feature_importance = None
    models = []
    for m in model_rows:
        model_data = {
            "id": m.id,
            "name": m.model_name,
            "type": m.model_type,
            "version": m.version,
            "accuracy": float(m.accuracy) if m.accuracy else None,
            "f1_score": float(m.f1_score) if m.f1_score else None,
            "brier_score": float(m.brier_score) if m.brier_score else None,
            "log_loss": float(m.log_loss_val) if m.log_loss_val else None,
            "training_samples": m.training_samples,
            "training_duration_sec": float(m.training_duration_sec) if m.training_duration_sec else None,
            "is_active": m.is_active,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        models.append(model_data)
        if m.is_active and m.feature_importance_json and active_feature_importance is None:
            try:
                fi = json_mod.loads(m.feature_importance_json)
                # Sort by importance, take top 20
                if isinstance(fi, dict):
                    sorted_fi = sorted(fi.items(), key=lambda x: abs(float(x[1])), reverse=True)[:20]
                    active_feature_importance = [{"feature": k, "importance": float(v)} for k, v in sorted_fi]
                elif isinstance(fi, list):
                    active_feature_importance = fi[:20]
            except Exception:
                pass

    # Recent learning events
    log_rows = (await db.execute(
        select(LearningLog).order_by(LearningLog.created_at.desc()).limit(30)
    )).scalars().all()
    learning_log = [
        {
            "event": l.event_type,
            "details": l.details_json,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in log_rows
    ]

    # Training data overview
    total_matches = (await db.execute(select(func.count(MatchFeature.id)))).scalar() or 0
    verified_matches = (await db.execute(
        select(func.count(MatchFeature.id)).where(MatchFeature.is_verified == True)
    )).scalar() or 0
    enriched_matches = (await db.execute(
        select(func.count(MatchFeature.id)).where(MatchFeature.home_elo.isnot(None))
    )).scalar() or 0

    # Matches by league (top 10)
    league_rows = (await db.execute(
        select(MatchFeature.league_name, func.count(MatchFeature.id).label("cnt"))
        .where(MatchFeature.league_name.isnot(None))
        .group_by(MatchFeature.league_name)
        .order_by(func.count(MatchFeature.id).desc())
        .limit(10)
    )).all()
    training_by_league = [{"league": r[0], "count": r[1]} for r in league_rows]

    return {
        "models": models,
        "feature_importance": active_feature_importance,
        "learning_log": learning_log,
        "training_data": {
            "total_matches": total_matches,
            "verified_matches": verified_matches,
            "enriched_matches": enriched_matches,
            "by_league": training_by_league,
        },
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


# ── Chat history endpoints (for AdminChats page) ──────────────────────


@router.get("/chats/support-sessions")
async def get_support_sessions(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    q: str = Query("", max_length=100),
    locale: Optional[str] = Query(None),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Paginated support chat sessions with preview and search."""
    filters = []
    if locale:
        filters.append(SupportChatMessage.locale == locale)
    if q.strip():
        try:
            uid = int(q.strip())
            filters.append(SupportChatMessage.user_id == uid)
        except ValueError:
            matching = (await db.execute(
                select(func.distinct(SupportChatMessage.session_id))
                .where(SupportChatMessage.content.ilike(f"%{q.strip()}%"))
                .limit(200)
            )).scalars().all()
            if matching:
                filters.append(SupportChatMessage.session_id.in_(matching))
            else:
                return {"total": 0, "sessions": []}

    base_q = select(
        SupportChatMessage.session_id,
        SupportChatMessage.user_id,
        SupportChatMessage.locale,
        SupportChatMessage.was_pro,
        SupportChatMessage.agent_name,
        func.min(SupportChatMessage.created_at).label("started"),
        func.max(SupportChatMessage.created_at).label("last_msg"),
        func.count(SupportChatMessage.id).label("total_msgs"),
        func.count(case((SupportChatMessage.role == "user", 1))).label("user_msgs"),
    )
    for f in filters:
        base_q = base_q.where(f)
    base_q = base_q.group_by(
        SupportChatMessage.session_id,
        SupportChatMessage.user_id,
        SupportChatMessage.locale,
        SupportChatMessage.was_pro,
        SupportChatMessage.agent_name,
    ).order_by(func.max(SupportChatMessage.created_at).desc())

    rows = (await db.execute(base_q.limit(limit).offset(offset))).all()

    # Get previews for these sessions
    session_ids = [r[0] for r in rows]
    previews = {}
    if session_ids:
        preview_rows = (await db.execute(
            select(SupportChatMessage.session_id, SupportChatMessage.content)
            .where(
                and_(
                    SupportChatMessage.session_id.in_(session_ids),
                    SupportChatMessage.role == "user",
                )
            )
            .distinct(SupportChatMessage.session_id)
            .order_by(SupportChatMessage.session_id, SupportChatMessage.created_at)
        )).all()
        previews = {r[0]: r[1][:120] for r in preview_rows}

    # Total count with filters
    count_q = select(func.count(func.distinct(SupportChatMessage.session_id)))
    for f in filters:
        count_q = count_q.where(f)
    total = (await db.execute(count_q)).scalar() or 0

    sessions = [
        {
            "session_id": r[0],
            "user_id": r[1],
            "locale": r[2],
            "was_pro": r[3],
            "agent_name": r[4],
            "started": r[5].isoformat() if r[5] else None,
            "last_message": r[6].isoformat() if r[6] else None,
            "total_messages": r[7],
            "user_messages": r[8],
            "preview": previews.get(r[0], ""),
        }
        for r in rows
    ]

    return {"total": total, "sessions": sessions}


@router.get("/chats/support-sessions/{session_id}")
async def get_support_session_messages(
    session_id: str,
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """All messages in a specific support session."""
    rows = (await db.execute(
        select(SupportChatMessage)
        .where(SupportChatMessage.session_id == session_id)
        .order_by(SupportChatMessage.created_at)
    )).scalars().all()

    if not rows:
        return {"messages": [], "session_id": session_id}

    messages = [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "locale": m.locale,
            "agent_name": m.agent_name,
            "was_pro": m.was_pro,
            "is_admin_reply": getattr(m, 'is_admin_reply', False),
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in rows
    ]

    return {
        "session_id": session_id,
        "user_id": rows[0].user_id,
        "locale": rows[0].locale,
        "agent_name": rows[0].agent_name,
        "was_pro": rows[0].was_pro,
        "messages": messages,
    }


@router.post("/chats/support-sessions/{session_id}/reply")
async def admin_reply_to_support(
    session_id: str,
    payload: dict = Body(...),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin sends a reply to a user's support chat session."""
    message = (payload.get("message") or "").strip()
    if not message:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(message) > 1000:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Message too long (max 1000 chars)")

    # Get session info (user_id, locale, agent_name) from existing messages
    first_msg = (await db.execute(
        select(SupportChatMessage)
        .where(SupportChatMessage.session_id == session_id)
        .order_by(SupportChatMessage.created_at)
        .limit(1)
    )).scalars().first()

    if not first_msg:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")

    # Auto-translate admin reply to user's language
    translated = await _translate_admin_reply(message, first_msg.locale)

    # Save admin reply as assistant message (translated for user)
    admin_msg = SupportChatMessage(
        user_id=first_msg.user_id,
        session_id=session_id,
        role="assistant",
        content=translated,
        locale=first_msg.locale,
        agent_name=first_msg.agent_name or "Alex",
        was_pro=first_msg.was_pro,
        is_admin_reply=True,
    )
    db.add(admin_msg)
    await db.commit()
    await db.refresh(admin_msg)

    was_translated = translated != message
    logger.info(f"Admin reply: admin={admin.get('email')}, session={session_id[:8]}, user={first_msg.user_id}, translated={was_translated}")

    return {
        "id": admin_msg.id,
        "session_id": session_id,
        "user_id": first_msg.user_id,
        "content": translated,
        "original_text": message if was_translated else None,
        "translated": was_translated,
        "created_at": admin_msg.created_at.isoformat() if admin_msg.created_at else None,
    }


@router.get("/chats/ai-sessions")
async def get_ai_chat_sessions(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    q: str = Query("", max_length=100),
    locale: Optional[str] = Query(None),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """AI chat sessions with search/filter."""
    filters = []
    if locale:
        filters.append(AIChatMessage.locale == locale)
    if q.strip():
        try:
            uid = int(q.strip())
            filters.append(AIChatMessage.user_id == uid)
        except ValueError:
            matching = (await db.execute(
                select(func.distinct(AIChatMessage.session_id))
                .where(AIChatMessage.content.ilike(f"%{q.strip()}%"))
                .limit(200)
            )).scalars().all()
            if matching:
                filters.append(AIChatMessage.session_id.in_(matching))
            else:
                return {"total": 0, "sessions": []}

    base_q = select(
        AIChatMessage.session_id,
        AIChatMessage.user_id,
        AIChatMessage.locale,
        AIChatMessage.was_pro,
        AIChatMessage.match_context,
        func.min(AIChatMessage.created_at).label("started"),
        func.max(AIChatMessage.created_at).label("last_msg"),
        func.count(AIChatMessage.id).label("total_msgs"),
        func.count(case((AIChatMessage.role == "user", 1))).label("user_msgs"),
    )
    for f in filters:
        base_q = base_q.where(f)
    base_q = base_q.group_by(
        AIChatMessage.session_id,
        AIChatMessage.user_id,
        AIChatMessage.locale,
        AIChatMessage.was_pro,
        AIChatMessage.match_context,
    ).order_by(func.max(AIChatMessage.created_at).desc())

    rows = (await db.execute(base_q.limit(limit).offset(offset))).all()

    # Get previews (first user message per session)
    session_ids = [r[0] for r in rows]
    previews = {}
    if session_ids:
        preview_rows = (await db.execute(
            select(AIChatMessage.session_id, AIChatMessage.content)
            .where(
                and_(
                    AIChatMessage.session_id.in_(session_ids),
                    AIChatMessage.role == "user",
                )
            )
            .distinct(AIChatMessage.session_id)
            .order_by(AIChatMessage.session_id, AIChatMessage.created_at)
        )).all()
        previews = {r[0]: r[1][:120] for r in preview_rows}

    count_q = select(func.count(func.distinct(AIChatMessage.session_id)))
    for f in filters:
        count_q = count_q.where(f)
    total = (await db.execute(count_q)).scalar() or 0

    sessions = [
        {
            "session_id": r[0],
            "user_id": r[1],
            "locale": r[2],
            "was_pro": r[3],
            "match_context": r[4],
            "started": r[5].isoformat() if r[5] else None,
            "last_message": r[6].isoformat() if r[6] else None,
            "total_messages": r[7],
            "user_messages": r[8],
            "preview": previews.get(r[0], ""),
        }
        for r in rows
    ]

    return {"total": total, "sessions": sessions}


@router.get("/chats/ai-sessions/{session_id}")
async def get_ai_session_messages(
    session_id: str,
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """All messages in a specific AI chat session."""
    rows = (await db.execute(
        select(AIChatMessage)
        .where(AIChatMessage.session_id == session_id)
        .order_by(AIChatMessage.created_at)
    )).scalars().all()

    if not rows:
        return {"messages": [], "session_id": session_id}

    messages = [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "locale": m.locale,
            "match_context": m.match_context,
            "was_pro": m.was_pro,
            "is_admin_reply": getattr(m, 'is_admin_reply', False),
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in rows
    ]

    return {
        "session_id": session_id,
        "user_id": rows[0].user_id,
        "locale": rows[0].locale,
        "was_pro": rows[0].was_pro,
        "messages": messages,
    }


@router.post("/chats/ai-sessions/{session_id}/reply")
async def admin_reply_to_ai_chat(
    session_id: str,
    payload: dict = Body(...),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin sends a reply to a user's AI chat session."""
    message = (payload.get("message") or "").strip()
    if not message:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(message) > 1000:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Message too long (max 1000 chars)")

    first_msg = (await db.execute(
        select(AIChatMessage)
        .where(AIChatMessage.session_id == session_id)
        .order_by(AIChatMessage.created_at)
        .limit(1)
    )).scalars().first()

    if not first_msg:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")

    # Auto-translate admin reply to user's language
    translated = await _translate_admin_reply(message, first_msg.locale)

    admin_msg = AIChatMessage(
        user_id=first_msg.user_id,
        session_id=session_id,
        role="assistant",
        content=translated,
        locale=first_msg.locale,
        was_pro=first_msg.was_pro,
        is_admin_reply=True,
    )
    db.add(admin_msg)
    await db.commit()
    await db.refresh(admin_msg)

    was_translated = translated != message
    logger.info(f"Admin AI reply: admin={admin.get('email')}, session={session_id[:8]}, user={first_msg.user_id}, translated={was_translated}")

    return {
        "id": admin_msg.id,
        "session_id": session_id,
        "user_id": first_msg.user_id,
        "content": translated,
        "original_text": message if was_translated else None,
        "translated": was_translated,
        "created_at": admin_msg.created_at.isoformat() if admin_msg.created_at else None,
    }


@router.post("/chats/sessions/{session_id}/takeover")
async def toggle_session_takeover(
    session_id: str,
    payload: dict = Body(...),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Toggle admin takeover mode for a chat session (AI auto vs manual)."""
    is_takeover = bool(payload.get("is_takeover", True))
    source_type = payload.get("source_type", "support")

    # Upsert into admin_session_overrides
    existing = (await db.execute(
        text("SELECT session_id FROM admin_session_overrides WHERE session_id = :sid"),
        {"sid": session_id},
    )).first()

    if existing:
        await db.execute(
            text("UPDATE admin_session_overrides SET is_takeover = :tk, admin_email = :email WHERE session_id = :sid"),
            {"tk": is_takeover, "email": admin.get("email"), "sid": session_id},
        )
    else:
        await db.execute(
            text("INSERT INTO admin_session_overrides (session_id, source_type, is_takeover, admin_email) VALUES (:sid, :src, :tk, :email)"),
            {"sid": session_id, "src": source_type, "tk": is_takeover, "email": admin.get("email")},
        )
    await db.commit()

    mode = "manual" if is_takeover else "auto"
    logger.info(f"Session takeover: {mode}, session={session_id[:8]}, admin={admin.get('email')}")

    return {"session_id": session_id, "is_takeover": is_takeover, "mode": mode}


@router.get("/chats/sessions/{session_id}/mode")
async def get_session_mode(
    session_id: str,
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Check if a session is in admin takeover mode."""
    row = (await db.execute(
        text("SELECT is_takeover, admin_email FROM admin_session_overrides WHERE session_id = :sid"),
        {"sid": session_id},
    )).first()

    if row:
        return {"session_id": session_id, "is_takeover": row[0], "admin_email": row[1]}
    return {"session_id": session_id, "is_takeover": False, "admin_email": None}


@router.post("/chats/translate")
async def translate_messages(
    payload: dict = Body(...),
    admin: dict = Depends(get_current_admin),
):
    """Translate messages to Russian and extract key phrases using Claude."""
    import os
    import anthropic
    import json as json_mod
    import re

    messages = payload.get("messages", [])
    if not messages:
        return {"translated": [], "keywords": ""}

    api_key = os.getenv("CLAUDE_API_KEY")
    if not api_key:
        logger.warning("CLAUDE_API_KEY not set — cannot translate")
        return {"translated": [], "keywords": "", "error": "AI not configured"}

    client = anthropic.AsyncAnthropic(api_key=api_key)

    def _parse_json(raw: str) -> dict:
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
        return json_mod.loads(raw)

    async def _translate_batch(batch: list[dict], batch_idx: int) -> list[str]:
        dialog_text = "\n".join(
            f"[{i+1}] {'User' if m.get('role') == 'user' else 'AI'}: {m.get('content', '')}"
            for i, m in enumerate(batch)
        )
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": (
                    f"Translate each numbered message to Russian. Keep the same order.\n"
                    f"There are exactly {len(batch)} messages.\n\n"
                    f"{dialog_text}\n\n"
                    f"Respond with ONLY a raw JSON array of {len(batch)} translated strings, no markdown.\n"
                    f'["перевод 1", "перевод 2", ...]'
                ),
            }],
        )
        parsed = _parse_json(resp.content[0].text)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict) and "translated" in parsed:
            return parsed["translated"]
        return [m.get("content", "") for m in batch]

    try:
        # Split into batches of 15 messages to avoid output truncation
        BATCH_SIZE = 15
        all_translated: list[str] = []

        if len(messages) <= BATCH_SIZE:
            all_translated = await _translate_batch(messages, 0)
        else:
            import asyncio
            batches = [
                messages[i:i + BATCH_SIZE]
                for i in range(0, len(messages), BATCH_SIZE)
            ]
            results = await asyncio.gather(
                *[_translate_batch(b, idx) for idx, b in enumerate(batches)],
                return_exceptions=True,
            )
            for idx, res in enumerate(results):
                if isinstance(res, Exception):
                    logger.error(f"Translation batch {idx} failed: {res}")
                    # fallback: keep originals for this batch
                    all_translated.extend(
                        m.get("content", "") for m in batches[idx]
                    )
                else:
                    all_translated.extend(res)

        # Extract keywords from full dialog (short summary request)
        keywords = ""
        try:
            summary_text = "\n".join(
                m.get("content", "")[:150] for m in messages
            )
            kw_resp = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=200,
                messages=[{
                    "role": "user",
                    "content": (
                        f"Выдели 2-4 ключевые темы этого диалога (на русском, через запятую):\n\n"
                        f"{summary_text[:2000]}"
                    ),
                }],
            )
            keywords = kw_resp.content[0].text.strip()
        except Exception as e:
            logger.warning(f"Keywords extraction failed: {e}")

        return {"translated": all_translated, "keywords": keywords}
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        return {"translated": [], "keywords": "", "error": str(e)}


@router.get("/chats/insights")
async def get_chat_insights(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Analyze recent chats with Claude — extract common topics, bugs, user pain points."""
    import os
    import anthropic
    import json as json_mod
    import re

    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    # Grab last 60 user messages from support chats (last 7 days)
    support_msgs = (await db.execute(
        select(
            SupportChatMessage.content,
            SupportChatMessage.locale,
            SupportChatMessage.session_id,
        )
        .where(
            and_(
                SupportChatMessage.role == "user",
                SupportChatMessage.created_at >= week_ago,
            )
        )
        .order_by(SupportChatMessage.created_at.desc())
        .limit(60)
    )).all()

    # Grab last 60 user messages from AI chats (last 7 days)
    ai_msgs = (await db.execute(
        select(
            AIChatMessage.content,
            AIChatMessage.locale,
            AIChatMessage.session_id,
        )
        .where(
            and_(
                AIChatMessage.role == "user",
                AIChatMessage.created_at >= week_ago,
            )
        )
        .order_by(AIChatMessage.created_at.desc())
        .limit(60)
    )).all()

    # Aggregate stats
    total_support_week = (await db.execute(
        select(func.count(SupportChatMessage.id)).where(
            and_(SupportChatMessage.created_at >= week_ago, SupportChatMessage.role == "user")
        )
    )).scalar() or 0

    total_ai_week = (await db.execute(
        select(func.count(AIChatMessage.id)).where(
            and_(AIChatMessage.created_at >= week_ago, AIChatMessage.role == "user")
        )
    )).scalar() or 0

    support_sessions_week = (await db.execute(
        select(func.count(func.distinct(SupportChatMessage.session_id))).where(
            SupportChatMessage.created_at >= week_ago
        )
    )).scalar() or 0

    ai_sessions_week = (await db.execute(
        select(func.count(func.distinct(AIChatMessage.session_id))).where(
            AIChatMessage.created_at >= week_ago
        )
    )).scalar() or 0

    # Language distribution
    locale_rows = (await db.execute(
        select(SupportChatMessage.locale, func.count(SupportChatMessage.id).label("cnt"))
        .where(SupportChatMessage.created_at >= week_ago)
        .group_by(SupportChatMessage.locale)
        .order_by(func.count(SupportChatMessage.id).desc())
    )).all()
    by_locale = [{"locale": r[0], "count": r[1]} for r in locale_rows]

    stats = {
        "support_messages_week": total_support_week,
        "ai_messages_week": total_ai_week,
        "support_sessions_week": support_sessions_week,
        "ai_sessions_week": ai_sessions_week,
        "by_locale": by_locale,
    }

    # If no messages, return just stats
    all_msgs = support_msgs + ai_msgs
    if not all_msgs:
        return {**stats, "insights": None}

    api_key = os.getenv("CLAUDE_API_KEY")
    if not api_key:
        return {**stats, "insights": None, "error": "AI not configured"}

    # Build numbered text for analysis — Claude returns msg_indices per issue
    trimmed = all_msgs[:80]
    lines = []
    for i, (content, locale, sid) in enumerate(trimmed):
        snippet = content[:200].replace("\n", " ")
        lines.append(f"#{i} [{locale}] {snippet}")
    all_text = "\n".join(lines)

    # Map index → (session_id, source_type)
    idx_map = []
    for content, locale, sid in trimmed:
        src = "support" if (content, locale, sid) in support_msgs else "ai"
        idx_map.append({"session_id": sid, "type": src})

    try:
        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=3000,
            messages=[{
                "role": "user",
                "content": (
                    f"You are analyzing {len(trimmed)} recent user messages from a football betting app's chats (support + AI chats) over the last 7 days.\n"
                    f"Each message starts with #N (its index number).\n\n"
                    f"Messages:\n{all_text}\n\n"
                    f"Analyze these messages and return a JSON with:\n"
                    f"1. 'top_topics' — array of 5-8 most discussed topics, each: {{'topic': '...', 'count_approx': N, 'emoji': '...', 'msg_indices': [list of #N numbers]}}\n"
                    f"2. 'bugs_issues' — array of bug reports or technical issues found (0-5), each: {{'issue': '...', 'severity': 'low'|'medium'|'high', 'count_approx': N, 'msg_indices': [list of #N numbers]}}\n"
                    f"3. 'user_sentiment' — object: {{'positive': N, 'neutral': N, 'negative': N}} (percentage, total 100)\n"
                    f"4. 'feature_requests' — array of feature requests or wishes (0-5), each: {{'request': '...', 'count_approx': N, 'msg_indices': [list of #N numbers]}}\n"
                    f"5. 'summary' — 2-3 sentence Russian summary of the overall trends\n\n"
                    f"msg_indices must contain actual message index numbers (#N) that relate to each topic/issue/request.\n"
                    f"ALL text in topics/issues/requests/summary must be in RUSSIAN.\n"
                    f"IMPORTANT: Respond with ONLY raw JSON, no markdown, no code blocks."
                ),
            }],
        )
        raw = resp.content[0].text.strip()
        if raw.startswith("```"):
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
        insights = json_mod.loads(raw)

        # Resolve msg_indices → unique session references
        def resolve_sessions(items):
            for item in (items or []):
                indices = item.pop("msg_indices", []) or []
                seen = set()
                sessions = []
                for idx in indices:
                    if isinstance(idx, int) and 0 <= idx < len(idx_map):
                        info = idx_map[idx]
                        if info["session_id"] not in seen:
                            seen.add(info["session_id"])
                            sessions.append(info)
                item["sessions"] = sessions

        resolve_sessions(insights.get("bugs_issues"))
        resolve_sessions(insights.get("feature_requests"))
        resolve_sessions(insights.get("top_topics"))

        return {**stats, "insights": insights}
    except Exception as e:
        logger.error(f"Insights analysis failed: {e}")
        return {**stats, "insights": None, "error": str(e)}


# ── PRO Analytics endpoint ──────────────────────────────────────────────


@router.get("/pro")
async def get_pro_analytics(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Comprehensive PRO user analytics — engagement, churn, growth, activity."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    try:
        # ── Overview KPIs (batch) ──

        total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

        active_pro = (await db.execute(
            select(func.count(User.id)).where(
                and_(User.is_premium == True, User.premium_until > now)
            )
        )).scalar() or 0

        # New PRO this week
        new_pro_week = (await db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.is_premium == True,
                    User.premium_until > now,
                    User.premium_until >= week_ago + timedelta(days=15),
                    User.premium_until < now + timedelta(days=16),
                )
            )
        )).scalar() or 0

        # New PRO this month
        new_pro_month = (await db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.is_premium == True,
                    User.premium_until > now,
                    User.premium_until >= month_ago + timedelta(days=15),
                    User.premium_until < now + timedelta(days=16),
                )
            )
        )).scalar() or 0

        # Churned PRO (expired in last 30 days)
        churned_month = (await db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.is_premium == True,
                    User.premium_until <= now,
                    User.premium_until >= month_ago,
                )
            )
        )).scalar() or 0

        # Avg days as PRO — compute in Python from fetched users
        pro_rows = (await db.execute(
            select(User)
            .where(and_(User.is_premium == True, User.premium_until > now))
            .order_by(User.updated_at.desc())
        )).scalars().all()

        avg_pro_days = 0
        if pro_rows:
            total_days = sum((now - u.created_at).days for u in pro_rows if u.created_at)
            avg_pro_days = round(total_days / len(pro_rows), 1)

        # ── PRO Growth (last 12 weeks — single query) ──

        twelve_weeks_ago = today_start - timedelta(days=84)
        growth_rows = (await db.execute(
            select(
                func.date(User.created_at).label("d"),
                func.count(User.id).label("cnt"),
            )
            .where(and_(
                User.is_premium == True,
                User.created_at >= twelve_weeks_ago,
            ))
            .group_by(func.date(User.created_at))
            .order_by(func.date(User.created_at))
        )).all()

        # Build weekly buckets
        growth_weekly = []
        for weeks_ago in range(11, -1, -1):
            week_start = today_start - timedelta(days=7 * (weeks_ago + 1))
            week_end = today_start - timedelta(days=7 * weeks_ago)
            # Count PRO users that existed at week_end: created before week_end, premium valid past week_start
            count = sum(1 for u in pro_rows if u.created_at and u.created_at < week_end)
            # Also add churned users who were active then
            growth_weekly.append({
                "week": week_start.strftime("%m/%d"),
                "pro_count": count,
            })

        # ── PRO vs Free Engagement ──

        pro_user_ids = [u.id for u in pro_rows]
        free_users = max(total_users - active_pro, 1)

        pro_ai_sessions = 0
        free_ai_sessions = 0
        pro_support_sessions = 0
        free_support_sessions = 0

        if pro_user_ids:
            pro_ai_sessions = (await db.execute(
                select(func.count(func.distinct(AIChatMessage.session_id)))
                .where(AIChatMessage.user_id.in_(pro_user_ids))
            )).scalar() or 0

            pro_support_sessions = (await db.execute(
                select(func.count(func.distinct(SupportChatMessage.session_id)))
                .where(SupportChatMessage.user_id.in_(pro_user_ids))
            )).scalar() or 0

        # Free engagement (total - pro)
        total_ai_sessions = (await db.execute(
            select(func.count(func.distinct(AIChatMessage.session_id)))
        )).scalar() or 0
        free_ai_sessions = total_ai_sessions - pro_ai_sessions

        total_support_sess = (await db.execute(
            select(func.count(func.distinct(SupportChatMessage.session_id)))
        )).scalar() or 0
        free_support_sessions = total_support_sess - pro_support_sessions

        pro_predictions_avg = round(sum(u.total_predictions or 0 for u in pro_rows) / max(len(pro_rows), 1), 1)

        free_pred_sum = (await db.execute(
            select(func.sum(User.total_predictions))
            .where((User.is_premium == False) | (User.premium_until.is_(None)) | (User.premium_until <= now))
        )).scalar() or 0
        free_predictions_avg = round(float(free_pred_sum) / free_users, 1)

        engagement = {
            "pro": {
                "avg_ai_sessions": round(pro_ai_sessions / max(active_pro, 1), 1),
                "avg_support_sessions": round(pro_support_sessions / max(active_pro, 1), 1),
                "avg_predictions": pro_predictions_avg,
            },
            "free": {
                "avg_ai_sessions": round(free_ai_sessions / free_users, 1),
                "avg_support_sessions": round(free_support_sessions / free_users, 1),
                "avg_predictions": free_predictions_avg,
            },
        }

        # ── Daily PRO Activity (last 30 days — single query) ──

        daily_rows = (await db.execute(
            select(
                func.date(User.updated_at).label("d"),
                func.count(User.id).label("cnt"),
            )
            .where(and_(
                User.is_premium == True,
                User.updated_at >= month_ago,
            ))
            .group_by(func.date(User.updated_at))
            .order_by(func.date(User.updated_at))
        )).all()
        daily_map = {str(r[0]): r[1] for r in daily_rows}

        daily_activity = []
        for days_ago in range(29, -1, -1):
            d = (today_start - timedelta(days=days_ago))
            daily_activity.append({
                "date": d.strftime("%m/%d"),
                "active_pro": daily_map.get(str(d.date()), 0),
            })

        # ── Build PRO users list (with batch engagement) ──

        ai_per_user = {}
        support_per_user = {}
        if pro_user_ids:
            ai_rows = (await db.execute(
                select(AIChatMessage.user_id, func.count(func.distinct(AIChatMessage.session_id)).label("cnt"))
                .where(AIChatMessage.user_id.in_(pro_user_ids))
                .group_by(AIChatMessage.user_id)
            )).all()
            ai_per_user = {r[0]: r[1] for r in ai_rows}

            sup_rows = (await db.execute(
                select(SupportChatMessage.user_id, func.count(func.distinct(SupportChatMessage.session_id)).label("cnt"))
                .where(SupportChatMessage.user_id.in_(pro_user_ids))
                .group_by(SupportChatMessage.user_id)
            )).all()
            support_per_user = {r[0]: r[1] for r in sup_rows}

        pro_users_list = []
        for u in pro_rows:
            days_as_pro = (now - u.created_at).days if u.created_at else 0
            days_remaining = (u.premium_until - now).days if u.premium_until else 0
            last_active_ago = (now - u.updated_at).total_seconds() / 3600 if u.updated_at else 9999
            pro_users_list.append({
                "id": u.id,
                "public_id": u.public_id,
                "email": u.email,
                "phone": u.phone,
                "country": u.country,
                "language": u.language,
                "total_predictions": u.total_predictions or 0,
                "correct_predictions": u.correct_predictions or 0,
                "accuracy": round((u.correct_predictions or 0) / u.total_predictions * 100, 1) if u.total_predictions else 0,
                "ai_sessions": ai_per_user.get(u.id, 0),
                "support_sessions": support_per_user.get(u.id, 0),
                "days_as_pro": days_as_pro,
                "days_remaining": days_remaining,
                "premium_until": u.premium_until.isoformat() if u.premium_until else None,
                "last_active_hours_ago": round(last_active_ago, 1),
                "risk_level": u.risk_level,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            })

        at_risk = [u for u in pro_users_list if 0 < u["days_remaining"] <= 7]

        # ── Recently Churned ──

        churned_rows = (await db.execute(
            select(User).where(
                and_(User.is_premium == True, User.premium_until <= now, User.premium_until >= month_ago)
            ).order_by(User.premium_until.desc()).limit(50)
        )).scalars().all()

        churned_list = [{
            "id": u.id, "public_id": u.public_id, "email": u.email, "phone": u.phone,
            "country": u.country, "total_predictions": u.total_predictions or 0,
            "expired_at": u.premium_until.isoformat() if u.premium_until else None,
            "days_since_expiry": (now - u.premium_until).days if u.premium_until else 0,
            "last_active_hours_ago": round((now - u.updated_at).total_seconds() / 3600, 1) if u.updated_at else 9999,
        } for u in churned_rows]

        # ── PRO by Country ──

        pro_country_rows = (await db.execute(
            select(User.country, func.count(User.id).label("cnt"))
            .where(and_(User.is_premium == True, User.premium_until > now, User.country.isnot(None)))
            .group_by(User.country).order_by(func.count(User.id).desc()).limit(10)
        )).all()
        pro_by_country = [{"country": r[0], "count": r[1]} for r in pro_country_rows]

        return {
            "overview": {
                "active_pro": active_pro,
                "total_users": total_users,
                "pro_percent": round(active_pro / total_users * 100, 1) if total_users > 0 else 0,
                "new_pro_week": new_pro_week,
                "new_pro_month": new_pro_month,
                "churned_month": churned_month,
                "avg_pro_days": avg_pro_days,
            },
            "growth_weekly": growth_weekly,
            "engagement": engagement,
            "daily_activity": daily_activity,
            "pro_users": pro_users_list,
            "at_risk": at_risk,
            "churned": churned_list,
            "pro_by_country": pro_by_country,
        }
    except Exception as e:
        logger.error(f"PRO analytics error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"PRO analytics error: {str(e)}")


# ── Traffic Sources Analytics ──────────────────────────────────────────


@router.get("/traffic")
async def get_traffic_analytics(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Traffic source analytics — registrations, conversions, retention by source."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    try:
        # ── Overview: users by source (raw SQL to avoid PG GROUP BY issues) ──
        source_rows = (await db.execute(text("""
            SELECT
                COALESCE(traffic_source, 'sportscoreai') AS src,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE is_premium = true AND premium_until > :now) AS pro,
                COUNT(*) FILTER (WHERE total_predictions > 0) AS activated
            FROM users
            GROUP BY COALESCE(traffic_source, 'sportscoreai')
            ORDER BY COUNT(*) DESC
        """), {"now": now})).all()

        total_all = sum(r[1] for r in source_rows) or 1

        by_source = [
            {
                "source": r[0],
                "total": r[1],
                "percent": round(r[1] / total_all * 100, 1),
                "pro": r[2],
                "conversion_pct": round(r[2] / r[1] * 100, 1) if r[1] > 0 else 0,
                "activated": r[3],
                "activation_pct": round(r[3] / r[1] * 100, 1) if r[1] > 0 else 0,
            }
            for r in source_rows
        ]

        # ── Daily registrations by source (last 30 days) ──
        daily_rows = (await db.execute(text("""
            SELECT
                created_at::date AS day,
                COALESCE(traffic_source, 'sportscoreai') AS src,
                COUNT(*) AS cnt
            FROM users
            WHERE created_at >= :since
            GROUP BY created_at::date, COALESCE(traffic_source, 'sportscoreai')
            ORDER BY created_at::date
        """), {"since": month_ago})).all()

        daily_by_source = [
            {"date": str(r[0]), "source": r[1], "count": r[2]}
            for r in daily_rows
        ]

        # ── New this week / month per source ──
        week_rows = (await db.execute(text("""
            SELECT COALESCE(traffic_source, 'sportscoreai') AS src, COUNT(*) AS cnt
            FROM users WHERE created_at >= :since
            GROUP BY COALESCE(traffic_source, 'sportscoreai')
            ORDER BY cnt DESC
        """), {"since": week_ago})).all()
        new_week = [{"source": r[0], "count": r[1]} for r in week_rows]

        month_rows = (await db.execute(text("""
            SELECT COALESCE(traffic_source, 'sportscoreai') AS src, COUNT(*) AS cnt
            FROM users WHERE created_at >= :since
            GROUP BY COALESCE(traffic_source, 'sportscoreai')
            ORDER BY cnt DESC
        """), {"since": month_ago})).all()
        new_month = [{"source": r[0], "count": r[1]} for r in month_rows]

        # ── Retention by source (week-1 return rate) ──
        cohort_start = today_start - timedelta(days=14)
        cohort_end = today_start - timedelta(days=7)

        ret_rows = (await db.execute(text("""
            SELECT
                COALESCE(traffic_source, 'sportscoreai') AS src,
                COUNT(*) AS registered,
                COUNT(*) FILTER (WHERE updated_at >= :cohort_end) AS returned
            FROM users
            WHERE created_at >= :cohort_start AND created_at < :cohort_end
            GROUP BY COALESCE(traffic_source, 'sportscoreai')
        """), {"cohort_start": cohort_start, "cohort_end": cohort_end})).all()

        retention_by_source = [
            {
                "source": r[0],
                "registered": r[1],
                "returned": r[2],
                "retention_pct": round(r[2] / r[1] * 100, 1) if r[1] > 0 else 0,
            }
            for r in ret_rows
        ]

        # ── Country breakdown per source ──
        country_rows = (await db.execute(text("""
            SELECT
                COALESCE(traffic_source, 'sportscoreai') AS src,
                country,
                COUNT(*) AS cnt
            FROM users
            WHERE country IS NOT NULL
            GROUP BY COALESCE(traffic_source, 'sportscoreai'), country
            ORDER BY cnt DESC
            LIMIT 30
        """))).all()

        by_source_country = [
            {"source": r[0], "country": r[1], "count": r[2]}
            for r in country_rows
        ]

        return {
            "by_source": by_source,
            "daily_by_source": daily_by_source,
            "new_week": new_week,
            "new_month": new_month,
            "retention_by_source": retention_by_source,
            "by_source_country": by_source_country,
        }
    except Exception as e:
        logger.error(f"Traffic analytics error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Traffic analytics error: {str(e)}")


# ── Postback Logs ──────────────────────────────────────────────────


@router.get("/postback-logs")
async def get_postback_logs(
    q: str = Query("", max_length=100),
    source: Optional[str] = Query(None),
    event: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get postback logs for admin dashboard."""
    from sqlalchemy import desc

    query = select(PostbackLog)
    count_q = select(func.count(PostbackLog.id))

    if q.strip():
        s = f"%{q.strip()}%"
        f = PostbackLog.user_id.ilike(s) | PostbackLog.click_id.ilike(s) | PostbackLog.transaction_id.ilike(s)
        query = query.where(f)
        count_q = count_q.where(f)

    if source:
        query = query.where(PostbackLog.source == source)
        count_q = count_q.where(PostbackLog.source == source)

    if event:
        query = query.where(PostbackLog.event == event)
        count_q = count_q.where(PostbackLog.event == event)

    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * per_page
    rows = (await db.execute(
        query.order_by(desc(PostbackLog.created_at)).limit(per_page).offset(offset)
    )).scalars().all()

    logs = [
        {
            "id": l.id,
            "user_id": l.user_id,
            "user_db_id": l.user_db_id,
            "source": l.source,
            "click_id": l.click_id,
            "transaction_id": l.transaction_id,
            "event": l.event,
            "amount": l.amount,
            "currency": l.currency,
            "country": l.country,
            "premium_activated": l.premium_activated,
            "error": l.error,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in rows
    ]

    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)
    today_count = (await db.execute(
        select(func.count(PostbackLog.id)).where(PostbackLog.created_at >= day_ago)
    )).scalar() or 0
    activated_count = (await db.execute(
        select(func.count(PostbackLog.id)).where(PostbackLog.premium_activated == True)
    )).scalar() or 0

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "logs": logs,
        "summary": {
            "total_all_time": (await db.execute(select(func.count(PostbackLog.id)))).scalar() or 0,
            "last_24h": today_count,
            "total_activated": activated_count,
        },
    }


# ── Banner Click Analytics ──────────────────────────────────────────


@router.get("/banner-clicks")
async def get_banner_clicks_stats(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Banner click analytics — clicks by banner, daily trends."""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    try:
        # Clicks per banner (all time)
        banner_rows = (await db.execute(text("""
            SELECT banner, COUNT(*) AS clicks, COUNT(DISTINCT user_id) AS unique_users
            FROM banner_clicks
            GROUP BY banner
            ORDER BY clicks DESC
        """))).all()

        by_banner = [
            {"banner": r[0], "clicks": r[1], "unique_users": r[2]}
            for r in banner_rows
        ]

        # Clicks per banner (last 7 days)
        week_rows = (await db.execute(text("""
            SELECT banner, COUNT(*) AS clicks
            FROM banner_clicks
            WHERE created_at >= :since
            GROUP BY banner
            ORDER BY clicks DESC
        """), {"since": week_ago})).all()

        week_by_banner = [{"banner": r[0], "clicks": r[1]} for r in week_rows]

        # Daily clicks (last 30 days)
        daily_rows = (await db.execute(text("""
            SELECT created_at::date AS day, COUNT(*) AS clicks
            FROM banner_clicks
            WHERE created_at >= :since
            GROUP BY created_at::date
            ORDER BY created_at::date
        """), {"since": month_ago})).all()

        daily = [{"date": str(r[0]), "clicks": r[1]} for r in daily_rows]

        # Total stats
        total_clicks = (await db.execute(
            select(func.count(BannerClick.id))
        )).scalar() or 0
        total_today = (await db.execute(
            select(func.count(BannerClick.id)).where(
                BannerClick.created_at >= now.replace(hour=0, minute=0, second=0, microsecond=0)
            )
        )).scalar() or 0

        return {
            "by_banner": by_banner,
            "week_by_banner": week_by_banner,
            "daily": daily,
            "total_clicks": total_clicks,
            "total_today": total_today,
        }
    except Exception as e:
        logger.error(f"Banner clicks analytics error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Banner analytics error: {str(e)}")
