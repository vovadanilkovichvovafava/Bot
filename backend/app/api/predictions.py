"""Predictions endpoints - real AI analysis via Claude + degressive limits"""
import json
import logging
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel
from typing import List, Optional, Union
from sqlalchemy import select, desc, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.prediction import Prediction
from app.models.user import User
from app.models.ai_chat import AIChatMessage
from app.services.match_analyzer import MatchAnalyzer
from app.services.prediction_verifier import get_accuracy_stats, get_learning_context
from app.services.ml_predictor import predict_match, batch_predict_today, get_match_recommendation
from app.services.ml_monitor import get_ml_dashboard_stats, calculate_roi

logger = logging.getLogger(__name__)
router = APIRouter()

BET_NAMES = {
    "П1": "Home Win", "П2": "Away Win", "Х": "Draw",
    "ТБ2.5": "Over 2.5", "ТМ2.5": "Under 2.5", "BTTS": "Both Teams Score",
    "1X": "Home or Draw", "X2": "Away or Draw",
}

# Degressive limits for funnel-1: day_number -> max_requests
DEGRESSIVE_LIMITS = {
    1: 3,  # First day of usage: 3 free requests
    2: 2,  # Second day: 2 free requests
    3: 1,  # Third day+: 1 free request per day
}

def get_daily_limit(day_number: int, funnel: str = "funnel-1") -> int:
    """Get the daily limit based on day of usage (degressive system)."""
    if day_number <= 0:
        day_number = 1
    if day_number in DEGRESSIVE_LIMITS:
        return DEGRESSIVE_LIMITS[day_number]
    return DEGRESSIVE_LIMITS[3]  # Day 3+ = 1 request/day


async def check_and_update_limits(user_id: int, db: AsyncSession) -> dict:
    """
    Check user's AI chat limits and update day tracking.
    Returns: {remaining, limit, day_number, resets_at, is_premium}
    """
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"DB error in check_and_update_limits (select): {e}")
        await db.rollback()
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    funnel = user.funnel or "funnel-1"

    # Premium users have unlimited access
    if user.is_premium:
        return {
            "remaining": 999,
            "limit": 999,
            "day_number": 0,
            "resets_at": None,
            "is_premium": True,
            "funnel": funnel,
        }

    now = datetime.utcnow()
    today = now.date()

    # Check if it's a new day since last request
    if user.last_chat_request_date is None:
        # First ever request — day 1
        user.account_day_number = 1
        user.daily_chat_requests = 0
        user.last_chat_request_date = now
    elif user.last_chat_request_date.date() < today:
        # New day! Advance day_number and reset counter
        user.account_day_number = (user.account_day_number or 1) + 1
        user.daily_chat_requests = 0
        user.last_chat_request_date = now

    day_number = user.account_day_number or 1
    limit = get_daily_limit(day_number, funnel)
    used = user.daily_chat_requests or 0

    # Add bonus from referrals
    bonus = user.referral_bonus_requests or 0
    total_limit = limit + bonus

    remaining = max(0, total_limit - used)

    # Calculate when the limit resets (next midnight UTC)
    tomorrow = datetime.combine(today + timedelta(days=1), datetime.min.time())

    try:
        await db.commit()
    except Exception as e:
        logger.error(f"DB error in check_and_update_limits (commit): {e}")
        await db.rollback()

    return {
        "remaining": remaining,
        "limit": total_limit,
        "base_limit": limit,
        "bonus": bonus,
        "day_number": day_number,
        "used": used,
        "resets_at": tomorrow.isoformat() + "Z",
        "is_premium": False,
        "funnel": funnel,
    }


async def increment_chat_usage(user_id: int, db: AsyncSession):
    """Increment the user's daily chat request counter after successful response."""
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return

        now = datetime.utcnow()
        today = now.date()

        # Safety: if somehow date changed between check and increment
        if user.last_chat_request_date and user.last_chat_request_date.date() < today:
            user.account_day_number = (user.account_day_number or 1) + 1
            user.daily_chat_requests = 1
        else:
            user.daily_chat_requests = (user.daily_chat_requests or 0) + 1

        user.last_chat_request_date = now
        user.total_predictions = (user.total_predictions or 0) + 1
        await db.commit()

        logger.info(
            f"User {user_id} chat usage: {user.daily_chat_requests} requests, "
            f"day {user.account_day_number}, total_predictions: {user.total_predictions}"
        )
    except Exception as e:
        logger.error(f"DB error in increment_chat_usage: {e}")
        await db.rollback()


