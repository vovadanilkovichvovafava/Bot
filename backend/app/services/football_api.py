"""
Football Data API service
Ported from bot_secure.py
"""
import aiohttp
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from app.config import settings


class FootballAPIService:
    """Service for fetching football data from API"""

    def __init__(self):
        self.base_url = settings.FOOTBALL_API_URL
        self.api_key = settings.FOOTBALL_API_KEY
        self.timeout = aiohttp.ClientTimeout(total=settings.HTTP_TIMEOUT)
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=self.timeout)
        return self._session

    async def close(self):
        """Close the session"""
        if self._session and not self._session.closed:
            await self._session.close()

    async def _request(self, endpoint: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """Make API request"""
        if not self.api_key:
            return None

        session = await self._get_session()
        headers = {"X-Auth-Token": self.api_key}

        try:
            async with session.get(
                f"{self.base_url}/{endpoint}",
                headers=headers,
                params=params
            ) as response:
                if response.status == 200:
                    return await response.json()
                return None
        except Exception:
            return None

    async def get_matches(
        self,
        date: Optional[str] = None,
        competition: Optional[str] = None,
        days_ahead: int = 7
    ) -> List[Dict[str, Any]]:
        """Get matches for date or competition"""
        if competition:
            # Get matches for specific competition
            data = await self._request(f"competitions/{competition}/matches", {
                "status": "SCHEDULED,TIMED,IN_PLAY"
            })
            matches = data.get("matches", []) if data else []
        else:
            # Get matches for date range
            if date:
                date_from = date
                date_to = date
            else:
                today = datetime.now(timezone.utc)
                date_from = today.strftime("%Y-%m-%d")
                date_to = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

            data = await self._request("matches", {
                "dateFrom": date_from,
                "dateTo": date_to,
            })
            matches = data.get("matches", []) if data else []

        return matches

    async def get_match(self, match_id: int) -> Optional[Dict]:
        """Get single match details"""
        return await self._request(f"matches/{match_id}")

    async def get_standings(self, competition: str) -> List[Dict]:
        """Get competition standings"""
        data = await self._request(f"competitions/{competition}/standings")
        if not data:
            return []

        standings = data.get("standings", [])
        if standings:
            # Return first standings table (usually total)
            return standings[0].get("table", [])
        return []

    async def get_team_form(self, team_name: str, competition: str = None) -> List[str]:
        """Get team's recent form (W/D/L)"""
        # This would need team ID lookup
        # For now, return empty
        return []

    async def get_h2h(self, match_id: int) -> List[Dict]:
        """Get head-to-head history"""
        data = await self._request(f"matches/{match_id}/head2head", {"limit": 10})
        if not data:
            return []
        return data.get("matches", [])

    async def get_team_squad(self, team_id: int) -> List[Dict]:
        """Get team squad"""
        data = await self._request(f"teams/{team_id}")
        if not data:
            return []
        return data.get("squad", [])

    async def get_top_scorers(self, competition: str, limit: int = 10) -> List[Dict]:
        """Get top scorers for competition"""
        data = await self._request(f"competitions/{competition}/scorers", {"limit": limit})
        if not data:
            return []
        return data.get("scorers", [])
