import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/match.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';

// Cache keys
const _todayMatchesCacheKey = 'cache_today_matches';
const _tomorrowMatchesCacheKey = 'cache_tomorrow_matches';
const _cacheTimestampKey = 'cache_matches_timestamp';

// Matches state
class MatchesState {
  final List<Match> todayMatches;
  final List<Match> tomorrowMatches;
  final bool isLoading;
  final bool isFromCache;
  final bool isOffline;
  final String? error;
  final DateTime? lastUpdated;

  const MatchesState({
    this.todayMatches = const [],
    this.tomorrowMatches = const [],
    this.isLoading = false,
    this.isFromCache = false,
    this.isOffline = false,
    this.error,
    this.lastUpdated,
  });

  MatchesState copyWith({
    List<Match>? todayMatches,
    List<Match>? tomorrowMatches,
    bool? isLoading,
    bool? isFromCache,
    bool? isOffline,
    String? error,
    DateTime? lastUpdated,
  }) {
    return MatchesState(
      todayMatches: todayMatches ?? this.todayMatches,
      tomorrowMatches: tomorrowMatches ?? this.tomorrowMatches,
      isLoading: isLoading ?? this.isLoading,
      isFromCache: isFromCache ?? this.isFromCache,
      isOffline: isOffline ?? this.isOffline,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }

  bool get hasData => todayMatches.isNotEmpty || tomorrowMatches.isNotEmpty;

  String? get offlineMessage {
    if (!isOffline || !hasData) return null;
    if (lastUpdated == null) return 'Офлайн режим';
    final ago = DateTime.now().difference(lastUpdated!);
    if (ago.inMinutes < 1) return 'Офлайн (обновлено только что)';
    if (ago.inMinutes < 60) return 'Офлайн (обновлено ${ago.inMinutes} мин назад)';
    return 'Офлайн (обновлено ${ago.inHours} ч назад)';
  }
}

// Matches notifier with caching
class MatchesNotifier extends StateNotifier<MatchesState> {
  final ApiService _api;
  SharedPreferences? _prefs;

  MatchesNotifier(this._api) : super(const MatchesState()) {
    _initCache();
  }

  Future<void> _initCache() async {
    _prefs = await SharedPreferences.getInstance();
    await _loadFromCache();
  }

