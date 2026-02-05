"""
ML Feature Columns Configuration
93+ features for football match prediction
"""

# All features with default values
ML_FEATURE_COLUMNS = {
    # ===== TEAM FORM (16 features) =====
    "home_wins": 0,
    "home_draws": 0,
    "home_losses": 0,
    "home_goals_scored": 1.5,
    "home_goals_conceded": 1.0,
    "home_home_win_rate": 50,
    "home_btts_pct": 50,
    "home_over25_pct": 50,
    "away_wins": 0,
    "away_draws": 0,
    "away_losses": 0,
    "away_goals_scored": 1.0,
    "away_goals_conceded": 1.5,
    "away_away_win_rate": 30,
    "away_btts_pct": 50,
    "away_over25_pct": 50,

    # ===== STANDINGS (3 features) =====
    "home_position": 10,
    "away_position": 10,
    "position_diff": 0,

    # ===== ODDS (6 features) =====
    "odds_home": 2.5,
    "odds_draw": 3.5,
    "odds_away": 3.0,
    "implied_home": 0.4,
    "implied_draw": 0.25,
    "implied_away": 0.35,

    # ===== H2H (4 features) =====
    "h2h_home_wins": 0,
    "h2h_draws": 0,
    "h2h_away_wins": 0,
    "h2h_total": 0,

    # ===== EXPECTED GOALS BASE (6 features) =====
    "expected_goals": 2.5,
    "expected_home_goals": 1.3,
    "expected_away_goals": 1.0,
    "expected_goals_method": 0,
    "avg_btts_pct": 50,
    "avg_over25_pct": 50,

    # ===== REFEREE (5 features) =====
    "referee_cards_per_game": 4.0,
    "referee_penalties_per_game": 0.32,
    "referee_reds_per_game": 0.12,
    "referee_style": 2,  # 4=strict, 3=firm, 2=balanced, 1=lenient
    "referee_cards_vs_avg": 0,

    # ===== CALENDAR CONGESTION (5 features) =====
    "home_rest_days": 5,
    "away_rest_days": 5,
    "home_congestion_score": 0,  # 0=fresh, 1=normal, 2=tired, 3=exhausted
    "away_congestion_score": 0,
    "rest_advantage": 0,

    # ===== MOTIVATION (7 features) =====
    "is_derby": 0,
    "home_motivation": 5,
    "away_motivation": 5,
    "home_relegation_battle": 0,
    "away_relegation_battle": 0,
    "home_title_race": 0,
    "away_title_race": 0,
    "motivation_diff": 0,

    # ===== TEAM CLASS (6 features) =====
    "home_is_elite": 0,
    "away_is_elite": 0,
    "home_team_class": 2,  # 4=elite, 3=strong, 2=midtable, 1=weak, 0=relegation
    "away_team_class": 2,
    "class_diff": 0,
    "elite_vs_underdog": 0,
    "class_mismatch": 0,

    # ===== LINE MOVEMENT / SHARP MONEY (7 features) =====
    "home_odds_dropped": 0,
    "away_odds_dropped": 0,
    "draw_odds_dropped": 0,
    "over_odds_dropped": 0,
    "under_odds_dropped": 0,
    "sharp_money_detected": 0,
    "line_movement_direction": 0,  # -1=away, 0=stable, 1=home

    # ===== COACH CHANGE (4 features) =====
    "home_new_coach": 0,
    "away_new_coach": 0,
    "home_coach_boost": 0,
    "away_coach_boost": 0,

    # ===== INJURIES (8 features) =====
    "home_injuries": 0,
    "away_injuries": 0,
    "total_injuries": 0,
    "home_lineup_confirmed": 0,
    "away_lineup_confirmed": 0,
    "home_injury_crisis": 0,
    "away_injury_crisis": 0,
    "fatigue_risk": 0,

    # ===== xG ADVANCED (21 features) =====
    "home_xg_per_game": 1.3,
    "away_xg_per_game": 1.0,
    "home_xga_per_game": 1.0,
    "away_xga_per_game": 1.3,
    "home_xg_diff": 0,
    "away_xg_diff": 0,
    "total_xg_deviation": 0,
    "xg_expected_total": 2.5,
    "xg_expected_home": 1.3,
    "xg_expected_away": 1.0,
    "home_recent_xg": 1.3,
    "away_recent_xg": 1.0,
    "recent_xg_total": 2.3,
    "home_unlucky": 0,
    "away_unlucky": 0,
    "home_lucky": 0,
    "away_lucky": 0,
    "both_underperforming": 0,
    "both_overperforming": 0,
    "xg_data_available": 0,

    # ===== PLAYER IMPACT (14 features) =====
    "home_attack_modifier": 0,
    "away_attack_modifier": 0,
    "home_defense_modifier": 0,
    "away_defense_modifier": 0,
    "home_goals_modifier": 0,
    "away_goals_modifier": 0,
    "home_total_impact": 0,
    "away_total_impact": 0,
    "home_key_players_out": 0,
    "away_key_players_out": 0,
    "home_star_out": 0,
    "away_star_out": 0,
    "home_defense_crisis": 0,
    "away_defense_crisis": 0,
    "player_impact_available": 0,

    # ===== WEATHER (7 features) - YOUR SUGGESTION! =====
    "wind_speed_kmh": 0,
    "wind_direction": 0,
    "wind_against_home_1h": 0,
    "wind_against_away_1h": 0,
    "is_strong_wind": 0,  # >25 km/h
    "rain_intensity": 0,
    "temperature": 20,

    # ===== ADDITIONAL =====
    "has_web_news": 0,
}

