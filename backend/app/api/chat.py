from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import random

from app.core.security import get_current_user
from app.services.football_api import fetch_matches, fetch_standings, fetch_match_details

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    match_id: Optional[int] = None


class ChatResponse(BaseModel):
    reply: str
    data: Optional[dict] = None
    suggestions: List[str] = []


# Intent keywords
_GREETINGS = {"hello", "hi", "hey", "привет", "здравствуйте", "хей", "хай"}
_TODAY = {"today", "сегодня", "today's", "сегодняшние"}
_TOMORROW = {"tomorrow", "завтра", "завтрашние"}
_UPCOMING = {"upcoming", "week", "next", "ближайшие", "неделя", "следующие", "скоро"}
_TIPS = {"tip", "tips", "advice", "suggest", "recommend", "best", "pick",
         "совет", "советы", "рекомендация", "лучший", "ставка", "что поставить"}
_STANDINGS = {"standings", "table", "таблица", "турнирная", "позиции", "лидеры"}
_LEAGUES = {"league", "leagues", "лига", "лиги", "чемпионат",
            "premier", "laliga", "bundesliga", "serie", "ligue",
            "pl", "pd", "bl1", "sa", "fl1", "cl"}
_HELP = {"help", "what", "how", "помощь", "что умеешь", "как", "функции"}
_OVER_UNDER = {"over", "under", "тотал", "тб", "тм", "goals", "голы"}
_BTTS = {"btts", "both", "обе", "забьют"}


def _detect_league_code(text: str) -> Optional[str]:
    t = text.lower()
    if any(w in t for w in ["premier", "pl", "apl", "апл", "английская"]):
        return "PL"
    if any(w in t for w in ["laliga", "la liga", "pd", "испан", "ла лига"]):
        return "PD"
    if any(w in t for w in ["bundesliga", "bl1", "немец", "бундеслига"]):
        return "BL1"
    if any(w in t for w in ["serie a", "sa", "итал", "серия"]):
        return "SA"
    if any(w in t for w in ["ligue 1", "fl1", "франц", "лига 1"]):
        return "FL1"
    if any(w in t for w in ["champions", "cl", "лч", "лига чемпионов"]):
        return "CL"
    return None


def _detect_intent(text: str) -> str:
    words = set(text.lower().split())
    t = text.lower()

    if words & _GREETINGS:
        return "greeting"
    if words & _HELP or "?" in t and any(w in t for w in ["can", "what", "how", "умеешь"]):
        return "help"
    if words & _TIPS:
        return "tips"
    if words & _STANDINGS or "таблиц" in t:
        return "standings"
    if words & _TODAY and ("match" in t or "матч" in t or "game" in t or "игр" in t or len(words) < 5):
        return "today"
    if words & _TOMORROW:
        return "tomorrow"
    if words & _UPCOMING:
        return "upcoming"
    if "матч" in t or "match" in t or "game" in t or "игр" in t:
        if words & _TOMORROW:
            return "tomorrow"
        return "today"
    if words & _OVER_UNDER:
        return "tips_goals"
    if words & _BTTS:
        return "tips_btts"
    if words & _LEAGUES:
        return "leagues"
    return "general"


def _format_matches_list(matches: list, limit: int = 8) -> str:
    if not matches:
        return "No matches found for this period."

    lines = []
    by_league = {}
    for m in matches[:limit]:
        lg = m.get("league", "Other")
        if lg not in by_league:
            by_league[lg] = []
        by_league[lg].append(m)

    for league, mlist in by_league.items():
        lines.append(f"\n🏆 {league}:")
        for m in mlist:
            home = m["home_team"]["name"]
            away = m["away_team"]["name"]
            dt = m.get("match_date", "")
            time_str = ""
            if dt:
                try:
                    d = datetime.fromisoformat(dt.replace("Z", "+00:00"))
                    time_str = d.strftime("%H:%M")
                except:
                    pass
            status = m.get("status", "")
            if status == "finished":
                hs = m.get("home_score", 0) or 0
                aws = m.get("away_score", 0) or 0
                lines.append(f"  ⚽ {home} {hs}-{aws} {away} (FT)")
            else:
                lines.append(f"  ⚽ {home} vs {away} ({time_str})")

    return "\n".join(lines)


