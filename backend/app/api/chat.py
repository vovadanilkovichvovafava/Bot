from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta, date
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.core.security import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.football_api import fetch_matches, fetch_team_form, fetch_standings
from app.services.odds_api import get_odds_summary

router = APIRouter()
logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class UserPreferences(BaseModel):
    min_odds: float = 1.5
    max_odds: float = 3.0
    risk_level: str = "medium"  # low, medium, high


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    preferences: Optional[UserPreferences] = None


class ChatResponse(BaseModel):
    response: str
    matches_context: Optional[List[dict]] = None


SYSTEM_PROMPT_BASE = """You are a professional AI football match analyst. Your task is to provide quality match analysis to assist with betting decisions.

## Your capabilities:
1. Analysis of specific matches (teams, form, statistics)
2. Predictions with probabilities (win, draw, totals, both teams to score)
3. Overview of today's/tomorrow's matches by league
4. Betting recommendations with reasoning

## Match analysis format:
When the user asks about a specific match, provide a detailed analysis:

**⚽ [Team1] vs [Team2]**
🏆 [League] | 📅 [Date/Time]

**📊 Analysis:**
• Team form (recent matches)
• Head-to-head (H2H)
• Key factors (injuries, motivation, home/away stats)

**🎯 Prediction:**
• Home Win: XX%
• Draw: XX%
• Away Win: XX%
• Over 2.5: XX%
• BTTS: XX%

**💡 Recommendation:**
[Specific bet with odds and reasoning]

**💰 Suggested Stake:** [Based on user's risk profile]

**⚠️ Risk:** [low/medium/high]

---
⚠️ Betting involves risk. Please gamble responsibly.

## Rules:
1. Always respond in English
2. Use markdown and emojis for readability
3. Provide specific percentages and recommendations
4. Base analysis on real team statistics
5. If a match is not found in the list - use your knowledge about the teams
6. Always add a responsible gambling warning
7. Indicate confidence level in the prediction
8. If real bookmaker odds are available - use them in recommendations
9. IMPORTANT: Follow user's betting preferences for recommendations"""


def build_system_prompt(preferences: Optional[UserPreferences] = None) -> str:
    """Build system prompt with user preferences"""
    prompt = SYSTEM_PROMPT_BASE

    if preferences:
        risk_stakes = {
            "low": "1-2% of bankroll (conservative)",
            "medium": "2-5% of bankroll (balanced)",
            "high": "5-10% of bankroll (aggressive)"
        }
        stake_suggestion = risk_stakes.get(preferences.risk_level, risk_stakes["medium"])

        prompt += f"""

## ⚠️ CRITICAL - User's Betting Preferences (MUST FOLLOW):
- **REQUIRED odds range:** {preferences.min_odds} - {preferences.max_odds}
- **Risk profile:** {preferences.risk_level.upper()}
- **Suggested stake per bet:** {stake_suggestion}

### STRICT RULES FOR RECOMMENDATIONS:
1. **NEVER recommend bets with odds below {preferences.min_odds}** - this is the user's minimum!
2. **NEVER recommend bets with odds above {preferences.max_odds}** - this is the user's maximum!
3. If the most likely outcome has odds outside {preferences.min_odds}-{preferences.max_odds}, find an alternative bet WITHIN this range
4. Examples of bets that fit {preferences.min_odds}-{preferences.max_odds} odds range:
   - If min is 3.0+: correct scores, handicaps, accumulators, BTTS+Over, first goalscorer
   - If max is under 2.0: heavy favorites, double chance, under goals
5. Always state the odds next to each recommendation and verify they're within range

For {preferences.risk_level.upper()} risk profile:
- LOW: focus on safer bets like double chance, under goals
- MEDIUM: balanced 1X2, over/under, BTTS
- HIGH: accumulators, correct scores, Asian handicaps, combo bets"""

    return prompt


