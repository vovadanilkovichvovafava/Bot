from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import random

from app.core.security import get_current_user

router = APIRouter()


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    avatar: Optional[str] = None
    predictions: int
    wins: int
    accuracy: float
    streak: int = 0
    roi: float = 0.0
    is_verified: bool = False


class TipsterProfile(BaseModel):
    user_id: int
    username: str
    avatar: Optional[str] = None
    bio: Optional[str] = None
    followers: int
    predictions: int
    wins: int
    accuracy: float
    roi: float
    best_league: Optional[str] = None
    is_verified: bool = False
    is_following: bool = False


class SharedPrediction(BaseModel):
    id: int
    user_id: int
    username: str
    avatar: Optional[str] = None
    match_name: str
    league: str
    bet_type: str
    odds: Optional[float] = None
    confidence: float
    analysis: Optional[str] = None
    created_at: datetime
    likes: int = 0
    is_liked: bool = False
    result: Optional[str] = None


# Mock data generators for demonstration
def _generate_mock_leaderboard(period: str, limit: int) -> List[LeaderboardEntry]:
    """Generate mock leaderboard data"""
    usernames = [
        "BetMaster", "FootballKing", "AccuratePunter", "WinningStreak",
        "PremierPro", "GoalPredictor", "SharpBetter", "OddsFinder",
        "ValueHunter", "TipsterAce", "MatchWizard", "BetExpert",
        "StatsGuru", "FormAnalyst", "UnderdogKing"
    ]

    entries = []
    for i in range(min(limit, len(usernames))):
        wins = random.randint(50, 200)
        predictions = wins + random.randint(20, 80)
        accuracy = (wins / predictions * 100) if predictions > 0 else 0.0

        entries.append(LeaderboardEntry(
            rank=i + 1,
            user_id=1000 + i,
            username=usernames[i],
            predictions=predictions,
            wins=wins,
            accuracy=round(accuracy, 1),
            streak=random.randint(-3, 10),
            roi=round(random.uniform(-5, 25), 1),
            is_verified=i < 3,  # Top 3 are verified
        ))

    # Sort by accuracy
    entries.sort(key=lambda x: x.accuracy, reverse=True)
    for i, entry in enumerate(entries):
        entry.rank = i + 1

    return entries


def _generate_mock_tipsters(limit: int) -> List[TipsterProfile]:
    """Generate mock tipster profiles"""
    tipsters_data = [
        {"username": "PremierExpert", "bio": "Premier League specialist with 5+ years experience", "best_league": "Premier League"},
        {"username": "LaLigaPro", "bio": "Spanish football analyst and tipster", "best_league": "La Liga"},
        {"username": "BundesligaGuru", "bio": "German football expert", "best_league": "Bundesliga"},
        {"username": "SerieAKing", "bio": "Italian football specialist", "best_league": "Serie A"},
        {"username": "EuroChampion", "bio": "Champions League and Europa focus", "best_league": "Champions League"},
        {"username": "ValueFinder", "bio": "Finding value bets across all leagues", "best_league": None},
        {"username": "LiveBetKing", "bio": "In-play betting specialist", "best_league": None},
        {"username": "AccaBuilder", "bio": "Accumulator tips and multiples", "best_league": None},
    ]

    tipsters = []
    for i, data in enumerate(tipsters_data[:limit]):
        wins = random.randint(100, 500)
        predictions = wins + random.randint(50, 200)
        accuracy = (wins / predictions * 100) if predictions > 0 else 0.0

        tipsters.append(TipsterProfile(
            user_id=2000 + i,
            username=data["username"],
            bio=data["bio"],
            followers=random.randint(100, 10000),
            predictions=predictions,
            wins=wins,
            accuracy=round(accuracy, 1),
            roi=round(random.uniform(5, 35), 1),
            best_league=data["best_league"],
            is_verified=i < 3,
            is_following=random.choice([True, False]),
        ))

    return tipsters


