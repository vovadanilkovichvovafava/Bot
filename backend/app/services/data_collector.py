"""
ML Data Collection Service.
Collects match data from API-Football for training ML models.
Runs hourly as a background task.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.database import async_session_maker
from app.models.ml_models import MatchFeature, LearningLog
from app.services.api_football import ApiFootballService

logger = logging.getLogger(__name__)

# Top-15 leagues by API-Football league IDs
TOP_LEAGUES = {
    39: "Premier League",       # England
    140: "La Liga",             # Spain
    135: "Serie A",             # Italy
    78: "Bundesliga",           # Germany
    61: "Ligue 1",             # France
    88: "Eredivisie",          # Netherlands
    94: "Liga Portugal",       # Portugal
    40: "Championship",        # England 2nd
    136: "Serie B",            # Italy 2nd
    79: "2. Bundesliga",       # Germany 2nd
    62: "Ligue 2",             # France 2nd
    203: "Super Lig",          # Turkey
    144: "Pro League",         # Belgium
    179: "Scottish Premiership", # Scotland
    333: "Ukrainian Premier League",  # Ukraine
}

# Rate limiting: max requests per minute
MAX_REQUESTS_PER_MINUTE = 10
_request_count = 0
_last_reset = datetime.utcnow()


async def _rate_limit():
    """Simple rate limiter for API-Football (they allow 100/min, we use 10/min to be safe)"""
    global _request_count, _last_reset
    now = datetime.utcnow()
    if (now - _last_reset).total_seconds() > 60:
        _request_count = 0
        _last_reset = now
    _request_count += 1
    if _request_count > MAX_REQUESTS_PER_MINUTE:
        wait = 60 - (now - _last_reset).total_seconds()
        if wait > 0:
            logger.info(f"Rate limit: waiting {wait:.0f}s")
            await asyncio.sleep(wait)
        _request_count = 0
        _last_reset = datetime.utcnow()


def _get_current_season() -> int:
    """Get current football season year (e.g. 2025 for 2025/26 season)"""
    now = datetime.utcnow()
    # Football seasons typically start in August
    return now.year if now.month >= 7 else now.year - 1


async def collect_daily_fixtures(date_str: str = None):
    """
    Collect all fixtures for a given date across top-15 leagues.
    Stores pre-match data (odds, predictions) and post-match results.
    """
    api = ApiFootballService()
    if not date_str:
        date_str = datetime.utcnow().strftime("%Y-%m-%d")

    logger.info(f"Collecting fixtures for {date_str}")

    await _rate_limit()
    all_fixtures = await api.get_fixtures_by_date(date_str)

    if not all_fixtures:
        logger.warning(f"No fixtures returned for {date_str}")
        return 0

    # Filter to top leagues only
    league_fixtures = [
        f for f in all_fixtures
        if f.get("league", {}).get("id") in TOP_LEAGUES
    ]

    logger.info(f"Found {len(league_fixtures)} fixtures in top-15 leagues (out of {len(all_fixtures)} total)")

    collected = 0
    async with async_session_maker() as db:
        for fixture in league_fixtures:
            try:
                fixture_id = fixture.get("fixture", {}).get("id")
                if not fixture_id:
                    continue

                # Check if already exists
                existing = await db.execute(
                    select(MatchFeature).where(MatchFeature.fixture_id == fixture_id)
                )
                if existing.scalar_one_or_none():
                    # Update results if match finished
                    await _update_results(db, fixture)
                    continue

                # Extract base data
                league = fixture.get("league", {})
                teams = fixture.get("teams", {})
                goals = fixture.get("goals", {})
                score = fixture.get("score", {})
                status = fixture.get("fixture", {}).get("status", {}).get("short", "")

                match_date_str = fixture.get("fixture", {}).get("date", "")
                try:
                    match_date = datetime.fromisoformat(match_date_str.replace("Z", "+00:00")).replace(tzinfo=None)
                except Exception:
                    match_date = datetime.utcnow()

                # Extract referee name
                referee_name = fixture.get("fixture", {}).get("referee")
                if referee_name and " - " in referee_name:
                    referee_name = referee_name.split(" - ")[0].strip()

                feature = MatchFeature(
                    fixture_id=fixture_id,
                    league_id=league.get("id"),
                    league_name=league.get("name"),
                    season=league.get("season"),
                    home_team_id=teams.get("home", {}).get("id"),
                    home_team_name=teams.get("home", {}).get("name", "Unknown"),
                    away_team_id=teams.get("away", {}).get("id"),
                    away_team_name=teams.get("away", {}).get("name", "Unknown"),
                    match_date=match_date,
                    referee_name=referee_name,
                )

                # If match is finished, add results immediately
                if status in ("FT", "AET", "PEN"):
                    home_goals = goals.get("home")
                    away_goals = goals.get("away")
                    if home_goals is not None and away_goals is not None:
                        feature.home_goals = home_goals
                        feature.away_goals = away_goals
                        feature.total_goals = home_goals + away_goals
                        feature.btts = home_goals > 0 and away_goals > 0
                        if home_goals > away_goals:
                            feature.result = "H"
                        elif away_goals > home_goals:
                            feature.result = "A"
                        else:
                            feature.result = "D"

                        # HT scores
                        ht = score.get("halftime", {})
                        if ht:
                            feature.ht_home_goals = ht.get("home")
                            feature.ht_away_goals = ht.get("away")
                            if feature.ht_home_goals is not None and feature.ht_away_goals is not None:
                                if feature.ht_home_goals > feature.ht_away_goals:
                                    feature.ht_result = "H"
                                elif feature.ht_away_goals > feature.ht_home_goals:
                                    feature.ht_result = "A"
                                else:
                                    feature.ht_result = "D"

                        feature.is_verified = True
                        feature.verified_at = datetime.utcnow()

                db.add(feature)
                collected += 1

            except Exception as e:
                logger.error(f"Error processing fixture {fixture.get('fixture', {}).get('id')}: {e}")
                continue

        if collected > 0:
            try:
                await db.commit()
                logger.info(f"Collected {collected} new fixtures for {date_str}")
            except Exception as e:
                logger.error(f"DB error committing fixtures: {e}")
                await db.rollback()

        # Log the collection event
        try:
            log_entry = LearningLog(
                event_type="data_collect",
                details_json=f'{{"date": "{date_str}", "collected": {collected}, "total_available": {len(league_fixtures)}}}'
            )
            db.add(log_entry)
            await db.commit()
        except Exception:
            await db.rollback()

    return collected


async def _update_results(db, fixture: dict):
    """Update an existing fixture with match results if now finished."""
    fixture_id = fixture.get("fixture", {}).get("id")
    status = fixture.get("fixture", {}).get("status", {}).get("short", "")

    if status not in ("FT", "AET", "PEN"):
        return

    goals = fixture.get("goals", {})
    home_goals = goals.get("home")
    away_goals = goals.get("away")

    if home_goals is None or away_goals is None:
        return

    result = await db.execute(
        select(MatchFeature).where(MatchFeature.fixture_id == fixture_id)
    )
    feature = result.scalar_one_or_none()
    if not feature or feature.is_verified:
        return

    feature.home_goals = home_goals
    feature.away_goals = away_goals
    feature.total_goals = home_goals + away_goals
    feature.btts = home_goals > 0 and away_goals > 0

    if home_goals > away_goals:
        feature.result = "H"
    elif away_goals > home_goals:
        feature.result = "A"
    else:
        feature.result = "D"

    score = fixture.get("score", {})
    ht = score.get("halftime", {})
    if ht:
        feature.ht_home_goals = ht.get("home")
        feature.ht_away_goals = ht.get("away")
        if feature.ht_home_goals is not None and feature.ht_away_goals is not None:
            if feature.ht_home_goals > feature.ht_away_goals:
                feature.ht_result = "H"
            elif feature.ht_away_goals > feature.ht_home_goals:
                feature.ht_result = "A"
            else:
                feature.ht_result = "D"

    feature.is_verified = True
    feature.verified_at = datetime.utcnow()

    logger.info(f"Updated results for fixture {fixture_id}: {home_goals}-{away_goals}")


async def enrich_fixture_data(fixture_id: int):
    """
    Enrich a fixture with odds, predictions, and statistics from API-Football.
    Called after basic fixture data is collected.
    """
    api = ApiFootballService()

    async with async_session_maker() as db:
        result = await db.execute(
            select(MatchFeature).where(MatchFeature.fixture_id == fixture_id)
        )
        feature = result.scalar_one_or_none()
        if not feature:
            return

        try:
            # Fetch odds
            await _rate_limit()
            odds_data = await api.get_odds(fixture_id)
            if odds_data:
                _extract_odds(feature, odds_data)

            # Fetch API prediction
            await _rate_limit()
            pred_data = await api.get_prediction(fixture_id)
            if pred_data:
                _extract_prediction(feature, pred_data)

            # Fetch injuries
            await _rate_limit()
            injuries_data = await api.get_injuries(fixture_id)
            if injuries_data:
                _extract_injuries(feature, injuries_data)

            # Calculate rest days (days since last match for each team)
            await _calculate_rest_days(db, feature)

            # Fetch statistics (if match is finished)
            if feature.is_verified:
                await _rate_limit()
                stats_data = await api.get_fixture_statistics(fixture_id)
                if stats_data:
                    _extract_statistics(feature, stats_data)

            await db.commit()
            logger.debug(f"Enriched fixture {fixture_id}")

        except Exception as e:
            logger.error(f"Error enriching fixture {fixture_id}: {e}")
            await db.rollback()


def _extract_odds(feature: MatchFeature, odds_data: list):
    """Extract betting odds from API-Football odds response."""
    if not odds_data:
        return

    # odds_data is a list of bookmakers
    for bookmaker in odds_data:
        bets = bookmaker.get("bets", [])
        for bet in bets:
            bet_name = bet.get("name", "")
            values = bet.get("values", [])

            if bet_name == "Match Winner":
                for v in values:
                    val = v.get("value", "")
                    odd = _safe_float(v.get("odd"))
                    if val == "Home" and odd:
                        feature.odds_home = odd
                    elif val == "Draw" and odd:
                        feature.odds_draw = odd
                    elif val == "Away" and odd:
                        feature.odds_away = odd

            elif bet_name == "Goals Over/Under" or bet_name == "Over/Under":
                for v in values:
                    val = v.get("value", "")
                    odd = _safe_float(v.get("odd"))
                    if "Over 2.5" in val and odd:
                        feature.odds_over25 = odd
                    elif "Under 2.5" in val and odd:
                        feature.odds_under25 = odd

            elif bet_name == "Both Teams Score":
                for v in values:
                    val = v.get("value", "")
                    odd = _safe_float(v.get("odd"))
                    if val == "Yes" and odd:
                        feature.odds_btts_yes = odd
                    elif val == "No" and odd:
                        feature.odds_btts_no = odd

        # We only need first bookmaker (usually most popular)
        break


def _extract_prediction(feature: MatchFeature, pred_data: dict):
    """Extract API-Football's own prediction data."""
    if not pred_data:
        return

    predictions = pred_data.get("predictions", {})
    percent = predictions.get("percent", {})

    feature.api_pred_home_pct = _safe_float(percent.get("home", "").replace("%", ""))
    feature.api_pred_draw_pct = _safe_float(percent.get("draw", "").replace("%", ""))
    feature.api_pred_away_pct = _safe_float(percent.get("away", "").replace("%", ""))