# === Response models ===

class PredictionResponse(BaseModel):
    id: int
    match_id: int
    home_team: str
    away_team: str
    league: str
    bet_type: str
    bet_name: str
    confidence: float
    odds: Optional[float] = None
    reasoning: str
    analysis: Optional[str] = None
    alt_bet_type: Optional[str] = None
    alt_confidence: Optional[float] = None
    created_at: datetime


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    match_context: Optional[str] = None
    history: Optional[List[ChatMessage]] = None
    locale: Optional[str] = "en"
    session_id: Optional[str] = None  # frontend sends to group messages


class ChatResponse(BaseModel):
    response: str
    remaining: Optional[int] = None
    limit: Optional[int] = None
    day_number: Optional[int] = None
    resets_at: Optional[str] = None


class ChatLimitResponse(BaseModel):
    remaining: int
    limit: int
    base_limit: int = 0
    bonus: int = 0
    day_number: int = 0
    used: int = 0
    resets_at: Optional[str] = None
    is_premium: bool
    funnel: str = "funnel-1"


class MLPredictionResponse(BaseModel):
    fixture_id: int
    home_team: Optional[str] = None
    away_team: Optional[str] = None
    match_date: Optional[str] = None
    markets: dict = {}
    recommendations: list = []
    model_info: dict = {}


class MLRecommendationResponse(BaseModel):
    fixture_id: int
    recommendation: Optional[dict] = None
    all_recommendations: Optional[list] = None
    markets: dict = {}
    has_value_bet: bool = False


class MLDashboardResponse(BaseModel):
    data: dict = {}
    models: dict = {}
    predictions: dict = {}
    recent_events: list = []


# === Endpoints ===

