from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.community_pick import CommunityPick

router = APIRouter()

VALID_PICKS = {"home", "draw", "away"}
VOTE_MULTIPLIER = 10


class PickRequest(BaseModel):
    pick: str  # 'home', 'draw', 'away'


class PickStats(BaseModel):
    home: int = 0
    draw: int = 0
    away: int = 0
    total: int = 0
    user_pick: str | None = None


@router.post("/{match_id}")
async def vote(
    match_id: str,
    body: PickRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.pick not in VALID_PICKS:
        raise HTTPException(status_code=400, detail="Invalid pick. Use: home, draw, away")

    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check if user already voted on this match
    existing = await db.execute(
        select(CommunityPick).where(
            CommunityPick.user_id == user_id,
            CommunityPick.match_id == match_id,
        )
    )
    pick_row = existing.scalar_one_or_none()

    if pick_row:
        # Update existing vote
        pick_row.pick = body.pick
    else:
        # Create new vote
        pick_row = CommunityPick(user_id=user_id, match_id=match_id, pick=body.pick)
        db.add(pick_row)

    await db.commit()

    # Return updated stats
    return await _get_stats(match_id, user_id, db)


@router.get("/{match_id}", response_model=PickStats)
async def get_stats(
    match_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.get("user_id")
    return await _get_stats(match_id, user_id, db)


async def _get_stats(match_id: str, user_id: int | None, db: AsyncSession) -> PickStats:
    # Count votes per pick
    rows = await db.execute(
        select(CommunityPick.pick, func.count(CommunityPick.id))
        .where(CommunityPick.match_id == match_id)
        .group_by(CommunityPick.pick)
    )
    counts = {row[0]: row[1] for row in rows.all()}

    home = counts.get("home", 0) * VOTE_MULTIPLIER
    draw = counts.get("draw", 0) * VOTE_MULTIPLIER
    away = counts.get("away", 0) * VOTE_MULTIPLIER
    total = home + draw + away

    # Get user's own pick
    user_pick = None
    if user_id:
        result = await db.execute(
            select(CommunityPick.pick).where(
                CommunityPick.user_id == user_id,
                CommunityPick.match_id == match_id,
            )
        )
        row = result.scalar_one_or_none()
        if row:
            user_pick = row

    return PickStats(home=home, draw=draw, away=away, total=total, user_pick=user_pick)