async def get_matches_context() -> List[dict]:
    """Fetch current matches for AI context"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")

    matches = await fetch_matches(date_from=today, date_to=tomorrow)

    # Simplify for context
    return [
        {
            "id": m.get("id"),
            "home": m.get("home_team", {}).get("name"),
            "away": m.get("away_team", {}).get("name"),
            "league": m.get("league"),
            "league_code": m.get("league_code"),
            "date": m.get("match_date"),
            "matchday": m.get("matchday"),
            "status": m.get("status"),
        }
        for m in (matches or [])
    ]


def format_matches_for_context(matches: List[dict]) -> str:
    """Format matches list for AI context"""
    if not matches:
        return "\n\nNo matches scheduled for today or tomorrow in major leagues."

    context = "\n\n## Matches for today and tomorrow:\n"

    # Group by league
    by_league = {}
    for m in matches:
        league = m.get('league', 'Unknown')
        if league not in by_league:
            by_league[league] = []
        by_league[league].append(m)

    for league, league_matches in by_league.items():
        context += f"\n**{league}:**\n"
        for m in league_matches[:10]:  # Max 10 per league
            date_str = m.get('date', '')
            if date_str:
                try:
                    dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    date_str = dt.strftime('%d.%m %H:%M')
                except:
                    pass
            context += f"• {m['home']} vs {m['away']} ({date_str})\n"

    return context


def extract_teams_from_query(query: str, matches: List[dict]) -> tuple:
    """Try to extract team names from user query"""
    query_lower = query.lower()

    # Check if query mentions a specific match from our list
    for m in matches:
        home = m.get('home', '').lower()
        away = m.get('away', '').lower()
        league_code = m.get('league_code', 'PL')
        match_id = m.get('id')

        if home and away:
            if home in query_lower or away in query_lower:
                return (m.get('home'), m.get('away'), league_code, match_id, m.get('date'))

    # Try to find "vs" pattern
    if ' vs ' in query_lower:
        parts = query_lower.split(' vs ')
        if len(parts) == 2:
            return (parts[0].strip(), parts[1].strip(), 'PL', None, None)

    return (None, None, None, None, None)


async def get_ml_prediction(
    db: AsyncSession,
    home_team: str,
    away_team: str,
    league_code: str,
    odds: Dict = None,
) -> Optional[Dict]:
    """Get ML prediction for a match"""
    try:
        from app.ml import MLPredictorService, FeatureExtractor, BET_CATEGORIES

        extractor = FeatureExtractor()
        predictor = MLPredictorService(db)

        # Fetch team form data
        home_form = await fetch_team_form(home_team, league_code)
        away_form = await fetch_team_form(away_team, league_code)

        # Fetch standings
        standings_list = await fetch_standings(league_code)
        standings = {s["team"]: {"position": s["position"]} for s in standings_list}

        # Extract features
        features = extractor.extract(
            home_form=home_form,
            away_form=away_form,
            standings=standings,
            odds=odds,
            home_team=home_team,
            away_team=away_team,
        )

        # Get predictions for all categories
        predictions = {}
        for category in BET_CATEGORIES:
            try:
                result = await predictor.get_calibrated_prediction(features, category)
                if result.get("available"):
                    predictions[category] = {
                        "confidence": round(result["confidence"], 1),
                        "prediction": result["prediction"],
                        "agreement": round(result["agreement"] * 100, 1),
                        "ev": result.get("ev"),
                        "stake": result.get("stake_percent"),
                    }
            except Exception as e:
                logger.warning(f"ML prediction error for {category}: {e}")

        if predictions:
            return {
                "predictions": predictions,
                "features_summary": {
                    "home_form": f"{home_form.get('wins', 0)}W-{home_form.get('draws', 0)}D-{home_form.get('losses', 0)}L" if home_form else "N/A",
                    "away_form": f"{away_form.get('wins', 0)}W-{away_form.get('draws', 0)}D-{away_form.get('losses', 0)}L" if away_form else "N/A",
                    "home_position": standings.get(home_team, {}).get("position", "N/A"),
                    "away_position": standings.get(away_team, {}).get("position", "N/A"),
                },
                "features": features,
            }

    except ImportError:
        logger.warning("ML libraries not available")
    except Exception as e:
        logger.error(f"ML prediction error: {e}")

    return None


def format_ml_context(ml_data: Dict) -> str:
    """Format ML predictions for Claude context"""
    if not ml_data:
        return ""

    context = "\n\n[ML MODEL PREDICTIONS - use these as guidance:]"

    predictions = ml_data.get("predictions", {})

    if "outcomes_home" in predictions:
        p = predictions["outcomes_home"]
        context += f"\n• Home Win: {p['confidence']}% confidence (agreement: {p['agreement']}%)"

    if "outcomes_away" in predictions:
        p = predictions["outcomes_away"]
        context += f"\n• Away Win: {p['confidence']}% confidence (agreement: {p['agreement']}%)"

    if "outcomes_draw" in predictions:
        p = predictions["outcomes_draw"]
        context += f"\n• Draw: {p['confidence']}% confidence (agreement: {p['agreement']}%)"

    if "totals_over" in predictions:
        p = predictions["totals_over"]
        context += f"\n• Over 2.5: {p['confidence']}% confidence"

    if "btts" in predictions:
        p = predictions["btts"]
        context += f"\n• BTTS: {p['confidence']}% confidence"

    summary = ml_data.get("features_summary", {})
    if summary:
        context += f"\n[Form: Home {summary.get('home_form', 'N/A')}, Away {summary.get('away_form', 'N/A')}]"
        context += f"\n[Positions: Home #{summary.get('home_position', 'N/A')}, Away #{summary.get('away_position', 'N/A')}]"

    return context


@router.post("/send", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a message to AI chat using Claude with ML predictions"""

    if not settings.CLAUDE_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Please set CLAUDE_API_KEY."
        )

    # Get user from database to check limits
    user_id = current_user.get("user_id")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check and reset daily limit if new day
    today = date.today()
    if user.last_request_date != today:
        user.daily_requests = 0
        user.last_request_date = today

    # Check if user can make predictions
    if not user.is_premium:
        remaining = (user.daily_limit - user.daily_requests) + user.bonus_predictions
        if remaining <= 0:
            raise HTTPException(
                status_code=429,
                detail="Daily prediction limit reached. Upgrade to Premium for unlimited predictions."
            )

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)

        # Get matches context
        matches_context = await get_matches_context()

        # Build context with matches data
        matches_info = format_matches_for_context(matches_context)

        # Try to get odds and ML predictions if user is asking about a specific match
        odds_info = ""
        ml_context = ""
        home_team, away_team, league_code, match_id, match_date = extract_teams_from_query(
            request.message, matches_context
        )

        odds_data = None
        ml_data = None

        if home_team and away_team:
            # Get odds
            if settings.ODDS_API_KEY:
                try:
                    odds_info = await get_odds_summary(home_team, away_team, league_code)
                    # Parse odds for ML
                    if odds_info:
                        # Simple parsing - could be improved
                        odds_data = {"home": 2.5, "draw": 3.5, "away": 3.0}
                except Exception:
                    pass

            # Get ML predictions
            try:
                ml_data = await get_ml_prediction(
                    db, home_team, away_team, league_code, odds_data
                )
                if ml_data:
                    ml_context = format_ml_context(ml_data)

                    # Save predictions for ML training
                    await save_ml_predictions(
                        db=db,
                        user_id=user_id,
                        match_id=str(match_id) if match_id else f"{home_team}_{away_team}",
                        home_team=home_team,
                        away_team=away_team,
                        league_code=league_code,
                        ml_data=ml_data,
                        match_date=match_date,
                    )
            except Exception as e:
                logger.warning(f"ML prediction failed: {e}")

        # Build messages for Claude
        messages = []

        # Add history (last 10 messages)
        for msg in request.history[-10:]:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })

        # Add current message with context
        user_message = request.message
        if odds_info:
            user_message += f"\n\n[Context - real bookmaker odds:{odds_info}]"
        if ml_context:
            user_message += ml_context

        messages.append({"role": "user", "content": user_message})

        # Build system prompt with user preferences
        system_prompt = build_system_prompt(request.preferences) + matches_info

        # Call Claude API
        response = client.messages.create(
            model="claude-3-haiku-20240307",  # Fast and cost-effective
            max_tokens=1500,
            system=system_prompt,
            messages=messages,
        )

        ai_response = response.content[0].text

        # Track total predictions for ALL users (for stats)
        user.total_predictions += 1

        # Track daily usage for non-premium users (for rate limiting)
        if not user.is_premium:
            # Use bonus predictions first, then daily limit
            if user.bonus_predictions > 0:
                user.bonus_predictions -= 1
            else:
                user.daily_requests += 1

        await db.commit()

        return ChatResponse(
            response=ai_response,
            matches_context=matches_context[:5] if matches_context else None
        )

    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Anthropic library not installed. Run: pip install anthropic"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}"
        )