@router.get("/chat/limit", response_model=ChatLimitResponse)
async def get_chat_limit(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's AI chat limit info (degressive system)."""
    limits = await check_and_update_limits(current_user["user_id"], db)
    return ChatLimitResponse(**limits)


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    req: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI chat for football questions and analysis — with degressive limits."""
    user_id = current_user["user_id"]
    sess_id = req.session_id or str(uuid.uuid4())[:12]
    locale = (req.locale or "en").lower()[:2]

    # Check if admin has taken over this session (manual mode)
    takeover_row = (await db.execute(
        text("SELECT is_takeover FROM admin_session_overrides WHERE session_id = :sid AND is_takeover = TRUE"),
        {"sid": sess_id},
    )).first()

    if takeover_row:
        _TAKEOVER_RESPONSES = {
            "en": "Your message has been received. Our team will reply shortly.",
            "ru": "Ваше сообщение получено. Наша команда скоро ответит.",
            "es": "Tu mensaje ha sido recibido. Nuestro equipo responderá pronto.",
            "de": "Ihre Nachricht wurde empfangen. Unser Team wird in Kürze antworten.",
            "fr": "Votre message a été reçu. Notre équipe vous répondra bientôt.",
            "it": "Il tuo messaggio è stato ricevuto. Il nostro team risponderà a breve.",
            "pt": "Sua mensagem foi recebida. Nossa equipe responderá em breve.",
        }
        wait_msg = _TAKEOVER_RESPONSES.get(locale, _TAKEOVER_RESPONSES["en"])
        # Save user message to DB (so admin sees it)
        try:
            user_obj = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
            is_pro = bool(user_obj and user_obj.is_premium)
            db.add(AIChatMessage(
                user_id=user_id, session_id=sess_id, role="user",
                content=req.message, locale=locale,
                match_context=req.match_context, was_pro=is_pro,
            ))
            await db.commit()
        except Exception as e:
            logger.warning(f"Failed to save takeover message: {e}")

        limits = await check_and_update_limits(user_id, db)
        return ChatResponse(
            response=wait_msg,
            remaining=limits["remaining"],
            limit=limits["limit"],
            day_number=limits["day_number"],
            resets_at=limits.get("resets_at"),
        )

    # Check limits BEFORE calling Claude (saves API costs)
    limits = await check_and_update_limits(user_id, db)
    if not limits["is_premium"] and limits["remaining"] <= 0:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "daily_limit_reached",
                "message": "You've used all your free AI requests for today",
                "remaining": 0,
                "limit": limits["limit"],
                "day_number": limits["day_number"],
                "resets_at": limits["resets_at"],
            }
        )

    # Enrich prompt with historical accuracy data (ML learning feedback)
    learning_ctx = ""
    try:
        learning_ctx = await get_learning_context(db)
    except Exception:
        pass  # Don't block AI if stats fail

    enriched_message = req.message
    if learning_ctx:
        enriched_message = req.message + learning_ctx

    # Call Claude AI
    analyzer = MatchAnalyzer()
    history = [{"role": m.role, "content": m.content} for m in (req.history or [])]
    response = await analyzer.ai_chat(enriched_message, req.match_context or "", history, locale)

    # Increment counter AFTER successful response
    await increment_chat_usage(user_id, db)

    # Save chat messages to DB for admin viewing
    try:
        user_obj = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        is_pro = bool(user_obj and user_obj.is_premium)
        # Save user message
        db.add(AIChatMessage(
            user_id=user_id, session_id=sess_id, role="user",
            content=req.message, locale=locale,
            match_context=req.match_context, was_pro=is_pro,
        ))
        # Save assistant response
        db.add(AIChatMessage(
            user_id=user_id, session_id=sess_id, role="assistant",
            content=response, locale=locale,
            match_context=req.match_context, was_pro=is_pro,
        ))
        await db.commit()
    except Exception as e:
        logger.warning(f"Failed to save AI chat message: {e}")

    # Get updated limits to return to frontend
    updated_limits = await check_and_update_limits(user_id, db)

    return ChatResponse(
        response=response,
        remaining=updated_limits["remaining"],
        limit=updated_limits["limit"],
        day_number=updated_limits["day_number"],
        resets_at=updated_limits.get("resets_at"),
    )


class ChatSessionResponse(BaseModel):
    session_id: str
    last_message: str
    last_message_at: str
    message_count: int
    match_context: Optional[str] = None


class ChatSessionDetailResponse(BaseModel):
    session_id: str
    messages: list


class ReanalyzeRequest(BaseModel):
    message: str
    match_context: Optional[str] = None
    original_session_id: Optional[str] = None
    locale: Optional[str] = "en"


class ReanalyzeResponse(BaseModel):
    response: str
    session_id: str
    remaining: Optional[int] = None
    limit: Optional[int] = None
    day_number: Optional[int] = None
    resets_at: Optional[str] = None


@router.get("/chat/history")
async def get_chat_history(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's AI chat sessions with last message preview."""
    user_id = current_user["user_id"]

    # Get distinct sessions with their latest message
    result = await db.execute(
        text("""
            SELECT DISTINCT ON (session_id)
                session_id,
                content,
                created_at,
                match_context
            FROM ai_chat_messages
            WHERE user_id = :uid AND role = 'assistant' AND is_admin_reply = FALSE
            ORDER BY session_id, created_at DESC
        """),
        {"uid": user_id},
    )
    rows = result.fetchall()

    # Get message counts per session
    count_result = await db.execute(
        text("""
            SELECT session_id, COUNT(*) as cnt
            FROM ai_chat_messages
            WHERE user_id = :uid
            GROUP BY session_id
        """),
        {"uid": user_id},
    )
    counts = {r.session_id: r.cnt for r in count_result.fetchall()}

    sessions = []
    for row in rows:
        sessions.append({
            "session_id": row.session_id,
            "last_message": (row.content or "")[:200],
            "last_message_at": row.created_at.isoformat() + "Z" if row.created_at else None,
            "message_count": counts.get(row.session_id, 0),
            "match_context": (row.match_context or "")[:100] if row.match_context else None,
        })

    # Sort by last message time descending
    sessions.sort(key=lambda s: s["last_message_at"] or "", reverse=True)

    return sessions[offset:offset + limit]


@router.get("/chat/history/{session_id}")
async def get_chat_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all messages from a specific chat session."""
    user_id = current_user["user_id"]

    result = await db.execute(
        select(AIChatMessage)
        .where(AIChatMessage.user_id == user_id, AIChatMessage.session_id == session_id)
        .order_by(AIChatMessage.created_at)
    )
    messages = result.scalars().all()

    if not messages:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session_id,
        "messages": [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "match_context": msg.match_context,
                "created_at": msg.created_at.isoformat() + "Z" if msg.created_at else None,
                "is_admin_reply": msg.is_admin_reply,
            }
            for msg in messages
        ],
    }


@router.post("/chat/reanalyze", response_model=ReanalyzeResponse)
async def reanalyze_chat(
    req: ReanalyzeRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-analyze a match — costs 1 token. Creates a new session with fresh analysis."""
    user_id = current_user["user_id"]
    locale = (req.locale or "en").lower()[:2]

    # Check limits (costs a token, same as normal chat)
    limits = await check_and_update_limits(user_id, db)
    if not limits["is_premium"] and limits["remaining"] <= 0:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "daily_limit_reached",
                "message": "You've used all your free AI requests for today",
                "remaining": 0,
                "limit": limits["limit"],
                "day_number": limits["day_number"],
                "resets_at": limits["resets_at"],
            }
        )

    # Create new session for re-analysis
    new_sess_id = "re_" + str(uuid.uuid4())[:10]

    # Enrich with learning context
    learning_ctx = ""
    try:
        learning_ctx = await get_learning_context(db)
    except Exception:
        pass

    enriched_message = req.message
    if learning_ctx:
        enriched_message = req.message + learning_ctx

    # Call Claude AI with fresh context (no history — forces new analysis)
    analyzer = MatchAnalyzer()
    response = await analyzer.ai_chat(enriched_message, req.match_context or "", [], locale)

    # Increment counter
    await increment_chat_usage(user_id, db)

    # Save to DB
    try:
        user_obj = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        is_pro = bool(user_obj and user_obj.is_premium)
        db.add(AIChatMessage(
            user_id=user_id, session_id=new_sess_id, role="user",
            content=req.message, locale=locale,
            match_context=req.match_context, was_pro=is_pro,
        ))
        db.add(AIChatMessage(
            user_id=user_id, session_id=new_sess_id, role="assistant",
            content=response, locale=locale,
            match_context=req.match_context, was_pro=is_pro,
        ))
        await db.commit()
    except Exception as e:
        logger.warning(f"Failed to save reanalyze chat: {e}")

    updated_limits = await check_and_update_limits(user_id, db)

    return ReanalyzeResponse(
        response=response,
        session_id=new_sess_id,
        remaining=updated_limits["remaining"],
        limit=updated_limits["limit"],
        day_number=updated_limits["day_number"],
        resets_at=updated_limits.get("resets_at"),
    )


