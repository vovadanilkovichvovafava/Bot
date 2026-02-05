import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/prediction.dart';
import '../models/match.dart';
import '../services/api_service.dart';
import '../services/predictions_storage_service.dart';

// Predictions state
class PredictionsState {
  final List<Prediction> predictions;
  final bool isLoading;
  final String? error;

  const PredictionsState({
    this.predictions = const [],
    this.isLoading = false,
    this.error,
  });

  PredictionsState copyWith({
    List<Prediction>? predictions,
    bool? isLoading,
    String? error,
  }) {
    return PredictionsState(
      predictions: predictions ?? this.predictions,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// Predictions notifier
class PredictionsNotifier extends StateNotifier<PredictionsState> {
  final PredictionsStorageService _storage;
  final ApiService _api;

  PredictionsNotifier(this._storage, this._api) : super(const PredictionsState()) {
    _loadLocalPredictions();
  }

  Future<void> _loadLocalPredictions() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final predictions = await _storage.loadPredictions();
      state = state.copyWith(
        predictions: predictions,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> refresh() async {
    await _loadLocalPredictions();
  }

  Future<void> savePrediction({
    required Match match,
    required String betType,
    required double confidence,
    double? odds,
    String? analysis,
  }) async {
    final id = await _storage.generateId();
    final prediction = Prediction(
      id: id,
      matchId: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      competition: match.league,
      matchDate: match.matchDate,
      betType: betType,
      confidence: confidence,
      odds: odds,
      analysis: analysis,
      createdAt: DateTime.now(),
    );

    await _storage.addPrediction(prediction);

    // Update state
    final predictions = List<Prediction>.from(state.predictions);
    final existingIndex = predictions.indexWhere((p) => p.matchId == match.id);
    if (existingIndex >= 0) {
      predictions[existingIndex] = prediction;
    } else {
      predictions.insert(0, prediction);
    }
    state = state.copyWith(predictions: predictions);
  }

  Future<void> updateResult(int matchId, String result, {int? homeScore, int? awayScore}) async {
    await _storage.updatePredictionResult(matchId, result, homeScore: homeScore, awayScore: awayScore);

    // Update state
    final predictions = state.predictions.map((p) {
      if (p.matchId == matchId) {
        return p.copyWith(result: result, homeScore: homeScore, awayScore: awayScore);
      }
      return p;
    }).toList();
    state = state.copyWith(predictions: predictions);
  }

  Future<void> removePrediction(int matchId) async {
    await _storage.removePrediction(matchId);

    // Update state
    final predictions = state.predictions.where((p) => p.matchId != matchId).toList();
    state = state.copyWith(predictions: predictions);
  }

  Future<void> clearAll() async {
    await _storage.clearAll();
    state = state.copyWith(predictions: []);
  }

  bool hasPrediction(int matchId) {
    return state.predictions.any((p) => p.matchId == matchId);
  }

  Prediction? getPrediction(int matchId) {
    try {
      return state.predictions.firstWhere((p) => p.matchId == matchId);
    } catch (e) {
      return null;
    }
  }
}

// Provider
final predictionsProvider =
    StateNotifierProvider<PredictionsNotifier, PredictionsState>((ref) {
  final storage = ref.watch(predictionsStorageProvider);
  final api = ref.watch(apiServiceProvider);
  return PredictionsNotifier(storage, api);
});

// Convenience providers
final predictionHistoryProvider = Provider<List<Prediction>>((ref) {
  return ref.watch(predictionsProvider).predictions;
});

// Stats from predictions
final predictionStatsProvider = Provider<PredictionStats>((ref) {
  final predictions = ref.watch(predictionHistoryProvider);
  return PredictionStats.calculate(predictions);
});

// Stats class
class PredictionStats {
  final int total;
  final int wins;
  final int losses;
  final int pending;
  final int voided;
  final double accuracy;
  final Map<String, BetTypeStats> byBetType;
  final Map<String, int> byLeague;
  final int streak; // positive = win streak, negative = loss streak
  final double avgConfidence;

  PredictionStats({
    required this.total,
    required this.wins,
    required this.losses,
    required this.pending,
    required this.voided,
    required this.accuracy,
    required this.byBetType,
    required this.byLeague,
    required this.streak,
    required this.avgConfidence,
  });

  factory PredictionStats.calculate(List<Prediction> predictions) {
    if (predictions.isEmpty) {
      return PredictionStats(
        total: 0,
        wins: 0,
        losses: 0,
        pending: 0,
        voided: 0,
        accuracy: 0.0,
        byBetType: {},
        byLeague: {},
        streak: 0,
        avgConfidence: 0.0,
      );
    }

    final wins = predictions.where((p) => p.isWin).length;
    final losses = predictions.where((p) => p.isLoss).length;
    final pending = predictions.where((p) => p.isPending).length;
    final voided = predictions.where((p) => p.isVoid).length;
    final decided = wins + losses;
    final accuracy = decided > 0 ? (wins / decided * 100) : 0.0;

    // Stats by bet type
    final byBetType = <String, BetTypeStats>{};
    for (final p in predictions) {
      if (p.betType.isNotEmpty) {
        byBetType.putIfAbsent(p.betType, () => BetTypeStats(total: 0, wins: 0));
        byBetType[p.betType] = byBetType[p.betType]!.add(p);
      }
    }

    // Stats by league
    final byLeague = <String, int>{};
    for (final p in predictions) {
      if (p.competition.isNotEmpty) {
        byLeague[p.competition] = (byLeague[p.competition] ?? 0) + 1;
      }
    }

    // Calculate streak
    int streak = 0;
    final decidedPredictions = predictions
        .where((p) => p.isWin || p.isLoss)
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

    if (decidedPredictions.isNotEmpty) {
      final firstResult = decidedPredictions.first.isWin;
      for (final p in decidedPredictions) {
        if (p.isWin == firstResult) {
          streak += firstResult ? 1 : -1;
        } else {
          break;
        }
      }
    }

    // Average confidence
    double totalConfidence = 0;
    for (final p in predictions) {
      totalConfidence += p.confidence;
    }
    final avgConfidence = predictions.isNotEmpty
        ? totalConfidence / predictions.length
        : 0.0;

    return PredictionStats(
      total: predictions.length,
      wins: wins,
      losses: losses,
      pending: pending,
      voided: voided,
      accuracy: accuracy,
      byBetType: byBetType,
      byLeague: byLeague,
      streak: streak,
      avgConfidence: avgConfidence,
    );
  }

  bool get hasData => total > 0;
  bool get hasDecidedPredictions => wins > 0 || losses > 0;
}

class BetTypeStats {
  final int total;
  final int wins;

  BetTypeStats({required this.total, required this.wins});

  BetTypeStats add(Prediction p) {
    return BetTypeStats(
      total: total + 1,
      wins: wins + (p.isWin ? 1 : 0),
    );
  }

  double get accuracy => total > 0 ? (wins / total * 100) : 0.0;
}
