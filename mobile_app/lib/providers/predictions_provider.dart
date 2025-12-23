import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/prediction.dart';
import '../services/api_service.dart';

// Predictions state
class PredictionsState {
  final List<Prediction> history;
  final Prediction? currentPrediction;
  final bool isLoading;
  final String? error;

  const PredictionsState({
    this.history = const [],
    this.currentPrediction,
    this.isLoading = false,
    this.error,
  });

  PredictionsState copyWith({
    List<Prediction>? history,
    Prediction? currentPrediction,
    bool? isLoading,
    String? error,
  }) {
    return PredictionsState(
      history: history ?? this.history,
      currentPrediction: currentPrediction ?? this.currentPrediction,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// Predictions notifier
class PredictionsNotifier extends StateNotifier<PredictionsState> {
  final ApiService _api;

  PredictionsNotifier(this._api) : super(const PredictionsState());

  Future<void> loadHistory({int limit = 50, int offset = 0}) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final predictions = await _api.getPredictionHistory(
        limit: limit,
        offset: offset,
      );
      state = state.copyWith(
        history: predictions,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<Prediction?> getPrediction(int matchId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final prediction = await _api.createPrediction(matchId);
      state = state.copyWith(
        currentPrediction: prediction,
        isLoading: false,
      );
      return prediction;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return null;
    }
  }

  void clearCurrent() {
    state = state.copyWith(currentPrediction: null);
  }
}

// Provider
final predictionsProvider =
    StateNotifierProvider<PredictionsNotifier, PredictionsState>((ref) {
  final api = ref.watch(apiServiceProvider);
  return PredictionsNotifier(api);
});

// History provider (convenience)
final predictionHistoryProvider = Provider<List<Prediction>>((ref) {
  return ref.watch(predictionsProvider).history;
});

// Stats from predictions
final predictionStatsProvider = Provider<Map<String, dynamic>>((ref) {
  final history = ref.watch(predictionHistoryProvider);

  if (history.isEmpty) {
    return {
      'total': 0,
      'wins': 0,
      'losses': 0,
      'pending': 0,
      'accuracy': 0.0,
    };
  }

  final wins = history.where((p) => p.isWin).length;
  final losses = history.where((p) => p.isLoss).length;
  final pending = history.where((p) => p.isPending).length;
  final decided = wins + losses;

  return {
    'total': history.length,
    'wins': wins,
    'losses': losses,
    'pending': pending,
    'accuracy': decided > 0 ? (wins / decided * 100) : 0.0,
  };
});
