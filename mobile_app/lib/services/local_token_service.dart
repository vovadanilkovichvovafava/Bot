import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Local token management - no server calls, purely local
/// Tokens reset 24 hours after first use of the day
class LocalTokenService extends StateNotifier<LocalTokenState> {
  static const String _tokensKey = 'local_tokens_count';
  static const String _firstUseKey = 'local_first_use_timestamp';
  static const int maxTokens = 10;
  static const Duration resetDuration = Duration(hours: 24);

  LocalTokenService() : super(LocalTokenState.initial()) {
    _loadFromStorage();
  }

  Future<void> _loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();

    final firstUseMs = prefs.getInt(_firstUseKey);
    final storedTokens = prefs.getInt(_tokensKey);

    if (firstUseMs == null) {
      // Never used before - full tokens, no timer
      state = LocalTokenState(
        tokens: maxTokens,
        firstUseTimestamp: null,
        isLoaded: true,
      );
      return;
    }

    final firstUse = DateTime.fromMillisecondsSinceEpoch(firstUseMs);
    final now = DateTime.now();
    final elapsed = now.difference(firstUse);

    if (elapsed >= resetDuration) {
      // 24 hours passed - reset tokens
      await prefs.remove(_firstUseKey);
      await prefs.setInt(_tokensKey, maxTokens);
      state = LocalTokenState(
        tokens: maxTokens,
        firstUseTimestamp: null,
        isLoaded: true,
      );
    } else {
      // Still within 24 hours - use stored tokens
      state = LocalTokenState(
        tokens: storedTokens ?? maxTokens,
        firstUseTimestamp: firstUse,
        isLoaded: true,
      );
    }
  }

  /// Use one token. Returns true if successful, false if no tokens left.
  Future<bool> useToken() async {
    if (state.tokens <= 0) return false;

    final prefs = await SharedPreferences.getInstance();
    final now = DateTime.now();

    // If this is the first use, start the 24h timer
    DateTime? firstUse = state.firstUseTimestamp;
    if (firstUse == null) {
      firstUse = now;
      await prefs.setInt(_firstUseKey, firstUse.millisecondsSinceEpoch);
    }

    // Decrement tokens
    final newTokens = state.tokens - 1;
    await prefs.setInt(_tokensKey, newTokens);

    state = LocalTokenState(
      tokens: newTokens,
      firstUseTimestamp: firstUse,
      isLoaded: true,
    );

    return true;
  }

  /// Check if user can make a request
  bool get canUseToken => state.tokens > 0;

  /// Get remaining tokens
  int get remainingTokens => state.tokens;

  /// Get time until reset (null if timer not started)
  Duration? get timeUntilReset {
    if (state.firstUseTimestamp == null) return null;

    final resetTime = state.firstUseTimestamp!.add(resetDuration);
    final now = DateTime.now();

    if (now.isAfter(resetTime)) {
      return Duration.zero;
    }

    return resetTime.difference(now);
  }

  /// Force check if 24h passed and reset if needed
  Future<void> checkAndReset() async {
    if (state.firstUseTimestamp == null) return;

    final elapsed = DateTime.now().difference(state.firstUseTimestamp!);
    if (elapsed >= resetDuration) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_firstUseKey);
      await prefs.setInt(_tokensKey, maxTokens);
      state = LocalTokenState(
        tokens: maxTokens,
        firstUseTimestamp: null,
        isLoaded: true,
      );
    }
  }
}

class LocalTokenState {
  final int tokens;
  final DateTime? firstUseTimestamp;
  final bool isLoaded;

  LocalTokenState({
    required this.tokens,
    required this.firstUseTimestamp,
    required this.isLoaded,
  });

  factory LocalTokenState.initial() => LocalTokenState(
    tokens: 10,
    firstUseTimestamp: null,
    isLoaded: false,
  );
}

/// Provider for local token service
final localTokenProvider = StateNotifierProvider<LocalTokenService, LocalTokenState>((ref) {
  return LocalTokenService();
});
