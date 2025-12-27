from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from app.config import settings
from app.core.security import get_current_user
from app.services.football_api import fetch_matches

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


SYSTEM_PROMPT = """Ты - AI помощник для анализа футбольных матчей. Твоя задача помогать пользователям получить информацию о матчах и давать аналитику.

Правила:
1. Отвечай кратко и по делу на русском языке
2. Если пользователь спрашивает о конкретном матче, используй данные о матчах которые тебе предоставлены
3. Предоставляй объективную аналитику, не обещай 100% результат
4. В конце каждого ответа добавляй предупреждение о ответственных ставках
5. Если нет данных о матче - честно скажи что нет информации

Формат ответа:
- Используй markdown для форматирования
- Используй эмодзи для лиг и статусов
- Структурируй информацию по пунктам"""


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
            "date": m.get("match_date"),
            "matchday": m.get("matchday"),
            "status": m.get("status"),
        }
        for m in (matches or [])
    ]


@router.post("/send", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to AI chat"""

    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Please set OPENAI_API_KEY."
        )

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        # Get matches context
        matches_context = await get_matches_context()

        # Build context with matches data
        matches_info = ""
        if matches_context:
            matches_info = "\n\nДоступные матчи на сегодня/завтра:\n"
            for m in matches_context[:20]:  # Limit to 20 matches
                matches_info += f"- {m['home']} vs {m['away']} ({m['league']}) - {m['date']}\n"

        # Build messages
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + matches_info}
        ]

        # Add history (last 10 messages)
        for msg in request.history[-10:]:
            messages.append({"role": msg.role, "content": msg.content})

        # Add current message
        messages.append({"role": "user", "content": request.message})

        # Call OpenAI
        response = await client.chat.completions.create(
            model="gpt-4o-mini",  # Cost-effective model
            messages=messages,
            max_tokens=1000,
            temperature=0.7,
        )

        ai_response = response.choices[0].message.content

        return ChatResponse(
            response=ai_response,
            matches_context=matches_context[:5] if matches_context else None
        )

    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="OpenAI library not installed. Run: pip install openai"
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
        "available": bool(settings.OPENAI_API_KEY),
        "model": "gpt-4o-mini" if settings.OPENAI_API_KEY else None
    }
