"""
AI Match Analyzer service using Claude API
Restored from original bot_secure.py implementation
With response caching to save API costs
"""
import json
import logging
import time
from typing import Optional, Dict, Any

import anthropic

from app.config import settings, TOP_CLUBS
from app.services.football_api import fetch_match_details, fetch_standings

logger = logging.getLogger(__name__)

# AI Analysis Cache - shared between all users
# Key: match_id, Value: {data: analysis_result, timestamp: unix_time}
_ai_cache: Dict[int, Dict] = {}
AI_CACHE_TTL = 86400  # 24 hours - same analysis for all users


def _get_cached_analysis(match_id: int) -> Optional[Dict]:
    """Get cached AI analysis if not expired"""
    if match_id in _ai_cache:
        entry = _ai_cache[match_id]
        if time.time() - entry["timestamp"] < AI_CACHE_TTL:
            logger.info(f"AI Cache HIT for match {match_id}")
            return entry["data"]
        else:
            del _ai_cache[match_id]
    return None


def _set_cached_analysis(match_id: int, data: Dict):
    """Cache AI analysis result"""
    _ai_cache[match_id] = {
        "data": data,
        "timestamp": time.time()
    }
    logger.info(f"AI Cache SET for match {match_id}")


def get_ai_cache_stats() -> Dict:
    """Get AI cache statistics"""
    now = time.time()
    total = len(_ai_cache)
    expired = sum(1 for v in _ai_cache.values() if now - v["timestamp"] >= AI_CACHE_TTL)
    return {
        "total_entries": total,
        "active_entries": total - expired,
        "expired_entries": expired,
        "ttl_seconds": AI_CACHE_TTL,
    }