  /// Load matches from cache if available and not expired
  Future<void> _loadFromCache() async {
    if (_prefs == null) return;

    try {
      final timestampStr = _prefs!.getString(_cacheTimestampKey);
      if (timestampStr != null) {
        final cacheTime = DateTime.parse(timestampStr);
        final isExpired = DateTime.now().difference(cacheTime) > AppConstants.matchesCacheDuration;

        if (!isExpired) {
          final todayJson = _prefs!.getString(_todayMatchesCacheKey);
          final tomorrowJson = _prefs!.getString(_tomorrowMatchesCacheKey);

          if (todayJson != null || tomorrowJson != null) {
            final todayMatches = todayJson != null
                ? (jsonDecode(todayJson) as List).map((m) => Match.fromJson(m)).toList()
                : <Match>[];
            final tomorrowMatches = tomorrowJson != null
                ? (jsonDecode(tomorrowJson) as List).map((m) => Match.fromJson(m)).toList()
                : <Match>[];

            state = state.copyWith(
              todayMatches: todayMatches,
              tomorrowMatches: tomorrowMatches,
              isFromCache: true,
              lastUpdated: cacheTime,
            );

            debugPrint('Loaded ${todayMatches.length} today + ${tomorrowMatches.length} tomorrow matches from cache');
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading matches from cache: $e');
    }
  }

  /// Save matches to cache
  Future<void> _saveToCache(List<Match> todayMatches, List<Match> tomorrowMatches) async {
    if (_prefs == null) return;

    try {
      final todayJson = jsonEncode(todayMatches.map((m) => m.toJson()).toList());
      final tomorrowJson = jsonEncode(tomorrowMatches.map((m) => m.toJson()).toList());

      await _prefs!.setString(_todayMatchesCacheKey, todayJson);
      await _prefs!.setString(_tomorrowMatchesCacheKey, tomorrowJson);
      await _prefs!.setString(_cacheTimestampKey, DateTime.now().toIso8601String());

      debugPrint('Saved ${todayMatches.length} today + ${tomorrowMatches.length} tomorrow matches to cache');
    } catch (e) {
      debugPrint('Error saving matches to cache: $e');
    }
  }

  Future<void> loadTodayMatches({bool forceRefresh = false}) async {
    // Skip if already loading
    if (state.isLoading) return;

    // Use cache if available and not forcing refresh
    if (!forceRefresh && state.hasData && state.isFromCache) {
      // Still fetch in background to update
      _fetchTodayMatchesBackground();
      return;
    }

    state = state.copyWith(isLoading: true, error: null, isOffline: false);

    try {
      final matches = await _api.getTodayMatches();
      state = state.copyWith(
        todayMatches: matches,
        isLoading: false,
        isFromCache: false,
        isOffline: false,
        lastUpdated: DateTime.now(),
      );
      await _saveToCache(matches, state.tomorrowMatches);
    } catch (e) {
      // If we have cached data, switch to offline mode instead of showing error
      state = state.copyWith(
        isLoading: false,
        isOffline: state.hasData,
        error: state.hasData ? null : e.toString(),
      );
    }
  }

  Future<void> _fetchTodayMatchesBackground() async {
    try {
      final matches = await _api.getTodayMatches();
      state = state.copyWith(
        todayMatches: matches,
        isFromCache: false,
        isOffline: false,
        lastUpdated: DateTime.now(),
      );
      await _saveToCache(matches, state.tomorrowMatches);
    } catch (e) {
      // Set offline mode on background failure
      state = state.copyWith(isOffline: true);
      debugPrint('Background fetch failed, switching to offline: $e');
    }
  }

  Future<void> loadTomorrowMatches({bool forceRefresh = false}) async {
    if (state.isLoading) return;

    if (!forceRefresh && state.hasData && state.isFromCache) {
      _fetchTomorrowMatchesBackground();
      return;
    }

    state = state.copyWith(isLoading: true, error: null, isOffline: false);

    try {
      final matches = await _api.getTomorrowMatches();
      state = state.copyWith(
        tomorrowMatches: matches,
        isLoading: false,
        isFromCache: false,
        isOffline: false,
        lastUpdated: DateTime.now(),
      );
      await _saveToCache(state.todayMatches, matches);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isOffline: state.hasData,
        error: state.hasData ? null : e.toString(),
      );
    }
  }

  Future<void> _fetchTomorrowMatchesBackground() async {
    try {
      final matches = await _api.getTomorrowMatches();
      state = state.copyWith(
        tomorrowMatches: matches,
        isFromCache: false,
        isOffline: false,
        lastUpdated: DateTime.now(),
      );
      await _saveToCache(state.todayMatches, matches);
    } catch (e) {
      state = state.copyWith(isOffline: true);
      debugPrint('Background fetch failed, switching to offline: $e');
    }
  }

  /// Force refresh from network
  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, error: null, isOffline: false);

    try {
      final results = await Future.wait([
        _api.getTodayMatches(),
        _api.getTomorrowMatches(),
      ]);

      state = state.copyWith(
        todayMatches: results[0],
        tomorrowMatches: results[1],
        isLoading: false,
        isFromCache: false,
        isOffline: false,
        lastUpdated: DateTime.now(),
      );
      await _saveToCache(results[0], results[1]);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isOffline: state.hasData,
        error: state.hasData ? null : e.toString(),
      );
    }
  }

  /// Clear cache
  Future<void> clearCache() async {
    if (_prefs == null) return;
    await _prefs!.remove(_todayMatchesCacheKey);
    await _prefs!.remove(_tomorrowMatchesCacheKey);
    await _prefs!.remove(_cacheTimestampKey);
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

// Loading state provider
final matchesLoadingProvider = Provider<bool>((ref) {
  return ref.watch(matchesProvider).isLoading;
});