def _extract_statistics(feature: MatchFeature, stats_data: list):
    """Extract match statistics from API-Football."""
    if not stats_data or len(stats_data) < 2:
        return

    home_stats = {}
    away_stats = {}

    for team_data in stats_data:
        team_id = team_data.get("team", {}).get("id")
        stats = team_data.get("statistics", [])
        stat_dict = {}
        for s in stats:
            stat_dict[s.get("type", "")] = s.get("value")

        if team_id == feature.home_team_id:
            home_stats = stat_dict
        elif team_id == feature.away_team_id:
            away_stats = stat_dict

    # Corners
    feature.home_corners = _safe_int(home_stats.get("Corner Kicks"))
    feature.away_corners = _safe_int(away_stats.get("Corner Kicks"))
    if feature.home_corners is not None and feature.away_corners is not None:
        feature.total_corners = feature.home_corners + feature.away_corners

    # Cards
    feature.home_cards_yellow = _safe_int(home_stats.get("Yellow Cards"))
    feature.away_cards_yellow = _safe_int(away_stats.get("Yellow Cards"))
    if feature.home_cards_yellow is not None and feature.away_cards_yellow is not None:
        feature.total_cards = feature.home_cards_yellow + feature.away_cards_yellow

    # Shots
    feature.home_shots = _safe_int(home_stats.get("Total Shots"))
    feature.away_shots = _safe_int(away_stats.get("Total Shots"))
    feature.home_shots_on_target = _safe_int(home_stats.get("Shots on Goal"))
    feature.away_shots_on_target = _safe_int(away_stats.get("Shots on Goal"))


