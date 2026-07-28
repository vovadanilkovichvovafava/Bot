"""
Admin stats API — dashboard data, user analytics, predictions overview.
All endpoints require admin authentication.
"""

import logging
import os
import time
from datetime import date, datetime, timedelta, timezone
from typing import Optional, Any, Dict, List, Tuple

from fastapi import APIRouter, Depends, Query, Body, HTTPException
from sqlalchemy import select, func, case, and_, or_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.admin_auth import get_current_admin, require_admin_role
from app.models.user import User
from app.models.prediction import Prediction
from app.models.support_chat import SupportChatMessage
from app.models.ai_chat import AIChatMessage
from app.models.ml_models import MLModel, ROIAnalytics, LearningLog
from app.models.postback_log import PostbackLog
from app.models.banner_click import BannerClick

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Simple TTL cache for heavy admin queries ────────────────────────────
# Avoids re-running 15+ expensive SQL queries every time the dashboard refreshes.
_admin_cache: Dict[str, Tuple[float, Any]] = {}
ADMIN_CACHE_TTL = 60  # 60 seconds — fresh enough for a dashboard


def _cache_get(key: str) -> Any:
    """Return cached value if still valid, else None."""
    entry = _admin_cache.get(key)
    if entry and time.time() - entry[0] < ADMIN_CACHE_TTL:
        return entry[1]
    return None


def _cache_set(key: str, value: Any) -> None:
    _admin_cache[key] = (time.time(), value)

def _fill_daily_gaps(rows: List[dict], days: int = 30, value_key: str = "count") -> List[dict]:
    """Fill missing dates with 0 so charts always show all days including today."""
    today = date.today()
    by_date = {r["date"]: r for r in rows}
    result = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        ds = str(d)
        if ds in by_date:
            result.append(by_date[ds])
        else:
            result.append({"date": ds, value_key: 0})
    return result


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
    cached = _cache_get("overview")
    if cached is not None:
        return cached

    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    yesterday_start = today_start - timedelta(days=1)
    tomorrow_start = today_start + timedelta(days=1)
    online_cutoff = now - timedelta(minutes=15)

    # Defaults in case any query fails
    user_data = {"total": 0, "pro": 0, "pro_new_today": 0, "new_today": 0, "new_week": 0, "online": 0}
    pred_data = {"total": 0, "verified": 0, "correct": 0, "accuracy": 0.0, "today": 0, "yesterday": 0}
    ai_chats_today = 0
    ai_chats_yesterday = 0
    support_sessions = 0
    support_sessions_today = 0

    # ── Users ──
    try:
        pro_window_start = today_start + timedelta(days=15)
        pro_window_end = tomorrow_start + timedelta(days=15)
        user_stats = (await db.execute(text("""
            SELECT
                COUNT(*) AS total_users,
                COUNT(*) FILTER (WHERE is_premium = true AND premium_until > :now) AS pro_users,
                COUNT(*) FILTER (WHERE created_at >= :today) AS new_today,
                COUNT(*) FILTER (WHERE created_at >= :week_ago) AS new_week,
                COUNT(*) FILTER (
                    WHERE is_premium = true
                    AND premium_until >= :pro_start
                    AND premium_until < :pro_end
                ) AS pro_new_today
            FROM users
        """), {
            "now": now,
            "today": today_start,
            "week_ago": week_ago,
            "pro_start": pro_window_start,
            "pro_end": pro_window_end,
        })).one()
        user_data = {
            "total": user_stats[0],
            "pro": user_stats[1],
            "pro_new_today": user_stats[4],
            "new_today": user_stats[2],
            "new_week": user_stats[3],
            "online": 0,  # filled from analytics below
        }
    except Exception as e:
        logger.error(f"Overview: users query failed: {e}")
        await db.rollback()

    # ── Predictions ──
    try:
        pred_stats = (await db.execute(text("""
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE is_correct IS NOT NULL) AS verified,
                COUNT(*) FILTER (WHERE is_correct = true) AS correct,
                COUNT(*) FILTER (WHERE created_at >= :today) AS today_cnt,
                COUNT(*) FILTER (WHERE created_at >= :yesterday AND created_at < :today) AS yesterday_cnt
            FROM predictions
        """), {"today": today_start, "yesterday": yesterday_start})).one()
        verified_cnt = pred_stats[1] or 0
        correct_cnt = pred_stats[2] or 0
        pred_data = {
            "total": pred_stats[0],
            "verified": verified_cnt,
            "correct": correct_cnt,
            "accuracy": round((correct_cnt / verified_cnt * 100), 1) if verified_cnt > 0 else 0.0,
            "today": pred_stats[3],
            "yesterday": pred_stats[4],
        }
    except Exception as e:
        logger.error(f"Overview: predictions query failed: {e}")
        await db.rollback()

    # WC group predictions + AI-chat questions also count as "predictions" on the
    # dashboard (verified/accuracy stay from the predictions table only).
    for label, sql in (
        ("wc_predictions", "SELECT COUNT(*) AS t, COUNT(*) FILTER (WHERE created_at >= :today) AS td, COUNT(*) FILTER (WHERE created_at >= :yesterday AND created_at < :today) AS yd FROM wc_predictions"),
        ("ai_chat", "SELECT COUNT(*) AS t, COUNT(*) FILTER (WHERE created_at >= :today) AS td, COUNT(*) FILTER (WHERE created_at >= :yesterday AND created_at < :today) AS yd FROM ai_chat_messages WHERE role = 'user'"),
    ):
        try:
            r = (await db.execute(text(sql), {"today": today_start, "yesterday": yesterday_start})).one()
            pred_data["total"] = (pred_data.get("total") or 0) + (r[0] or 0)
            pred_data["today"] = (pred_data.get("today") or 0) + (r[1] or 0)
            pred_data["yesterday"] = (pred_data.get("yesterday") or 0) + (r[2] or 0)
        except Exception as e:
            logger.warning(f"Overview: {label} count failed: {e}")
            await db.rollback()

    # ── Chat/support + online ──
    try:
        chat_stats = (await db.execute(text("""
            SELECT
                (SELECT COUNT(*) FROM ai_chat_messages WHERE created_at >= :today AND role = 'user'),
                (SELECT COUNT(*) FROM ai_chat_messages WHERE created_at >= :yesterday AND created_at < :today AND role = 'user'),
                (SELECT COUNT(DISTINCT session_id) FROM support_chat_messages),
                (SELECT COUNT(DISTINCT session_id) FROM support_chat_messages WHERE created_at >= :today),
                (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= :online_cutoff AND user_id IS NOT NULL)
        """), {"today": today_start, "yesterday": yesterday_start, "online_cutoff": online_cutoff})).one()
        ai_chats_today = chat_stats[0]
        ai_chats_yesterday = chat_stats[1]
        support_sessions = chat_stats[2]
        support_sessions_today = chat_stats[3]
        user_data["online"] = chat_stats[4]
    except Exception as e:
        logger.error(f"Overview: chat/online query failed: {e}")
        await db.rollback()

    # Football API usage today
    football_api_today = await _get_football_api_status()

    result = {
        "users": user_data,
        "predictions": pred_data,
        "ai_chats_today": ai_chats_today,
        "ai_chats_yesterday": ai_chats_yesterday,
        "support_sessions": support_sessions,
        "support_sessions_today": support_sessions_today,
        "football_api": football_api_today,
    }
    _cache_set("overview", result)
    return result


@router.get("/online-history")
async def get_online_history(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Unique active users per hour for the last 24 hours (from analytics_events)."""
    cached = _cache_get("online_history")
    if cached is not None:
        return cached

    now = datetime.now()
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

        result = {
            "hours": hours,
            "peak_users": peak_users,
            "peak_hour": peak_hour,
            "current_online": (await db.execute(
                text("SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= :cutoff AND user_id IS NOT NULL"),
                {"cutoff": now - timedelta(minutes=15)},
            )).scalar() or 0,
        }
        _cache_set("online_history", result)
        return result
    except Exception as e:
        logger.error(f"Online history error: {e}")
        return {"hours": [], "peak_users": 0, "peak_hour": None, "current_online": 0}


@router.get("/users")
async def get_users_stats(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Detailed user analytics."""
    cached = _cache_get("users_stats")
    if cached is not None:
        return cached

    now = datetime.now()

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
    daily_registrations = _fill_daily_gaps(
        [{"date": str(r[0]), "count": r[1]} for r in growth_rows], days=30
    )

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
    # Ensure today is present even if no registrations yet
    today_str = str(date.today())
    if not any(r["date"] == today_str for r in daily_by_country):
        daily_by_country.insert(0, {"date": today_str, "country": "—", "count": 0})

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
            "funnel": u.funnel or "funnel-1",
            "total_predictions": u.total_predictions,
            "correct_predictions": u.correct_predictions,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in recent_rows
    ]

    # Users by funnel
    funnel_rows = (await db.execute(
        select(User.funnel, func.count(User.id).label("cnt"))
        .group_by(User.funnel)
        .order_by(func.count(User.id).desc())
    )).all()
    by_funnel = [{"funnel": r[0] or "funnel-1", "count": r[1]} for r in funnel_rows]

    result = {
        "by_country": by_country,
        "by_language": by_language,
        "by_funnel": by_funnel,
        "daily_registrations": daily_registrations,
        "daily_by_country": daily_by_country,
        "total_referred": total_referred,
        "recent_users": recent_users,
    }
    _cache_set("users_stats", result)
    return result


