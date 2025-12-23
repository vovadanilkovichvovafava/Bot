"""Favorites endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.favorite import FavoriteTeam, FavoriteLeague
from app.config import COMPETITIONS

router = APIRouter()


class FavoriteTeamResponse(BaseModel):
    id: int
    team_name: str

    class Config:
        from_attributes = True


class FavoriteLeagueResponse(BaseModel):
    id: int
    league_code: str
    league_name: str

    class Config:
        from_attributes = True


# Teams

@router.get("/teams", response_model=List[FavoriteTeamResponse])
async def get_favorite_teams(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get user's favorite teams"""
    result = await db.execute(
        select(FavoriteTeam).where(FavoriteTeam.user_id == user_id)
    )
    return result.scalars().all()


@router.post("/teams/{team_name}", response_model=FavoriteTeamResponse)
async def add_favorite_team(
    team_name: str,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Add a team to favorites"""
    # Check if already exists
    existing = await db.execute(
        select(FavoriteTeam)
        .where(FavoriteTeam.user_id == user_id)
        .where(FavoriteTeam.team_name == team_name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Team already in favorites")

    favorite = FavoriteTeam(user_id=user_id, team_name=team_name)
    db.add(favorite)
    await db.flush()
    await db.refresh(favorite)

    return favorite


@router.delete("/teams/{team_name}")
async def remove_favorite_team(
    team_name: str,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Remove a team from favorites"""
    await db.execute(
        delete(FavoriteTeam)
        .where(FavoriteTeam.user_id == user_id)
        .where(FavoriteTeam.team_name == team_name)
    )
    return {"message": "Team removed from favorites"}


# Leagues

@router.get("/leagues", response_model=List[FavoriteLeagueResponse])
async def get_favorite_leagues(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get user's favorite leagues"""
    result = await db.execute(
        select(FavoriteLeague).where(FavoriteLeague.user_id == user_id)
    )
    return result.scalars().all()


@router.post("/leagues/{league_code}", response_model=FavoriteLeagueResponse)
async def add_favorite_league(
    league_code: str,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Add a league to favorites"""
    if league_code not in COMPETITIONS:
        raise HTTPException(status_code=400, detail="Invalid league code")

    # Check if already exists
    existing = await db.execute(
        select(FavoriteLeague)
        .where(FavoriteLeague.user_id == user_id)
        .where(FavoriteLeague.league_code == league_code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="League already in favorites")

    favorite = FavoriteLeague(
        user_id=user_id,
        league_code=league_code,
        league_name=COMPETITIONS[league_code]
    )
    db.add(favorite)
    await db.flush()
    await db.refresh(favorite)

    return favorite


@router.delete("/leagues/{league_code}")
async def remove_favorite_league(
    league_code: str,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Remove a league from favorites"""
    await db.execute(
        delete(FavoriteLeague)
        .where(FavoriteLeague.user_id == user_id)
        .where(FavoriteLeague.league_code == league_code)
    )
    return {"message": "League removed from favorites"}
