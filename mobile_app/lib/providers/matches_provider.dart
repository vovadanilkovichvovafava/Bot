import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/match.dart';
import '../services/api_service.dart';

// Matches state
class MatchesState {
  final List<Match> todayMatches;
  final List<Match> tomorrowMatches;
  final bool isLoading;
  final String? error;

  const MatchesState({
    this.todayMatches = const [],
    this.tomorrowMatches = const [],
    this.isLoading = false,
    this.error,
  });

  MatchesState copyWith({
    List<Match>? todayMatches,
    List<Match>? tomorrowMatches,
    bool? isLoading,
    String? error,
  }) {
    return MatchesState(
      todayMatches: todayMatches ?? this.todayMatches,
      tomorrowMatches: tomorrowMatches ?? this.tomorrowMatches,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// Matches notifier
class MatchesNotifier extends StateNotifier<MatchesState> {
  final ApiService _api;

  MatchesNotifier(this._api) : super(const MatchesState());

  Future<void> loadTodayMatches() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final matches = await _api.getTodayMatches();
      state = state.copyWith(
        todayMatches: matches,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> loadTomorrowMatches() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final matches = await _api.getTomorrowMatches();
      state = state.copyWith(
        tomorrowMatches: matches,
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
    await Future.wait([
      loadTodayMatches(),
      loadTomorrowMatches(),
    ]);
  }
}

// Provider
final matchesProvider = StateNotifierProvider<MatchesNotifier, MatchesState>((ref) {
  final api = ref.watch(apiServiceProvider);
  return MatchesNotifier(api);
});

// Today matches provider (convenience)
final todayMatchesProvider = Provider<List<Match>>((ref) {
  return ref.watch(matchesProvider).todayMatches;
});

// Tomorrow matches provider (convenience)
final tomorrowMatchesProvider = Provider<List<Match>>((ref) {
  return ref.watch(matchesProvider).tomorrowMatches;
});
