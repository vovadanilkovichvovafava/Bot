"""Database models"""
from app.models.user import User
from app.models.prediction import Prediction
from app.models.favorite import FavoriteTeam, FavoriteLeague

__all__ = ["User", "Prediction", "FavoriteTeam", "FavoriteLeague"]
