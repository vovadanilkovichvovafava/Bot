"""
Feature Engineering Service for ML Pipeline.
Computes Elo ratings, form, H2H statistics, and builds feature vectors.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select, func, and_, or_, case, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.models.ml_models import MatchFeature, EloRating, LearningLog

logger = logging.getLogger(__name__)

# Elo configuration
ELO_DEFAULT = 1500.0
ELO_K_ESTABLISHED = 20  # K-factor for teams with 10+ matches
ELO_K_NEW = 40           # K-factor for teams with < 10 matches
HOME_ADVANTAGE = 65       # ~65 Elo points home advantage


def calculate_expected_score(rating_a: float, rating_b: float) -> float:
    """Calculate expected score using Elo formula."""
    return 1.0 / (1.0 + 10 ** ((rating_b - rating_a) / 400.0))


def calculate_elo_change(
    home_elo: float, away_elo: float,
    home_goals: int, away_goals: int,
    home_matches: int, away_matches: int
) -> Tuple[float, float]:
    """
    Calculate Elo rating changes after a match.
    Returns (home_change, away_change).
    """
    # Apply home advantage
    adjusted_home = home_elo + HOME_ADVANTAGE

    # Expected scores
    home_expected = calculate_expected_score(adjusted_home, away_elo)
    away_expected = 1.0 - home_expected

    # Actual scores (1 = win, 0.5 = draw, 0 = loss)
    if home_goals > away_goals:
        home_actual, away_actual = 1.0, 0.0
    elif home_goals < away_goals:
        home_actual, away_actual = 0.0, 1.0
    else:
        home_actual, away_actual = 0.5, 0.5

    # Goal difference multiplier (bigger wins = bigger Elo change)
    goal_diff = abs(home_goals - away_goals)
    if goal_diff <= 1:
        gd_mult = 1.0
    elif goal_diff == 2:
        gd_mult = 1.5
    elif goal_diff == 3:
        gd_mult = 1.75
    else:
        gd_mult = 1.75 + (goal_diff - 3) * 0.125

    # K-factor based on experience
    k_home = ELO_K_NEW if home_matches < 10 else ELO_K_ESTABLISHED
    k_away = ELO_K_NEW if away_matches < 10 else ELO_K_ESTABLISHED

    home_change = k_home * gd_mult * (home_actual - home_expected)
    away_change = k_away * gd_mult * (away_actual - away_expected)

    return home_change, away_change


async def get_or_create_elo(db: AsyncSession, team_id: int, team_name: str, league_id: int, league_name: str = None) -> EloRating:
    """Get existing Elo rating or create new one with default."""
    result = await db.execute(
        select(EloRating).where(
            and_(EloRating.team_id == team_id, EloRating.league_id == league_id)
        )
    )
    elo = result.scalar_one_or_none()

    if not elo:
        elo = EloRating(
            team_id=team_id,
            team_name=team_name,
            league_id=league_id,
            league_name=league_name,
            elo_rating=ELO_DEFAULT,
            matches_played=0,
            wins=0, draws=0, losses=0,
            goals_scored=0, goals_conceded=0,
            current_streak=0,
            home_matches=0, home_wins=0,
            away_matches=0, away_wins=0,
        )
        db.add(elo)
        await db.flush()

    return elo


async def update_elo_after_match(
    db: AsyncSession,
    home_team_id: int, away_team_id: int,
    home_team_name: str, away_team_name: str,
    league_id: int, league_name: str,
    home_goals: int, away_goals: int
):
    """Update Elo ratings for both teams after a match result."""
    home_elo = await get_or_create_elo(db, home_team_id, home_team_name, league_id, league_name)
    away_elo = await get_or_create_elo(db, away_team_id, away_team_name, league_id, league_name)

    # Calculate changes
    home_change, away_change = calculate_elo_change(
        home_elo.elo_rating, away_elo.elo_rating,
        home_goals, away_goals,
        home_elo.matches_played, away_elo.matches_played
    )

    # Update home team
    home_elo.elo_rating += home_change
    home_elo.matches_played += 1
    home_elo.goals_scored += home_goals
    home_elo.goals_conceded += away_goals
    home_elo.home_matches += 1
    home_elo.last_updated = datetime.utcnow()

    if home_goals > away_goals:
        home_elo.wins += 1
        home_elo.home_wins += 1
        home_elo.current_streak = max(1, home_elo.current_streak + 1) if home_elo.current_streak >= 0 else 1
    elif home_goals < away_goals:
        home_elo.losses += 1
        home_elo.current_streak = min(-1, home_elo.current_streak - 1) if home_elo.current_streak <= 0 else -1
    else:
        home_elo.draws += 1
        home_elo.current_streak = 0

    # Update away team
    away_elo.elo_rating += away_change
    away_elo.matches_played += 1
    away_elo.goals_scored += away_goals
    away_elo.goals_conceded += home_goals
    away_elo.away_matches += 1
    away_elo.last_updated = datetime.utcnow()

    if away_goals > home_goals:
        away_elo.wins += 1
        away_elo.away_wins += 1
        away_elo.current_streak = max(1, away_elo.current_streak + 1) if away_elo.current_streak >= 0 else 1
    elif away_goals < home_goals:
        away_elo.losses += 1
        away_elo.current_streak = min(-1, away_elo.current_streak - 1) if away_elo.current_streak <= 0 else -1
    else:
        away_elo.draws += 1
        away_elo.current_streak = 0

    logger.debug(
        f"Elo update: {home_team_name} {home_elo.elo_rating:.0f} ({home_change:+.1f}) vs "
        f"{away_team_name} {away_elo.elo_rating:.0f} ({away_change:+.1f})"
    )


async def calculate_form(db: AsyncSession, team_id: int, league_id: int, before_date: datetime, last_n: int = 5) -> Dict:
    """
    Calculate team form from last N matches.
    Returns dict with form stats.
    """
    # Get last N matches for this team (home or away)
    result = await db.execute(
        select(MatchFeature).where(
            and_(
                MatchFeature.league_id == league_id,
                MatchFeature.is_verified == True,
                MatchFeature.match_date < before_date,
                or_(
                    MatchFeature.home_team_id == team_id,
                    MatchFeature.away_team_id == team_id,
                )
            )
        ).order_by(desc(MatchFeature.match_date)).limit(last_n)
    )
    matches = result.scalars().all()

    if not matches:
        return {
            "form_points": None, "goals_scored": None, "goals_conceded": None,
            "wins": 0, "draws": 0, "losses": 0,
        }

    points = 0
    goals_scored = 0
    goals_conceded = 0
    wins = draws = losses = 0

    for m in matches:
        is_home = m.home_team_id == team_id
        if is_home:
            gs = m.home_goals or 0
            gc = m.away_goals or 0
        else:
            gs = m.away_goals or 0
            gc = m.home_goals or 0

        goals_scored += gs
        goals_conceded += gc

        if gs > gc:
            points += 3
            wins += 1
        elif gs == gc:
            points += 1
            draws += 1
        else:
            losses += 1

    n = len(matches)
    return {
        "form_points": float(points),
        "goals_scored": round(goals_scored / n, 2),
        "goals_conceded": round(goals_conceded / n, 2),
        "wins": wins,
        "draws": draws,
        "losses": losses,
    }


async def calculate_h2h(db: AsyncSession, home_team_id: int, away_team_id: int, before_date: datetime, last_n: int = 10) -> Dict:
    """Calculate head-to-head stats between two teams."""
    result = await db.execute(
        select(MatchFeature).where(
            and_(
                MatchFeature.is_verified == True,
                MatchFeature.match_date < before_date,
                or_(
                    and_(
                        MatchFeature.home_team_id == home_team_id,
                        MatchFeature.away_team_id == away_team_id,
                    ),
                    and_(
                        MatchFeature.home_team_id == away_team_id,
                        MatchFeature.away_team_id == home_team_id,
                    ),
                )
            )
        ).order_by(desc(MatchFeature.match_date)).limit(last_n)
    )
    matches = result.scalars().all()

    if not matches:
        return {"home_wins": 0, "draws": 0, "away_wins": 0, "total_goals_avg": None}

    home_wins = 0
    draws = 0
    away_wins = 0
    total_goals = 0

    for m in matches:
        hg = m.home_goals or 0
        ag = m.away_goals or 0
        total_goals += hg + ag

        # Determine winner relative to the home_team_id we're asking about
        if m.home_team_id == home_team_id:
            if hg > ag:
                home_wins += 1
            elif hg < ag:
                away_wins += 1
            else:
                draws += 1
        else:
            # Roles are reversed in this match
            if ag > hg:
                home_wins += 1
            elif ag < hg:
                away_wins += 1
            else:
                draws += 1

    n = len(matches)
    return {
        "home_wins": home_wins,
        "draws": draws,
        "away_wins": away_wins,
        "total_goals_avg": round(total_goals / n, 2),
    }


async def calculate_home_away_rates(db: AsyncSession, team_id: int, league_id: int, before_date: datetime) -> Dict:
    """Calculate home win rate and away win rate."""
    # Home win rate
    home_result = await db.execute(
        select(
            func.count(MatchFeature.id).label("total"),
            func.sum(case((MatchFeature.result == "H", 1), else_=0)).label("wins"),
        ).where(
            and_(
                MatchFeature.league_id == league_id,
                MatchFeature.home_team_id == team_id,
                MatchFeature.is_verified == True,
                MatchFeature.match_date < before_date,
            )
        )
    )
    home_row = home_result.one()
    home_total = home_row.total or 0
    home_wins = home_row.wins or 0

    # Away win rate
    away_result = await db.execute(
        select(
            func.count(MatchFeature.id).label("total"),
            func.sum(case((MatchFeature.result == "A", 1), else_=0)).label("wins"),
        ).where(
            and_(
                MatchFeature.league_id == league_id,
                MatchFeature.away_team_id == team_id,
                MatchFeature.is_verified == True,
                MatchFeature.match_date < before_date,
            )
        )
    )
    away_row = away_result.one()
    away_total = away_row.total or 0
    away_wins = away_row.wins or 0

    return {
        "home_win_rate": round(home_wins / home_total, 3) if home_total > 0 else None,
        "away_win_rate": round(away_wins / away_total, 3) if away_total > 0 else None,
    }


async def calculate_avg_stats(db: AsyncSession, team_id: int, league_id: int, before_date: datetime, last_n: int = 10) -> Dict:
    """Calculate average match statistics (shots, corners, cards) for a team."""
    result = await db.execute(
        select(MatchFeature).where(
            and_(
                MatchFeature.league_id == league_id,
                MatchFeature.is_verified == True,
                MatchFeature.match_date < before_date,
                or_(
                    MatchFeature.home_team_id == team_id,
                    MatchFeature.away_team_id == team_id,
                )
            )
        ).order_by(desc(MatchFeature.match_date)).limit(last_n)
    )
    matches = result.scalars().all()

    if not matches:
        return {"shots_avg": None, "shots_on_target_avg": None, "corners_avg": None, "cards_avg": None}

    shots = []
    sot = []
    corners = []
    cards = []

    for m in matches:
        is_home = m.home_team_id == team_id
        if is_home:
            if m.home_shots is not None:
                shots.append(m.home_shots)
            if m.home_shots_on_target is not None:
                sot.append(m.home_shots_on_target)
            if m.home_corners is not None:
                corners.append(m.home_corners)
            if m.home_cards_yellow is not None:
                cards.append(m.home_cards_yellow)
        else:
            if m.away_shots is not None:
                shots.append(m.away_shots)
            if m.away_shots_on_target is not None:
                sot.append(m.away_shots_on_target)
            if m.away_corners is not None:
                corners.append(m.away_corners)
            if m.away_cards_yellow is not None:
                cards.append(m.away_cards_yellow)

    return {
        "shots_avg": round(sum(shots) / len(shots), 2) if shots else None,
        "shots_on_target_avg": round(sum(sot) / len(sot), 2) if sot else None,
        "corners_avg": round(sum(corners) / len(corners), 2) if corners else None,
        "cards_avg": round(sum(cards) / len(cards), 2) if cards else None,
    }


async def enrich_features_for_match(db: AsyncSession, feature: MatchFeature):
    """
    Compute and fill all pre-match features for a MatchFeature record.
    Called before prediction or when building training data.
    """
    if not feature.home_team_id or not feature.away_team_id:
        return

    match_date = feature.match_date or datetime.utcnow()
    league_id = feature.league_id

    # 1. Elo ratings
    home_elo = await get_or_create_elo(db, feature.home_team_id, feature.home_team_name, league_id, feature.league_name)
    away_elo = await get_or_create_elo(db, feature.away_team_id, feature.away_team_name, league_id, feature.league_name)

    feature.home_elo = home_elo.elo_rating
    feature.away_elo = away_elo.elo_rating
    feature.elo_diff = home_elo.elo_rating - away_elo.elo_rating

    # 2. Form (last 5)
    home_form = await calculate_form(db, feature.home_team_id, league_id, match_date, last_n=5)
    away_form = await calculate_form(db, feature.away_team_id, league_id, match_date, last_n=5)

    feature.home_form_points = home_form["form_points"]
    feature.away_form_points = away_form["form_points"]
    feature.home_form_goals_scored = home_form["goals_scored"]
    feature.home_form_goals_conceded = home_form["goals_conceded"]
    feature.away_form_goals_scored = away_form["goals_scored"]
    feature.away_form_goals_conceded = away_form["goals_conceded"]
    feature.home_form_wins = home_form["wins"]
    feature.home_form_draws = home_form["draws"]
    feature.home_form_losses = home_form["losses"]
    feature.away_form_wins = away_form["wins"]
    feature.away_form_draws = away_form["draws"]
    feature.away_form_losses = away_form["losses"]

    # 3. H2H
    h2h = await calculate_h2h(db, feature.home_team_id, feature.away_team_id, match_date, last_n=10)
    feature.h2h_home_wins = h2h["home_wins"]
    feature.h2h_draws = h2h["draws"]
    feature.h2h_away_wins = h2h["away_wins"]
    feature.h2h_total_goals_avg = h2h["total_goals_avg"]

    # 4. Home/Away rates
    home_rates = await calculate_home_away_rates(db, feature.home_team_id, league_id, match_date)
    away_rates = await calculate_home_away_rates(db, feature.away_team_id, league_id, match_date)
    feature.home_home_win_rate = home_rates["home_win_rate"]
    feature.away_away_win_rate = away_rates["away_win_rate"]

    # 5. Average stats
    home_stats = await calculate_avg_stats(db, feature.home_team_id, league_id, match_date)
    away_stats = await calculate_avg_stats(db, feature.away_team_id, league_id, match_date)
    feature.home_shots_avg = home_stats["shots_avg"]
    feature.away_shots_avg = away_stats["shots_avg"]
    feature.home_shots_on_target_avg = home_stats["shots_on_target_avg"]
    feature.away_shots_on_target_avg = away_stats["shots_on_target_avg"]
    feature.home_corners_avg = home_stats["corners_avg"]
    feature.away_corners_avg = away_stats["corners_avg"]
    feature.home_cards_avg = home_stats["cards_avg"]
    feature.away_cards_avg = away_stats["cards_avg"]

    # 6. League position (from standings if available — placeholder)
    # Positions need standings data which is fetched separately
    # For now, position_diff stays null until we add standings integration

    logger.debug(f"Features enriched for {feature.home_team_name} vs {feature.away_team_name}")


async def build_feature_vector(feature: MatchFeature) -> Optional[List[float]]:
    """
    Build a numeric feature vector from a MatchFeature record.
    Returns list of floats suitable for ML model input.
    Returns None if critical features are missing.
    """
    # Core features (must have at least Elo)
    if feature.home_elo is None or feature.away_elo is None:
        return None

    def safe(val, default=0.0):
        return float(val) if val is not None else default

    vector = [
        # Elo features (3)
        safe(feature.home_elo),
        safe(feature.away_elo),
        safe(feature.elo_diff),

        # Form features (12)
        safe(feature.home_form_points, 7.5),   # neutral default
        safe(feature.away_form_points, 7.5),
        safe(feature.home_form_goals_scored, 1.3),
        safe(feature.home_form_goals_conceded, 1.3),
        safe(feature.away_form_goals_scored, 1.3),
        safe(feature.away_form_goals_conceded, 1.3),
        safe(feature.home_form_wins, 2),
        safe(feature.home_form_draws, 1),
        safe(feature.home_form_losses, 2),
        safe(feature.away_form_wins, 2),
        safe(feature.away_form_draws, 1),
        safe(feature.away_form_losses, 2),

        # H2H features (4)
        safe(feature.h2h_home_wins),
        safe(feature.h2h_draws),
        safe(feature.h2h_away_wins),
        safe(feature.h2h_total_goals_avg, 2.5),

        # Odds features (7)
        safe(feature.odds_home, 2.5),
        safe(feature.odds_draw, 3.3),
        safe(feature.odds_away, 3.0),
        safe(feature.odds_over25, 1.9),
        safe(feature.odds_under25, 1.9),
        safe(feature.odds_btts_yes, 1.8),
        safe(feature.odds_btts_no, 1.9),

        # Implied probabilities from odds (3) — more useful than raw odds
        1.0 / safe(feature.odds_home, 2.5) if safe(feature.odds_home, 2.5) > 0 else 0.4,
        1.0 / safe(feature.odds_draw, 3.3) if safe(feature.odds_draw, 3.3) > 0 else 0.3,
        1.0 / safe(feature.odds_away, 3.0) if safe(feature.odds_away, 3.0) > 0 else 0.3,

        # Home/Away advantage (2)
        safe(feature.home_home_win_rate, 0.45),
        safe(feature.away_away_win_rate, 0.30),

        # Avg stats (8)
        safe(feature.home_shots_avg, 12.0),
        safe(feature.away_shots_avg, 11.0),
        safe(feature.home_shots_on_target_avg, 4.0),
        safe(feature.away_shots_on_target_avg, 3.5),
        safe(feature.home_corners_avg, 5.0),
        safe(feature.away_corners_avg, 4.5),
        safe(feature.home_cards_avg, 1.8),
        safe(feature.away_cards_avg, 1.8),

        # API prediction (3)
        safe(feature.api_pred_home_pct, 40.0) / 100.0,
        safe(feature.api_pred_draw_pct, 25.0) / 100.0,
        safe(feature.api_pred_away_pct, 35.0) / 100.0,

        # xG (2)
        safe(feature.home_xg, 1.3),
        safe(feature.away_xg, 1.1),

        # ========== ADVANCED FEATURES ==========

        # Referee stats (4) — cards-heavy ref = more cards in match
        safe(feature.referee_avg_fouls, 25.0),
        safe(feature.referee_avg_yellow, 3.5),
        safe(feature.referee_avg_red, 0.15),
        safe(feature.referee_avg_penalties, 0.2),

        # Injuries (4) — more injuries = weaker team
        safe(feature.home_injuries_count, 1),
        safe(feature.away_injuries_count, 1),
        safe(feature.home_key_injuries, 0),
        safe(feature.away_key_injuries, 0),

        # Rest days (3) — fewer rest = more tired = worse performance
        safe(feature.home_rest_days, 7),
        safe(feature.away_rest_days, 7),
        safe(feature.rest_days_diff, 0),

        # Weather (3) — extreme weather affects Over/Under and play style
        safe(feature.temperature_c, 18.0),
        safe(feature.wind_speed_kmh, 10.0),
        safe(feature.humidity_pct, 60.0),
    ]

    return vector


# Feature names corresponding to build_feature_vector output (58 features total)
FEATURE_NAMES = [
    "home_elo", "away_elo", "elo_diff",
    "home_form_points", "away_form_points",
    "home_form_gs", "home_form_gc", "away_form_gs", "away_form_gc",
    "home_form_w", "home_form_d", "home_form_l",
    "away_form_w", "away_form_d", "away_form_l",
    "h2h_home_wins", "h2h_draws", "h2h_away_wins", "h2h_goals_avg",
    "odds_home", "odds_draw", "odds_away",
    "odds_over25", "odds_under25", "odds_btts_yes", "odds_btts_no",
    "implied_home", "implied_draw", "implied_away",
    "home_win_rate_home", "away_win_rate_away",
    "home_shots_avg", "away_shots_avg",
    "home_sot_avg", "away_sot_avg",
    "home_corners_avg", "away_corners_avg",
    "home_cards_avg", "away_cards_avg",
    "api_pred_home", "api_pred_draw", "api_pred_away",
    "home_xg", "away_xg",
    # Advanced features
    "ref_avg_fouls", "ref_avg_yellow", "ref_avg_red", "ref_avg_penalties",
    "home_injuries", "away_injuries", "home_key_injuries", "away_key_injuries",
    "home_rest_days", "away_rest_days", "rest_days_diff",
    "temperature", "wind_speed", "humidity",
]


async def enrich_all_unenriched(limit: int = 100):
    """
    Batch process: enrich features for all MatchFeature records
    that don't have Elo data yet.
    """
    async with async_session_maker() as db:
        result = await db.execute(
            select(MatchFeature).where(
                MatchFeature.home_elo.is_(None),
            ).order_by(MatchFeature.match_date.asc()).limit(limit)
        )
        features = result.scalars().all()

        if not features:
            logger.info("No unenriched features found")
            return 0

        enriched = 0
        for feature in features:
            try:
                await enrich_features_for_match(db, feature)
                enriched += 1
            except Exception as e:
                logger.error(f"Error enriching feature {feature.fixture_id}: {e}")

        try:
            await db.commit()
            logger.info(f"Enriched {enriched} features")
        except Exception as e:
            logger.error(f"DB error committing enriched features: {e}")
            await db.rollback()

        return enriched


async def process_verified_matches():
    """
    Process newly verified matches:
    1. Update Elo ratings
    2. Enrich features
    Called after prediction verification.
    """
    async with async_session_maker() as db:
        # Find verified matches that haven't had Elo updated
        # (have results but Elo is still default or null)
        result = await db.execute(
            select(MatchFeature).where(
                and_(
                    MatchFeature.is_verified == True,
                    MatchFeature.home_elo.is_(None),
                    MatchFeature.home_goals.isnot(None),
                )
            ).order_by(MatchFeature.match_date.asc()).limit(200)
        )
        matches = result.scalars().all()

        if not matches:
            return 0

        processed = 0
        for match in matches:
            try:
                # Update Elo
                await update_elo_after_match(
                    db,
                    match.home_team_id, match.away_team_id,
                    match.home_team_name, match.away_team_name,
                    match.league_id, match.league_name,
                    match.home_goals, match.away_goals,
                )

                # Enrich features
                await enrich_features_for_match(db, match)
                processed += 1

            except Exception as e:
                logger.error(f"Error processing match {match.fixture_id}: {e}")

        try:
            await db.commit()

            # Log event
            log = LearningLog(
                event_type="elo_update",
                details_json=f'{{"processed": {processed}, "matches": {len(matches)}}}'
            )
            db.add(log)
            await db.commit()

            logger.info(f"Processed {processed} verified matches (Elo + features)")
        except Exception as e:
            logger.error(f"DB error: {e}")
            await db.rollback()

        return processed