def _generate_tip(matches: list) -> str:
    """Pick a random interesting match and generate a tip."""
    if not matches:
        return "No matches available right now to generate tips. Check back later!"

    m = random.choice(matches[:10])
    home = m["home_team"]["name"]
    away = m["away_team"]["name"]
    league = m.get("league", "")

    templates = [
        f"🔥 Hot pick: {home} vs {away} ({league}). Look at the home team's form - they've been solid defensively. Consider Under 2.5 or Home Win depending on your risk level.",
        f"💡 {home} vs {away} ({league}) stands out today. This matchup historically produces goals. Over 2.5 could be worth a look at decent odds.",
        f"🎯 Eye on {home} vs {away} ({league}). Both teams need points. A Draw or BTTS bet could offer good value here.",
        f"⚡ {league}: {home} vs {away}. The home advantage could be key here. Home Win at moderate odds is the safe play.",
        f"📊 {home} vs {away} ({league}). Close matchup on paper. Consider Double Chance (1X) for a safer approach or BTTS for better odds.",
    ]
    return random.choice(templates)


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    text = req.message.strip()
    intent = _detect_intent(text)
    league_code = _detect_league_code(text)

    if intent == "greeting":
        return ChatResponse(
            reply="Hey! 👋 I'm your AI Bet Analyst assistant. I can help you with:\n\n"
                  "⚽ Today's & upcoming matches\n"
                  "💡 Betting tips & analysis\n"
                  "📊 League standings\n"
                  "🎯 Match predictions\n\n"
                  "What would you like to know?",
            suggestions=["Today's matches", "Give me tips", "PL standings", "Upcoming matches"]
        )

    if intent == "help":
        return ChatResponse(
            reply="Here's what I can do:\n\n"
                  "⚽ **Matches** — Ask about today's, tomorrow's or upcoming matches\n"
                  "💡 **Tips** — Get AI-powered betting suggestions\n"
                  "📊 **Standings** — View league tables (PL, LaLiga, Bundesliga, etc.)\n"
                  "🏆 **Leagues** — Filter by specific league\n"
                  "🎯 **Analysis** — Open any match for detailed H2H & AI prediction\n\n"
                  "Try asking: \"What matches are on today?\" or \"Give me a tip for Premier League\"",
            suggestions=["Today's matches", "PL tips", "Bundesliga standings", "Best picks today"]
        )

    if intent == "today":
        matches = await fetch_matches(
            date_from=datetime.utcnow().strftime("%Y-%m-%d"),
            date_to=datetime.utcnow().strftime("%Y-%m-%d"),
            league=league_code
        )
        formatted = _format_matches_list(matches, 12)
        count = len(matches or [])
        reply = f"📅 **Today's Matches** ({count} found):\n{formatted}"
        if not matches:
            reply = "No matches scheduled for today. Check tomorrow's schedule!"
        return ChatResponse(
            reply=reply,
            data={"match_count": count},
            suggestions=["Tomorrow's matches", "Give me tips", "Upcoming this week"]
        )

    if intent == "tomorrow":
        tmrw = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
        matches = await fetch_matches(date_from=tmrw, date_to=tmrw, league=league_code)
        formatted = _format_matches_list(matches, 12)
        count = len(matches or [])
        reply = f"📅 **Tomorrow's Matches** ({count} found):\n{formatted}"
        if not matches:
            reply = "No matches scheduled for tomorrow yet."
        return ChatResponse(
            reply=reply,
            data={"match_count": count},
            suggestions=["Today's matches", "Tips for tomorrow", "PL standings"]
        )

    if intent == "upcoming":
        date_from = datetime.utcnow().strftime("%Y-%m-%d")
        date_to = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
        matches = await fetch_matches(date_from=date_from, date_to=date_to, league=league_code)
        formatted = _format_matches_list(matches, 15)
        count = len(matches or [])
        reply = f"📅 **Upcoming Matches (7 days)** — {count} matches:\n{formatted}"
        if not matches:
            reply = "No upcoming matches found. The league might be on break."
        return ChatResponse(
            reply=reply,
            data={"match_count": count},
            suggestions=["Today's matches", "Give me tips", "PL standings"]
        )

    if intent == "tips" or intent == "tips_goals" or intent == "tips_btts":
        matches = await fetch_matches(
            date_from=datetime.utcnow().strftime("%Y-%m-%d"),
            date_to=(datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d"),
            league=league_code
        )

        if not matches:
            return ChatResponse(
                reply="No upcoming matches to analyze right now. Try again later!",
                suggestions=["Tomorrow's matches", "PL standings"]
            )

        tips = []
        for _ in range(min(3, len(matches))):
            tips.append(_generate_tip(matches))

        if intent == "tips_goals":
            extra = "\n\n📈 **Goals tip**: Look for matches between attacking teams with weak defenses. Over 2.5 tends to hit more in derbies and mid-table clashes."
        elif intent == "tips_btts":
            extra = "\n\n📈 **BTTS tip**: Best value is in matches where both teams have scored in 60%+ of their recent games. Check the H2H data in match details."
        else:
            extra = ""

        reply = "🎯 **AI Betting Tips:**\n\n" + "\n\n".join(tips) + extra
        reply += "\n\n⚠️ Remember: always bet responsibly. Open individual matches for detailed AI analysis with confidence scores."

        return ChatResponse(
            reply=reply,
            suggestions=["Today's matches", "PL tips", "More tips"]
        )

    if intent == "standings":
        code = league_code or "PL"
        standings = await fetch_standings(code)
        league_names = {"PL": "Premier League", "PD": "La Liga", "BL1": "Bundesliga",
                       "SA": "Serie A", "FL1": "Ligue 1", "CL": "Champions League"}
        lg_name = league_names.get(code, code)

        if not standings:
            return ChatResponse(
                reply=f"Couldn't fetch {lg_name} standings. Try again or specify: PL, LaLiga, Bundesliga, Serie A, Ligue 1.",
                suggestions=["PL standings", "LaLiga standings", "Bundesliga standings"]
            )

        lines = [f"📊 **{lg_name} Standings** (Top 10):\n"]
        for s in standings[:10]:
            pos = s["position"]
            team = s["team"]
            pts = s["points"]
            w = s["won"]
            d = s["drawn"]
            l = s["lost"]
            gd = s["goal_difference"]
            medal = "🥇" if pos == 1 else "🥈" if pos == 2 else "🥉" if pos == 3 else f"{pos}."
            lines.append(f"  {medal} {team} — {pts}pts (W{w} D{d} L{l}, GD{gd:+d})")

        return ChatResponse(
            reply="\n".join(lines),
            data={"league": code, "count": len(standings)},
            suggestions=["Full table", "PL matches today", "Tips"]
        )

    if intent == "leagues":
        return ChatResponse(
            reply="🏆 **Available Leagues:**\n\n"
                  "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League (PL)\n"
                  "🇪🇸 La Liga (LaLiga)\n"
                  "🇩🇪 Bundesliga (BL1)\n"
                  "🇮🇹 Serie A (SA)\n"
                  "🇫🇷 Ligue 1 (FL1)\n"
                  "🇪🇺 Champions League (CL)\n"
                  "🇪🇺 Europa League (EL)\n\n"
                  "Ask about standings, matches or tips for any league!",
            suggestions=["PL standings", "LaLiga matches", "Bundesliga tips"]
        )

    # General / unknown - still be helpful
    # Try to provide matches as a fallback
    matches = await fetch_matches(
        date_from=datetime.utcnow().strftime("%Y-%m-%d"),
        date_to=datetime.utcnow().strftime("%Y-%m-%d"),
        league=league_code
    )

    reply = "I'm your AI football betting assistant! I'm not sure what you mean, but here's what I can help with:\n\n"
    if matches:
        reply += f"📅 There are **{len(matches)} matches** today. "
        reply += "Ask me for tips, standings, or match details!\n\n"
    reply += "Try asking:\n• \"What matches are on today?\"\n• \"Give me betting tips\"\n• \"Premier League standings\"\n• \"Upcoming matches this week\""

    return ChatResponse(
        reply=reply,
        suggestions=["Today's matches", "Tips", "PL standings", "Help"]
    )
