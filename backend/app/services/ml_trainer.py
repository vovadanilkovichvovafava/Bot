"""
ML Model Training Service.
Trains XGBoost models for all betting markets.
Runs weekly as a background task (daily in first 2 weeks).
"""
import asyncio
import base64
import io
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.models.ml_models import MatchFeature, MLModel, LearningLog
from app.services.feature_engineer import build_feature_vector, FEATURE_NAMES

logger = logging.getLogger(__name__)

# Training configuration
MIN_TRAINING_SAMPLES = 50  # minimum matches before training
TEMPORAL_TRAIN_RATIO = 0.75
TEMPORAL_CAL_RATIO = 0.10
TEMPORAL_TEST_RATIO = 0.15


async def get_training_data() -> Tuple[List[List[float]], Dict[str, List[int]]]:
    """
    Load verified matches and build feature vectors + target labels.
    Returns (features_list, targets_dict) where targets_dict has keys for each model type.
    """
    async with async_session_maker() as db:
        result = await db.execute(
            select(MatchFeature).where(
                and_(
                    MatchFeature.is_verified == True,
                    MatchFeature.home_elo.isnot(None),
                    MatchFeature.home_goals.isnot(None),
                )
            ).order_by(MatchFeature.match_date.asc())
        )
        matches = result.scalars().all()

    if len(matches) < MIN_TRAINING_SAMPLES:
        logger.info(f"Not enough data: {len(matches)} < {MIN_TRAINING_SAMPLES}")
        return [], {}

    features = []
    targets = {
        "outcome_3way": [],     # 0=Home, 1=Draw, 2=Away
        "goals_ou25": [],       # 0=Under, 1=Over
        "goals_ou15": [],
        "goals_ou35": [],
        "btts": [],             # 0=No, 1=Yes
        "corners_ou95": [],     # 0=Under, 1=Over
        "cards_ou35": [],
    }

    for m in matches:
        vec = await build_feature_vector(m)
        if vec is None:
            continue

        features.append(vec)

        # Outcome
        if m.result == "H":
            targets["outcome_3way"].append(0)
        elif m.result == "D":
            targets["outcome_3way"].append(1)
        else:
            targets["outcome_3way"].append(2)

        # Goals
        total_goals = (m.home_goals or 0) + (m.away_goals or 0)
        targets["goals_ou25"].append(1 if total_goals > 2 else 0)
        targets["goals_ou15"].append(1 if total_goals > 1 else 0)
        targets["goals_ou35"].append(1 if total_goals > 3 else 0)

        # BTTS
        targets["btts"].append(1 if m.btts else 0)

        # Corners (if data available, else skip marker -1)
        if m.total_corners is not None:
            targets["corners_ou95"].append(1 if m.total_corners > 9 else 0)
        else:
            targets["corners_ou95"].append(-1)  # marker for missing

        # Cards
        if m.total_cards is not None:
            targets["cards_ou35"].append(1 if m.total_cards > 3 else 0)
        else:
            targets["cards_ou35"].append(-1)

    logger.info(f"Loaded {len(features)} training samples with {len(FEATURE_NAMES)} features")
    return features, targets


def temporal_split(features, targets, train_ratio=0.75, cal_ratio=0.10):
    """
    Temporal split (NOT random -- preserves time order).
    Returns (X_train, y_train, X_cal, y_cal, X_test, y_test)
    """
    n = len(features)
    train_end = int(n * train_ratio)
    cal_end = int(n * (train_ratio + cal_ratio))

    X_train = features[:train_end]
    y_train = targets[:train_end]
    X_cal = features[train_end:cal_end]
    y_cal = targets[train_end:cal_end]
    X_test = features[cal_end:]
    y_test = targets[cal_end:]

    return X_train, y_train, X_cal, y_cal, X_test, y_test


