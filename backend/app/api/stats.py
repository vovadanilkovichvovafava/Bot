"""Statistics endpoints"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.prediction import Prediction

router = APIRouter()


class AccuracyResponse(BaseModel):
    total: int
    wins: int
    losses: int
    pending: int
    accuracy: float


class ROIByCategoryResponse(BaseModel):
    category: str
    total: int
    wins: int
    accuracy: float
    roi: float


class DailyStatsResponse(BaseModel):
    date: str
    predictions: int
    wins: int
    accuracy: float


class WeeklyReportResponse(BaseModel):
    week_start: str
    week_end: str
    total_predictions: int
    wins: int
    losses: int
    accuracy: float
    best_category: str | None
    best_category_accuracy: float | None
    daily_stats: List[DailyStatsResponse]


@router.get("/accuracy", response_model=AccuracyResponse)
async def get_accuracy(
    days: int = 30,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get prediction accuracy for the last N days"""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    total_result = await db.execute(
        select(func.count(Prediction.id))
        .where(Prediction.user_id == user_id)
        .where(Prediction.created_at >= since)
    )
    total = total_result.scalar() or 0

    wins_result = await db.execute(
        select(func.count(Prediction.id))
        .where(Prediction.user_id == user_id)
        .where(Prediction.created_at >= since)
        .where(Prediction.result == "win")
    )
    wins = wins_result.scalar() or 0

    losses_result = await db.execute(
        select(func.count(Prediction.id))
        .where(Prediction.user_id == user_id)
        .where(Prediction.created_at >= since)
        .where(Prediction.result == "lose")
    )
    losses = losses_result.scalar() or 0

    pending = total - wins - losses

    accuracy = (wins / total * 100) if total > 0 else 0.0

    return AccuracyResponse(
        total=total,
        wins=wins,
        losses=losses,
        pending=pending,
        accuracy=round(accuracy, 1)
    )


@router.get("/roi", response_model=List[ROIByCategoryResponse])
async def get_roi_by_category(
    days: int = 30,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get ROI statistics by bet category"""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Get predictions grouped by category
    result = await db.execute(
        select(
            Prediction.category,
            func.count(Prediction.id).label("total"),
            func.sum(func.case((Prediction.result == "win", 1), else_=0)).label("wins"),
        )
        .where(Prediction.user_id == user_id)
        .where(Prediction.created_at >= since)
        .where(Prediction.result.in_(["win", "lose"]))
        .group_by(Prediction.category)
    )
    rows = result.all()

    return [
        ROIByCategoryResponse(
            category=row.category or "other",
            total=row.total,
            wins=row.wins or 0,
            accuracy=round((row.wins or 0) / row.total * 100, 1) if row.total > 0 else 0.0,
            roi=0.0  # TODO: Calculate actual ROI based on odds
        )
        for row in rows
    ]


@router.get("/weekly", response_model=WeeklyReportResponse)
async def get_weekly_report(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get weekly statistics report"""
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

    # Get weekly totals
    total_result = await db.execute(
        select(func.count(Prediction.id))
        .where(Prediction.user_id == user_id)
        .where(Prediction.created_at >= week_start)
        .where(Prediction.result.in_(["win", "lose"]))
    )
    total = total_result.scalar() or 0

    wins_result = await db.execute(
        select(func.count(Prediction.id))
        .where(Prediction.user_id == user_id)
        .where(Prediction.created_at >= week_start)
        .where(Prediction.result == "win")
    )
    wins = wins_result.scalar() or 0

    losses = total - wins
    accuracy = (wins / total * 100) if total > 0 else 0.0

    # Get daily breakdown
    daily_stats = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        if day > now:
            break

        day_total = await db.execute(
            select(func.count(Prediction.id))
            .where(Prediction.user_id == user_id)
            .where(func.date(Prediction.created_at) == day.date())
            .where(Prediction.result.in_(["win", "lose"]))
        )
        day_predictions = day_total.scalar() or 0

        day_wins = await db.execute(
            select(func.count(Prediction.id))
            .where(Prediction.user_id == user_id)
            .where(func.date(Prediction.created_at) == day.date())
            .where(Prediction.result == "win")
        )
        day_wins_count = day_wins.scalar() or 0

        daily_stats.append(DailyStatsResponse(
            date=day.strftime("%Y-%m-%d"),
            predictions=day_predictions,
            wins=day_wins_count,
            accuracy=round((day_wins_count / day_predictions * 100) if day_predictions > 0 else 0, 1)
        ))

    return WeeklyReportResponse(
        week_start=week_start.strftime("%Y-%m-%d"),
        week_end=(week_start + timedelta(days=6)).strftime("%Y-%m-%d"),
        total_predictions=total,
        wins=wins,
        losses=losses,
        accuracy=round(accuracy, 1),
        best_category=None,  # TODO: Calculate
        best_category_accuracy=None,
        daily_stats=daily_stats
    )