def _extract_injuries(feature: MatchFeature, injuries_data: list):
    """Extract injury/suspension data from API-Football."""
    if not injuries_data:
        return

    home_injuries = 0
    away_injuries = 0
    home_key = 0
    away_key = 0

    # Key positions that significantly impact team performance
    key_positions = {"Goalkeeper", "Attacker", "Midfielder"}

    for injury in injuries_data:
        team_id = injury.get("team", {}).get("id")
        player = injury.get("player", {})
        position = player.get("type", "")  # position type

        if team_id == feature.home_team_id:
            home_injuries += 1
            if position in key_positions:
                home_key += 1
        elif team_id == feature.away_team_id:
            away_injuries += 1
            if position in key_positions:
                away_key += 1

    feature.home_injuries_count = home_injuries
    feature.away_injuries_count = away_injuries
    feature.home_key_injuries = home_key
    feature.away_key_injuries = away_key


async def _calculate_rest_days(db, feature: MatchFeature):
    """Calculate days since last match for each team."""
    from sqlalchemy import or_, and_, desc

    if not feature.match_date or not feature.home_team_id or not feature.away_team_id:
        return

    # Home team's last match
    home_last = await db.execute(
        select(MatchFeature.match_date).where(
            and_(
                MatchFeature.match_date < feature.match_date,
                MatchFeature.is_verified == True,
                or_(
                    MatchFeature.home_team_id == feature.home_team_id,
                    MatchFeature.away_team_id == feature.home_team_id,
                ),
                MatchFeature.fixture_id != feature.fixture_id,
            )
        ).order_by(desc(MatchFeature.match_date)).limit(1)
    )
    home_last_date = home_last.scalar_one_or_none()
    if home_last_date:
        feature.home_rest_days = (feature.match_date - home_last_date).days

    # Away team's last match
    away_last = await db.execute(
        select(MatchFeature.match_date).where(
            and_(
                MatchFeature.match_date < feature.match_date,
                MatchFeature.is_verified == True,
                or_(
                    MatchFeature.home_team_id == feature.away_team_id,
                    MatchFeature.away_team_id == feature.away_team_id,
                ),
                MatchFeature.fixture_id != feature.fixture_id,
            )
        ).order_by(desc(MatchFeature.match_date)).limit(1)
    )
    away_last_date = away_last.scalar_one_or_none()
    if away_last_date:
        feature.away_rest_days = (feature.match_date - away_last_date).days

    # Rest difference
    if feature.home_rest_days is not None and feature.away_rest_days is not None:
        feature.rest_days_diff = feature.home_rest_days - feature.away_rest_days