async def train_model(model_name: str, features: list, targets: list, is_multiclass: bool = False) -> Optional[Dict]:
    """
    Train a single XGBoost model with calibration.
    Returns dict with model bytes, metrics, and feature importance.
    """
    try:
        from xgboost import XGBClassifier
        from sklearn.calibration import CalibratedClassifierCV
        from sklearn.metrics import accuracy_score, log_loss, brier_score_loss, f1_score
        import joblib
        import numpy as np
    except ImportError as e:
        logger.error(f"ML dependencies not installed: {e}")
        return None

    # Filter out missing data markers (-1)
    valid_indices = [i for i, t in enumerate(targets) if t != -1]
    if len(valid_indices) < MIN_TRAINING_SAMPLES:
        logger.info(f"Not enough valid data for {model_name}: {len(valid_indices)}")
        return None

    X = np.array([features[i] for i in valid_indices])
    y = np.array([targets[i] for i in valid_indices])

    # Temporal split
    X_train, y_train, X_cal, y_cal, X_test, y_test = temporal_split(
        X.tolist(), y.tolist()
    )
    X_train = np.array(X_train)
    y_train = np.array(y_train)
    X_cal = np.array(X_cal)
    y_cal = np.array(y_cal)
    X_test = np.array(X_test)
    y_test = np.array(y_test)

    if len(X_train) < 20 or len(X_test) < 5:
        logger.info(f"Splits too small for {model_name}")
        return None

    # XGBoost parameters
    if is_multiclass:
        xgb = XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            objective='multi:softprob', num_class=3,
            eval_metric='mlogloss', use_label_encoder=False,
            random_state=42,
        )
    else:
        xgb = XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            objective='binary:logistic',
            eval_metric='logloss', use_label_encoder=False,
            random_state=42,
        )

    # Train
    xgb.fit(X_train, y_train, eval_set=[(X_cal, y_cal)], verbose=False)

    # Calibrate using isotonic regression
    try:
        calibrated = CalibratedClassifierCV(xgb, method='isotonic', cv='prefit')
        calibrated.fit(X_cal, y_cal)
        model = calibrated
    except Exception:
        model = xgb  # fallback to uncalibrated

    # Evaluate on test set
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    try:
        ll = log_loss(y_test, y_proba)
    except Exception:
        ll = None

    f1 = f1_score(y_test, y_pred, average='weighted')

    # Brier score (binary only)
    brier = None
    if not is_multiclass and y_proba.shape[1] == 2:
        brier = brier_score_loss(y_test, y_proba[:, 1])

    # Feature importance
    importance = {}
    try:
        fi = xgb.feature_importances_
        for i, name in enumerate(FEATURE_NAMES):
            if i < len(fi):
                importance[name] = round(float(fi[i]), 4)
        # Sort by importance
        importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True)[:20])
    except Exception:
        pass

    # Serialize model to base64
    buffer = io.BytesIO()
    joblib.dump(model, buffer)
    model_bytes = base64.b64encode(buffer.getvalue()).decode('utf-8')

    logger.info(
        f"Trained {model_name}: accuracy={accuracy:.3f}, f1={f1:.3f}, "
        f"log_loss={ll:.3f if ll else 'N/A'}, samples={len(X_train)}+{len(X_test)}"
    )

    return {
        "model_binary": model_bytes,
        "accuracy": accuracy,
        "f1_score": f1,
        "log_loss": ll,
        "brier_score": brier,
        "feature_importance": importance,
        "training_samples": len(X_train),
    }