class MatchAnalyzer:
    """AI-powered match analysis using Claude"""

    def __init__(self):
        self.claude_client = None
        if settings.CLAUDE_API_KEY:
            self.claude_client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)

    async def analyze_match(self, match_id: int) -> Optional[Dict[str, Any]]:
        """Analyze a match and return AI prediction (with caching)"""

        # Check cache first - same analysis for all users saves API costs!
        cached = _get_cached_analysis(match_id)
        if cached:
            return cached

        details = await fetch_match_details(match_id)
        if not details:
            return None

        home_team = details.get("home_team", {}).get("name", "")
        away_team = details.get("away_team", {}).get("name", "")
        competition = details.get("league", "")
        league_code = details.get("league_code", "")
        match_date = details.get("match_date")
        h2h = details.get("head_to_head", {})

        # Get standings
        standings = await fetch_standings(league_code) if league_code else []

        # Build context
        context = self._build_context(
            home_team=home_team,
            away_team=away_team,
            competition=competition,
            h2h=h2h,
            standings=standings,
        )

        # Try AI analysis first
        analysis = await self._get_ai_analysis(home_team, away_team, context)

        if not analysis:
            # Fallback to simple stats-based analysis
            analysis = self._simple_analysis(home_team, away_team, standings)

        result = {
            "match_id": match_id,
            "home_team": home_team,
            "away_team": away_team,
            "competition": competition,
            "match_date": match_date,
            **analysis,
        }

        # Cache the result for other users
        _set_cached_analysis(match_id, result)

        return result

    async def ai_chat(self, message: str, match_context: str = "", history: list = None) -> str:
        """AI chat for general football questions"""
        if not self.claude_client:
            return "AI assistant is not available. Please set CLAUDE_API_KEY."

        system = (
            "You are an expert football/soccer analyst and betting advisor for the AI Betting Bot app. "
            "You have deep knowledge of all football leagues, teams, players, tactics, and betting markets.\n\n"
            "Guidelines:\n"
            "- When real-time match data is provided in the context, ALWAYS use it as the primary basis for your analysis. "
            "Do not guess or hallucinate statistics — use only the data provided.\n"
            "- Structure predictions clearly: predicted outcome, confidence level, key factors, and a specific betting recommendation.\n"
            "- For match analysis, cover: current form, head-to-head, injuries, tactical matchup, and market value.\n"
            "- Use **bold** for key points and team names.\n"
            "- Be honest about uncertainty. If you lack data, say so rather than fabricate.\n"
            "- Keep responses focused and well-structured. Use bullet points for clarity.\n"
            "- Respond in the same language the user writes in."
        )

        # Build messages array with conversation history
        messages = []
        if history:
            # Include last 6 messages for context (3 turns)
            for msg in history[-6:]:
                role = msg.get("role", "user")
                if role in ("user", "assistant"):
                    messages.append({"role": role, "content": msg["content"]})

        # Build current message with optional context
        prompt = message
        if match_context:
            prompt = f"[Real-time match data]\n{match_context}\n\n[User question]\n{message}"

        messages.append({"role": "user", "content": prompt})

        try:
            logger.info(f"Calling Claude API with {len(messages)} messages")
            response = self.claude_client.messages.create(
                model="claude-3-5-haiku-latest",
                max_tokens=1500,
                system=system,
                messages=messages,
            )
            logger.info("Claude API call successful")
            return response.content[0].text
        except anthropic.AuthenticationError as e:
            logger.error(f"Claude API authentication error: {e}")
            return "AI authentication failed. Please check the API key configuration."
        except anthropic.RateLimitError as e:
            logger.error(f"Claude API rate limit: {e}")
            return "AI service is temporarily busy. Please try again in a moment."
        except anthropic.BadRequestError as e:
            logger.error(f"Claude API bad request: {e}")
            return "AI service error: Invalid request. Please try again."
        except anthropic.APIError as e:
            logger.error(f"Claude API error: {e}")
            return "AI service is temporarily unavailable. Please try again later."
        except Exception as e:
            logger.error(f"AI chat unexpected error: {type(e).__name__}: {e}")
            return "Sorry, AI analysis is temporarily unavailable. Please try again later."

    def _build_context(
        self,
        home_team: str,
        away_team: str,
        competition: str,
        h2h: dict,
        standings: list,
    ) -> str:
        """Build context string for AI analysis"""
        parts = [f"Match: {home_team} vs {away_team}", f"Competition: {competition}"]

        # Standings info
        for s in standings:
            team = s.get("team", "")
            if home_team.lower() in team.lower():
                parts.append(
                    f"{home_team}: {s['position']}th, {s['points']} pts, "
                    f"W{s['won']} D{s['drawn']} L{s['lost']}, GD {s['goal_difference']}"
                )
            if away_team.lower() in team.lower():
                parts.append(
                    f"{away_team}: {s['position']}th, {s['points']} pts, "
                    f"W{s['won']} D{s['drawn']} L{s['lost']}, GD {s['goal_difference']}"
                )

        # H2H
        if h2h and h2h.get("total_matches", 0) > 0:
            parts.append(
                f"H2H (last {h2h['total_matches']}): "
                f"{home_team} {h2h.get('home_wins', 0)}W - "
                f"{h2h.get('draws', 0)}D - "
                f"{h2h.get('away_wins', 0)}W {away_team}"
            )

        # Top club notes
        home_top = any(tc.lower() in home_team.lower() for tc in TOP_CLUBS)
        away_top = any(tc.lower() in away_team.lower() for tc in TOP_CLUBS)
        if home_top:
            parts.append(f"Note: {home_team} is a top European club")
        if away_top:
            parts.append(f"Note: {away_team} is a top European club")

        return "\n".join(parts)

    async def _get_ai_analysis(self, home_team: str, away_team: str, context: str) -> Optional[Dict]:
        """Get AI analysis from Claude"""
        if not self.claude_client:
            return None

        prompt = f"""Analyze this football match and provide a betting prediction.

{context}

Respond in this exact JSON format:
{{
    "bet_type": "П1 or П2 or Х or ТБ2.5 or ТМ2.5 or BTTS or 1X or X2",
    "confidence": 65-95 (number),
    "odds": 1.5-3.0 (estimated fair odds),
    "reasoning": "2-3 sentences explaining the prediction",
    "analysis": "Detailed 3-5 sentence analysis covering form, H2H, tactical factors",
    "alt_bet_type": "alternative bet suggestion",
    "alt_confidence": number
}}

Consider: current form, H2H record, standings position, home advantage, team quality.
Be realistic with confidence - rarely above 80%. Only respond with JSON."""

        try:
            response = self.claude_client.messages.create(
                model="claude-3-5-haiku-latest",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            )

            text = response.content[0].text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    parsed = json.loads(text[start:end])
                    # Validate expected fields exist
                    if "bet_type" in parsed and "confidence" in parsed:
                        return parsed
                    logger.warning(f"AI response missing required fields: {list(parsed.keys())}")
                except json.JSONDecodeError as je:
                    logger.warning(f"Failed to parse AI JSON response: {je}")
            else:
                logger.warning(f"No JSON found in AI response: {text[:100]}...")
        except Exception as e:
            logger.error(f"Claude analysis error: {e}")

        return None

    def _simple_analysis(self, home_team: str, away_team: str, standings: list) -> Dict:
        """Fallback analysis based on standings when AI is unavailable"""
        home_pos = away_pos = 10

        for s in standings:
            team = s.get("team", "")
            if home_team.lower() in team.lower():
                home_pos = s.get("position", 10)
            if away_team.lower() in team.lower():
                away_pos = s.get("position", 10)

        if home_pos < away_pos - 3:
            return {
                "bet_type": "П1",
                "confidence": min(70, 55 + (away_pos - home_pos) * 2),
                "reasoning": f"{home_team} is higher in standings and has home advantage",
                "analysis": f"Based on standings: {home_team} ({home_pos}th) vs {away_team} ({away_pos}th). Home advantage is a significant factor.",
                "alt_bet_type": "1X",
                "alt_confidence": 75,
            }
        elif away_pos < home_pos - 5:
            return {
                "bet_type": "П2",
                "confidence": min(70, 55 + (home_pos - away_pos) * 2),
                "reasoning": f"{away_team} is significantly higher in standings",
                "analysis": f"Based on standings: {home_team} ({home_pos}th) vs {away_team} ({away_pos}th). Away team quality overcomes home advantage.",
                "alt_bet_type": "X2",
                "alt_confidence": 75,
            }
        else:
            return {
                "bet_type": "1X",
                "confidence": 65,
                "reasoning": f"Teams are close in standings, home advantage gives edge to {home_team}",
                "analysis": f"Based on standings: {home_team} ({home_pos}th) vs {away_team} ({away_pos}th). Closely matched, home factor tips the balance.",
                "alt_bet_type": "ТМ2.5",
                "alt_confidence": 60,
            }
