from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from app.config import settings
from app.core.security import get_current_user
from app.services.football_api import fetch_matches
from app.services.odds_api import get_odds_summary

router = APIRouter()


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

        if home and away:
            if home in query_lower or away in query_lower:
                return (m.get('home'), m.get('away'), league_code)

    # Try to find "vs" pattern
    if ' vs ' in query_lower:
        parts = query_lower.split(' vs ')
        if len(parts) == 2:
            return (parts[0].strip(), parts[1].strip(), 'PL')

    return (None, None, None)


@router.post("/send", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to AI chat using Claude"""

    if not settings.CLAUDE_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Please set CLAUDE_API_KEY."
        )

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)

        # Get matches context
        matches_context = await get_matches_context()

        # Build context with matches data
        matches_info = format_matches_for_context(matches_context)

        # Try to get odds if user is asking about a specific match
        odds_info = ""
        home_team, away_team, league_code = extract_teams_from_query(
            request.message, matches_context
        )
        if home_team and away_team and settings.ODDS_API_KEY:
            try:
                odds_info = await get_odds_summary(home_team, away_team, league_code)
            except Exception:
                pass  # Odds not critical

        # Build messages for Claude
        messages = []

        # Add history (last 10 messages)
        for msg in request.history[-10:]:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })

        # Add current message with odds context if available
        user_message = request.message
        if odds_info:
            user_message += f"\n\n[Context - real bookmaker odds:{odds_info}]"

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


@router.get("/status")
async def chat_status():
    """Check if AI chat is available"""
    return {
        "available": bool(settings.CLAUDE_API_KEY),
        "model": "claude-3-haiku" if settings.CLAUDE_API_KEY else None
    }
