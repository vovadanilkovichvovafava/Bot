import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

/// Local token management with internet time verification
/// Prevents bypass by changing device date
class LocalTokenService extends StateNotifier<LocalTokenState> {
  static const String _tokensKey = 'local_tokens_count';
  static const String _firstUseKey = 'local_first_use_timestamp';
  static const String _timeOffsetKey = 'time_offset_seconds';
  static const int maxTokens = 3;
  static const Duration resetDuration = Duration(hours: 24);

  // Cached time offset (difference between real time and device time)
  int _timeOffsetSeconds = 0;

  LocalTokenService() : super(LocalTokenState.initial()) {
    _initialize();
  }

  Future<void> _initialize() async {
    await _syncTimeFromInternet();
    await _loadFromStorage();
  }

  /// Get real current time (corrected for device time manipulation)
  DateTime _getRealNow() {
    return DateTime.now().add(Duration(seconds: _timeOffsetSeconds));
  }

  /// Sync time from internet to detect device time manipulation
  Future<void> _syncTimeFromInternet() async {
    final prefs = await SharedPreferences.getInstance();

    // Load cached offset first
    _timeOffsetSeconds = prefs.getInt(_timeOffsetKey) ?? 0;

    try {
      // Try multiple time APIs for reliability
      DateTime? serverTime = await _fetchTimeFromWorldTimeApi();
      serverTime ??= await _fetchTimeFromTimeApi();
      serverTime ??= await _fetchTimeFromOurBackend();

      if (serverTime != null) {
        final deviceTime = DateTime.now();
        _timeOffsetSeconds = serverTime.difference(deviceTime).inSeconds;

        // Save offset for offline use
        await prefs.setInt(_timeOffsetKey, _timeOffsetSeconds);
      }
    } catch (e) {
      // If all APIs fail, use cached offset (or 0 if never synced)
      // This is acceptable - user would need internet eventually
    }
  }

  Future<DateTime?> _fetchTimeFromWorldTimeApi() async {
    try {
      final response = await http.get(
        Uri.parse('https://worldtimeapi.org/api/ip'),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final dateTimeStr = data['datetime'] as String;
        // Format: "2024-01-15T12:30:45.123456+00:00"
        return DateTime.parse(dateTimeStr);
      }
    } catch (e) {
      // Silent fail, try next API
    }
    return null;
  }

  Future<DateTime?> _fetchTimeFromTimeApi() async {
    try {
      final response = await http.get(
        Uri.parse('https://timeapi.io/api/Time/current/zone?timeZone=UTC'),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return DateTime.utc(
          data['year'],
          data['month'],
          data['day'],
          data['hour'],
          data['minute'],
          data['seconds'],
        );
      }
    } catch (e) {
      // Silent fail
    }
    return null;
  }

  Future<DateTime?> _fetchTimeFromOurBackend() async {
    try {
      // Fallback: get time from our own backend
      final response = await http.get(
        Uri.parse('https://api.football-data.org/v4/matches'),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        // Use response date header (format: "Wed, 15 Jan 2025 12:30:45 GMT")
        final dateHeader = response.headers['date'];
        if (dateHeader != null) {
          return _parseHttpDate(dateHeader);
        }
      }
    } catch (e) {
      // Silent fail
    }
    return null;
  }

