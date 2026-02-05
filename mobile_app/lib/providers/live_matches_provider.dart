import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/match.dart';
import '../services/api_service.dart';

/// State for live matches
class LiveMatchesState {
  final List<Match> matches;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  const LiveMatchesState({
    this.matches = const [],
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  LiveMatchesState copyWith({
    List<Match>? matches,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return LiveMatchesState(
      matches: matches ?? this.matches,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }

  bool get hasLiveMatches => matches.isNotEmpty;
  int get liveCount => matches.length;
}

/// Notifier for live matches with periodic updates
class LiveMatchesNotifier extends StateNotifier<LiveMatchesState> {
  final ApiService _api;
  Timer? _timer;
  bool _isActive = false;

  // Refresh every 30 seconds for live matches
  static const Duration _refreshInterval = Duration(seconds: 30);

  LiveMatchesNotifier(this._api) : super(const LiveMatchesState());

  /// Start live updates
  void startLiveUpdates() {
    if (_isActive) return;
    _isActive = true;

    // Fetch immediately
    _fetchLiveMatches();

    // Schedule periodic updates
    _timer = Timer.periodic(_refreshInterval, (_) => _fetchLiveMatches());
    if (kDebugMode) debugPrint('LiveMatchesNotifier: Started live updates');
  }

  /// Stop live updates
  void stopLiveUpdates() {
    _timer?.cancel();
    _timer = null;
    _isActive = false;
    if (kDebugMode) debugPrint('LiveMatchesNotifier: Stopped live updates');
  }

  /// Fetch live matches from API
  Future<void> _fetchLiveMatches() async {
    try {
      state = state.copyWith(isLoading: true, error: null);

      final matches = await _api.getLiveMatches();

      state = state.copyWith(
        matches: matches,
        isLoading: false,
        lastUpdated: DateTime.now(),
      );

      if (kDebugMode) debugPrint('LiveMatchesNotifier: Fetched ${matches.length} live matches');
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      if (kDebugMode) debugPrint('LiveMatchesNotifier: Error fetching live matches: $e');
    }
  }

  /// Manual refresh
  Future<void> refresh() async {
    await _fetchLiveMatches();
  }

  /// Update a specific match in the list (for optimistic updates)
  void updateMatch(Match updatedMatch) {
    final matches = state.matches.map((m) {
      return m.id == updatedMatch.id ? updatedMatch : m;
    }).toList();

    state = state.copyWith(matches: matches);
  }

  @override
  void dispose() {
    stopLiveUpdates();
    super.dispose();
  }
}

// Provider for live matches
final liveMatchesProvider =
    StateNotifierProvider<LiveMatchesNotifier, LiveMatchesState>((ref) {
  final api = ref.watch(apiServiceProvider);
  return LiveMatchesNotifier(api);
});

// Convenience provider for just the live matches list
final liveMatchesListProvider = Provider<List<Match>>((ref) {
  return ref.watch(liveMatchesProvider).matches;
});

// Provider for live match count (for badges, etc.)
final liveMatchCountProvider = Provider<int>((ref) {
  return ref.watch(liveMatchesProvider).liveCount;
});
