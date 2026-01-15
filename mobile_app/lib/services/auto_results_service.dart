import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/prediction.dart';
import '../providers/predictions_provider.dart';
import 'api_service.dart';

/// Service that automatically fetches match results and updates predictions
class AutoResultsService {
  final ApiService _api;
  final Ref _ref;
  Timer? _timer;
  bool _isRunning = false;

  static const Duration _checkInterval = Duration(minutes: 5);

  AutoResultsService(this._api, this._ref);

  /// Start the auto-results checker
  void start() {
    if (_isRunning) return;
    _isRunning = true;

    // Run immediately on start
    _checkResults();

    // Schedule periodic checks
    _timer = Timer.periodic(_checkInterval, (_) => _checkResults());
    if (kDebugMode) debugPrint('AutoResultsService started');
  }

  /// Stop the auto-results checker
  void stop() {
    _timer?.cancel();
    _timer = null;
    _isRunning = false;
    if (kDebugMode) debugPrint('AutoResultsService stopped');
  }

  /// Check for finished matches and update predictions
  Future<void> _checkResults() async {
    try {
      final predictionsState = _ref.read(predictionsProvider);
      final pendingPredictions = predictionsState.predictions
          .where((p) => p.isPending && p.matchDate != null)
          .where((p) => p.matchDate!.isBefore(DateTime.now().add(const Duration(hours: 3))))
          .toList();

      if (pendingPredictions.isEmpty) {
        if (kDebugMode) debugPrint('AutoResults: No pending predictions to check');
        return;
      }

      if (kDebugMode) debugPrint('AutoResults: Checking ${pendingPredictions.length} pending predictions');

      // Get match IDs
      final matchIds = pendingPredictions.map((p) => p.matchId).toList();

      // Fetch results from API
      final results = await _api.getMatchResults(matchIds);

      // Process each result
      for (final result in results) {
        final matchId = result['id'] as int;
        final status = result['status'] as String;
        final homeScore = result['home_score'] as int?;
        final awayScore = result['away_score'] as int?;

        // Only process finished matches
        if (status.toLowerCase() != 'finished') continue;
        if (homeScore == null || awayScore == null) continue;

        // Find the prediction for this match
        final prediction = pendingPredictions.firstWhere(
          (p) => p.matchId == matchId,
          orElse: () => throw Exception('Prediction not found'),
        );

        // Determine if prediction is correct
        final isWin = _evaluatePrediction(prediction, homeScore, awayScore);
        final resultString = isWin ? 'win' : 'loss';

        // Update the prediction
        await _ref.read(predictionsProvider.notifier).updateResult(
          matchId,
          resultString,
          homeScore: homeScore,
          awayScore: awayScore,
        );

        if (kDebugMode) debugPrint('AutoResults: Updated prediction for match $matchId - $resultString');
      }
    } catch (e) {
      if (kDebugMode) debugPrint('AutoResults: Error checking results: $e');
    }
  }

  /// Evaluate if a prediction is correct based on bet type and final score
  bool _evaluatePrediction(Prediction prediction, int homeScore, int awayScore) {
    final betType = prediction.betType.toLowerCase();
    final totalGoals = homeScore + awayScore;

    // Home Win (1)
    if (betType.contains('home') || betType == '1' || betType.contains('1x2 home')) {
      return homeScore > awayScore;
    }

    // Away Win (2)
    if (betType.contains('away') || betType == '2' || betType.contains('1x2 away')) {
      return awayScore > homeScore;
    }

    // Draw (X)
    if (betType.contains('draw') || betType == 'x' || betType.contains('1x2 draw')) {
      return homeScore == awayScore;
    }

    // Double Chance 1X (Home or Draw)
    if (betType.contains('1x') || betType.contains('home or draw')) {
      return homeScore >= awayScore;
    }

    // Double Chance X2 (Draw or Away)
    if (betType.contains('x2') || betType.contains('draw or away')) {
      return homeScore <= awayScore;
    }

    // Double Chance 12 (Home or Away - no draw)
    if (betType.contains('12') || betType.contains('home or away')) {
      return homeScore != awayScore;
    }

    // Over 2.5 Goals
    if (betType.contains('over 2.5') || betType.contains('o2.5')) {
      return totalGoals > 2;
    }

    // Under 2.5 Goals
    if (betType.contains('under 2.5') || betType.contains('u2.5')) {
      return totalGoals < 3;
    }

    // Over 1.5 Goals
    if (betType.contains('over 1.5') || betType.contains('o1.5')) {
      return totalGoals > 1;
    }

    // Under 1.5 Goals
    if (betType.contains('under 1.5') || betType.contains('u1.5')) {
      return totalGoals < 2;
    }

    // Over 3.5 Goals
    if (betType.contains('over 3.5') || betType.contains('o3.5')) {
      return totalGoals > 3;
    }

    // Under 3.5 Goals
    if (betType.contains('under 3.5') || betType.contains('u3.5')) {
      return totalGoals < 4;
    }

    // Both Teams to Score (BTTS)
    if (betType.contains('btts') || betType.contains('both teams to score')) {
      if (betType.contains('yes') || !betType.contains('no')) {
        return homeScore > 0 && awayScore > 0;
      } else {
        return homeScore == 0 || awayScore == 0;
      }
    }

    // Clean Sheet Home
    if (betType.contains('clean sheet home')) {
      return awayScore == 0;
    }

    // Clean Sheet Away
    if (betType.contains('clean sheet away')) {
      return homeScore == 0;
    }

    // Win to Nil - Home
    if (betType.contains('home win to nil')) {
      return homeScore > awayScore && awayScore == 0;
    }

    // Win to Nil - Away
    if (betType.contains('away win to nil')) {
      return awayScore > homeScore && homeScore == 0;
    }

    // Exact Score (e.g., "2-1", "1:0")
    final scorePattern = RegExp(r'(\d+)[:\-](\d+)');
    final scoreMatch = scorePattern.firstMatch(betType);
    if (scoreMatch != null) {
      final predictedHome = int.tryParse(scoreMatch.group(1)!);
      final predictedAway = int.tryParse(scoreMatch.group(2)!);
      if (predictedHome != null && predictedAway != null) {
        return homeScore == predictedHome && awayScore == predictedAway;
      }
    }

    // Handicap betting (e.g., "Home -1", "Away +1.5")
    final handicapPattern = RegExp(r'(home|away)\s*([+\-]?\d+\.?\d*)');
    final handicapMatch = handicapPattern.firstMatch(betType);
    if (handicapMatch != null) {
      final team = handicapMatch.group(1)!.toLowerCase();
      final handicap = double.tryParse(handicapMatch.group(2)!) ?? 0;

      if (team == 'home') {
        return (homeScore + handicap) > awayScore;
      } else {
        return (awayScore + handicap) > homeScore;
      }
    }

    // Default: Can't evaluate, mark as loss (conservative)
    if (kDebugMode) debugPrint('AutoResults: Unknown bet type "$betType", defaulting to loss');
    return false;
  }

  /// Manual trigger for checking results (can be called from UI)
  Future<void> checkNow() async {
    await _checkResults();
  }
}

// Provider for auto-results service
final autoResultsServiceProvider = Provider<AutoResultsService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return AutoResultsService(api, ref);
});
