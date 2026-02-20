"""
ML Monitoring Service.
Tracks model accuracy, ROI, detects drift, and generates dashboard stats.
Runs daily as a background task.
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

from sqlalchemy import select, func, and_, case, desc

from app.core.database import async_session_maker
from app.models.ml_models import (
    MatchFeature, MLModel, ROIAnalytics, LearningLog, FeatureErrorPattern
)
from app.models.prediction import Prediction

logger = logging.getLogger(__name__)


async def calculate_roi(period: str = "weekly") -> Optional[Dict]:
    """
    Calculate ROI for the current period.
    Compares model predictions vs actual results.
    """
    now = datetime.utcnow()

    if period == "daily":
        period_start = now - timedelta(days=1)
    elif period == "weekly":
        period_start = now - timedelta(days=7)
    elif period == "monthly":
        period_start = now - timedelta(days=30)
    else:
        period_start = now - timedelta(days=7)

    async with async_session_maker() as db:
        try:
            # Get verified predictions in this period
            result = await db.execute(
                select(
                    func.count(Prediction.id).label("total"),
                    func.sum(case((Prediction.is_correct == True, 1), else_=0)).label("correct"),
                    func.sum(case((Prediction.is_correct == False, 1), else_=0)).label("wrong"),
                ).where(
                    and_(
                        Prediction.is_correct.isnot(None),
                        Prediction.verified_at >= period_start,
                        Prediction.verified_at <= now,
                    )
                )
            )
            row = result.one()
            total = row.total or 0
            correct = row.correct or 0
            wrong = row.wrong or 0

            if total == 0:
                logger.info(f"No verified predictions for {period} period")
                return None

            accuracy = round((correct / total) * 100, 1)

            # Calculate ROI (simplified — assumes flat stake of 1 unit per bet)
            # For each correct bet, we win (odds - 1) units
            # For each wrong bet, we lose 1 unit
            roi_result = await db.execute(
                select(
                    func.sum(
                        case(
                            (Prediction.is_correct == True, Prediction.odds - 1.0),
                            else_=-1.0
                        )
                    ).label("profit"),
                    func.count(Prediction.id).label("total_bets"),
                ).where(
                    and_(
                        Prediction.is_correct.isnot(None),
                        Prediction.verified_at >= period_start,
                        Prediction.odds.isnot(None),
                        Prediction.odds > 1.0,
                    )
                )
            )
            roi_row = roi_result.one()
            profit = float(roi_row.profit or 0)
            total_bets_with_odds = roi_row.total_bets or 0

            roi_percent = round((profit / total_bets_with_odds) * 100, 1) if total_bets_with_odds > 0 else 0

            # Breakdown by bet type
            bt_result = await db.execute(
                select(
                    Prediction.bet_type,
                    func.count(Prediction.id).label("total"),
                    func.sum(case((Prediction.is_correct == True, 1), else_=0)).label("correct"),
                ).where(
                    and_(
                        Prediction.is_correct.isnot(None),
                        Prediction.verified_at >= period_start,
                    )
                ).group_by(Prediction.bet_type)
                .order_by(func.count(Prediction.id).desc())
                .limit(10)
            )
            by_bet_type = []
            for bt_row in bt_result.all():
                bt_total = bt_row.total or 0
                bt_correct = bt_row.correct or 0
                by_bet_type.append({
                    "bet_type": bt_row.bet_type,
                    "total": bt_total,
                    "correct": bt_correct,
                    "accuracy": round((bt_correct / bt_total) * 100, 1) if bt_total > 0 else 0,
                })

            # Breakdown by league
            lg_result = await db.execute(
                select(
                    Prediction.league,
                    func.count(Prediction.id).label("total"),
                    func.sum(case((Prediction.is_correct == True, 1), else_=0)).label("correct"),
                ).where(
                    and_(
                        Prediction.is_correct.isnot(None),
                        Prediction.verified_at >= period_start,
                    )
                ).group_by(Prediction.league)
                .order_by(func.count(Prediction.id).desc())
                .limit(10)
            )
            by_league = []
            for lg_row in lg_result.all():
                lg_total = lg_row.total or 0
                lg_correct = lg_row.correct or 0
                by_league.append({
                    "league": lg_row.league,
                    "total": lg_total,
                    "correct": lg_correct,
                    "accuracy": round((lg_correct / lg_total) * 100, 1) if lg_total > 0 else 0,
                })

            # Save to ROI analytics
            analytics = ROIAnalytics(
                period=period,
                period_start=period_start,
                period_end=now,
                total_predictions=total,
                total_recommended=total_bets_with_odds,
                correct_predictions=correct,
                accuracy=accuracy,
                total_staked=float(total_bets_with_odds),
                total_returned=float(total_bets_with_odds + profit),
                roi_percent=roi_percent,
                by_bet_type_json=json.dumps(by_bet_type),
                by_league_json=json.dumps(by_league),
            )
            db.add(analytics)
            await db.commit()

            stats = {
                "period": period,
                "total": total,
                "correct": correct,
                "wrong": wrong,
                "accuracy": accuracy,
                "roi_percent": roi_percent,
                "profit_units": round(profit, 2),
                "by_bet_type": by_bet_type,
                "by_league": by_league,
            }

            logger.info(f"ROI {period}: accuracy={accuracy}%, ROI={roi_percent}%, profit={profit:.1f} units")
            return stats

        except Exception as e:
            logger.error(f"Error calculating ROI: {e}")
            await db.rollback()
            return None


async def check_model_drift() -> Dict:
    """
    Check if model accuracy has dropped significantly.
    Compare last week's accuracy to overall accuracy.
    """
    async with async_session_maker() as db:
        try:
            # Overall accuracy (all time)
            overall = await db.execute(
                select(
                    func.count(Prediction.id).label("total"),
                    func.sum(case((Prediction.is_correct == True, 1), else_=0)).label("correct"),
                ).where(Prediction.is_correct.isnot(None))
            )
            overall_row = overall.one()
            overall_total = overall_row.total or 0
            overall_correct = overall_row.correct or 0
            overall_accuracy = (overall_correct / overall_total * 100) if overall_total > 0 else 0

            # Last 7 days accuracy
            week_ago = datetime.utcnow() - timedelta(days=7)
            recent = await db.execute(
                select(
                    func.count(Prediction.id).label("total"),
                    func.sum(case((Prediction.is_correct == True, 1), else_=0)).label("correct"),
                ).where(
                    and_(
                        Prediction.is_correct.isnot(None),
                        Prediction.verified_at >= week_ago,
                    )
                )
            )
            recent_row = recent.one()
            recent_total = recent_row.total or 0
            recent_correct = recent_row.correct or 0
            recent_accuracy = (recent_correct / recent_total * 100) if recent_total > 0 else 0

            drift = overall_accuracy - recent_accuracy
            has_drift = drift > 5.0 and recent_total >= 10  # >5% drop with sufficient sample

            if has_drift:
                logger.warning(
                    f"MODEL DRIFT DETECTED: overall={overall_accuracy:.1f}% vs recent={recent_accuracy:.1f}% "
                    f"(drop={drift:.1f}%)"
                )
                # Log drift event
                log = LearningLog(
                    event_type="model_drift",
                    details_json=json.dumps({
                        "overall_accuracy": round(overall_accuracy, 1),
                        "recent_accuracy": round(recent_accuracy, 1),
                        "drift": round(drift, 1),
                        "recent_sample_size": recent_total,
                    })
                )
                db.add(log)
                await db.commit()

            return {
                "overall_accuracy": round(overall_accuracy, 1),
                "recent_accuracy": round(recent_accuracy, 1),
                "drift": round(drift, 1),
                "has_drift": has_drift,
                "overall_total": overall_total,
                "recent_total": recent_total,
            }

        except Exception as e:
            logger.error(f"Error checking drift: {e}")
            return {"error": str(e)}


async def get_ml_dashboard_stats() -> Dict:
    """Get comprehensive ML pipeline statistics for dashboard/admin."""
    stats = {
        "data": {},
        "models": {},
        "predictions": {},
        "elo": {},
    }

    async with async_session_maker() as db:
        try:
            # Training data stats
            data_result = await db.execute(
                select(
                    func.count(MatchFeature.id).label("total"),
                    func.sum(case((MatchFeature.is_verified == True, 1), else_=0)).label("verified"),
                    func.sum(case((MatchFeature.home_elo.isnot(None), 1), else_=0)).label("enriched"),
                )
            )
            data_row = data_result.one()
            stats["data"] = {
                "total_matches": data_row.total or 0,
                "verified": data_row.verified or 0,
                "enriched": data_row.enriched or 0,
            }

            # Active models
            models_result = await db.execute(
                select(MLModel).where(MLModel.is_active == True)
            )
            active_models = []
            for m in models_result.scalars().all():
                active_models.append({
                    "name": m.model_name,
                    "version": m.version,
                    "accuracy": m.accuracy,
                    "f1_score": m.f1_score,
                    "training_samples": m.training_samples,
                    "trained_at": m.training_date.isoformat() if m.training_date else None,
                })
            stats["models"] = {
                "active_count": len(active_models),
                "models": active_models,
            }

            # Prediction stats
            pred_result = await db.execute(
                select(
                    func.count(Prediction.id).label("total"),
                    func.sum(case((Prediction.is_correct == True, 1), else_=0)).label("correct"),
                    func.sum(case((Prediction.is_correct == False, 1), else_=0)).label("wrong"),
                    func.sum(case((Prediction.is_correct.is_(None), 1), else_=0)).label("pending"),
                )
            )
            pred_row = pred_result.one()
            total = pred_row.total or 0
            correct = pred_row.correct or 0
            stats["predictions"] = {
                "total": total,
                "correct": correct,
                "wrong": pred_row.wrong or 0,
                "pending": pred_row.pending or 0,
                "accuracy": round((correct / total * 100), 1) if total > 0 else 0,
            }

            # Recent learning logs
            logs_result = await db.execute(
                select(LearningLog)
                .order_by(desc(LearningLog.created_at))
                .limit(10)
            )
            stats["recent_events"] = [
                {
                    "type": log.event_type,
                    "details": log.details_json,
                    "at": log.created_at.isoformat() if log.created_at else None,
                }
                for log in logs_result.scalars().all()
            ]

        except Exception as e:
            logger.error(f"Error getting dashboard stats: {e}")
            stats["error"] = str(e)

    return stats


async def monitoring_loop():
    """
    Background monitoring loop. Runs daily.
    - Calculates ROI (daily, weekly, monthly)
    - Checks for model drift
    - Logs results
    """
    logger.info("ML monitoring worker started")

    # Wait 10 minutes after startup
    await asyncio.sleep(600)

    while True:
        try:
            logger.info("Running daily monitoring...")

            # Calculate ROI for all periods
            await calculate_roi("daily")
            await calculate_roi("weekly")
            await calculate_roi("monthly")

            # Check for model drift
            drift = await check_model_drift()
            if drift.get("has_drift"):
                logger.warning("Model drift detected! Consider retraining.")

            logger.info("Daily monitoring complete")

        except Exception as e:
            logger.error(f"Monitoring loop error: {e}")

        # Sleep 24 hours
        await asyncio.sleep(24 * 60 * 60)
