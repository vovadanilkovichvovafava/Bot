"""
AI Match Analyzer service using Claude API
Restored from original bot_secure.py implementation
"""
import json
import logging
from typing import Optional, Dict, Any

import anthropic

from app.config import settings, TOP_CLUBS
from app.services.football_api import fetch_match_details, fetch_standings

logger = logging.getLogger(__name__)


class MatchAnalyzer:
    """AI-powered match analysis using Claude"""

    def __init__(self):
        self.claude_client = None
        if settings.CLAUDE_API_KEY:
            self.claude_client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)

    async def analyze_match(self, match_id: int) -> Optional[Dict[str, Any]]:
        """Analyze a match and return AI prediction"""
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

        return {
            "match_id": match_id,
            "home_team": home_team,
            "away_team": away_team,
            "competition": competition,
            "match_date": match_date,
            **analysis,
        }

    async def ai_chat(self, message: str, match_context: str = "") -> str:
        """AI chat for general football questions"""
        if not self.claude_client:
            return "AI assistant is not available. Please set CLAUDE_API_KEY."

        system = (
            "You are an expert football/soccer analyst and betting advisor. "
            "Provide insightful analysis based on statistics, form, and tactical knowledge. "
            "Be concise but thorough. Always mention key factors behind your reasoning."
        )

        prompt = message
        if match_context:
            prompt = f"Context: {match_context}\n\nQuestion: {message}"

        try:
            response = self.claude_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=800,
                system=system,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"AI chat error: {e}")
            return f"Sorry, AI analysis is temporarily unavailable. Error: {type(e).__name__}"

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
                model="claude-3-haiku-20240307",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            )

            text = response.content[0].text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
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