async def save_ml_predictions(
    db: AsyncSession,
    user_id: int,
    match_id: str,
    home_team: str,
    away_team: str,
    league_code: str,
    ml_data: Dict,
    match_date: str = None,
):
    """Save ML predictions for training data collection"""
    try:
        from app.ml import MLDataCollector
        from datetime import datetime

        collector = MLDataCollector(db)
        features = ml_data.get("features", {})

        # Parse match date
        match_time = None
        if match_date:
            try:
                match_time = datetime.fromisoformat(match_date.replace('Z', '+00:00'))
            except:
                pass

        # Save prediction for each category
        for category, pred in ml_data.get("predictions", {}).items():
            bet_type_map = {
                "outcomes_home": "P1",
                "outcomes_away": "P2",
                "outcomes_draw": "X",
                "totals_over": "Over 2.5",
                "totals_under": "Under 2.5",
                "btts": "BTTS",
            }

            await collector.save_prediction(
                user_id=user_id,
                match_id=match_id,
                home_team=home_team,
                away_team=away_team,
                league_code=league_code,
                bet_type=bet_type_map.get(category, category),
                bet_category=category,
                confidence=pred["confidence"],
                odds=features.get("odds_home") if "home" in category else features.get("odds_away"),
                features=features,
                bet_rank=1,
                match_time=match_time,
                expected_value=pred.get("ev"),
                stake_percent=pred.get("stake"),
            )

    except Exception as e:
        logger.error(f"Error saving ML predictions: {e}")


@router.get("/status")
async def chat_status():
    """Check if AI chat is available"""
    return {
        "available": bool(settings.CLAUDE_API_KEY),
        "model": "claude-3-haiku" if settings.CLAUDE_API_KEY else None
    }
