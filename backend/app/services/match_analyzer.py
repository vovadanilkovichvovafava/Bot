"""
Match Analyzer service
Ported from bot_secure.py - analyze_match_enhanced
"""
import anthropic
from typing import Optional, Dict, Any

from app.config import settings, TOP_CLUBS
from app.services.football_api import FootballAPIService


class MatchAnalyzer:
    """AI-powered match analysis service"""

    def __init__(self):
        self.football_api = FootballAPIService()
        self.claude_client = None
        if settings.CLAUDE_API_KEY:
            self.claude_client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)

    async def analyze_match(self, match_id: int) -> Optional[Dict[str, Any]]:
        """Analyze a match and return prediction"""
        # Get match details
        match = await self.football_api.get_match(match_id)
        if not match:
            return None

        home_team = match.get("homeTeam", {}).get("name", "")
        away_team = match.get("awayTeam", {}).get("name", "")
        competition = match.get("competition", {}).get("name", "")
        comp_code = match.get("competition", {}).get("code", "")
        match_date = match.get("utcDate")

        # Get additional data
        h2h = await self.football_api.get_h2h(match_id)
        standings = await self.football_api.get_standings(comp_code)

        # Build context for AI
        context = self._build_context(
            home_team=home_team,
            away_team=away_team,
            competition=competition,
            h2h=h2h,
            standings=standings
        )

        # Get AI analysis
        analysis = await self._get_ai_analysis(home_team, away_team, context)

        if not analysis:
            # Fallback to simple analysis
            analysis = self._simple_analysis(home_team, away_team, standings)

        return {
            "match_id": match_id,
            "home_team": home_team,
            "away_team": away_team,
            "competition": competition,
            "match_date": match_date,
            **analysis
        }

    def _build_context(
        self,
        home_team: str,
        away_team: str,
        competition: str,
        h2h: list,
        standings: list
    ) -> str:
        """Build context string for AI analysis"""
        context_parts = [f"Match: {home_team} vs {away_team}"]
        context_parts.append(f"Competition: {competition}")

        # Add standings info
        home_pos = away_pos = None
        for s in standings:
            team_name = s.get("team", {}).get("name", "")
            if home_team.lower() in team_name.lower():
                home_pos = s.get("position")
                context_parts.append(f"{home_team}: {home_pos}th, {s.get('points')} pts, form: {s.get('form', 'N/A')}")
            if away_team.lower() in team_name.lower():
                away_pos = s.get("position")
                context_parts.append(f"{away_team}: {away_pos}th, {s.get('points')} pts, form: {s.get('form', 'N/A')}")

        # Add H2H
        if h2h:
            home_wins = sum(1 for m in h2h if m.get("score", {}).get("winner") == "HOME_TEAM")
            away_wins = sum(1 for m in h2h if m.get("score", {}).get("winner") == "AWAY_TEAM")
            draws = len(h2h) - home_wins - away_wins
            context_parts.append(f"H2H (last {len(h2h)}): {home_team} {home_wins}W - {draws}D - {away_wins}W {away_team}")

        # Check for top clubs
        home_is_top = any(tc.lower() in home_team.lower() for tc in TOP_CLUBS)
        away_is_top = any(tc.lower() in away_team.lower() for tc in TOP_CLUBS)
        if home_is_top:
            context_parts.append(f"Note: {home_team} is a top European club")
        if away_is_top:
            context_parts.append(f"Note: {away_team} is a top European club")

        return "\n".join(context_parts)

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
    "odds": 1.5-3.0 (estimated),
    "reasoning": "2-3 sentences why this bet",
    "analysis": "Detailed analysis text",
    "alt_bet_type": "alternative bet or null",
    "alt_confidence": number or null
}}

Consider: form, H2H, standings position, home advantage, team quality.
Be realistic with confidence - rarely above 80%.
"""

        try:
            response = self.claude_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse JSON from response
            import json
            text = response.content[0].text
            # Find JSON in response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])

        except Exception:
            pass

        return None

    def _simple_analysis(self, home_team: str, away_team: str, standings: list) -> Dict:
        """Simple analysis without AI"""
        home_pos = away_pos = 10  # Default middle position

        for s in standings:
            team_name = s.get("team", {}).get("name", "")
            if home_team.lower() in team_name.lower():
                home_pos = s.get("position", 10)
            if away_team.lower() in team_name.lower():
                away_pos = s.get("position", 10)

        # Simple logic: home team with better position + home advantage
        if home_pos < away_pos - 3:
            return {
                "bet_type": "П1",
                "confidence": min(70, 55 + (away_pos - home_pos) * 2),
                "reasoning": f"{home_team} is higher in standings and has home advantage",
                "analysis": f"Based on standings: {home_team} ({home_pos}th) vs {away_team} ({away_pos}th). Home advantage applies.",
                "alt_bet_type": "1X",
                "alt_confidence": 75,
            }
        elif away_pos < home_pos - 5:
            return {
                "bet_type": "П2",
                "confidence": min(70, 55 + (home_pos - away_pos) * 2),
                "reasoning": f"{away_team} is significantly higher in standings",
                "analysis": f"Based on standings: {home_team} ({home_pos}th) vs {away_team} ({away_pos}th). Away team quality advantage.",
                "alt_bet_type": "X2",
                "alt_confidence": 75,
            }
        else:
            return {
                "bet_type": "1X",
                "confidence": 65,
                "reasoning": f"Teams are close in standings, home advantage gives edge to {home_team}",
                "analysis": f"Based on standings: {home_team} ({home_pos}th) vs {away_team} ({away_pos}th). Closely matched.",
                "alt_bet_type": "ТМ2.5",
                "alt_confidence": 60,
            }
