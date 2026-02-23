"""
Admin stats API — dashboard data, user analytics, predictions overview.
All endpoints require admin authentication.
"""

import logging
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

    # New PRO users today
    pro_new_today = (await db.execute(
        select(func.count(User.id)).where(
            and_(
                User.is_premium == True,
                User.premium_until > now,
                User.updated_at >= today_start,
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

    return {
        "users": {
            "total": total_users,
            "pro": pro_users,
            "pro_new_today": pro_new_today,
            "new_today": new_today,
            "new_week": new_week,
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


# ── Chat history endpoints (for AdminChats page) ──────────────────────


@router.get("/chats/support-sessions")
async def get_support_sessions(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Paginated support chat sessions with preview."""
    # Subquery: first user message per session for preview
    preview_sq = (
        select(
            SupportChatMessage.session_id,
            func.min(
                case(
                    (SupportChatMessage.role == "user", SupportChatMessage.id),
                )
            ).label("first_user_msg_id"),
        )
        .group_by(SupportChatMessage.session_id)
        .subquery()
    )

    rows = (await db.execute(
        select(
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
        .group_by(
            SupportChatMessage.session_id,
            SupportChatMessage.user_id,
            SupportChatMessage.locale,
            SupportChatMessage.was_pro,
            SupportChatMessage.agent_name,
        )
        .order_by(func.max(SupportChatMessage.created_at).desc())
        .limit(limit)
        .offset(offset)
    )).all()

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

    total = (await db.execute(
        select(func.count(func.distinct(SupportChatMessage.session_id)))
    )).scalar() or 0

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


@router.get("/chats/ai-sessions")
async def get_ai_chat_sessions(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin: dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """AI chat sessions — real user ↔ AI dialogs."""
    rows = (await db.execute(
        select(
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
        .group_by(
            AIChatMessage.session_id,
            AIChatMessage.user_id,
            AIChatMessage.locale,
            AIChatMessage.was_pro,
            AIChatMessage.match_context,
        )
        .order_by(func.max(AIChatMessage.created_at).desc())
        .limit(limit)
        .offset(offset)
    )).all()

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

    total = (await db.execute(
        select(func.count(func.distinct(AIChatMessage.session_id)))
    )).scalar() or 0

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


@router.post("/chats/translate")
async def translate_messages(
    payload: dict = Body(...),
    admin: dict = Depends(get_current_admin),
):
    """Translate messages to Russian and extract key phrases using Claude."""
    messages = payload.get("messages", [])
    if not messages:
        return {"translated": [], "keywords": ""}

    # Build text for translation
    dialog_text = "\n".join(
        f"{'User' if m.get('role') == 'user' else 'AI'}: {m.get('content', '')}"
        for m in messages
    )

    try:
        import anthropic
        import json as json_mod
        import re

        client = anthropic.AsyncAnthropic()
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4000,
            messages=[{
                "role": "user",
                "content": (
                    f"You have a dialog between a user and an AI assistant about football betting.\n\n"
                    f"Dialog:\n{dialog_text}\n\n"
                    f"Do two things:\n"
                    f"1. Translate EVERY message to Russian (keep the same order). There are exactly {len(messages)} messages.\n"
                    f"2. Extract 2-4 key phrases/topics discussed in the entire dialog (in Russian).\n\n"
                    f"IMPORTANT: Respond with ONLY raw JSON, no markdown, no code blocks.\n"
                    f'{{"translated": ["translated msg 1", "translated msg 2", ...], "keywords": "keyword1, keyword2, keyword3"}}'
                ),
            }],
        )
        raw = resp.content[0].text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
        result = json_mod.loads(raw)
        return result
    except Exception as e:
        logger.warning(f"Translation failed: {e}")
        return {"translated": [], "keywords": ""}