# Bet categories
BET_CATEGORIES = [
    "outcomes_home",
    "outcomes_away",
    "outcomes_draw",
    "totals_over",
    "totals_under",
    "btts",
]

# Ensemble model configuration
ENSEMBLE_MODEL_TYPES = {
    "random_forest": {
        "class": "RandomForestClassifier",
        "params": {
            "n_estimators": 100,
            "max_depth": 10,
            "min_samples_split": 5,
            "random_state": 42
        },
        "weight": 1.0
    },
    "gradient_boost": {
        "class": "GradientBoostingClassifier",
        "params": {
            "n_estimators": 100,
            "max_depth": 5,
            "learning_rate": 0.1,
            "random_state": 42
        },
        "weight": 1.2
    },
    "logistic": {
        "class": "LogisticRegression",
        "params": {
            "max_iter": 1000,
            "random_state": 42
        },
        "weight": 0.8
    }
}

# ML Configuration
ML_CONFIG = {
    "min_samples": 50,
    "models_dir": "ml_models",
    "min_confidence": 30,
    "max_confidence": 95,
    "min_confidence_for_bet": 55,
    "min_ev_for_bet": 5.0,
    "kelly_fraction": 0.25,
    "max_stake_percent": 10.0,
    "min_stake_percent": 1.0,
    "calibration_min_samples": 10,
    "roi_min_bets": 15,
}

# Elite teams list
ELITE_TEAMS = {
    "Real Madrid", "Barcelona", "Atletico Madrid",
    "Manchester City", "Liverpool", "Arsenal", "Chelsea", "Manchester United",
    "Bayern Munich", "Borussia Dortmund",
    "PSG", "Marseille",
    "Juventus", "Inter", "AC Milan", "Napoli",
    "Ajax", "Porto", "Benfica",
}


def features_to_vector(features: dict) -> list:
    """
    Convert features dict to vector for ML model.
    IMPORTANT: Order must match training!
    """
    return [
        features.get(name, default)
        for name, default in ML_FEATURE_COLUMNS.items()
    ]


def get_confidence_band(confidence: float) -> str:
    """Get confidence band for calibration."""
    if confidence < 40:
        return "30-40"
    elif confidence < 50:
        return "40-50"
    elif confidence < 60:
        return "50-60"
    elif confidence < 70:
        return "60-70"
    elif confidence < 80:
        return "70-80"
    elif confidence < 90:
        return "80-90"
    else:
        return "90-100"


def calculate_ev(confidence: float, odds: float) -> float:
    """Calculate Expected Value."""
    probability = confidence / 100
    ev = (probability * odds - 1) * 100
    return round(ev, 1)


def calculate_kelly_stake(confidence: float, odds: float) -> float:
    """Calculate Kelly Criterion stake."""
    probability = confidence / 100
    if odds <= 1:
        return ML_CONFIG["min_stake_percent"]

    kelly = ((odds * probability - 1) / odds) * 100
    fractional_kelly = kelly * ML_CONFIG["kelly_fraction"]

    stake = max(
        ML_CONFIG["min_stake_percent"],
        min(ML_CONFIG["max_stake_percent"], fractional_kelly)
    )
    return round(stake, 2)
