"""
Settle World Cup group-stage fantasy predictions.

When a group's table is final (every team has played its 3 group matches), compare
each user's predicted finishing order to the actual order and award fantasy points
(+50 per team in the exact correct position). Idempotent per group via the
`scored_groups` list, so it can run on every loop and only acts on newly-final groups.
"""
import json
import logging

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.models.user import User
from app.models.fantasy import FantasyLedger, WcPrediction
from app.services.api_football import ApiFootballService

logger = logging.getLogger(__name__)

WC_LEAGUE_ID = 1
WC_SEASON = 2026
POINTS_PER_EXACT_POSITION = 50


async def _final_group_orders(api: ApiFootballService):
    """Return {letter: [team_id, ...]} for groups whose table is final (all played >= 3)."""
    data = await api.get_standings(WC_LEAGUE_ID, WC_SEASON)
    if not data:
        return {}
    league = (data[0] or {}).get("league") or {}
    tables = league.get("standings") or []
    out = {}
    for table in tables:
        if not table:
            continue
        letter = str(table[0].get("group", "")).replace("Group", "").strip()
        if not letter:
            continue
        # Group is final only when every team has completed all 3 group games
        if not all((r.get("all") or {}).get("played", 0) >= 3 for r in table):
            continue
        ordered = [r["team"]["id"] for r in sorted(table, key=lambda r: r.get("rank", 99)) if r.get("team")]
        if ordered:
            out[letter] = ordered
    return out


async def settle_wc_predictions() -> int:
    """Score all users' WC predictions against final group tables. Returns groups settled."""
    api = ApiFootballService()
    try:
        finals = await _final_group_orders(api)
    except Exception as e:
        logger.error(f"WC settlement: failed to fetch standings: {e}")
        return 0
    if not finals:
        return 0

    settled = 0
    async with async_session_maker() as db:
        # Only finalized predictions count toward fantasy points.
        rows = (await db.execute(
            select(WcPrediction).where(WcPrediction.finalized == True)  # noqa: E712
        )).scalars().all()
        for pred in rows:
            try:
                picks = json.loads(pred.picks_json or "{}")
                scored = set(json.loads(pred.scored_groups or "[]"))
                gained = 0
                for letter, actual in finals.items():
                    if letter in scored:
                        continue
                    predicted = picks.get(letter) or []
                    pts = sum(
                        POINTS_PER_EXACT_POSITION
                        for i in range(min(len(predicted), len(actual)))
                        if predicted[i] == actual[i]
                    )
                    scored.add(letter)
                    settled += 1
                    if pts > 0:
                        gained += pts
                        db.add(FantasyLedger(user_id=pred.user_id, kind="earn", points=pts,
                                             reason="wc_group_prediction", ref=f"Group {letter}"))
                if scored != set(json.loads(pred.scored_groups or "[]")):
                    pred.scored_groups = json.dumps(sorted(scored))
                    pred.points_awarded = (pred.points_awarded or 0) + gained
                    if gained > 0:
                        await db.execute(
                            update(User).where(User.id == pred.user_id).values(
                                fantasy_points=func.coalesce(User.fantasy_points, 0) + gained,
                                fantasy_points_lifetime=func.coalesce(User.fantasy_points_lifetime, 0) + gained,
                            )
                        )
            except Exception as e:
                logger.error(f"WC settlement error for user {pred.user_id}: {e}")
        if settled:
            await db.commit()
            logger.info(f"WC settlement: settled {settled} group-results across {len(rows)} predictions")
    return settled