@router.get("/users/deeplink-split")
async def get_deeplink_split(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Italian users split by use_deeplink (old vs new)."""

    # Total Italian users
    total_it = (await db.execute(
        select(func.count(User.id)).where(User.country == "IT")
    )).scalar() or 0

    # Old Italian users (use_deeplink=True → go to match deeplinks)
    old_it = (await db.execute(
        select(func.count(User.id)).where(
            User.country == "IT", User.use_deeplink == True
        )
    )).scalar() or 0

    # New Italian users (use_deeplink=False → go to offer)
    new_it = (await db.execute(
        select(func.count(User.id)).where(
            User.country == "IT", User.use_deeplink == False
        )
    )).scalar() or 0

    # Recent old Italian users (last 20)
    old_rows = (await db.execute(
        select(User)
        .where(User.country == "IT", User.use_deeplink == True)
        .order_by(User.created_at.desc())
        .limit(20)
    )).scalars().all()

    # Recent new Italian users (last 20)
    new_rows = (await db.execute(
        select(User)
        .where(User.country == "IT", User.use_deeplink == False)
        .order_by(User.created_at.desc())
        .limit(20)
    )).scalars().all()

    def user_dict(u):
        return {
            "id": u.id,
            "public_id": u.public_id,
            "email": u.email,
            "phone": u.phone,
            "is_premium": u.is_premium,
            "use_deeplink": u.use_deeplink,
            "total_predictions": u.total_predictions,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }

    return {
        "total_italian": total_it,
        "old_users": old_it,
        "new_users": new_it,
        "old_users_list": [user_dict(u) for u in old_rows],
        "new_users_list": [user_dict(u) for u in new_rows],
    }


@router.get("/retention")
async def get_retention_stats(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retention cohorts and Free->PRO conversion metrics."""
    cached = _cache_get("retention")
    if cached is not None:
        return cached

    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_ago = now - timedelta(days=30)

    # ── Weekly cohorts: 1 query instead of 32 ──
    cohort_start_oldest = today_start - timedelta(days=7 * 8)
    cohort_rows = (await db.execute(text("""
        WITH cohort AS (
            SELECT
                id, created_at, updated_at, is_premium, total_predictions,
                FLOOR(EXTRACT(EPOCH FROM (:today - created_at)) / (7 * 86400))::int AS weeks_ago
            FROM users
            WHERE created_at >= :oldest AND created_at < :today
        )
        SELECT
            weeks_ago,
            COUNT(*) AS registered,
            COUNT(*) FILTER (WHERE updated_at >= created_at + interval '7 days') AS returned,
            COUNT(*) FILTER (WHERE is_premium = true) AS converted_pro,
            COUNT(*) FILTER (WHERE total_predictions > 0) AS made_prediction
        FROM cohort
        WHERE weeks_ago BETWEEN 0 AND 7
        GROUP BY weeks_ago
        ORDER BY weeks_ago DESC
    """), {"today": today_start, "oldest": cohort_start_oldest})).all()

    cohort_map = {r[0]: r for r in cohort_rows}
    cohorts = []
    for weeks_ago in range(8):
        cohort_start = today_start - timedelta(days=7 * (weeks_ago + 1))
        r = cohort_map.get(weeks_ago + 1)  # weeks_ago=1 means last week
        if not r or r[1] == 0:
            cohorts.append({
                "week": cohort_start.strftime("%m/%d"),
                "registered": 0, "returned_week1": 0,
                "converted_pro": 0, "made_prediction": 0,
            })
        else:
            total = r[1]
            cohorts.append({
                "week": cohort_start.strftime("%m/%d"),
                "registered": total,
                "returned_week1": r[2],
                "retention_pct": round(r[2] / total * 100, 1),
                "converted_pro": r[3],
                "conversion_pct": round(r[3] / total * 100, 1),
                "made_prediction": r[4],
                "activation_pct": round(r[4] / total * 100, 1),
            })
    cohorts.reverse()

    # ── Overall + 30d funnel: 1 query instead of 6 ──
    overall = (await db.execute(text("""
        SELECT
            COUNT(*) AS total_users,
            COUNT(*) FILTER (WHERE is_premium = true AND premium_until > :now) AS total_pro,
            COUNT(*) FILTER (WHERE total_predictions > 0) AS total_activated,
            COUNT(*) FILTER (WHERE created_at >= :month_ago) AS new_30d,
            COUNT(*) FILTER (WHERE created_at >= :month_ago AND is_premium = true) AS pro_30d,
            COUNT(*) FILTER (WHERE created_at >= :month_ago AND total_predictions > 0) AS activated_30d
        FROM users
    """), {"now": now, "month_ago": month_ago})).one()

    total_users = overall[0] or 1

    result = {
        "cohorts": cohorts,
        "overall": {
            "total_users": overall[0],
            "total_pro": overall[1],
            "conversion_rate": round(overall[1] / total_users * 100, 1),
            "activation_rate": round(overall[2] / total_users * 100, 1),
        },
        "funnel_30d": {
            "registered": overall[3],
            "activated": overall[5],
            "converted_pro": overall[4],
        },
    }
    _cache_set("retention", result)
    return result


@router.get("/users/export-csv")
async def export_users_csv(
    status: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    admin: dict = Depends(require_admin_role("owner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Export users as CSV file."""
    from fastapi.responses import StreamingResponse
    import csv
    import io

    now = datetime.now()
    query = select(User).order_by(User.created_at.desc())

    if status == "pro":
        query = query.where(and_(User.is_premium == True, User.premium_until > now))
    elif status == "free":
        query = query.where((User.is_premium == False) | (User.premium_until <= now) | (User.premium_until.is_(None)))
    elif status == "banned":
        query = query.where(User.is_banned == True)

    if country:
        query = query.where(User.country == country)

    if domain:
        query = query.where(User.email.ilike(f"%@{domain}"))

    rows = (await db.execute(query)).scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Public ID", "Email", "Phone", "Username", "Country", "Language",
        "Traffic Source", "PRO", "Premium Until", "Banned",
        "Predictions", "Correct", "Accuracy %",
        "Referral Code", "Registered",
    ])
    for u in rows:
        is_pro = u.is_premium and u.premium_until and u.premium_until > now
        accuracy = round(u.correct_predictions / u.total_predictions * 100, 1) if u.total_predictions else 0
        writer.writerow([
            u.id, u.public_id, u.email, u.phone or "", u.username or "",
            u.country or "", u.language or "",
            u.traffic_source or "", "Yes" if is_pro else "No",
            u.premium_until.isoformat() if u.premium_until else "",
            "Yes" if u.is_banned else "No",
            u.total_predictions, u.correct_predictions, accuracy,
            u.referral_code or "",
            u.created_at.isoformat() if u.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=users_export_{now.strftime('%Y%m%d_%H%M')}.csv"},
    )


@router.get("/users/email-domains")
async def get_email_domains(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get list of unique email domains for filtering."""
    domain_expr = func.split_part(User.email, '@', 2).label("domain")
    result = await db.execute(
        select(
            domain_expr,
            func.count(User.id).label("cnt"),
        )
        .where(User.email.isnot(None))
        .group_by(text("domain"))
        .order_by(text("cnt DESC"))
    )
    rows = result.all()
    return {"domains": [{"domain": r.domain, "count": r.cnt} for r in rows if r.domain]}


@router.get("/users/recent-registrations")
async def get_recent_registrations(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get registrations for today and yesterday with user details."""
    now = datetime.now()
    today_start = datetime.combine(now.date(), datetime.min.time())
    yesterday_start = today_start - timedelta(days=1)

    result = await db.execute(
        select(
            User.id,
            User.phone,
            User.email,
            User.username,
            User.country,
            User.traffic_source,
            User.is_premium,
            User.created_at,
        )
        .where(User.created_at >= yesterday_start)
        .order_by(User.created_at.desc())
    )
    rows = result.all()

    today = []
    yesterday = []
    for r in rows:
        entry = {
            "id": r.id,
            "phone": r.phone,
            "email": r.email,
            "username": r.username,
            "country": r.country,
            "source": r.traffic_source,
            "is_premium": r.is_premium,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "time": r.created_at.strftime("%H:%M") if r.created_at else None,
        }
        if r.created_at >= today_start:
            today.append(entry)
        else:
            yesterday.append(entry)

    return {
        "today": today,
        "today_count": len(today),
        "yesterday": yesterday,
        "yesterday_count": len(yesterday),
        "today_date": str(now.date()),
        "yesterday_date": str((now - timedelta(days=1)).date()),
    }


@router.get("/users/search")
async def search_users(
    q: str = Query("", max_length=100),
    status: Optional[str] = Query(None),  # pro, free
    country: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),  # email domain filter (e.g. gmail.com)
    funnel: Optional[str] = Query(None),  # funnel-1, funnel-2, funnel-3
    sort: str = Query("created_at"),  # created_at, total_predictions
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Search users by phone, email, public_id, username."""
    now = datetime.now()
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

    # Email domain filter
    if domain:
        domain_filter = User.email.ilike(f"%@{domain}")
        query = query.where(domain_filter)
        count_query = count_query.where(domain_filter)

    # Funnel filter
    if funnel:
        query = query.where(User.funnel == funnel)
        count_query = count_query.where(User.funnel == funnel)

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
            "domain": u.email.split("@")[1] if u.email and "@" in u.email else None,
            "username": u.username,
            "country": u.country,
            "language": u.language,
            "is_premium": u.is_premium,
            "premium_until": u.premium_until.isoformat() if u.premium_until else None,
            "funnel": u.funnel or "funnel-1",
            "total_predictions": u.total_predictions,
            "correct_predictions": u.correct_predictions,
            "daily_requests": u.daily_requests,
            "daily_limit": u.daily_limit,
            "referral_code": u.referral_code,
            "is_banned": u.is_banned,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in rows
    ]

    return {"total": total, "page": page, "per_page": per_page, "users": users}


@router.get("/users/funnel-stats")
async def get_funnel_stats(
    days: Optional[int] = Query(None, ge=1, le=365,
                                description="Only count users registered in the last N days"),
    date_from: Optional[str] = Query(None, description="Start date, YYYY-MM-DD (inclusive)"),
    date_to: Optional[str] = Query(None, description="End date, YYYY-MM-DD (inclusive)"),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """A/B funnel comparison: user counts, engagement, and conversion per funnel.

    Supports a signup-date window so a campaign can be judged on its own days
    instead of drowning in the whole historical pool (asked for on the 28.07 call:
    "I need to compare how these funnels performed over the 3 days I ran traffic").
    Pass either `days` (rolling window) or `date_from`/`date_to` (explicit range).
    """
    # Each window is cached separately — otherwise switching the filter would
    # keep serving the previously cached period.
    cache_key = f"funnel_stats:{days or ''}:{date_from or ''}:{date_to or ''}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    now = datetime.now()

    where = ["funnel IN ('funnel-1', 'funnel-2', 'funnel-3', 'funnel-5', 'funnel-6', 'funnel-7')"]
    params: dict = {"now": now}

    if days:
        where.append("created_at >= :period_start")
        params["period_start"] = now - timedelta(days=days)
    else:
        if date_from:
            try:
                params["period_start"] = datetime.strptime(date_from, "%Y-%m-%d")
                where.append("created_at >= :period_start")
            except ValueError:
                raise HTTPException(status_code=400, detail="date_from must be YYYY-MM-DD")
        if date_to:
            try:
                # inclusive end date → everything before the next midnight
                params["period_end"] = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
                where.append("created_at < :period_end")
            except ValueError:
                raise HTTPException(status_code=400, detail="date_to must be YYYY-MM-DD")

    # ── All funnels in 1 query instead of 15 ──
    funnel_rows = (await db.execute(text(f"""
        SELECT
            funnel,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE is_premium = true AND premium_until > :now) AS premium,
            COUNT(*) FILTER (WHERE total_predictions > 0) AS active,
            COUNT(*) FILTER (WHERE daily_chat_requests > 0) AS with_chat,
            COALESCE(AVG(total_predictions) FILTER (WHERE total_predictions > 0), 0) AS avg_preds
        FROM users
        WHERE {' AND '.join(where)}
        GROUP BY funnel
        ORDER BY funnel
    """), params)).all()

    stats = []
    for r in funnel_rows:
        total = r[1] or 1
        stats.append({
            "funnel": r[0],
            "total_users": r[1],
            "premium_users": r[2],
            "active_users": r[3],
            "users_with_chat": r[4],
            "conversion_rate": round(r[2] / total * 100, 1),
            "activation_rate": round(r[3] / total * 100, 1),
            "chat_usage_rate": round(r[4] / total * 100, 1),
            "avg_predictions": round(float(r[5]), 1),
        })

    result = {
        "funnels": stats,
        "period": {
            "days": days,
            "date_from": date_from,
            "date_to": date_to,
        },
    }
    _cache_set(cache_key, result)
    return result


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

    now = datetime.now()

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
            "funnel": user.funnel or "funnel-1",
            "risk_level": user.risk_level,
            "min_odds": user.min_odds,
            "max_odds": user.max_odds,
            "is_banned": user.is_banned,
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
    admin: dict = Depends(require_admin_role("owner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Toggle premium status for a user (admin action)."""
    from fastapi import HTTPException
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_premium and user.premium_until and user.premium_until > datetime.now():
        # Deactivate
        user.is_premium = False
        user.premium_until = None
        action = "deactivated"
    else:
        # Activate
        user.is_premium = True
        user.premium_until = datetime.now() + timedelta(days=days)
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


@router.post("/users/{user_id}/toggle-ban")
async def toggle_user_ban(
    user_id: int,
    admin: dict = Depends(require_admin_role("owner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Toggle ban status for a user (admin action)."""
    from fastapi import HTTPException
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_banned = not user.is_banned
    action = "banned" if user.is_banned else "unbanned"

    await db.commit()

    return {
        "success": True,
        "action": action,
        "user_id": user.id,
        "public_id": user.public_id,
        "is_banned": user.is_banned,
    }


@router.get("/predictions/world-cup")
async def get_wc_prediction_stats(
    until: Optional[str] = Query(None),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """World Cup prediction accuracy, deduped to UNIQUE bets (match + bet type).

    The same bet saved for many users would otherwise inflate the count, so we
    take one row per (match_id, bet_type). Round/stage isn't stored, so the
    group stage is approximated with an optional `until` date cutoff (matches
    kicking off before the knockouts). Without `until`, all WC bets are counted.
    """
    wc = "(league_code = 'WC' OR league ILIKE '%world cup%')"
    params = {}
    date_clause = ""
    if until:
        date_clause = " AND COALESCE(match_date, match_time, created_at) < :until"
        params["until"] = until

    rows = (await db.execute(text(f"""
        SELECT DISTINCT ON (match_id, bet_type)
          match_id, home_team, away_team, bet_type,
          COALESCE(predicted_odds, odds) AS odds,
          confidence, is_correct,
          actual_home_score, actual_away_score,
          COALESCE(match_date, match_time, created_at) AS mdate
        FROM predictions
        WHERE {wc} AND is_correct IS NOT NULL{date_clause}
        ORDER BY match_id, bet_type, verified_at DESC NULLS LAST
    """), params)).all()

    total = len(rows)
    correct = sum(1 for r in rows if r.is_correct)
    accuracy = round(correct / total * 100, 1) if total else 0

    pending = (await db.execute(text(
        f"SELECT COUNT(DISTINCT (match_id, bet_type)) FROM predictions "
        f"WHERE {wc} AND is_correct IS NULL{date_clause}"
    ), params)).scalar() or 0

    bt = {}
    for r in rows:
        b = bt.setdefault(r.bet_type or "—", {"total": 0, "correct": 0})
        b["total"] += 1
        if r.is_correct:
            b["correct"] += 1
    by_bet_type = sorted(
        [
            {"bet_type": k, "total": v["total"], "correct": v["correct"],
             "accuracy": round(v["correct"] / v["total"] * 100, 1) if v["total"] else 0}
            for k, v in bt.items()
        ],
        key=lambda x: -x["total"],
    )

    bets = [
        {
            "match": f"{r.home_team} vs {r.away_team}",
            "bet_type": r.bet_type,
            "odds": round(r.odds, 2) if r.odds else None,
            "confidence": round(r.confidence) if r.confidence else None,
            "is_correct": r.is_correct,
            "score": (f"{r.actual_home_score}-{r.actual_away_score}"
                      if r.actual_home_score is not None and r.actual_away_score is not None else None),
            "date": r.mdate.isoformat() if r.mdate else None,
        }
        for r in sorted(rows, key=lambda r: (r.mdate or datetime.min), reverse=True)
    ]

    won_odds = [r.odds for r in rows if r.is_correct and r.odds]
    avg_winning_odds = round(sum(won_odds) / len(won_odds), 2) if won_odds else 0

    return {
        "total": total,
        "correct": correct,
        "wrong": total - correct,
        "accuracy": accuracy,
        "pending": pending,
        "avg_winning_odds": avg_winning_odds,
        "by_bet_type": by_bet_type,
        "bets": bets,
        "group_stage_until": until,
    }


@router.get("/predictions")
async def get_predictions_stats(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Prediction analytics."""
    now = datetime.now()

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

    # Daily predictions — last 30 days, combining match predictions + WC group
    # predictions + AI-chat questions. Per-table (each in its own try) so one
    # failing source can't blank out the whole chart.
    cutoff = now - timedelta(days=30)
    daily_map = {}
    for label, src_sql in (
        ("predictions", "SELECT (created_at)::date AS d, COUNT(*) AS c FROM predictions WHERE created_at >= :cutoff GROUP BY (created_at)::date"),
        ("wc_predictions", "SELECT (created_at)::date AS d, COUNT(*) AS c FROM wc_predictions WHERE created_at >= :cutoff GROUP BY (created_at)::date"),
        ("ai_chat", "SELECT (created_at)::date AS d, COUNT(*) AS c FROM ai_chat_messages WHERE role = 'user' AND created_at >= :cutoff GROUP BY (created_at)::date"),
    ):
        try:
            rows = (await db.execute(text(src_sql), {"cutoff": cutoff})).all()
            for r in rows:
                daily_map[str(r[0])] = daily_map.get(str(r[0]), 0) + (r[1] or 0)
        except Exception as e:
            logger.warning(f"Daily predictions: {label} query failed: {e}")
            await db.rollback()
    daily_predictions = _fill_daily_gaps(
        [{"date": d, "count": c} for d, c in sorted(daily_map.items())], days=30
    )

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

    # Pipeline status — help user understand if ML pipeline is healthy
    pipeline_status = {
        "data_ready": total_matches > 0,
        "has_verified": verified_matches > 0,
        "has_enriched": enriched_matches > 0,
        "training_possible": enriched_matches >= 50,
        "has_active_model": any(m.get("is_active") for m in models),
    }

    # Pending enrichment: verified but not yet enriched with Elo
    pending_enrichment = (await db.execute(
        select(func.count(MatchFeature.id)).where(
            and_(
                MatchFeature.is_verified == True,
                MatchFeature.home_elo.is_(None),
                MatchFeature.home_goals.isnot(None),
            )
        )
    )).scalar() or 0

    # Unverified: collected but no results yet (scheduled/live matches)
    unverified_matches = total_matches - verified_matches

    # Last events by type
    last_events = {}
    for evt_type in ("data_collect", "train_complete", "elo_update"):
        row = (await db.execute(
            select(LearningLog.created_at).where(LearningLog.event_type == evt_type)
            .order_by(LearningLog.created_at.desc()).limit(1)
        )).scalar()
        last_events[evt_type] = row.isoformat() if row else None

    pipeline_status["last_events"] = last_events
    pipeline_status["pending_enrichment"] = pending_enrichment
    pipeline_status["unverified_matches"] = unverified_matches

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
        "pipeline_status": pipeline_status,
    }


@router.post("/ml/train")
async def trigger_ml_training(
    admin: dict = Depends(require_admin_role("owner", "admin")),
):
    """Manually trigger ML model training with full enrichment pipeline."""
    import asyncio
    from app.services.ml_trainer import train_all_models
    from app.services.feature_engineer import process_verified_matches
    from app.core.database import async_session_maker
    from app.models.ml_models import LearningLog
    import json as _json

    logger.info(f"Manual training triggered by admin")

    # Pre-flight check: ML dependencies must be installed
    missing_deps = []
    for dep_name, dep_import in [
        ("xgboost", "xgboost"),
        ("scikit-learn", "sklearn"),
        ("numpy", "numpy"),
        ("joblib", "joblib"),
    ]:
        try:
            __import__(dep_import)
        except ImportError:
            missing_deps.append(dep_name)

    if missing_deps:
        error_msg = f"ML dependencies not installed: {', '.join(missing_deps)}. Run: pip install {' '.join(missing_deps)}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg,
        }

    # Run enrichment + training in background so the request doesn't timeout
    async def _run_full_pipeline():
        try:
            # Log training start
            async with async_session_maker() as db:
                db.add(LearningLog(
                    event_type="train_start",
                    details_json=_json.dumps({"trigger": "manual"}),
                ))
                await db.commit()

            # Step 1: Ensure all verified matches are enriched
            enriched = await process_verified_matches()
            logger.info(f"Pre-training enrichment: {enriched} matches enriched")

            # Step 2: Train models
            count = await train_all_models()
            logger.info(f"Manual training finished: {count} models trained")

            if count == 0:
                async with async_session_maker() as db:
                    db.add(LearningLog(
                        event_type="train_error",
                        details_json=_json.dumps({
                            "error": "Training produced 0 models",
                            "enriched": enriched,
                            "hint": "Check data quality: verified matches need home_elo and home_goals",
                        }),
                    ))
                    await db.commit()
        except Exception as e:
            logger.error(f"Manual training error: {e}", exc_info=True)
            try:
                async with async_session_maker() as db:
                    db.add(LearningLog(
                        event_type="train_error",
                        details_json=_json.dumps({
                            "error": str(e)[:500],
                            "trigger": "manual",
                        }),
                    ))
                    await db.commit()
            except Exception:
                pass  # DB error logging failed, already logged to stderr

    asyncio.create_task(_run_full_pipeline())

    return {
        "status": "training_started",
        "message": "Enrichment + ML training pipeline triggered. Check /admin/stats/ml for results.",
    }


@router.post("/ml/backfill")
async def trigger_backfill(
    admin: dict = Depends(require_admin_role("owner", "admin")),
):
    """Manually trigger data backfill + enrichment + training."""
    import asyncio
    from app.services.data_collector import backfill_historical
    from app.services.feature_engineer import process_verified_matches
    from app.services.ml_trainer import train_all_models

    logger.info("Manual backfill + train triggered by admin")

    async def _run_full_backfill():
        try:
            # Step 1: Backfill 90 days of historical data
            total = await backfill_historical(days=90)
            logger.info(f"Backfill complete: {total} fixtures collected")

            # Step 2: Enrich all matches
            enriched = await process_verified_matches()
            logger.info(f"Enrichment complete: {enriched} matches enriched")

            # Step 3: Train models
            count = await train_all_models()
            logger.info(f"Training complete: {count} models trained")
        except Exception as e:
            logger.error(f"Manual backfill pipeline error: {e}", exc_info=True)

    asyncio.create_task(_run_full_backfill())

    return {
        "status": "backfill_started",
        "message": "Full pipeline (backfill → enrich → train) started. Check /admin/stats/ml/diagnostics for progress.",
    }


@router.get("/ml/diagnostics")
async def get_ml_diagnostics(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Comprehensive ML pipeline diagnostics — shows exactly why training may not be working."""
    from app.models.ml_models import MatchFeature, MLModel, EloRating, LearningLog
    import os

    diag = {
        "environment": {},
        "data_pipeline": {},
        "enrichment": {},
        "training_readiness": {},
        "active_models": [],
        "recent_events": [],
        "bottlenecks": [],
    }

    # 1. Environment checks
    api_football_key = os.getenv("API_FOOTBALL_KEY", "")
    diag["environment"] = {
        "API_FOOTBALL_KEY": "set" if api_football_key else "MISSING — data collection will fail!",
        "API_FOOTBALL_KEY_length": len(api_football_key),
        "DATABASE_URL": "set" if os.getenv("DATABASE_URL") else "using default localhost",
    }
    if not api_football_key:
        diag["bottlenecks"].append("CRITICAL: API_FOOTBALL_KEY not set — no data can be collected")

    # 2. Data pipeline stats
    total_matches = (await db.execute(select(func.count(MatchFeature.id)))).scalar() or 0
    verified_matches = (await db.execute(
        select(func.count(MatchFeature.id)).where(MatchFeature.is_verified == True)
    )).scalar() or 0
    enriched_matches = (await db.execute(
        select(func.count(MatchFeature.id)).where(
            and_(
                MatchFeature.is_verified == True,
                MatchFeature.home_elo.isnot(None),
                MatchFeature.home_goals.isnot(None),
            )
        )
    )).scalar() or 0
    unenriched = (await db.execute(
        select(func.count(MatchFeature.id)).where(
            and_(
                MatchFeature.is_verified == True,
                MatchFeature.home_elo.is_(None),
                MatchFeature.home_goals.isnot(None),
            )
        )
    )).scalar() or 0
    unverified = total_matches - verified_matches

    diag["data_pipeline"] = {
        "total_matches": total_matches,
        "verified_with_results": verified_matches,
        "unverified_scheduled": unverified,
        "enriched_ready_for_training": enriched_matches,
        "pending_enrichment": unenriched,
    }

    if total_matches == 0:
        diag["bottlenecks"].append("No match data at all — check API_FOOTBALL_KEY and data collection logs")
    elif verified_matches == 0:
        diag["bottlenecks"].append(f"Have {total_matches} matches but none verified (no finished matches)")
    elif unenriched > 0:
        diag["bottlenecks"].append(f"{unenriched} matches need enrichment (Elo/form/H2H). Trigger /ml/train to process them.")

    # 3. Enrichment details
    elo_teams = (await db.execute(select(func.count(EloRating.id)))).scalar() or 0
    leagues_covered = (await db.execute(
        select(func.count(func.distinct(MatchFeature.league_id)))
    )).scalar() or 0

    diag["enrichment"] = {
        "teams_with_elo": elo_teams,
        "leagues_covered": leagues_covered,
        "min_training_samples": 50,
    }

    # 4. Training readiness
    can_train = enriched_matches >= 50
    diag["training_readiness"] = {
        "usable_samples": enriched_matches,
        "minimum_required": 50,
        "can_train": can_train,
        "status": "READY" if can_train else f"NEED {50 - enriched_matches} MORE enriched matches",
    }
    if not can_train:
        diag["bottlenecks"].append(
            f"Only {enriched_matches}/50 usable training samples. "
            f"Need {50 - enriched_matches} more enriched+verified matches."
        )

    # 5. Active models
    model_rows = (await db.execute(
        select(MLModel).where(MLModel.is_active == True)
    )).scalars().all()
    for m in model_rows:
        diag["active_models"].append({
            "name": m.model_name,
            "version": m.version,
            "accuracy": float(m.accuracy) if m.accuracy else None,
            "f1_score": float(m.f1_score) if m.f1_score else None,
            "training_samples": m.training_samples,
            "trained_at": m.created_at.isoformat() if m.created_at else None,
        })

    if not model_rows:
        diag["bottlenecks"].append("No active ML models — training hasn't succeeded yet")

    # 6. Recent learning log events
    log_rows = (await db.execute(
        select(LearningLog).order_by(LearningLog.created_at.desc()).limit(20)
    )).scalars().all()
    for l in log_rows:
        diag["recent_events"].append({
            "type": l.event_type,
            "details": l.details_json,
            "at": l.created_at.isoformat() if l.created_at else None,
        })

    # 7. ML dependencies check
    try:
        from xgboost import XGBClassifier  # noqa: F401
        from sklearn.calibration import CalibratedClassifierCV  # noqa: F401
        import joblib  # noqa: F401
        import numpy  # noqa: F401
        diag["environment"]["ml_dependencies"] = "OK (xgboost, sklearn, joblib, numpy)"
    except ImportError as e:
        diag["environment"]["ml_dependencies"] = f"MISSING: {e}"
        diag["bottlenecks"].append(f"ML dependency not installed: {e}")

    # Summary
    if not diag["bottlenecks"]:
        diag["summary"] = "Pipeline is healthy. Models are active and training has succeeded."
    else:
        diag["summary"] = f"Found {len(diag['bottlenecks'])} issue(s) preventing training."

    return diag


@router.get("/support")
async def get_support_stats(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Support chat analytics."""
    now = datetime.now()
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

    # Which funnel each chatting user belongs to — asked for on the 28.07 call
    # ("how can I see which funnel he fell into?"). Support is where a lead is
    # actually looked at, so the badge has to be here and not only in the user
    # list. One extra query for the whole page, keyed by user id.
    funnels: dict = {}
    user_ids = {r[1] for r in rows if r[1]}
    if user_ids:
        try:
            funnel_rows = (await db.execute(
                select(User.id, User.funnel, User.country).where(User.id.in_(user_ids))
            )).all()
            funnels = {fr[0]: {"funnel": fr[1] or "funnel-1", "country": fr[2]} for fr in funnel_rows}
        except Exception as e:
            logger.warning("support sessions: failed to load funnels: %s", e)

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
            "funnel": (funnels.get(r[1]) or {}).get("funnel"),
            "country": (funnels.get(r[1]) or {}).get("country"),
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

    now = datetime.now()
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
        client = anthropic.AsyncAnthropic(api_key=api_key)
        resp = await client.messages.create(
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
    now = datetime.now()
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

        # Avg days as PRO: approximate activation date as premium_until - 15 days
        PRO_DURATION_DAYS = 15
        avg_pro_days = 0
        if pro_rows:
            total_days = 0
            for u in pro_rows:
                if u.premium_until:
                    pro_start = u.premium_until - timedelta(days=PRO_DURATION_DAYS)
                    total_days += (now - pro_start).days
                elif u.created_at:
                    total_days += (now - u.created_at).days
            avg_pro_days = round(total_days / len(pro_rows), 1)

        # ── PRO Growth (last 30 days — daily) ──
        # Count ALL users who had active PRO on each day (including now-expired).
        # A user was PRO on a day if: is_premium=True AND premium_until >= that day.

        growth_rows = (await db.execute(text("""
            SELECT d::date AS day, COUNT(*) AS cnt
            FROM generate_series(CAST(:start AS date), CAST(:end AS date), '1 day') AS d
            LEFT JOIN LATERAL (
                SELECT id FROM users
                WHERE is_premium = true
                  AND premium_until >= d::date
                  AND created_at < d::date + interval '1 day'
            ) u ON true
            WHERE u.id IS NOT NULL
            GROUP BY d::date
            ORDER BY d::date
        """), {"start": (today_start - timedelta(days=29)).date(), "end": today_start.date()})).all()
        growth_map = {str(r[0]): r[1] for r in growth_rows}

        growth_daily = []
        for days_ago in range(29, -1, -1):
            day = today_start - timedelta(days=days_ago)
            growth_daily.append({
                "date": day.strftime("%m/%d"),
                "pro_count": growth_map.get(str(day.date()), 0),
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

        # ── Daily PRO Activity (last 30 days) ──
        # Use analytics_events joined with users to count truly active PRO users per day.
        # analytics_events.user_id stores public_id (e.g. "usr_abc123").

        daily_rows = (await db.execute(text("""
            SELECT
                ae.created_at::date AS d,
                COUNT(DISTINCT ae.user_id) AS cnt
            FROM analytics_events ae
            JOIN users u ON u.public_id = ae.user_id
            WHERE ae.created_at >= :since
              AND ae.user_id IS NOT NULL
              AND u.is_premium = true
              AND u.premium_until >= ae.created_at::date
            GROUP BY ae.created_at::date
            ORDER BY ae.created_at::date
        """), {"since": month_ago})).all()
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

        # Which PRO users actually have a real deposit postback (money), vs those
        # who got PRO from a 'lead' (registration only) due to the postback bug.
        deposited_ids = set()
        if pro_user_ids:
            dep_rows = (await db.execute(
                select(func.distinct(PostbackLog.user_db_id)).where(
                    and_(
                        PostbackLog.user_db_id.in_(pro_user_ids),
                        or_(
                            func.lower(PostbackLog.event).in_(
                                ['sale', 'deposit', 'first_deposit', 'ftd', 'confirmed', 'qualified']
                            ),
                            PostbackLog.amount > 0,
                        ),
                    )
                )
            )).scalars().all()
            deposited_ids = {r for r in dep_rows if r is not None}

        pro_users_list = []
        for u in pro_rows:
            pro_start = (u.premium_until - timedelta(days=PRO_DURATION_DAYS)) if u.premium_until else u.created_at
            days_as_pro = (now - pro_start).days if pro_start else 0
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
                # True = PRO but no real deposit postback (likely granted from a 'lead')
                "no_deposit": u.id not in deposited_ids,
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
            "growth_daily": growth_daily,
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
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    try:
        # ── Overview: users by source (raw SQL to avoid PG GROUP BY issues) ──
        source_rows = (await db.execute(text("""
            SELECT
                COALESCE(traffic_source, 'direct') AS src,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE is_premium = true AND premium_until > :now) AS pro,
                COUNT(*) FILTER (WHERE total_predictions > 0) AS activated
            FROM users
            GROUP BY COALESCE(traffic_source, 'direct')
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
                COALESCE(traffic_source, 'direct') AS src,
                COUNT(*) AS cnt
            FROM users
            WHERE created_at >= :since
            GROUP BY created_at::date, COALESCE(traffic_source, 'direct')
            ORDER BY created_at::date
        """), {"since": month_ago})).all()

        daily_by_source = [
            {"date": str(r[0]), "source": r[1], "count": r[2]}
            for r in daily_rows
        ]
        # Ensure today is present even if no registrations yet
        today_str = str(date.today())
        if not any(r["date"] == today_str for r in daily_by_source):
            daily_by_source.append({"date": today_str, "source": "—", "count": 0})

        # ── New this week / month per source ──
        week_rows = (await db.execute(text("""
            SELECT COALESCE(traffic_source, 'direct') AS src, COUNT(*) AS cnt
            FROM users WHERE created_at >= :since
            GROUP BY COALESCE(traffic_source, 'direct')
            ORDER BY cnt DESC
        """), {"since": week_ago})).all()
        new_week = [{"source": r[0], "count": r[1]} for r in week_rows]

        month_rows = (await db.execute(text("""
            SELECT COALESCE(traffic_source, 'direct') AS src, COUNT(*) AS cnt
            FROM users WHERE created_at >= :since
            GROUP BY COALESCE(traffic_source, 'direct')
            ORDER BY cnt DESC
        """), {"since": month_ago})).all()
        new_month = [{"source": r[0], "count": r[1]} for r in month_rows]

        # ── Retention by source (week-1 return rate) ──
        cohort_start = today_start - timedelta(days=14)
        cohort_end = today_start - timedelta(days=7)

        ret_rows = (await db.execute(text("""
            SELECT
                COALESCE(traffic_source, 'direct') AS src,
                COUNT(*) AS registered,
                COUNT(*) FILTER (WHERE updated_at >= :cohort_end) AS returned
            FROM users
            WHERE created_at >= :cohort_start AND created_at < :cohort_end
            GROUP BY COALESCE(traffic_source, 'direct')
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
                COALESCE(traffic_source, 'direct') AS src,
                country,
                COUNT(*) AS cnt
            FROM users
            WHERE country IS NOT NULL
            GROUP BY COALESCE(traffic_source, 'direct'), country
            ORDER BY cnt DESC
            LIMIT 30
        """))).all()

        by_source_country = [
            {"source": r[0], "country": r[1], "count": r[2]}
            for r in country_rows
        ]

        # ── UTM Source breakdown ──
        utm_source_rows = (await db.execute(text("""
            SELECT
                COALESCE(utm_source, 'unknown') AS src,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE is_premium = true AND premium_until > :now) AS pro,
                COUNT(*) FILTER (WHERE total_predictions > 0) AS activated
            FROM users
            WHERE utm_source IS NOT NULL AND utm_source != ''
            GROUP BY COALESCE(utm_source, 'unknown')
            ORDER BY COUNT(*) DESC
            LIMIT 20
        """), {"now": now})).all()

        total_utm = sum(r[1] for r in utm_source_rows) or 1
        by_utm_source = [
            {
                "source": r[0],
                "total": r[1],
                "percent": round(r[1] / total_utm * 100, 1),
                "pro": r[2],
                "conversion_pct": round(r[2] / r[1] * 100, 1) if r[1] > 0 else 0,
                "activated": r[3],
                "activation_pct": round(r[3] / r[1] * 100, 1) if r[1] > 0 else 0,
            }
            for r in utm_source_rows
        ]

        # ── UTM Campaign breakdown ──
        utm_campaign_rows = (await db.execute(text("""
            SELECT
                COALESCE(utm_campaign, 'unknown') AS camp,
                COALESCE(utm_source, 'unknown') AS src,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE is_premium = true AND premium_until > :now) AS pro,
                COUNT(*) FILTER (WHERE total_predictions > 0) AS activated
            FROM users
            WHERE utm_campaign IS NOT NULL AND utm_campaign != ''
            GROUP BY COALESCE(utm_campaign, 'unknown'), COALESCE(utm_source, 'unknown')
            ORDER BY COUNT(*) DESC
            LIMIT 30
        """), {"now": now})).all()

        by_utm_campaign = [
            {
                "campaign": r[0],
                "source": r[1],
                "total": r[2],
                "pro": r[3],
                "conversion_pct": round(r[3] / r[2] * 100, 1) if r[2] > 0 else 0,
                "activated": r[4],
                "activation_pct": round(r[4] / r[2] * 100, 1) if r[2] > 0 else 0,
            }
            for r in utm_campaign_rows
        ]

        return {
            "by_source": by_source,
            "daily_by_source": daily_by_source,
            "new_week": new_week,
            "new_month": new_month,
            "retention_by_source": retention_by_source,
            "by_source_country": by_source_country,
            "by_utm_source": by_utm_source,
            "by_utm_campaign": by_utm_campaign,
        }
    except Exception as e:
        logger.error(f"Traffic analytics error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Traffic analytics error: {str(e)}")


# ── Financial Dashboard ──────────────────────────────────────────


@router.get("/finance")
async def get_finance_stats(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Financial dashboard — revenue from deposits, LTV, CAC estimates."""
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    try:
        # ── Revenue from postback deposits ──
        total_revenue = (await db.execute(text(
            "SELECT COALESCE(SUM(amount), 0) FROM postback_logs WHERE amount > 0"
        ))).scalar() or 0

        revenue_today = (await db.execute(text(
            "SELECT COALESCE(SUM(amount), 0) FROM postback_logs WHERE amount > 0 AND created_at >= :since"
        ), {"since": today_start})).scalar() or 0

        revenue_week = (await db.execute(text(
            "SELECT COALESCE(SUM(amount), 0) FROM postback_logs WHERE amount > 0 AND created_at >= :since"
        ), {"since": week_ago})).scalar() or 0

        revenue_month = (await db.execute(text(
            "SELECT COALESCE(SUM(amount), 0) FROM postback_logs WHERE amount > 0 AND created_at >= :since"
        ), {"since": month_ago})).scalar() or 0

        # Total deposits count
        total_deposits = (await db.execute(text(
            "SELECT COUNT(*) FROM postback_logs WHERE amount > 0"
        ))).scalar() or 0

        deposits_today = (await db.execute(text(
            "SELECT COUNT(*) FROM postback_logs WHERE amount > 0 AND created_at >= :since"
        ), {"since": today_start})).scalar() or 0

        # Avg deposit
        avg_deposit = round(float(total_revenue) / total_deposits, 2) if total_deposits > 0 else 0

        # ── Depositing users ──
        depositing_users = (await db.execute(text(
            "SELECT COUNT(DISTINCT user_db_id) FROM postback_logs WHERE user_db_id IS NOT NULL AND amount > 0"
        ))).scalar() or 0

        total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

        # ── LTV (Lifetime Value) ──
        # Revenue per depositing user
        ltv_depositors = round(float(total_revenue) / depositing_users, 2) if depositing_users > 0 else 0
        # Revenue per all users
        ltv_all = round(float(total_revenue) / total_users, 2) if total_users > 0 else 0

        # ── Revenue by source (traffic source) ──
        source_rows = (await db.execute(text("""
            SELECT
                COALESCE(u.traffic_source, 'unknown') AS src,
                COUNT(DISTINCT p.user_db_id) AS users,
                COUNT(*) AS deposits,
                COALESCE(SUM(p.amount), 0) AS revenue
            FROM postback_logs p
            LEFT JOIN users u ON u.id = p.user_db_id
            WHERE p.amount > 0
            GROUP BY COALESCE(u.traffic_source, 'unknown')
            ORDER BY revenue DESC
        """))).all()

        by_source = [
            {"source": r[0], "users": r[1], "deposits": r[2], "revenue": round(float(r[3]), 2)}
            for r in source_rows
        ]

        # ── Revenue by country ──
        country_rows = (await db.execute(text("""
            SELECT
                COALESCE(u.country, 'Unknown') AS country,
                COUNT(DISTINCT p.user_db_id) AS users,
                COALESCE(SUM(p.amount), 0) AS revenue
            FROM postback_logs p
            LEFT JOIN users u ON u.id = p.user_db_id
            WHERE p.amount > 0
            GROUP BY COALESCE(u.country, 'Unknown')
            ORDER BY revenue DESC
            LIMIT 15
        """))).all()

        by_country = [
            {"country": r[0], "users": r[1], "revenue": round(float(r[2]), 2)}
            for r in country_rows
        ]

        # ── Daily revenue (last 30 days) ──
        daily_rows = (await db.execute(text("""
            SELECT created_at::date AS day, COALESCE(SUM(amount), 0) AS revenue, COUNT(*) AS deposits
            FROM postback_logs
            WHERE amount > 0 AND created_at >= :since
            GROUP BY created_at::date
            ORDER BY created_at::date
        """), {"since": month_ago})).all()

        daily_revenue_raw = [
            {"date": str(r[0]), "revenue": round(float(r[1]), 2), "deposits": r[2]}
            for r in daily_rows
        ]
        # Fill missing dates with 0 revenue/deposits so today always shows
        today_d = date.today()
        revenue_by_date = {r["date"]: r for r in daily_revenue_raw}
        daily = []
        for i in range(29, -1, -1):
            d = str(today_d - timedelta(days=i))
            if d in revenue_by_date:
                daily.append(revenue_by_date[d])
            else:
                daily.append({"date": d, "revenue": 0, "deposits": 0})

        # ── Conversion funnel ──
        pro_users = (await db.execute(
            select(func.count(User.id)).where(
                and_(User.is_premium == True, User.premium_until > now)
            )
        )).scalar() or 0

        active_users = (await db.execute(
            select(func.count(User.id)).where(User.total_predictions > 0)
        )).scalar() or 0

        funnel = {
            "total_users": total_users,
            "active_users": active_users,
            "pro_users": pro_users,
            "depositing_users": depositing_users,
            "activation_rate": round(active_users / total_users * 100, 1) if total_users > 0 else 0,
            "pro_rate": round(pro_users / total_users * 100, 1) if total_users > 0 else 0,
            "deposit_rate": round(depositing_users / total_users * 100, 1) if total_users > 0 else 0,
        }

        # ── Recent deposits ──
        recent_rows = (await db.execute(text("""
            SELECT p.user_id, p.user_db_id, p.amount, p.currency, p.source, p.created_at,
                   u.username, u.country
            FROM postback_logs p
            LEFT JOIN users u ON u.id = p.user_db_id
            WHERE p.amount > 0
            ORDER BY p.created_at DESC
            LIMIT 15
        """))).all()

        recent_deposits = [
            {
                "user_id": r[0], "user_db_id": r[1], "amount": r[2],
                "currency": r[3], "source": r[4],
                "created_at": r[5].isoformat() if r[5] else None,
                "username": r[6], "country": r[7],
            }
            for r in recent_rows
        ]

        return {
            "overview": {
                "total_revenue": round(float(total_revenue), 2),
                "revenue_today": round(float(revenue_today), 2),
                "revenue_week": round(float(revenue_week), 2),
                "revenue_month": round(float(revenue_month), 2),
                "total_deposits": total_deposits,
                "deposits_today": deposits_today,
                "avg_deposit": avg_deposit,
                "depositing_users": depositing_users,
            },
            "ltv": {
                "per_depositor": ltv_depositors,
                "per_user": ltv_all,
            },
            "by_source": by_source,
            "by_country": by_country,
            "daily": daily,
            "funnel": funnel,
            "recent_deposits": recent_deposits,
        }
    except Exception as e:
        logger.error(f"Finance stats error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Finance stats error: {str(e)}")


# ── Postback Logs ──────────────────────────────────────────────────


@router.post("/pro/revoke-no-deposit")
async def revoke_no_deposit_pro(
    payload: dict = Body(default={}),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Revoke PRO from users who got it WITHOUT a real deposit (granted from a
    'lead'), and drop a deposit-CTA message into their support chat.

    Pass {"dry_run": true} to PREVIEW the affected users without changing
    anything. {"dry_run": false} performs the revocation + messaging.
    """
    import uuid as _uuid

    now = datetime.now()
    dry_run = bool(payload.get("dry_run", True))
    message = payload.get("message") or (
        "O teu acesso PRO de teste (24h por te teres registado) terminou. "
        "Faz o teu primeiro depósito e o PRO é ativado automaticamente. {deposit}"
    )

    pro_rows = (await db.execute(
        select(User).where(and_(User.is_premium == True, User.premium_until > now))
    )).scalars().all()
    pro_ids = [u.id for u in pro_rows]
    if not pro_ids:
        return {"dry_run": dry_run, "count": 0, "users": [], "revoked": 0, "messaged": 0}

    dep_rows = (await db.execute(
        select(func.distinct(PostbackLog.user_db_id)).where(
            and_(
                PostbackLog.user_db_id.in_(pro_ids),
                or_(
                    func.lower(PostbackLog.event).in_(
                        ["sale", "deposit", "first_deposit", "ftd", "confirmed", "qualified"]),
                    PostbackLog.amount > 0,
                ),
            )
        )
    )).scalars().all()
    deposited = {r for r in dep_rows if r is not None}

    targets = [u for u in pro_rows if u.id not in deposited]
    preview = [
        {"id": u.id, "public_id": u.public_id, "phone": u.phone,
         "premium_until": u.premium_until.isoformat() if u.premium_until else None}
        for u in targets
    ]

    if dry_run:
        return {"dry_run": True, "count": len(targets), "users": preview, "revoked": 0, "messaged": 0}

    messaged = 0
    for u in targets:
        u.is_premium = False
        u.premium_until = None
        if message:
            db.add(SupportChatMessage(
                user_id=u.id,
                session_id=f"sys-deposit-{_uuid.uuid4().hex[:12]}",
                role="assistant",
                content=message,
                locale=(u.language or "pt")[:5],
                agent_name="Suporte",
                is_admin_reply=True,
            ))
            messaged += 1
    await db.commit()
    logger.info("Revoked lead-only PRO from %s users (messaged=%s)", len(targets), messaged)
    return {"dry_run": False, "count": len(targets), "users": preview,
            "revoked": len(targets), "messaged": messaged}


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
            "raw_params": l.raw_params,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in rows
    ]

    now = datetime.now()
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


@router.get("/deposits")
async def get_deposits(
    limit: int = Query(200, ge=1, le=500),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Real deposits with banner attribution — who deposited, how much, from which
    in-app banner (last click before the deposit) and when."""
    rows = (await db.execute(text("""
        SELECT p.id, p.user_id, p.amount, p.currency, p.country, p.event, p.source,
               p.created_at, p.click_id, p.transaction_id,
               u.phone,
               (SELECT bc.banner FROM banner_clicks bc
                WHERE bc.user_id = p.user_id AND bc.created_at <= p.created_at
                ORDER BY bc.created_at DESC LIMIT 1) AS banner
        FROM postback_logs p
        LEFT JOIN users u ON u.public_id = p.user_id
        WHERE (LOWER(p.event) IN ('sale','deposit','first_deposit','ftd','confirmed','qualified')
               OR p.amount > 0)
        ORDER BY p.created_at DESC
        LIMIT :limit
    """), {"limit": limit})).mappings().all()

    deposits = [
        {
            "id": r["id"],
            "user_id": r["user_id"],
            "phone": r["phone"],
            "amount": float(r["amount"]) if r["amount"] is not None else None,
            "currency": r["currency"],
            "country": r["country"],
            "event": r["event"],
            "source": r["source"],
            "banner": r["banner"],
            "click_id": r["click_id"],
            "transaction_id": r["transaction_id"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        }
        for r in rows
    ]

    day_ago = datetime.now() - timedelta(days=1)
    qualify = ("(LOWER(event) IN ('sale','deposit','first_deposit','ftd','confirmed','qualified') "
               "OR amount > 0)")
    total = (await db.execute(text(f"SELECT COUNT(*) FROM postback_logs WHERE {qualify}"))).scalar() or 0
    total_amount = (await db.execute(text("SELECT COALESCE(SUM(amount),0) FROM postback_logs WHERE amount > 0"))).scalar() or 0
    last24 = (await db.execute(text(
        f"SELECT COUNT(*) FROM postback_logs WHERE {qualify} AND created_at >= :d"
    ), {"d": day_ago})).scalar() or 0

    return {
        "deposits": deposits,
        "summary": {
            "total": total,
            "total_amount": round(float(total_amount), 2),
            "last_24h": last24,
        },
    }


@router.get("/deposits/user/{user_id}")
async def get_deposit_user_detail(
    user_id: str,
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Behaviour detail for a depositor: time on app before deposit, sessions,
    pages visited, the banner journey, AI usage, and a replayable session id."""
    j = (await db.execute(text("""
        SELECT MIN(created_at) AS first, MAX(created_at) AS last,
               COUNT(*) AS events, COUNT(DISTINCT session_id) AS sessions,
               COUNT(DISTINCT page) AS pages
        FROM analytics_events WHERE user_id = :uid
    """), {"uid": user_id})).mappings().first()
    first = j["first"] if j else None
    last = j["last"] if j else None
    total_time = int((last - first).total_seconds()) if (first and last) else 0

    pages = (await db.execute(text("""
        SELECT page, COUNT(*) AS n FROM analytics_events
        WHERE user_id = :uid AND page IS NOT NULL AND page <> ''
        GROUP BY page ORDER BY n DESC LIMIT 15
    """), {"uid": user_id})).mappings().all()

    banners = (await db.execute(text("""
        SELECT banner, MIN(created_at) AS first_click, COUNT(*) AS n
        FROM banner_clicks WHERE user_id = :uid
        GROUP BY banner ORDER BY first_click ASC LIMIT 20
    """), {"uid": user_id})).mappings().all()

    replay = (await db.execute(text("""
        SELECT sr.session_id FROM session_replays sr
        JOIN analytics_events ae ON ae.session_id = sr.session_id
        WHERE ae.user_id = :uid
        ORDER BY sr.updated_at DESC LIMIT 1
    """), {"uid": user_id})).scalar()

    ai_requests = 0
    predictions = 0
    try:
        ai_requests = (await db.execute(text(
            "SELECT COUNT(*) FROM ai_chat_messages WHERE user_id = "
            "(SELECT id FROM users WHERE public_id = :uid) AND role = 'user'"
        ), {"uid": user_id})).scalar() or 0
    except Exception:
        await db.rollback()
    try:
        predictions = (await db.execute(text(
            "SELECT COUNT(*) FROM predictions WHERE user_id = "
            "(SELECT id FROM users WHERE public_id = :uid)"
        ), {"uid": user_id})).scalar() or 0
    except Exception:
        await db.rollback()

    return {
        "total_time_sec": total_time,
        "sessions": (j["sessions"] if j else 0) or 0,
        "events": (j["events"] if j else 0) or 0,
        "page_views": (j["pages"] if j else 0) or 0,
        "first_seen": first.isoformat() if first else None,
        "last_seen": last.isoformat() if last else None,
        "ai_requests": ai_requests,
        "predictions": predictions,
        "replay_session_id": replay,
        "pages": [{"page": p["page"], "count": p["n"]} for p in pages],
        "banners": [
            {"banner": b["banner"],
             "first_click": b["first_click"].isoformat() if b["first_click"] else None,
             "count": b["n"]}
            for b in banners
        ],
    }


@router.get("/banner-attribution")
async def get_banner_attribution(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Which in-app banners the depositing users engaged with. Attributes by
    user overlap (clicked banner AND later deposited), not by fragile sub_id echo."""
    rows = (await db.execute(text("""
        WITH dep AS (
            SELECT DISTINCT user_id FROM postback_logs
            WHERE user_id IS NOT NULL
              AND (LOWER(event) IN ('sale','deposit','first_deposit','ftd','confirmed','qualified')
                   OR amount > 0)
        )
        SELECT bc.banner,
               COUNT(*) AS clicks,
               COUNT(DISTINCT bc.user_id) AS users,
               COUNT(DISTINCT bc.user_id) FILTER (WHERE bc.user_id IN (SELECT user_id FROM dep)) AS depositors
        FROM banner_clicks bc
        GROUP BY bc.banner
        ORDER BY depositors DESC, clicks DESC
        LIMIT 50
    """))).all()
    return {
        "banners": [
            {
                "banner": r.banner,
                "clicks": r.clicks,
                "users": r.users,
                "depositors": r.depositors,
                "deposit_rate": round(r.depositors / r.users * 100, 1) if r.users else 0,
            }
            for r in rows
        ]
    }


# ── Session replay: visitor sessions list + replay playback (admin only) ──────

@router.get("/recent-visits")
async def get_recent_visits(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Recent visitor sessions (grouped analytics_events), flagged if a replay exists."""
    from datetime import timezone
    sql = text("""
        SELECT ae.session_id,
               MIN(ae.created_at) AS first_seen,
               MAX(ae.created_at) AS last_seen,
               COUNT(*) AS events,
               COUNT(DISTINCT ae.page) AS pages,
               MAX(ae.user_id) AS user_id,
               MAX(ae.country) AS country,
               MAX(ae.referrer) AS referrer,
               MAX(ae.user_agent) AS user_agent,
               (ARRAY_AGG(ae.page ORDER BY ae.created_at DESC))[1] AS last_page,
               (SELECT COUNT(*) FROM session_replays sr WHERE sr.session_id = ae.session_id) AS has_replay
        FROM analytics_events ae
        WHERE ae.session_id IS NOT NULL AND ae.session_id <> ''
        GROUP BY ae.session_id
        ORDER BY last_seen DESC
        LIMIT :limit OFFSET :offset
    """)
    rows = (await db.execute(sql, {"limit": limit, "offset": offset})).mappings().all()
    now = datetime.now(timezone.utc)
    visits = []
    for r in rows:
        first, last = r["first_seen"], r["last_seen"]
        dur = int((last - first).total_seconds()) if (first and last) else 0
        is_live = False
        try:
            la = last.replace(tzinfo=timezone.utc) if (last and last.tzinfo is None) else last
            is_live = bool(la and (now - la).total_seconds() < 120)
        except Exception:
            pass
        visits.append({
            "session_id": r["session_id"],
            "visit_time": first.isoformat() if first else None,
            "last_activity": last.isoformat() if last else None,
            "duration_sec": dur,
            "events": r["events"],
            "page_views": r["pages"],
            "user_id": r["user_id"],
            "country": r["country"],
            "referrer": r["referrer"],
            "user_agent": r["user_agent"],
            "last_page": r["last_page"],
            "has_replay": bool(r["has_replay"]),
            "is_live": is_live,
        })
    return {"visits": visits, "limit": limit, "offset": offset}


@router.get("/replay/{session_id}")
async def get_session_replay(
    session_id: str,
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Merge all replay chunks for a session and return rrweb events for playback."""
    import json as _json
    from fastapi import HTTPException
    from app.models.session_replay import SessionReplay, ReplayChunk

    replay = (await db.execute(
        select(SessionReplay).where(SessionReplay.session_id == session_id)
    )).scalar_one_or_none()
    if not replay:
        raise HTTPException(status_code=404, detail="No replay data for this session")

    chunks = (await db.execute(
        select(ReplayChunk).where(ReplayChunk.session_id == session_id)
        .order_by(ReplayChunk.chunk_index.asc(), ReplayChunk.id.asc())
    )).scalars().all()

    all_events = []
    for chunk in chunks:
        try:
            ev = _json.loads(chunk.events_json)
            if isinstance(ev, list):
                all_events.extend(ev)
        except Exception:
            continue
    if not all_events:
        raise HTTPException(status_code=404, detail="No valid replay events")

    return {
        "session_id": session_id,
        "events": all_events,
        "events_count": len(all_events),
        "chunks": len(chunks),
        "size_bytes": replay.total_size,
        "is_complete": replay.is_complete,
    }


@router.get("/banner-clicks")
async def get_banner_clicks_stats(
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Banner click analytics — clicks by banner, daily trends."""
    now = datetime.now()
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

        daily = _fill_daily_gaps(
            [{"date": str(r[0]), "clicks": r[1]} for r in daily_rows],
            days=30, value_key="clicks",
        )

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


# ── Maintenance: purge users by traffic source (owner only) ──────────────────

@router.post("/maintenance/purge-source")
async def purge_users_by_source(
    source: str = Body(..., embed=True),
    confirm: bool = Body(False, embed=True),
    admin: dict = Depends(require_admin_role("owner")),
    db: AsyncSession = Depends(get_db),
):
    """Delete all users with a given traffic_source plus their related rows.

    Owner-only, requires confirm=true. Used to clear legacy/old-domain test data
    (e.g. source='prescoreai_com') so the dashboard reflects only the new domain.
    """
    from fastapi import HTTPException
    source = (source or "").strip()
    if not source:
        raise HTTPException(status_code=400, detail="source is required")
    if not confirm:
        raise HTTPException(status_code=400, detail="confirm must be true")

    # How many users match (for the response / sanity)
    target_count = (await db.execute(
        text("SELECT COUNT(*) FROM users WHERE traffic_source = :s"), {"s": source}
    )).scalar() or 0
    if target_count == 0:
        return {"deleted_users": 0, "source": source, "message": "No users matched."}

    sub = "(SELECT id FROM users WHERE traffic_source = :s)"
    # Children first (FK to users.id), then null the self-referential referrer link,
    # then the users themselves.
    child_tables = [
        "predictions", "fantasy_ledger", "wc_predictions",
        "community_picks", "match_chat_messages", "support_chat_messages",
        "ai_chat_messages",
    ]
    deleted = {}
    for tbl in child_tables:
        res = await db.execute(text(f"DELETE FROM {tbl} WHERE user_id IN {sub}"), {"s": source})
        deleted[tbl] = res.rowcount
    await db.execute(text(f"UPDATE users SET referred_by_id = NULL WHERE referred_by_id IN {sub}"), {"s": source})
    res = await db.execute(text("DELETE FROM users WHERE traffic_source = :s"), {"s": source})
    deleted_users = res.rowcount
    await db.commit()

    logger.warning("PURGE source=%s by admin=%s: removed %s users, children=%s",
                   source, admin.get("email"), deleted_users, deleted)
    return {"deleted_users": deleted_users, "source": source, "children": deleted}


# ── Session replay: visitor sessions list + replay playback (admin only) ──────

@router.get("/recent-visits")
async def get_recent_visits(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Recent visitor sessions (grouped analytics_events), flagged if a replay exists."""
    sql = text("""
        WITH sessions AS (
            SELECT ae.session_id,
                   MIN(ae.created_at) AS first_seen,
                   MAX(ae.created_at) AS last_seen,
                   COUNT(*) AS events,
                   COUNT(DISTINCT ae.page) AS pages,
                   MAX(ae.user_id) AS user_id,
                   MAX(ae.country) AS country,
                   MAX(ae.referrer) AS referrer,
                   MAX(ae.user_agent) AS user_agent,
                   (ARRAY_AGG(ae.page ORDER BY ae.created_at DESC))[1] AS last_page
            FROM analytics_events ae
            WHERE ae.session_id IS NOT NULL AND ae.session_id <> ''
            GROUP BY ae.session_id
        ),
        ranked AS (
            SELECT s.*,
                   CASE WHEN s.user_id IS NOT NULL AND s.user_id <> ''
                        THEN ROW_NUMBER() OVER (PARTITION BY s.user_id ORDER BY s.first_seen ASC)
                   END AS visit_number,
                   CASE WHEN s.user_id IS NOT NULL AND s.user_id <> ''
                        THEN COUNT(*) OVER (PARTITION BY s.user_id)
                   END AS total_visits
            FROM sessions s
        )
        SELECT r.*,
               (SELECT COUNT(*) FROM session_replays sr WHERE sr.session_id = r.session_id) AS has_replay
        FROM ranked r
        ORDER BY r.last_seen DESC
        LIMIT :limit OFFSET :offset
    """)
    rows = (await db.execute(sql, {"limit": limit, "offset": offset})).mappings().all()
    now = datetime.now(timezone.utc)
    visits = []
    for r in rows:
        first, last = r["first_seen"], r["last_seen"]
        dur = int((last - first).total_seconds()) if (first and last) else 0
        is_live = False
        try:
            la = last.replace(tzinfo=timezone.utc) if (last and last.tzinfo is None) else last
            is_live = bool(la and (now - la).total_seconds() < 120)
        except Exception:
            pass
        visits.append({
            "session_id": r["session_id"],
            "visit_time": first.isoformat() if first else None,
            "last_activity": last.isoformat() if last else None,
            "duration_sec": dur,
            "events": r["events"],
            "page_views": r["pages"],
            "user_id": r["user_id"],
            "country": r["country"],
            "referrer": r["referrer"],
            "user_agent": r["user_agent"],
            "last_page": r["last_page"],
            "has_replay": bool(r["has_replay"]),
            "is_live": is_live,
            "visit_number": r["visit_number"],   # Nth visit of this user (None if anonymous)
            "total_visits": r["total_visits"],    # total visits of this user
        })
    return {"visits": visits, "limit": limit, "offset": offset}


@router.get("/replay/{session_id}")
async def get_session_replay(
    session_id: str,
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Merge all replay chunks for a session and return rrweb events for playback."""
    import json as _json
    from fastapi import HTTPException
    from app.models.session_replay import SessionReplay, ReplayChunk

    replay = (await db.execute(
        select(SessionReplay).where(SessionReplay.session_id == session_id)
    )).scalar_one_or_none()
    if not replay:
        raise HTTPException(status_code=404, detail="No replay data for this session")

    chunks = (await db.execute(
        select(ReplayChunk).where(ReplayChunk.session_id == session_id)
        .order_by(ReplayChunk.chunk_index.asc(), ReplayChunk.id.asc())
    )).scalars().all()

    all_events = []
    for chunk in chunks:
        try:
            ev = _json.loads(chunk.events_json)
            if isinstance(ev, list):
                all_events.extend(ev)
        except Exception:
            continue
    if not all_events:
        raise HTTPException(status_code=404, detail="No valid replay events")

    return {
        "session_id": session_id,
        "events": all_events,
        "events_count": len(all_events),
        "chunks": len(chunks),
        "size_bytes": replay.total_size,
        "is_complete": replay.is_complete,
    }


@router.get("/ip-check")
async def ip_check(
    ips: str = Query(..., description="Comma-separated IPs to check"),
    admin: dict = Depends(require_admin_role("owner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Is an IP 'ours'? Returns this backend's egress IP (so you can compare) and,
    for each given IP, how many app requests we logged from it (analytics_events).
    NOTE: postback/Keitaro requests are NOT IP-logged, so they can't be counted here.
    """
    import httpx

    egress = None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get("https://api.ipify.org")
            egress = (r.text or "").strip()
    except Exception:
        egress = None

    ip_list = [s.strip() for s in (ips or "").split(",") if s.strip()][:20]
    out = []
    for ip in ip_list:
        row = (await db.execute(text("""
            SELECT COUNT(*) AS events,
                   COUNT(DISTINCT session_id) AS sessions,
                   MIN(created_at) AS first_seen,
                   MAX(created_at) AS last_seen,
                   COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL AND user_id <> '') AS users
            FROM analytics_events WHERE ip = :ip
        """), {"ip": ip})).mappings().first()
        reg = (await db.execute(text(
            "SELECT COUNT(*) FROM users WHERE registration_ip = :ip"
        ), {"ip": ip})).scalar() or 0
        out.append({
            "ip": ip,
            "is_our_backend_egress": bool(egress and ip == egress),
            "app_events": row["events"] or 0,
            "sessions": row["sessions"] or 0,
            "users_seen": row["users"] or 0,
            "registrations_from_ip": int(reg),
            "first_seen": row["first_seen"].isoformat() if row["first_seen"] else None,
            "last_seen": row["last_seen"].isoformat() if row["last_seen"] else None,
        })
    return {"our_backend_egress_ip": egress, "ips": out}