class SavePredictionRequest(BaseModel):
    match_id: Union[int, str]
    home_team: str
    away_team: str
    league: Optional[str] = None
    match_date: Optional[datetime] = None
    bet_type: Optional[str] = None
    predicted_odds: Optional[float] = None
    confidence: Optional[float] = None
    ai_analysis: Optional[str] = None
    api_prediction: Optional[dict] = None


class SavedPredictionResponse(BaseModel):
    id: int
    match_id: str
    home_team: str
    away_team: str
    league: Optional[str] = None
    match_date: Optional[datetime] = None
    bet_type: Optional[str] = None
    predicted_odds: Optional[float] = None
    confidence: Optional[float] = None
    ai_analysis: Optional[str] = None
    is_correct: Optional[bool] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/save", response_model=SavedPredictionResponse)
async def save_prediction(
    req: SavePredictionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a prediction to the database"""
    # Strip timezone info — DB uses TIMESTAMP WITHOUT TIME ZONE
    match_date = req.match_date
    if match_date and match_date.tzinfo is not None:
        match_date = match_date.replace(tzinfo=None)

    prediction = Prediction(
        user_id=current_user["user_id"],
        match_id=str(req.match_id),
        home_team=req.home_team,
        away_team=req.away_team,
        league=req.league,
        match_date=match_date,
        bet_type=req.bet_type or "",
        predicted_odds=req.predicted_odds,
        confidence=req.confidence or 0.0,
        ai_analysis=req.ai_analysis,
        api_prediction=json.dumps(req.api_prediction) if req.api_prediction else None,
    )
    db.add(prediction)
    try:
        await db.commit()
        await db.refresh(prediction)
    except Exception as e:
        logger.error(f"DB error saving prediction: {e}")
        await db.rollback()
        raise HTTPException(status_code=503, detail="Database error saving prediction")
    return prediction


@router.get("/saved", response_model=List[SavedPredictionResponse])
async def get_saved_predictions(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's saved predictions from database"""
    result = await db.execute(
        select(Prediction)
        .where(Prediction.user_id == current_user["user_id"])
        .order_by(desc(Prediction.created_at))
        .offset(offset)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/stats")
async def get_prediction_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get real prediction accuracy stats from verified predictions."""
    user_stats = await get_accuracy_stats(db, user_id=current_user["user_id"])
    global_stats = await get_accuracy_stats(db)
    return {
        "user": user_stats,
        "global": global_stats,
    }


@router.get("/learning-context")
async def get_ml_learning_context(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get historical accuracy context for AI prompt enrichment."""
    context = await get_learning_context(db)
    return {"context": context}


# === ML Prediction Endpoints ===

@router.get("/ml/{fixture_id}", response_model=MLPredictionResponse)
async def get_ml_prediction(
    fixture_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Get pure ML prediction for a fixture (no Claude, no API cost)."""
    result = await predict_match(fixture_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail="ML prediction not available. Model may not be trained yet or fixture data missing."
        )
    return MLPredictionResponse(**result)


@router.get("/ml/recommend/{fixture_id}", response_model=MLRecommendationResponse)
async def get_ml_recommendation(
    fixture_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Get the best betting recommendation from ML model for a fixture."""
    result = await get_match_recommendation(fixture_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail="No recommendation available for this fixture."
        )
    return MLRecommendationResponse(**result)


@router.post("/ml/batch-predict")
async def trigger_batch_prediction(
    current_user: dict = Depends(get_current_user),
):
    """Trigger batch ML predictions for today's matches. Admin/debug endpoint."""
    count = await batch_predict_today()
    return {"predicted": count, "status": "complete"}


@router.get("/ml/dashboard")
async def get_ml_dashboard(
    current_user: dict = Depends(get_current_user),
):
    """Get ML pipeline dashboard stats."""
    stats = await get_ml_dashboard_stats()
    return stats


@router.get("/ml/roi/{period}")
async def get_roi_stats(
    period: str = "weekly",
    current_user: dict = Depends(get_current_user),
):
    """Get ROI statistics for a period (daily/weekly/monthly)."""
    if period not in ("daily", "weekly", "monthly"):
        raise HTTPException(status_code=400, detail="Period must be daily, weekly, or monthly")
    result = await calculate_roi(period)
    if not result:
        return {"period": period, "message": "No verified predictions in this period"}
    return result


@router.get("/history", response_model=List[PredictionResponse])
async def get_prediction_history(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
):
    """Get prediction history (legacy endpoint - use /saved instead)"""
    return []


@router.post("/{match_id:int}", response_model=PredictionResponse)
async def create_prediction(
    match_id: int = Path(..., gt=0, description="Match ID must be a positive integer"),
    current_user: dict = Depends(get_current_user)
):
    """Get AI prediction for a specific match"""
    analyzer = MatchAnalyzer()
    result = await analyzer.analyze_match(match_id)

    if not result:
        raise HTTPException(status_code=404, detail="Could not analyze match. Match not found or API unavailable.")

    bet_type = result.get("bet_type", "1X")

    return PredictionResponse(
        id=match_id,
        match_id=match_id,
        home_team=result.get("home_team", ""),
        away_team=result.get("away_team", ""),
        league=result.get("competition", ""),
        bet_type=bet_type,
        bet_name=BET_NAMES.get(bet_type, bet_type),
        confidence=result.get("confidence", 60),
        odds=result.get("odds"),
        reasoning=result.get("reasoning", ""),
        analysis=result.get("analysis"),
        alt_bet_type=result.get("alt_bet_type"),
        alt_confidence=result.get("alt_confidence"),
        created_at=datetime.utcnow(),
    )


# ── Post-match reminders (recently verified predictions) ──────────────

@router.get("/verified-recent")
async def get_verified_recent(
    user_data: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return user's predictions verified in the last 24 hours for post-match reminders."""
    user = (await db.execute(
        select(User).where(User.id == user_data["user_id"])
    )).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    since = datetime.utcnow() - timedelta(hours=24)

    rows = (await db.execute(
        select(Prediction)
        .where(
            Prediction.user_id == user.id,
            Prediction.verified_at >= since,
            Prediction.is_correct == True,  # only winning predictions
        )
        .order_by(desc(Prediction.verified_at))
        .limit(10)
    )).scalars().all()

    stake = 75
    results = []
    for p in rows:
        odds = p.predicted_odds or p.odds
        if not odds or odds <= 1:
            continue  # skip entries without real odds
        potential_win = round(stake * odds, 2)

        results.append({
            "id": p.id,
            "match_id": p.match_id,
            "home_team": p.home_team,
            "away_team": p.away_team,
            "league": p.league or p.league_code,
            "bet_type": p.bet_type,
            "bet_name": BET_NAMES.get(p.bet_type, p.bet_type),
            "odds": odds,
            "actual_score": f"{p.actual_home_score}-{p.actual_away_score}" if p.actual_home_score is not None else None,
            "stake": stake,
            "potential_win": potential_win,
            "missed_profit": round(potential_win - stake, 2),
            "verified_at": p.verified_at.isoformat() if p.verified_at else None,
        })

    return {"predictions": results}