async def train_all_models():
    """Train all ML models and save to database."""
    logger.info("Starting model training for all markets")
    start_time = datetime.utcnow()

    features, targets = await get_training_data()
    if not features:
        logger.info("No training data available, skipping")
        return

    # Models to train: (name, target_key, is_multiclass)
    models_config = [
        ("outcome_3way", "outcome_3way", True),
        ("goals_ou25", "goals_ou25", False),
        ("goals_ou15", "goals_ou15", False),
        ("goals_ou35", "goals_ou35", False),
        ("btts", "btts", False),
        ("corners_ou95", "corners_ou95", False),
        ("cards_ou35", "cards_ou35", False),
    ]

    trained_count = 0
    async with async_session_maker() as db:
        for model_name, target_key, is_multi in models_config:
            try:
                result = await train_model(
                    model_name, features, targets[target_key], is_multi
                )
                if result is None:
                    continue

                # Get current max version
                ver_result = await db.execute(
                    select(func.max(MLModel.version)).where(
                        MLModel.model_name == model_name
                    )
                )
                max_ver = ver_result.scalar() or 0
                new_version = max_ver + 1

                # Deactivate old models
                old_result = await db.execute(
                    select(MLModel).where(
                        and_(MLModel.model_name == model_name, MLModel.is_active == True)
                    )
                )
                for old in old_result.scalars().all():
                    old.is_active = False

                # Save new model
                new_model = MLModel(
                    model_name=model_name,
                    model_type="xgboost_calibrated",
                    version=new_version,
                    accuracy=result["accuracy"],
                    f1_score=result["f1_score"],
                    brier_score=result.get("brier_score"),
                    log_loss_val=result.get("log_loss"),
                    feature_importance_json=json.dumps(result["feature_importance"]),
                    model_binary=result["model_binary"],
                    training_samples=result["training_samples"],
                    training_duration_sec=(datetime.utcnow() - start_time).total_seconds(),
                    is_active=True,
                )
                db.add(new_model)
                trained_count += 1

                logger.info(f"Saved model {model_name} v{new_version} (accuracy={result['accuracy']:.3f})")

            except Exception as e:
                logger.error(f"Error training {model_name}: {e}")

        if trained_count > 0:
            try:
                # Log training event
                log = LearningLog(
                    event_type="train_complete",
                    details_json=json.dumps({
                        "models_trained": trained_count,
                        "total_samples": len(features),
                        "duration_sec": (datetime.utcnow() - start_time).total_seconds(),
                    })
                )
                db.add(log)
                await db.commit()
                logger.info(f"Training complete: {trained_count} models trained")
            except Exception as e:
                logger.error(f"DB error: {e}")
                await db.rollback()

    return trained_count


async def load_active_model(model_name: str):
    """Load the active model for a given model name. Returns sklearn model or None."""
    try:
        import joblib
        import base64
        import io
    except ImportError:
        return None

    async with async_session_maker() as db:
        result = await db.execute(
            select(MLModel).where(
                and_(MLModel.model_name == model_name, MLModel.is_active == True)
            )
        )
        model_record = result.scalar_one_or_none()

    if not model_record or not model_record.model_binary:
        return None

    try:
        model_bytes = base64.b64decode(model_record.model_binary)
        model = joblib.load(io.BytesIO(model_bytes))
        return model
    except Exception as e:
        logger.error(f"Error loading model {model_name}: {e}")
        return None


async def training_loop():
    """
    Background training loop.
    First 2 weeks: train daily (building up data).
    After: train weekly (Sunday 3:00 UTC).
    """
    logger.info("ML training worker started")

    # Wait 5 minutes after startup to let data collection run first
    await asyncio.sleep(300)

    while True:
        try:
            # Check how much data we have
            async with async_session_maker() as db:
                result = await db.execute(
                    select(func.count(MatchFeature.id)).where(
                        MatchFeature.is_verified == True
                    )
                )
                total_verified = result.scalar() or 0

            if total_verified >= MIN_TRAINING_SAMPLES:
                await train_all_models()
            else:
                logger.info(f"Waiting for more data: {total_verified}/{MIN_TRAINING_SAMPLES} verified matches")

            # Determine next training time
            now = datetime.utcnow()
            if total_verified < 500:
                # Early phase: train daily
                sleep_hours = 24
            else:
                # Mature phase: train weekly (next Sunday 3:00 UTC)
                days_until_sunday = (6 - now.weekday()) % 7
                if days_until_sunday == 0 and now.hour >= 3:
                    days_until_sunday = 7
                next_sunday = now.replace(hour=3, minute=0, second=0) + timedelta(days=days_until_sunday)
                sleep_hours = max(1, (next_sunday - now).total_seconds() / 3600)

            logger.info(f"Next training in {sleep_hours:.1f} hours")
            await asyncio.sleep(sleep_hours * 3600)

        except Exception as e:
            logger.error(f"Training loop error: {e}")
            await asyncio.sleep(3600)  # Retry in 1 hour
