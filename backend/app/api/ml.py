"""
ML API Endpoints
Training, predictions, and statistics
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.core.database import get_db
from app.ml import (
    MLTrainingService,
    MLPredictorService,
    FeatureExtractor,
    BET_CATEGORIES,
    calculate_ev,
    calculate_kelly_stake,
)

router = APIRouter()


class PredictionRequest(BaseModel):
    """Request for ML prediction"""
    home_team: str
    away_team: str
    league: str
    bet_category: str  # outcomes_home, totals_over, btts, etc.

    # Optional data sources
    home_form: Optional[Dict] = None
    away_form: Optional[Dict] = None
    standings: Optional[Dict] = None
    odds: Optional[Dict] = None
    h2h: Optional[List[Dict]] = None
    xg_data: Optional[Dict] = None
    injuries: Optional[Dict] = None
    weather: Optional[Dict] = None


class PredictionResponse(BaseModel):
    """ML prediction response"""
    available: bool
    prediction: Optional[int] = None
    confidence: float
    votes: Optional[Dict] = None
    agreement: Optional[float] = None
    ev: Optional[float] = None
    stake_percent: Optional[float] = None
    calibration_applied: bool = False
    roi_adjustment: Optional[int] = None


class TrainingResponse(BaseModel):
    """Training result response"""
    category: str
    models: Dict


@router.post("/predict", response_model=PredictionResponse)
async def get_prediction(
    request: PredictionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get ML prediction for a match.

    Requires premium subscription for full features.
    """
    if request.bet_category not in BET_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid bet_category. Must be one of: {BET_CATEGORIES}"
        )

    # Extract features
    extractor = FeatureExtractor()
    features = extractor.extract(
        home_form=request.home_form,
        away_form=request.away_form,
        standings=request.standings,
        odds=request.odds,
        h2h=request.h2h,
        home_team=request.home_team,
        away_team=request.away_team,
        xg_data=request.xg_data,
        injuries=request.injuries,
        weather=request.weather,
    )

    # Add odds for EV calculation
    if request.odds:
        category_odds_map = {
            "outcomes_home": "home",
            "outcomes_away": "away",
            "outcomes_draw": "draw",
            "totals_over": "over",
            "totals_under": "under",
            "btts": "btts_yes",
        }
        odds_key = category_odds_map.get(request.bet_category)
        if odds_key and odds_key in request.odds:
            features["odds"] = request.odds[odds_key]

    # Get prediction
    predictor = MLPredictorService(db)
    result = await predictor.get_calibrated_prediction(features, request.bet_category)

    return PredictionResponse(
        available=result.get("available", False),
        prediction=result.get("prediction"),
        confidence=result.get("confidence", 50),
        votes=result.get("votes"),
        agreement=result.get("agreement"),
        ev=result.get("ev"),
        stake_percent=result.get("stake_percent"),
        calibration_applied=result.get("calibration_applied", False),
        roi_adjustment=result.get("roi_adjustment"),
    )


@router.post("/predict/all")
async def get_all_predictions(
    request: PredictionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get predictions for all bet categories"""
    extractor = FeatureExtractor()
    features = extractor.extract(
        home_form=request.home_form,
        away_form=request.away_form,
        standings=request.standings,
        odds=request.odds,
        h2h=request.h2h,
        home_team=request.home_team,
        away_team=request.away_team,
        xg_data=request.xg_data,
        injuries=request.injuries,
        weather=request.weather,
    )

    predictor = MLPredictorService(db)
    results = {}

    for category in BET_CATEGORIES:
        # Add appropriate odds
        if request.odds:
            category_odds_map = {
                "outcomes_home": "home",
                "outcomes_away": "away",
                "outcomes_draw": "draw",
                "totals_over": "over",
                "totals_under": "under",
                "btts": "btts_yes",
            }
            odds_key = category_odds_map.get(category)
            if odds_key and odds_key in request.odds:
                features["odds"] = request.odds[odds_key]

        result = await predictor.get_calibrated_prediction(features, category)
        results[category] = {
            "available": result.get("available", False),
            "prediction": result.get("prediction"),
            "confidence": result.get("confidence", 50),
            "ev": result.get("ev"),
            "stake_percent": result.get("stake_percent"),
        }

    # Find best bet
    best_bet = None
    best_ev = -100
    for category, data in results.items():
        if data.get("available") and data.get("ev", -100) > best_ev:
            best_ev = data["ev"]
            best_bet = {"category": category, **data}

    return {
        "predictions": results,
        "best_bet": best_bet,
        "features_extracted": len(features),
    }


@router.post("/train/{category}", response_model=TrainingResponse)
async def train_category(
    category: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Train ML models for a specific category.
    Admin only.
    """
    # Check admin (simplified - add proper admin check)
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")

    if category not in BET_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {BET_CATEGORIES}"
        )

    trainer = MLTrainingService(db)
    result = await trainer.train_ensemble(category)

    return TrainingResponse(category=category, models=result)


@router.post("/train/all")
async def train_all(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Train all categories. Admin only."""
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")

    trainer = MLTrainingService(db)
    results = await trainer.train_all_categories()

    return {"results": results}


@router.get("/stats")
async def get_ml_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get ML system statistics"""
    trainer = MLTrainingService(db)
    stats = await trainer.get_stats()
    return stats


@router.get("/categories")
async def get_categories():
    """Get available bet categories"""
    return {
        "categories": BET_CATEGORIES,
        "descriptions": {
            "outcomes_home": "Home Win (П1)",
            "outcomes_away": "Away Win (П2)",
            "outcomes_draw": "Draw (X)",
            "totals_over": "Over 2.5 Goals (ТБ)",
            "totals_under": "Under 2.5 Goals (ТМ)",
            "btts": "Both Teams to Score (ОЗ)",
        }
    }
