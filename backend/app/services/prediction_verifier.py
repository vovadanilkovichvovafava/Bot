"""
Prediction verification worker.
Runs periodically to check match results and update prediction outcomes.
Also computes aggregate accuracy stats for ML feedback loop.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.models.prediction import Prediction
from app.services.api_football import ApiFootballService

logger = logging.getLogger(__name__)

# Bet type verification logic
# Maps bet_type to a function(home_goals, away_goals) -> bool
BET_VERIFIERS = {
    # 1X2
    "Home Win": lambda h, a: h > a,
    "Away Win": lambda h, a: a > h,
    "Draw": lambda h, a: h == a,
    # Double chance
    "Home or Draw": lambda h, a: h >= a,
    "Away or Draw": lambda h, a: a >= h,
    "Home or Away": lambda h, a: h != a,
    # Goals
    "Over 2.5": lambda h, a: h + a > 2,
    "Under 2.5": lambda h, a: h + a < 3,
    "Over 1.5": lambda h, a: h + a > 1,
    "Under 1.5": lambda h, a: h + a < 2,
    "Over 3.5": lambda h, a: h + a > 3,
    "Under 3.5": lambda h, a: h + a < 4,
    # BTTS
    "Both Teams Score": lambda h, a: h > 0 and a > 0,
    "BTTS": lambda h, a: h > 0 and a > 0,
    # Russian bet type names
    "П1": lambda h, a: h > a,
    "П2": lambda h, a: a > h,
    "Х": lambda h, a: h == a,
    "ТБ2.5": lambda h, a: h + a > 2,
    "ТМ2.5": lambda h, a: h + a < 3,
    "1X": lambda h, a: h >= a,
    "X2": lambda h, a: a >= h,
}


def verify_bet(bet_type: str, home_goals: int, away_goals: int) -> Optional[bool]:
    """Check if a bet was correct based on match result."""
    # Direct match
    if bet_type in BET_VERIFIERS:
        return BET_VERIFIERS[bet_type](home_goals, away_goals)

    # Fuzzy match: check if bet_type contains a team name (winner prediction)
    bt = bet_type.lower().strip()

    # Generic win patterns
    if "home" in bt or "win" in bt and "away" not in bt:
        return home_goals > away_goals
    if "away" in bt:
        return away_goals > home_goals
    if "draw" in bt or bt == "x":
        return home_goals == away_goals
    if "over" in bt and "2.5" in bt:
        return home_goals + away_goals > 2
    if "under" in bt and "2.5" in bt:
        return home_goals + away_goals < 3
    if "btts" in bt or "both" in bt:
        return home_goals > 0 and away_goals > 0

    # Can't determine — treat as winner prediction
    # The bet_type might be a team name
    if home_goals > away_goals:
        return None  # Need team name matching, handled separately
    elif away_goals > home_goals:
        return None
    else:
        return None


async def verify_pending_predictions():
    """
    Main verification loop. Checks all unverified predictions
    where match date has passed, fetches results, updates DB.
    """
    api = ApiFootballService()
    now = datetime.utcnow()
    verified_count = 0

    async with async_session_maker() as db:
        try:
            # Get all unverified predictions where match should be finished
            # (match_date + 3 hours < now)
            cutoff = now - timedelta(hours=3)
            result = await db.execute(
                select(Prediction).where(
                    and_(
                        Prediction.is_correct.is_(None),
                        Prediction.match_date.isnot(None),
                        Prediction.match_date < cutoff,
                    )
                ).limit(100)
            )
            pending = result.scalars().all()
        except Exception as e:
            logger.error(f"DB error querying pending predictions: {e}")
            await db.rollback()
            return 0

        if not pending:
            logger.info("No pending predictions to verify")
            return 0

        logger.info(f"Found {len(pending)} pending predictions to verify")

        # Group by date for efficient API calls
        by_date: Dict[str, list] = {}
        for pred in pending:
            date_str = pred.match_date.strftime("%Y-%m-%d")
            if date_str not in by_date:
                by_date[date_str] = []
            by_date[date_str].append(pred)

        for date_str, preds in by_date.items():
            try:
                fixtures = await api.get_fixtures_by_date(date_str)
                if not fixtures:
                    logger.warning(f"No fixtures returned for {date_str}")
                    continue

                for pred in preds:
                    fixture = _find_fixture(pred, fixtures)
                    if not fixture:
                        continue

                    status = fixture.get("fixture", {}).get("status", {}).get("short", "")
                    if status not in ("FT", "AET", "PEN"):
                        continue  # Match not finished yet

                    home_goals = fixture.get("goals", {}).get("home")
                    away_goals = fixture.get("goals", {}).get("away")

                    if home_goals is None or away_goals is None:
                        continue

                    # Update scores
                    pred.actual_home_score = home_goals
                    pred.actual_away_score = away_goals
                    pred.verified_at = now

                    # Determine if prediction was correct
                    is_correct = _check_prediction(pred, home_goals, away_goals, fixture)
                    pred.is_correct = is_correct
                    verified_count += 1

                    logger.info(
                        f"Verified prediction #{pred.id}: "
                        f"{pred.home_team} {home_goals}-{away_goals} {pred.away_team} | "
                        f"bet={pred.bet_type} | correct={is_correct}"
                    )

            except Exception as e:
                logger.error(f"Error verifying predictions for {date_str}: {e}")

        if verified_count > 0:
            try:
                await db.commit()
                logger.info(f"Verified {verified_count} predictions")
            except Exception as e:
                logger.error(f"DB error committing verifications: {e}")
                await db.rollback()

    return verified_count


def _find_fixture(pred: Prediction, fixtures: list) -> Optional[dict]:
    """Find the matching fixture for a prediction using fuzzy name matching."""
    pred_home = (pred.home_team or "").lower().strip()
    pred_away = (pred.away_team or "").lower().strip()

    # Try match_id first (exact match)
    for f in fixtures:
        fid = f.get("fixture", {}).get("id")
        if fid and str(fid) == str(pred.match_id):
            return f

    # Fuzzy name matching
    for f in fixtures:
        home_name = (f.get("teams", {}).get("home", {}).get("name") or "").lower()
        away_name = (f.get("teams", {}).get("away", {}).get("name") or "").lower()

        home_match = (
            pred_home in home_name or home_name in pred_home or
            any(w for w in pred_home.split() if len(w) > 3 and w in home_name)
        )
        away_match = (
            pred_away in away_name or away_name in pred_away or
            any(w for w in pred_away.split() if len(w) > 3 and w in away_name)
        )

        if home_match and away_match:
            return f

    return None


def _check_prediction(pred: Prediction, home_goals: int, away_goals: int, fixture: dict) -> bool:
    """Check if a prediction was correct."""
    bet_type = (pred.bet_type or "").strip()

    # Try direct bet type verification
    result = verify_bet(bet_type, home_goals, away_goals)
    if result is not None:
        return result

    # Bet type might be a team name — check winner
    home_name = (fixture.get("teams", {}).get("home", {}).get("name") or "").lower()
    away_name = (fixture.get("teams", {}).get("away", {}).get("name") or "").lower()
    bt = bet_type.lower()

    if home_goals > away_goals:
        actual_winner = home_name
    elif away_goals > home_goals:
        actual_winner = away_name
    else:
        actual_winner = "draw"

    # Check if predicted team name matches winner
    if actual_winner == "draw":
        return "draw" in bt or bt == "x" or bt == "х"

    return (
        bt in actual_winner or actual_winner in bt or
        any(w for w in bt.split() if len(w) > 3 and w in actual_winner) or
        any(w for w in actual_winner.split() if len(w) > 3 and w in bt)
    )


async def get_accuracy_stats(db: AsyncSession, user_id: int = None) -> dict:
    """
    Get real accuracy statistics from verified predictions.
    If user_id is provided, returns per-user stats. Otherwise global.
    """
    empty_stats = {
        "total": 0, "correct": 0, "wrong": 0, "pending": 0,
        "accuracy": 0, "current_streak": 0, "streak_type": None,
        "by_bet_type": [], "by_league": [],
    }

    try:
        base_filter = Prediction.is_correct.isnot(None)
        if user_id:
            base_filter = and_(base_filter, Prediction.user_id == user_id)

        # Total verified
        result = await db.execute(
            select(
                func.count(Prediction.id).label("total"),
                func.sum(case((Prediction.is_correct == True, 1), else_=0)).label("correct"),
                func.sum(case((Prediction.is_correct == False, 1), else_=0)).label("wrong"),
            ).where(base_filter)
        )
        row = result.one()
        total = row.total or 0
        correct = row.correct or 0
        wrong = row.wrong or 0

        # Pending count
        pending_filter = Prediction.is_correct.is_(None)
        if user_id:
            pending_filter = and_(pending_filter, Prediction.user_id == user_id)
        pending_result = await db.execute(
            select(func.count(Prediction.id)).where(pending_filter)
        )
        pending = pending_result.scalar() or 0

        accuracy = round((correct / total) * 100, 1) if total > 0 else 0

        # Accuracy by bet type (top 5)
        bt_result = await db.execute(
            select(
                Prediction.bet_type,
                func.count(Prediction.id).label("total"),
                func.sum(case((Prediction.is_correct == True, 1), else_=0)).label("correct"),
            ).where(base_filter)
            .group_by(Prediction.bet_type)
            .order_by(func.count(Prediction.id).desc())
            .limit(5)
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

        # Accuracy by league (top 5)
        lg_result = await db.execute(
            select(
                Prediction.league,
                func.count(Prediction.id).label("total"),
                func.sum(case((Prediction.is_correct == True, 1), else_=0)).label("correct"),
            ).where(base_filter)
            .group_by(Prediction.league)
            .order_by(func.count(Prediction.id).desc())
            .limit(5)
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

        # Recent streak
        recent_result = await db.execute(
            select(Prediction.is_correct).where(base_filter)
            .order_by(Prediction.verified_at.desc())
            .limit(20)
        )
        recent = [r[0] for r in recent_result.all()]
        current_streak = 0
        streak_type = "win" if recent and recent[0] else "loss"
        for r in recent:
            if (streak_type == "win" and r) or (streak_type == "loss" and not r):
                current_streak += 1
            else:
                break

        return {
            "total": total,
            "correct": correct,
            "wrong": wrong,
            "pending": pending,
            "accuracy": accuracy,
            "current_streak": current_streak,
            "streak_type": streak_type if total > 0 else None,
            "by_bet_type": by_bet_type,
            "by_league": by_league,
        }
    except Exception as e:
        logger.error(f"DB error in get_accuracy_stats: {e}")
        await db.rollback()
        return empty_stats


async def get_learning_context(db: AsyncSession) -> str:
    """
    Generate a context string with historical accuracy data
    to feed into AI prompts for better calibration.
    """
    stats = await get_accuracy_stats(db)

    if stats["total"] < 5:
        return ""

    parts = [
        f"\n\n**HISTORICAL PREDICTION ACCURACY (based on {stats['total']} verified predictions):**",
        f"- Overall accuracy: {stats['accuracy']}%",
        f"- Win/Loss: {stats['correct']}W / {stats['wrong']}L",
    ]

    if stats["by_bet_type"]:
        parts.append("- Accuracy by bet type:")
        for bt in stats["by_bet_type"]:
            parts.append(f"  - {bt['bet_type']}: {bt['accuracy']}% ({bt['total']} bets)")

    if stats["by_league"]:
        parts.append("- Accuracy by league:")
        for lg in stats["by_league"]:
            parts.append(f"  - {lg['league']}: {lg['accuracy']}% ({lg['total']} bets)")

    parts.append(
        "Use this data to CALIBRATE your confidence levels. "
        "If your accuracy for a bet type is low, be more conservative. "
        "If high, you can be more confident. "
        "Aim to improve overall accuracy above 60%."
    )

    return "\n".join(parts)


async def verification_loop():
    """Background loop that verifies predictions every 2 hours."""
    logger.info("Prediction verification worker started")
    while True:
        try:
            count = await verify_pending_predictions()
            if count > 0:
                logger.info(f"Verification cycle complete: {count} predictions verified")
            else:
                logger.info("Verification cycle: no new verifications")
        except Exception as e:
            logger.error(f"Verification loop error: {e}")

        # Sleep 2 hours
        await asyncio.sleep(2 * 60 * 60)
