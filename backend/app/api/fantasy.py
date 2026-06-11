"""
Fantasy rewards API — users earn points for correct predictions and redeem them.
Points are awarded by the verification worker (prediction_verifier). Rewards are
PRO time today; a $ free-bet code tier is reserved ("coming soon") and depends on
a partner-issued promo-code agreement.
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.fantasy import FantasyLedger, WcPrediction

logger = logging.getLogger(__name__)

router = APIRouter()

# Max premium a user can hold via redemptions (defense against stacking)
MAX_PREMIUM_DAYS = 365
LEADERBOARD_MIN_PREDICTIONS = 5

# Redemption tiers. PRO tiers are live; the cash/freebet tier is gated off until a
# partner promo-code integration exists.
TIERS = [
    {"id": "pro_3d",  "points": 1000, "type": "pro",  "pro_days": 3,  "label": "3 days PRO",  "available": True},
    {"id": "pro_7d",  "points": 2500, "type": "pro",  "pro_days": 7,  "label": "7 days PRO",  "available": True},
    {"id": "pro_30d", "points": 5000, "type": "pro",  "pro_days": 30, "label": "30 days PRO", "available": True},
    {"id": "cash_50", "points": 5000, "type": "cash", "amount": 50, "currency": "USD",
     "label": "$50 free bet", "available": False, "note": "coming soon"},
]


def _tier(tier_id: str):
    return next((t for t in TIERS if t["id"] == tier_id), None)


class RedeemRequest(BaseModel):
    tier_id: str


@router.get("/me")
async def fantasy_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = current_user.get("user_id")
    user = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    lifetime = user.fantasy_points_lifetime or 0
    rank = (await db.execute(
        select(func.count()).select_from(User).where(User.fantasy_points_lifetime > lifetime)
    )).scalar() or 0

    recent = (await db.execute(
        select(FantasyLedger)
        .where(FantasyLedger.user_id == uid)
        .order_by(desc(FantasyLedger.created_at)).limit(20)
    )).scalars().all()

    return {
        "points": user.fantasy_points or 0,
        "lifetime": lifetime,
        "rank": rank + 1,
        "tiers": TIERS,
        "history": [
            {
                "kind": l.kind,
                "points": l.points,
                "reason": l.reason,
                "ref": l.ref,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in recent
        ],
    }


@router.post("/redeem")
async def fantasy_redeem(
    body: RedeemRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = current_user.get("user_id")
    tier = _tier(body.tier_id)
    if not tier or not tier.get("available"):
        raise HTTPException(status_code=400, detail="Reward not available")
    if tier["type"] != "pro":
        raise HTTPException(status_code=400, detail="This reward is coming soon")

    user = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    cost = tier["points"]
    if (user.fantasy_points or 0) < cost:
        raise HTTPException(status_code=400, detail="Not enough points")

    now = datetime.utcnow()
    base = user.premium_until if (user.premium_until and user.premium_until > now) else now
    new_until = min(base + timedelta(days=tier["pro_days"]), now + timedelta(days=MAX_PREMIUM_DAYS))

    user.fantasy_points = (user.fantasy_points or 0) - cost
    user.is_premium = True
    user.premium_until = new_until
    db.add(FantasyLedger(user_id=uid, kind="redeem", points=-cost, reason=f"redeem_{tier['id']}", ref=tier["id"]))
    await db.commit()

    logger.info("Fantasy redeem: user=%s tier=%s cost=%s premium_until=%s", uid, tier["id"], cost, new_until)
    return {
        "success": True,
        "points": user.fantasy_points,
        "premium_until": new_until.isoformat(),
        "reward": tier["label"],
    }


class WcPredictRequest(BaseModel):
    picks: dict  # {"A": [teamId, teamId, teamId, teamId], ...} api-sports ids in predicted order


@router.get("/wc-predict")
async def get_wc_predict(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = current_user.get("user_id")
    row = (await db.execute(select(WcPrediction).where(WcPrediction.user_id == uid))).scalar_one_or_none()
    return {
        "picks": json.loads(row.picks_json) if row and row.picks_json else {},
        "points_awarded": row.points_awarded if row else 0,
        "scored_groups": json.loads(row.scored_groups) if (row and row.scored_groups) else [],
    }


@router.post("/wc-predict")
async def save_wc_predict(
    body: WcPredictRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = current_user.get("user_id")
    # Only keep group keys with a list of ids (defensive)
    clean = {str(k): [int(x) for x in v][:4] for k, v in (body.picks or {}).items() if isinstance(v, list)}
    row = (await db.execute(select(WcPrediction).where(WcPrediction.user_id == uid))).scalar_one_or_none()
    if row:
        # Don't let users rewrite groups that were already scored
        scored = set(json.loads(row.scored_groups or "[]"))
        existing = json.loads(row.picks_json or "{}")
        for g in scored:
            if g in existing:
                clean[g] = existing[g]
        row.picks_json = json.dumps(clean)
    else:
        db.add(WcPrediction(user_id=uid, picks_json=json.dumps(clean)))
    await db.commit()
    return {"success": True, "picks": clean}


@router.get("/leaderboard")
async def fantasy_leaderboard(
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(User.public_id, User.username, User.country, User.fantasy_points_lifetime)
        .where(
            User.fantasy_points_lifetime > 0,
            User.total_predictions >= LEADERBOARD_MIN_PREDICTIONS,
            User.is_banned == False,  # noqa: E712
        )
        .order_by(desc(User.fantasy_points_lifetime)).limit(50)
    )).all()

    return {
        "leaderboard": [
            {
                "rank": i + 1,
                "id": r[0],
                "name": r[1] or "Player",
                "country": r[2],
                "points": r[3] or 0,
            }
            for i, r in enumerate(rows)
        ]
    }
