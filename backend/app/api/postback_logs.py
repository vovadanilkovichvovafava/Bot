"""
Postback log API — record and query postback events.
- POST /log — internal endpoint called by postback server (auth via X-Internal-Secret)
- GET /  — admin endpoint for viewing logs
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query, Header, HTTPException
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.admin_auth import get_current_admin
from app.models.postback_log import PostbackLog
from app.models.user import User

logger = logging.getLogger(__name__)

INTERNAL_SECRET = os.getenv("POSTBACK_SECRET")
if not INTERNAL_SECRET:
    raise RuntimeError("POSTBACK_SECRET environment variable is not set")

router = APIRouter()


@router.post("/log")
async def record_postback(
    data: dict,
    x_internal_secret: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Record a postback event (called by postback server)."""
    if x_internal_secret != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")

    user_id = data.get("user_id")

    # Try to resolve internal user id
    user_db_id = None
    if user_id:
        if str(user_id).startswith("usr_"):
            row = (await db.execute(select(User.id).where(User.public_id == user_id))).first()
            if row:
                user_db_id = row[0]
            else:
                logger.warning("Postback user_id=%s (public_id) not found in DB", user_id)
        else:
            try:
                int_id = int(user_id)
                # Verify the integer ID actually exists
                row = (await db.execute(select(User.id).where(User.id == int_id))).first()
                if row:
                    user_db_id = int_id
                else:
                    logger.warning("Postback user_id=%s (integer) not found in DB", user_id)
            except (ValueError, TypeError):
                logger.warning("Postback user_id=%s is not a valid public_id or integer", user_id)
    else:
        logger.warning("Postback received without user_id, event=%s source=%s", data.get("event"), data.get("source"))

    # Mark user as registered on bookmaker → enables direct match deeplinks
    # Any postback with a resolved user means they registered through our offer
    if user_db_id:
        user = (await db.execute(select(User).where(User.id == user_db_id))).scalar_one_or_none()
        if user and not user.use_deeplink:
            user.use_deeplink = True
            logger.info("Set use_deeplink=True for user_id=%s (event=%s)", user_id, data.get("event"))

    log = PostbackLog(
        user_id=str(user_id) if user_id else None,
        user_db_id=user_db_id,
        source=data.get("source", "unknown"),
        click_id=data.get("click_id"),
        transaction_id=data.get("transaction_id"),
        event=data.get("event"),
        amount=float(data["amount"]) if data.get("amount") else None,
        currency=data.get("currency"),
        country=data.get("country"),
        premium_activated=data.get("premium_activated", False),
        error=data.get("error"),
        raw_params=data.get("raw_params"),
    )
    db.add(log)
    await db.commit()

    return {"success": True, "id": log.id}


@router.get("/")
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

    # Summary stats
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