def _safe_float(val) -> Optional[float]:
    """Safely convert to float."""
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _safe_int(val) -> Optional[int]:
    """Safely convert to int."""
    if val is None:
        return None
    try:
        if isinstance(val, str) and "%" in val:
            return None
        return int(val)
    except (ValueError, TypeError):
        return None


async def collect_and_enrich_daily(date_str: str = None):
    """
    Full daily collection: fixtures + enrichment (odds, predictions, stats).
    """
    collected = await collect_daily_fixtures(date_str)

    if collected == 0:
        return 0

    # Enrich recently collected fixtures
    async with async_session_maker() as db:
        # Get fixtures that haven't been enriched yet (no odds data)
        result = await db.execute(
            select(MatchFeature.fixture_id).where(
                MatchFeature.odds_home.is_(None),
                MatchFeature.match_date >= datetime.utcnow() - timedelta(days=2),
            ).limit(50)
        )
        fixture_ids = [r[0] for r in result.all()]

    enriched = 0
    for fid in fixture_ids:
        try:
            await enrich_fixture_data(fid)
            enriched += 1
            # Rate limiting between enrichment calls
            await asyncio.sleep(2)
        except Exception as e:
            logger.error(f"Error enriching fixture {fid}: {e}")

    logger.info(f"Collection complete: {collected} new fixtures, {enriched} enriched")
    return collected


async def backfill_historical(days: int = 90):
    """
    Backfill historical data for the last N days.
    Used for initial model training data collection.
    """
    logger.info(f"Starting historical backfill for {days} days")
    total = 0

    for i in range(days, 0, -1):
        date = datetime.utcnow() - timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")

        try:
            count = await collect_daily_fixtures(date_str)
            total += count

            # Be gentle with API rate limits during backfill
            await asyncio.sleep(6)  # ~10 requests per minute

            if i % 10 == 0:
                logger.info(f"Backfill progress: {days - i}/{days} days, {total} fixtures collected")
        except Exception as e:
            logger.error(f"Backfill error for {date_str}: {e}")
            await asyncio.sleep(10)

    logger.info(f"Backfill complete: {total} fixtures collected over {days} days")
    return total


async def data_collection_loop():
    """
    Background task: collect data every hour.
    On first run, triggers backfill if DB is empty.
    """
    logger.info("Data collection worker started")

    # Check if we need initial backfill
    async with async_session_maker() as db:
        result = await db.execute(select(func.count(MatchFeature.id)))
        count = result.scalar() or 0

    if count < 100:
        logger.info("Less than 100 training samples, starting 30-day backfill")
        try:
            await backfill_historical(days=30)
        except Exception as e:
            logger.error(f"Backfill error: {e}")

    while True:
        try:
            # Collect today's fixtures
            await collect_and_enrich_daily()

            # Also check yesterday (for late-finishing matches)
            yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
            await collect_daily_fixtures(yesterday)

        except Exception as e:
            logger.error(f"Data collection loop error: {e}")

        # Sleep 1 hour
        await asyncio.sleep(60 * 60)
