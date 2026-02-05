"""
Feature Extraction Service
Extracts 93+ features from match data for ML predictions
"""
from typing import Dict, List, Optional
from app.ml.features import ML_FEATURE_COLUMNS, ELITE_TEAMS


class FeatureExtractor:
    """Extract features from match data sources"""

    def extract(
        self,
        home_form: Dict = None,
        away_form: Dict = None,
        standings: Dict = None,
        odds: Dict = None,
        h2h: List = None,
        home_team: str = "",
        away_team: str = "",
        referee_stats: Dict = None,
        congestion: Dict = None,
        motivation: Dict = None,
        team_class: Dict = None,
        coach_factor: Dict = None,
        line_movement: Dict = None,
        injuries: Dict = None,
        xg_data: Dict = None,
        player_impact: Dict = None,
        weather: Dict = None,
        has_web_news: bool = False,
    ) -> Dict:
        """
        Extract all features from provided data sources.
        Missing data uses default values from ML_FEATURE_COLUMNS.
        """
        # Start with defaults
        features = dict(ML_FEATURE_COLUMNS)

        # Extract from each data source
        self._extract_form(features, home_form, away_form)
        self._extract_standings(features, standings, home_team, away_team)
        self._extract_odds(features, odds)
        self._extract_h2h(features, h2h)
        self._extract_referee(features, referee_stats)
        self._extract_congestion(features, congestion)
        self._extract_motivation(features, motivation, home_team, away_team)
        self._extract_team_class(features, team_class, home_team, away_team)
        self._extract_line_movement(features, line_movement)
        self._extract_coach(features, coach_factor)
        self._extract_injuries(features, injuries)
        self._extract_xg(features, xg_data)
        self._extract_player_impact(features, player_impact)
        self._extract_weather(features, weather)

        features["has_web_news"] = 1 if has_web_news else 0

        return features

    def _extract_form(self, features: Dict, home_form: Dict, away_form: Dict):
        """Extract team form features"""
        if home_form:
            features["home_wins"] = home_form.get("wins", 0)
            features["home_draws"] = home_form.get("draws", 0)
            features["home_losses"] = home_form.get("losses", 0)
            features["home_goals_scored"] = home_form.get("goals_scored", 1.5)
            features["home_goals_conceded"] = home_form.get("goals_conceded", 1.0)
            features["home_home_win_rate"] = home_form.get("home_win_rate", 50)
            features["home_btts_pct"] = home_form.get("btts_pct", 50)
            features["home_over25_pct"] = home_form.get("over25_pct", 50)

        if away_form:
            features["away_wins"] = away_form.get("wins", 0)
            features["away_draws"] = away_form.get("draws", 0)
            features["away_losses"] = away_form.get("losses", 0)
            features["away_goals_scored"] = away_form.get("goals_scored", 1.0)
            features["away_goals_conceded"] = away_form.get("goals_conceded", 1.5)
            features["away_away_win_rate"] = away_form.get("away_win_rate", 30)
            features["away_btts_pct"] = away_form.get("btts_pct", 50)
            features["away_over25_pct"] = away_form.get("over25_pct", 50)

        # Calculate expected goals from form
        if home_form and away_form:
            home_scored = features["home_goals_scored"]
            away_scored = features["away_goals_scored"]
            home_conceded = features["home_goals_conceded"]
            away_conceded = features["away_goals_conceded"]

            features["expected_home_goals"] = (home_scored + away_conceded) / 2
            features["expected_away_goals"] = (away_scored + home_conceded) / 2
            features["expected_goals"] = features["expected_home_goals"] + features["expected_away_goals"]
            features["avg_btts_pct"] = (features["home_btts_pct"] + features["away_btts_pct"]) / 2
            features["avg_over25_pct"] = (features["home_over25_pct"] + features["away_over25_pct"]) / 2

    def _extract_standings(self, features: Dict, standings: Dict, home_team: str, away_team: str):
        """Extract standings features"""
        if standings:
            home_pos = standings.get(home_team, {}).get("position", 10)
            away_pos = standings.get(away_team, {}).get("position", 10)

            features["home_position"] = home_pos
            features["away_position"] = away_pos
            features["position_diff"] = home_pos - away_pos

    def _extract_odds(self, features: Dict, odds: Dict):
        """Extract odds features"""
        if odds:
            home_odds = odds.get("home", 2.5)
            draw_odds = odds.get("draw", 3.5)
            away_odds = odds.get("away", 3.0)

            features["odds_home"] = home_odds
            features["odds_draw"] = draw_odds
            features["odds_away"] = away_odds

            # Implied probabilities
            total = (1/home_odds + 1/draw_odds + 1/away_odds) if home_odds and draw_odds and away_odds else 1
            features["implied_home"] = (1/home_odds) / total if home_odds else 0.4
            features["implied_draw"] = (1/draw_odds) / total if draw_odds else 0.25
            features["implied_away"] = (1/away_odds) / total if away_odds else 0.35

    def _extract_h2h(self, features: Dict, h2h: List):
        """Extract head-to-head features"""
        if h2h:
            home_wins = sum(1 for m in h2h if m.get("winner") == "home")
            draws = sum(1 for m in h2h if m.get("winner") == "draw")
            away_wins = sum(1 for m in h2h if m.get("winner") == "away")

            features["h2h_home_wins"] = home_wins
            features["h2h_draws"] = draws
            features["h2h_away_wins"] = away_wins
            features["h2h_total"] = len(h2h)

    def _extract_referee(self, features: Dict, referee: Dict):
        """Extract referee features"""
        if referee:
            features["referee_cards_per_game"] = referee.get("cards_per_game", 4.0)
            features["referee_penalties_per_game"] = referee.get("penalties_per_game", 0.32)
            features["referee_reds_per_game"] = referee.get("reds_per_game", 0.12)
            features["referee_style"] = referee.get("style", 2)
            features["referee_cards_vs_avg"] = referee.get("cards_vs_avg", 0)

    def _extract_congestion(self, features: Dict, congestion: Dict):
        """Extract calendar congestion features"""
        if congestion:
            features["home_rest_days"] = congestion.get("home_rest", 5)
            features["away_rest_days"] = congestion.get("away_rest", 5)
            features["home_congestion_score"] = congestion.get("home_congestion", 0)
            features["away_congestion_score"] = congestion.get("away_congestion", 0)
            features["rest_advantage"] = features["home_rest_days"] - features["away_rest_days"]
            features["fatigue_risk"] = 1 if features["home_congestion_score"] >= 2 or features["away_congestion_score"] >= 2 else 0

    def _extract_motivation(self, features: Dict, motivation: Dict, home_team: str, away_team: str):
        """Extract motivation features"""
        if motivation:
            features["is_derby"] = motivation.get("is_derby", 0)
            features["home_motivation"] = motivation.get("home", 5)
            features["away_motivation"] = motivation.get("away", 5)
            features["home_relegation_battle"] = motivation.get("home_relegation", 0)
            features["away_relegation_battle"] = motivation.get("away_relegation", 0)
            features["home_title_race"] = motivation.get("home_title", 0)
            features["away_title_race"] = motivation.get("away_title", 0)
            features["motivation_diff"] = features["home_motivation"] - features["away_motivation"]

    def _extract_team_class(self, features: Dict, team_class: Dict, home_team: str, away_team: str):
        """Extract team class features"""
        # Check elite status
        home_is_elite = 1 if home_team in ELITE_TEAMS else 0
        away_is_elite = 1 if away_team in ELITE_TEAMS else 0

        features["home_is_elite"] = home_is_elite
        features["away_is_elite"] = away_is_elite

        if team_class:
            features["home_team_class"] = team_class.get("home", 2)
            features["away_team_class"] = team_class.get("away", 2)
        else:
            # Derive from elite status
            features["home_team_class"] = 4 if home_is_elite else 2
            features["away_team_class"] = 4 if away_is_elite else 2

        features["class_diff"] = features["home_team_class"] - features["away_team_class"]
        features["class_mismatch"] = abs(features["class_diff"])
        features["elite_vs_underdog"] = 1 if (home_is_elite and features["away_team_class"] <= 1) or \
                                              (away_is_elite and features["home_team_class"] <= 1) else 0

    def _extract_line_movement(self, features: Dict, movement: Dict):
        """Extract line movement / sharp money features"""
        if movement:
            features["home_odds_dropped"] = movement.get("home_dropped", 0)
            features["away_odds_dropped"] = movement.get("away_dropped", 0)
            features["draw_odds_dropped"] = movement.get("draw_dropped", 0)
            features["over_odds_dropped"] = movement.get("over_dropped", 0)
            features["under_odds_dropped"] = movement.get("under_dropped", 0)
            features["sharp_money_detected"] = movement.get("sharp_detected", 0)
            features["line_movement_direction"] = movement.get("direction", 0)

    def _extract_coach(self, features: Dict, coach: Dict):
        """Extract coach change features"""
        if coach:
            features["home_new_coach"] = coach.get("home_new", 0)
            features["away_new_coach"] = coach.get("away_new", 0)
            features["home_coach_boost"] = coach.get("home_boost", 0)
            features["away_coach_boost"] = coach.get("away_boost", 0)

    def _extract_injuries(self, features: Dict, injuries: Dict):
        """Extract injury features"""
        if injuries:
            home_inj = injuries.get("home", 0)
            away_inj = injuries.get("away", 0)

            features["home_injuries"] = home_inj
            features["away_injuries"] = away_inj
            features["total_injuries"] = home_inj + away_inj
            features["home_lineup_confirmed"] = injuries.get("home_confirmed", 0)
            features["away_lineup_confirmed"] = injuries.get("away_confirmed", 0)
            features["home_injury_crisis"] = 1 if home_inj >= 6 else 0
            features["away_injury_crisis"] = 1 if away_inj >= 6 else 0

    def _extract_xg(self, features: Dict, xg: Dict):
        """Extract xG features"""
        if xg:
            features["xg_data_available"] = 1

            features["home_xg_per_game"] = xg.get("home_xg", 1.3)
            features["away_xg_per_game"] = xg.get("away_xg", 1.0)
            features["home_xga_per_game"] = xg.get("home_xga", 1.0)
            features["away_xga_per_game"] = xg.get("away_xga", 1.3)

            # xG diff (positive = underperforming)
            home_actual = xg.get("home_goals", features["home_xg_per_game"])
            away_actual = xg.get("away_goals", features["away_xg_per_game"])
            features["home_xg_diff"] = features["home_xg_per_game"] - home_actual
            features["away_xg_diff"] = features["away_xg_per_game"] - away_actual
            features["total_xg_deviation"] = abs(features["home_xg_diff"]) + abs(features["away_xg_diff"])

            # Expected totals from xG
            features["xg_expected_home"] = (features["home_xg_per_game"] + features["away_xga_per_game"]) / 2
            features["xg_expected_away"] = (features["away_xg_per_game"] + features["home_xga_per_game"]) / 2
            features["xg_expected_total"] = features["xg_expected_home"] + features["xg_expected_away"]

            # Recent xG
            features["home_recent_xg"] = xg.get("home_recent_xg", features["home_xg_per_game"])
            features["away_recent_xg"] = xg.get("away_recent_xg", features["away_xg_per_game"])
            features["recent_xg_total"] = features["home_recent_xg"] + features["away_recent_xg"]

            # Lucky/unlucky flags
            features["home_unlucky"] = 1 if features["home_xg_diff"] > 2 else 0
            features["away_unlucky"] = 1 if features["away_xg_diff"] > 2 else 0
            features["home_lucky"] = 1 if features["home_xg_diff"] < -2 else 0
            features["away_lucky"] = 1 if features["away_xg_diff"] < -2 else 0
            features["both_underperforming"] = 1 if features["total_xg_deviation"] > 3 else 0
            features["both_overperforming"] = 1 if features["home_xg_diff"] < -1 and features["away_xg_diff"] < -1 else 0

    def _extract_player_impact(self, features: Dict, impact: Dict):
        """Extract player impact features"""
        if impact:
            features["player_impact_available"] = 1

            features["home_attack_modifier"] = impact.get("home_attack", 0)
            features["away_attack_modifier"] = impact.get("away_attack", 0)
            features["home_defense_modifier"] = impact.get("home_defense", 0)
            features["away_defense_modifier"] = impact.get("away_defense", 0)
            features["home_goals_modifier"] = impact.get("home_goals", 0)
            features["away_goals_modifier"] = impact.get("away_goals", 0)
            features["home_total_impact"] = impact.get("home_total", 0)
            features["away_total_impact"] = impact.get("away_total", 0)
            features["home_key_players_out"] = impact.get("home_key_out", 0)
            features["away_key_players_out"] = impact.get("away_key_out", 0)

            # Crisis flags
            features["home_star_out"] = 1 if features["home_attack_modifier"] < -25 else 0
            features["away_star_out"] = 1 if features["away_attack_modifier"] < -25 else 0
            features["home_defense_crisis"] = 1 if features["home_defense_modifier"] < -25 else 0
            features["away_defense_crisis"] = 1 if features["away_defense_modifier"] < -25 else 0

    def _extract_weather(self, features: Dict, weather: Dict):
        """Extract weather features (YOUR SUGGESTION!)"""
        if weather:
            features["wind_speed_kmh"] = weather.get("wind_speed", 0)
            features["wind_direction"] = weather.get("wind_direction", 0)
            features["is_strong_wind"] = 1 if features["wind_speed_kmh"] > 25 else 0
            features["rain_intensity"] = weather.get("rain", 0)
            features["temperature"] = weather.get("temperature", 20)

            # Wind against calculations would need pitch orientation data
            # For now, set based on strong wind only
            if features["is_strong_wind"]:
                features["wind_against_home_1h"] = 1  # Simplified
                features["wind_against_away_1h"] = 0