  /// Parse HTTP date format (e.g., "Wed, 15 Jan 2025 12:30:45 GMT")
  DateTime? _parseHttpDate(String dateStr) {
    try {
      // HTTP date format: "Wed, 15 Jan 2025 12:30:45 GMT"
      final months = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
      };

      final parts = dateStr.split(' ');
      if (parts.length >= 5) {
        final day = int.parse(parts[1]);
        final month = months[parts[2]] ?? 1;
        final year = int.parse(parts[3]);
        final timeParts = parts[4].split(':');
        final hour = int.parse(timeParts[0]);
        final minute = int.parse(timeParts[1]);
        final second = int.parse(timeParts[2]);

        return DateTime.utc(year, month, day, hour, minute, second);
      }
    } catch (e) {
      // Parse failed
    }
    return null;
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
        timeUntilReset: null,
        isLoaded: true,
      );
      return;
    }

    final firstUse = DateTime.fromMillisecondsSinceEpoch(firstUseMs);
    final now = _getRealNow(); // Use real time!
    final elapsed = now.difference(firstUse);

    if (elapsed >= resetDuration || elapsed.isNegative) {
      // 24 hours passed OR time went backwards (manipulation detected) - reset tokens
      await prefs.remove(_firstUseKey);
      await prefs.setInt(_tokensKey, maxTokens);
      state = LocalTokenState(
        tokens: maxTokens,
        firstUseTimestamp: null,
        timeUntilReset: null,
        isLoaded: true,
      );
    } else {
      // Still within 24 hours - use stored tokens
      final resetTime = firstUse.add(resetDuration);
      final timeUntilReset = resetTime.difference(now);

      state = LocalTokenState(
        tokens: storedTokens ?? maxTokens,
        firstUseTimestamp: firstUse,
        timeUntilReset: timeUntilReset,
        isLoaded: true,
      );
    }
  }

  /// Use one token. Returns true if successful, false if no tokens left.
  Future<bool> useToken() async {
    // Re-sync time before using token (prevents mid-session manipulation)
    await _syncTimeFromInternet();

    // Re-check if reset is needed after time sync
    await _loadFromStorage();

    if (state.tokens <= 0) return false;

    final prefs = await SharedPreferences.getInstance();
    final now = _getRealNow();

    // If this is the first use, start the 24h timer
    DateTime? firstUse = state.firstUseTimestamp;
    if (firstUse == null) {
      firstUse = now;
      await prefs.setInt(_firstUseKey, firstUse.millisecondsSinceEpoch);
    }

    // Decrement tokens
    final newTokens = state.tokens - 1;
    await prefs.setInt(_tokensKey, newTokens);

    final resetTime = firstUse.add(resetDuration);
    final timeUntilReset = resetTime.difference(now);

    state = LocalTokenState(
      tokens: newTokens,
      firstUseTimestamp: firstUse,
      timeUntilReset: timeUntilReset,
      isLoaded: true,
    );

    return true;
  }

  /// Check if user can make a request
  bool get canUseToken => state.tokens > 0;

  /// Get remaining tokens
  int get remainingTokens => state.tokens;

  /// Force check if 24h passed and reset if needed
  Future<void> checkAndReset() async {
    await _syncTimeFromInternet();
    await _loadFromStorage();
  }

  /// Add bonus tokens (e.g., from watching ads)
  /// Returns true if tokens were added successfully
  Future<bool> addBonusTokens(int count) async {
    if (count <= 0) return false;

    final prefs = await SharedPreferences.getInstance();

    // Add tokens (no maximum limit for bonus tokens)
    final newTokens = state.tokens + count;
    await prefs.setInt(_tokensKey, newTokens);

    state = LocalTokenState(
      tokens: newTokens,
      firstUseTimestamp: state.firstUseTimestamp,
      timeUntilReset: state.timeUntilReset,
      isLoaded: true,
    );

    return true;
  }

  /// Refresh time until reset (for UI timer updates)
  void refreshTimeUntilReset() {
    if (state.firstUseTimestamp == null) return;

    final now = _getRealNow();
    final resetTime = state.firstUseTimestamp!.add(resetDuration);
    final timeUntilReset = resetTime.difference(now);

    if (timeUntilReset.isNegative) {
      // Reset needed
      checkAndReset();
    } else {
      state = LocalTokenState(
        tokens: state.tokens,
        firstUseTimestamp: state.firstUseTimestamp,
        timeUntilReset: timeUntilReset,
        isLoaded: true,
      );
    }
  }
}

class LocalTokenState {
  final int tokens;
  final DateTime? firstUseTimestamp;
  final Duration? timeUntilReset;
  final bool isLoaded;

  LocalTokenState({
    required this.tokens,
    required this.firstUseTimestamp,
    required this.timeUntilReset,
    required this.isLoaded,
  });

  factory LocalTokenState.initial() => LocalTokenState(
    tokens: 10,
    firstUseTimestamp: null,
    timeUntilReset: null,
    isLoaded: false,
  );

  /// Format time until reset as string (e.g., "23h 45m")
  String? get formattedTimeUntilReset {
    if (timeUntilReset == null) return null;

    final hours = timeUntilReset!.inHours;
    final minutes = timeUntilReset!.inMinutes % 60;

    if (hours > 0) {
      return '${hours}h ${minutes}m';
    } else if (minutes > 0) {
      return '${minutes}m';
    } else {
      return 'Soon';
    }
  }
}

/// Provider for local token service
final localTokenProvider = StateNotifierProvider<LocalTokenService, LocalTokenState>((ref) {
  return LocalTokenService();
});
