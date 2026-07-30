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
    2: 3,  # Second day: 3 free requests
    3: 3,  # Third day+: 3 free requests per day
}

# Fixed daily limit for funnel-3
FUNNEL3_DAILY_LIMIT = 7

# funnel-1 (default): lifetime free limit — 3 free AI requests TOTAL (no daily
# reset). Once used up, only the PRO upgrade unlocks unlimited.
FREE_LIFETIME_LIMIT = 3


def get_daily_limit(day_number: int, funnel: str = "funnel-1") -> int:
    """Get the daily limit based on funnel type and day of usage."""
    if funnel == "funnel-2":
        # All-free funnel: unlimited requests
        return 999
    if funnel == "funnel-3":
        # Fixed daily limit, no degradation
        return FUNNEL3_DAILY_LIMIT
    if funnel == "funnel-4":
        # Express-first funnel: same as funnel-2 (all free), monetize via express ads
        return 999

    # funnel-1 (default): degressive limits
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

    # Premium users have unlimited access (only relevant for funnel-1)
    if user.is_premium:
        return {
            "remaining": 999,
            "limit": 999,
            "day_number": 0,
            "resets_at": None,
            "is_premium": True,
            "funnel": funnel,
        }

    # funnel-2 and funnel-4: everything free, unlimited — behave like premium
    if funnel in ("funnel-2", "funnel-4"):
        return {
            "remaining": 999,
            "limit": 999,
            "day_number": 0,
            "resets_at": None,
            "is_premium": False,
            "funnel": funnel,
        }

    now = datetime.utcnow()
    today = now.date()

    if funnel == "funnel-3":
        # funnel-3: fixed daily limit — reset the counter each new day.
        if user.last_chat_request_date is None:
            user.account_day_number = 1
            user.daily_chat_requests = 0
            user.last_chat_request_date = now
        elif user.last_chat_request_date.date() < today:
            user.account_day_number = (user.account_day_number or 1) + 1
            user.daily_chat_requests = 0
            user.last_chat_request_date = now
        base_limit = get_daily_limit(user.account_day_number or 1, funnel)
        resets_at = datetime.combine(today + timedelta(days=1), datetime.min.time()).isoformat() + "Z"
    else:
        # funnel-1 (default): LIFETIME free limit — FREE_LIFETIME_LIMIT total
        # requests, NO daily reset. daily_chat_requests is used here as a
        # lifetime counter (never reset). Once used up, only PRO unlocks unlimited.
        if user.last_chat_request_date is None:
            user.last_chat_request_date = now
        if user.account_day_number is None:
            user.account_day_number = 1
        base_limit = FREE_LIFETIME_LIMIT
        resets_at = None  # never resets — upgrade to PRO for unlimited

    day_number = user.account_day_number or 1
    used = user.daily_chat_requests or 0

    # Add bonus from referrals
    bonus = user.referral_bonus_requests or 0
    total_limit = base_limit + bonus

    remaining = max(0, total_limit - used)

    try:
        await db.commit()
    except Exception as e:
        logger.error(f"DB error in check_and_update_limits (commit): {e}")
        await db.rollback()

    return {
        "remaining": remaining,
        "limit": total_limit,
        "base_limit": base_limit,
        "bonus": bonus,
        "day_number": day_number,
        "used": used,
        "resets_at": resets_at,
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

        # funnel-3 resets daily; funnel-1 (default) is a LIFETIME counter — never reset.
        if (user.funnel or "funnel-1") == "funnel-3" and user.last_chat_request_date and user.last_chat_request_date.date() < today:
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

@router.get("/recent-win")
async def recent_winning_pick(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """A REAL recently-verified winning pick with odds > 2. Powers the
    'you missed this' loss-aversion nudge shown to non-PRO users. Returns
    found=False when no such real pick exists (never fabricate)."""
    row = (await db.execute(text("""
        SELECT home_team, away_team, bet_type,
               COALESCE(predicted_odds, odds) AS odds,
               COALESCE(match_date, match_time, verified_at, created_at) AS mdate
        FROM predictions
        WHERE is_correct = TRUE
          AND COALESCE(predicted_odds, odds) > 2
          AND bet_type <> ''
        ORDER BY verified_at DESC NULLS LAST
        LIMIT 1
    """))).first()
    if not row:
        return {"found": False}
    return {
        "found": True,
        "match": f"{row.home_team} vs {row.away_team}",
        "market": row.bet_type,
        "odds": round(row.odds, 2) if row.odds else None,
        "date": row.mdate.isoformat() if row.mdate else None,
    }


@router.get("/missed-express")
async def missed_winning_express(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """A 'missed winning express': a 2-4 leg accumulator built from REAL
    recently-verified winning picks (distinct matches) combined until total
    odds >= 5. Powers the loss-aversion nudge for non-PRO users. Every leg is a
    pick that really won (is_correct=TRUE) — only the accumulator framing is
    synthetic. Returns found=False when there aren't enough real winning picks
    (never fabricate a result)."""
    user_id = current_user["user_id"]

    def build(rows):
        """Dedupe by match (keep most recent), greedily combine legs until the
        combined odds reach >= 5 (min 2 legs, cap 4). Returns None if not enough."""
        seen, legs, total, latest = set(), [], 1.0, None
        for r in rows:
            key = (r.home_team, r.away_team)
            if key in seen or not r.odds:
                continue
            seen.add(key)
            odd = round(float(r.odds), 2)
            legs.append({
                "match": f"{r.home_team} vs {r.away_team}",
                "market": r.bet_type,
                "odds": odd,
            })
            total *= odd
            if latest is None and r.mdate is not None:
                latest = r.mdate
            if (total >= 5 and len(legs) >= 2) or len(legs) >= 4:
                break
        if len(legs) < 2 or total < 3:
            return None
        return {
            "legs": legs,
            "legCount": len(legs),
            "totalOdds": round(total, 2),
            "date": latest.isoformat() if latest else None,
        }

    cols = """
        SELECT home_team, away_team, bet_type,
               COALESCE(predicted_odds, odds) AS odds,
               COALESCE(match_date, match_time, verified_at, created_at) AS mdate
        FROM predictions
        WHERE is_correct = TRUE
          AND COALESCE(predicted_odds, odds) > 1.3
          AND bet_type <> ''
    """
    tail = "ORDER BY verified_at DESC NULLS LAST LIMIT 40"

    # 1) Personal — picks WE actually gave this user that won ("you missed OUR bet").
    personal_rows = (await db.execute(
        text(f"{cols} AND user_id = :uid {tail}"), {"uid": user_id}
    )).all()
    exp = build(personal_rows)
    if exp:
        return {"found": True, "personal": True, **exp}

    # 2) Generic — any recently-won picks ("we had a winning bet, you could've too").
    exp = build((await db.execute(text(f"{cols} {tail}"))).all())
    if exp:
        return {"found": True, "personal": False, **exp}

    return {"found": False}


@router.get("/big-wins")
async def big_wins(
    limit: int = Query(8, ge=1, le=20),
    min_odds: float = Query(5.0, ge=1.0, le=100.0),
    db: AsyncSession = Depends(get_db),
):
    """Real recently-won single picks with odds >= min_odds (default 5), for the
    big-wins social-proof carousel. Public. Never fabricates — only real
    is_correct=TRUE picks; a notional stake turns odds into a shown return."""
    rows = (await db.execute(text("""
        SELECT home_team, away_team, bet_type,
               COALESCE(predicted_odds, odds) AS odds,
               COALESCE(match_date, match_time, verified_at, created_at) AS mdate
        FROM predictions
        WHERE is_correct = TRUE
          AND COALESCE(predicted_odds, odds) >= :min_odds
          AND bet_type <> ''
        ORDER BY verified_at DESC NULLS LAST
        LIMIT 60
    """), {"min_odds": min_odds})).all()

    STAKES = [20, 25, 30, 40, 50]
    seen, wins = set(), []
    for r in rows:
        key = (r.home_team, r.away_team, r.bet_type)
        if key in seen or not r.odds:
            continue
        seen.add(key)
        odd = round(float(r.odds), 2)
        stake = STAKES[len(wins) % len(STAKES)]
        wins.append({
            "match": f"{r.home_team} vs {r.away_team}",
            "market": r.bet_type,
            "odds": odd,
            "stake": stake,
            "win": round(stake * odd),
            "date": r.mdate.isoformat() if r.mdate else None,
        })
        if len(wins) >= limit:
            break

    return {"wins": wins}


# ── Showcase pick (registration screen) ───────────────────────────────────────
# The signup screen used to show a hardcoded slip labelled "AI pick · yesterday",
# which was neither yesterday's nor a real fixture. This serves a genuine UPCOMING
# match instead, refreshed on its own every day, with the visitor's own league
# first — a Brazilian must see the Brasileirão, not the Bundesliga.

# League priority per country, mirroring web/src/shared/config/leagues.js.
_SHOWCASE_LEAGUES = {
    # Brasileirão, Copa do Brasil, then the continental cups where Brazilian
    # clubs play (Libertadores, Sudamericana). Série B sits last: still local,
    # but it is not what the brief asks us to lead with.
    "BR": [71, 73, 13, 11, 72],
    "PT": [94, 96, 2, 3],         # Primeira Liga, Taça, UCL, UEL
    "ES": [140, 143, 2, 3],
    "IT": [135, 137, 2, 3],
    "DE": [78, 81, 2, 3],
    "FR": [61, 66, 2, 3],
    "AR": [128, 13, 2],
    "MX": [262, 2],
    "PL": [106, 2, 3],
}
_SHOWCASE_FALLBACK = [2, 3, 39, 140, 135, 78, 61]  # UCL, UEL, big five

# Markets we are willing to show, in the order we prefer them, each described by
# how to find it in an API-Football odds payload: (label, bet id, value name).
# The price comes from the bookmaker — nothing here is invented.
# Shortest price first. The probability we print is the one implied by the odd,
# so a market priced at 1.30 honestly shows ~77% where 2.40 honestly shows 42% —
# same truthfulness, far better first impression on a signup screen.
# (key, english label, bet id, value name). The key lets the client print the
# market in the visitor's own language; the label is the fallback if it can't.
_SHOWCASE_MARKETS = [
    ("over_1_5", "Over 1.5 goals", 5, "Over 1.5"),
    ("btts", "Both teams to score", 8, "Yes"),
    ("over_2_5", "Over 2.5 goals", 5, "Over 2.5"),
]

# League country → ISO code, for the "BR • Campeonato Brasileiro Série A" label.
_LEAGUE_COUNTRY_CODE = {
    "Brazil": "BR", "Portugal": "PT", "Spain": "ES", "Argentina": "AR",
    "England": "EN", "Italy": "IT", "Germany": "DE", "France": "FR",
}


def _real_market_from_odds(odds_payload) -> Optional[dict]:
    """Pick a market we can price from real bookmaker odds.

    Returns None when the bookmaker has not published the markets we show —
    better an honest gap on the screen than a number we made up.
    """
    for item in odds_payload or []:
        for bookmaker in item.get("bookmakers") or []:
            bets = {b.get("id"): b for b in (bookmaker.get("bets") or []) if b.get("id")}
            for key, label, bet_id, value_name in _SHOWCASE_MARKETS:
                bet = bets.get(bet_id)
                if not bet:
                    continue
                for v in bet.get("values") or []:
                    if str(v.get("value")).strip().lower() != value_name.lower():
                        continue
                    try:
                        odd = float(v.get("odd"))
                    except (TypeError, ValueError):
                        continue
                    if odd <= 1.0:
                        continue
                    return {
                        "market_key": key,
                        "market": label,
                        "odds": round(odd, 2),
                        # Implied probability of the price itself — derived from the
                        # bookmaker's number, not an accuracy claim of our own.
                        "confidence": round(100 / odd),
                    }
    return None


@router.get("/showcase-pick")
async def showcase_pick(
    country: Optional[str] = Query(None, description="ISO country code of the visitor"),
):
    """One upcoming fixture to show on the signup screen. Public, read-only.

    Picks the soonest match from the visitor's own leagues, falling back to the
    big European ones when nothing local is scheduled — Brazilian league rounds
    do not run every day.
    """
    from app.services.api_football import api_football

    cc = (country or "").upper()
    league_order = _SHOWCASE_LEAGUES.get(cc, []) + [
        l for l in _SHOWCASE_FALLBACK if l not in _SHOWCASE_LEAGUES.get(cc, [])
    ]

    for league_id in league_order:
        try:
            fixtures = await api_football.get_league_fixtures(league_id, next_count=5)
        except Exception as e:
            logger.warning("showcase-pick: league %s failed: %s", league_id, e)
            continue
        for f in fixtures or []:
            teams = f.get("teams") or {}
            home = (teams.get("home") or {}).get("name")
            away = (teams.get("away") or {}).get("name")
            fx = f.get("fixture") or {}
            if not home or not away:
                continue
            # Only genuinely scheduled matches. The API also returns postponed and
            # cancelled ones, and offering a pick on a match that will not be
            # played reads as broken.
            if (fx.get("status") or {}).get("short") != "NS":
                continue

            # Real bookmaker price for a market we show. If the book hasn't put
            # one up yet, the card renders without the odds row rather than with
            # a plausible-looking number nobody can stand behind.
            priced = None
            try:
                priced = _real_market_from_odds(await api_football.get_odds(fx.get("id")))
            except Exception as e:
                logger.warning("showcase-pick: odds for fixture %s failed: %s", fx.get("id"), e)

            league = f.get("league") or {}
            return {
                "home": home,
                "away": away,
                "home_logo": (teams.get("home") or {}).get("logo"),
                "away_logo": (teams.get("away") or {}).get("logo"),
                "league": league.get("name"),
                "league_country": league.get("country"),
                "league_country_code": _LEAGUE_COUNTRY_CODE.get(league.get("country")),
                "league_id": league_id,
                "kickoff": fx.get("date"),
                "market_key": (priced or {}).get("market_key"),
                "market": (priced or {}).get("market"),
                "odds": (priced or {}).get("odds"),
                "confidence": (priced or {}).get("confidence"),
            }

    return {"home": None}


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
    """Save a prediction to the database (upsert: skip if same user+match already exists)."""
    user_id = current_user["user_id"]
    match_id_str = str(req.match_id)

    # Check if prediction already exists for this user + match
    existing = (await db.execute(
        select(Prediction).where(
            Prediction.user_id == user_id,
            Prediction.match_id == match_id_str,
        )
    )).scalar_one_or_none()

    if existing:
        # Update AI analysis if it was missing
        if req.ai_analysis and not existing.ai_analysis:
            existing.ai_analysis = req.ai_analysis
            try:
                await db.commit()
                await db.refresh(existing)
            except Exception:
                await db.rollback()
        return existing

    # Strip timezone info — DB uses TIMESTAMP WITHOUT TIME ZONE
    match_date = req.match_date
    if match_date and match_date.tzinfo is not None:
        match_date = match_date.replace(tzinfo=None)

    prediction = Prediction(
        user_id=user_id,
        match_id=match_id_str,
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
    logger.info(f"Prediction saved: user={user_id}, match={match_id_str}, bet={req.bet_type}")
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
