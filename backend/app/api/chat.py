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


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    response: str
    matches_context: Optional[List[dict]] = None


SYSTEM_PROMPT = """Ты - профессиональный AI-аналитик футбольных матчей. Твоя задача - давать качественный анализ матчей для помощи в ставках.

## Твои возможности:
1. Анализ конкретных матчей (команды, форма, статистика)
2. Прогнозы с вероятностями (победа, ничья, тоталы, обе забьют)
3. Обзор матчей на сегодня/завтра по лигам
4. Рекомендации по ставкам с обоснованием

## Формат анализа матча:
Когда пользователь спрашивает о конкретном матче, дай развёрнутый анализ:

**⚽ [Команда1] vs [Команда2]**
🏆 [Лига] | 📅 [Дата/Время]

**📊 Анализ:**
• Форма команд (последние матчи)
• Очные встречи (H2H)
• Ключевые факторы (травмы, мотивация, домашняя/гостевая статистика)

**🎯 Прогноз:**
• Победа 1: XX%
• Ничья: XX%
• Победа 2: XX%
• Тотал больше 2.5: XX%
• Обе забьют: XX%

**💡 Рекомендация:**
[Конкретная ставка с коэффициентом и обоснованием]

**⚠️ Риск:** [низкий/средний/высокий]

---
⚠️ Ставки связаны с риском. Играйте ответственно.

## Правила:
1. Отвечай на русском языке
2. Используй markdown и эмодзи для читаемости
3. Давай конкретные проценты и рекомендации
4. Основывай анализ на реальной статистике команд
5. Если матч не найден в списке - используй свои знания о командах
6. Всегда добавляй предупреждение об ответственной игре
7. Указывай уровень уверенности в прогнозе
8. Если есть реальные коэффициенты букмекеров - используй их в рекомендациях"""


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
        return "\n\nСегодня и завтра нет запланированных матчей в основных лигах."

    context = "\n\n## Матчи на сегодня и завтра:\n"

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
            user_message += f"\n\n[Контекст - реальные коэффициенты букмекеров:{odds_info}]"

        messages.append({"role": "user", "content": user_message})

        # Call Claude API
        response = client.messages.create(
            model="claude-3-haiku-20240307",  # Fast and cost-effective
            max_tokens=1500,
            system=SYSTEM_PROMPT + matches_info,
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