def _generate_mock_shared_predictions(limit: int) -> List[SharedPrediction]:
    """Generate mock shared predictions feed"""
    predictions_data = [
        {"match": "Arsenal vs Chelsea", "league": "Premier League", "bet": "Over 2.5 Goals", "conf": 75},
        {"match": "Barcelona vs Real Madrid", "league": "La Liga", "bet": "BTTS Yes", "conf": 80},
        {"match": "Bayern vs Dortmund", "league": "Bundesliga", "bet": "Home Win", "conf": 70},
        {"match": "Inter vs AC Milan", "league": "Serie A", "bet": "Under 2.5 Goals", "conf": 65},
        {"match": "PSG vs Marseille", "league": "Ligue 1", "bet": "Home Win", "conf": 85},
        {"match": "Liverpool vs Man United", "league": "Premier League", "bet": "Draw", "conf": 55},
    ]

    usernames = ["BetMaster", "PremierPro", "GoalPredictor", "TipsterAce", "FormAnalyst"]

    predictions = []
    for i, data in enumerate(predictions_data[:limit]):
        predictions.append(SharedPrediction(
            id=3000 + i,
            user_id=1000 + (i % 5),
            username=usernames[i % len(usernames)],
            match_name=data["match"],
            league=data["league"],
            bet_type=data["bet"],
            odds=round(random.uniform(1.5, 4.0), 2),
            confidence=data["conf"],
            analysis=f"Based on recent form and head-to-head statistics.",
            created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
            likes=random.randint(5, 150),
            is_liked=random.choice([True, False]),
            result=random.choice([None, None, "win", "loss"]),
        ))

    return predictions


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    period: str = Query("weekly", regex="^(daily|weekly|monthly|alltime)$"),
    limit: int = Query(20, ge=1, le=100),
):
    """Get leaderboard rankings for the specified period"""
    return _generate_mock_leaderboard(period, limit)


@router.get("/tipsters", response_model=List[TipsterProfile])
async def get_tipsters(
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    """Get list of top tipsters to follow"""
    return _generate_mock_tipsters(limit)


@router.get("/tipsters/{user_id}", response_model=TipsterProfile)
async def get_tipster_profile(
    user_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Get a specific tipster's profile"""
    tipsters = _generate_mock_tipsters(10)
    for tipster in tipsters:
        if tipster.user_id == user_id:
            return tipster

    # Return generic profile for any user_id
    return TipsterProfile(
        user_id=user_id,
        username=f"User{user_id}",
        followers=random.randint(10, 500),
        predictions=random.randint(20, 100),
        wins=random.randint(10, 50),
        accuracy=round(random.uniform(50, 70), 1),
        roi=round(random.uniform(-5, 15), 1),
        is_verified=False,
        is_following=False,
    )


@router.post("/tipsters/{user_id}/follow")
async def follow_tipster(
    user_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Follow a tipster"""
    return {"success": True, "message": f"Now following tipster {user_id}"}


@router.delete("/tipsters/{user_id}/follow")
async def unfollow_tipster(
    user_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Unfollow a tipster"""
    return {"success": True, "message": f"Unfollowed tipster {user_id}"}


@router.get("/feed", response_model=List[SharedPrediction])
async def get_social_feed(
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    """Get social feed with shared predictions from followed tipsters"""
    return _generate_mock_shared_predictions(limit)


@router.post("/predictions/{prediction_id}/share")
async def share_prediction(
    prediction_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Share a prediction publicly"""
    return {"success": True, "share_url": f"https://app.bettingbot.ai/p/{prediction_id}"}


@router.post("/predictions/{prediction_id}/like")
async def like_prediction(
    prediction_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Like a shared prediction"""
    return {"success": True, "likes": random.randint(10, 200)}


@router.delete("/predictions/{prediction_id}/like")
async def unlike_prediction(
    prediction_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Unlike a shared prediction"""
    return {"success": True, "likes": random.randint(5, 195)}


@router.get("/my-stats")
async def get_my_social_stats(current_user: dict = Depends(get_current_user)):
    """Get current user's social stats and ranking"""
    return {
        "rank": random.randint(100, 5000),
        "followers": random.randint(0, 50),
        "following": random.randint(5, 20),
        "shared_predictions": random.randint(0, 30),
        "total_likes_received": random.randint(0, 500),
    }
