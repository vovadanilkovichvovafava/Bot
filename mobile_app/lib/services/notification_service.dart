import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz_data;

/// Local notification service for match reminders and app notifications
class NotificationService {
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  // Notification channel IDs
  static const String _matchRemindersChannel = 'match_reminders';
  static const String _resultsChannel = 'match_results';
  static const String _hotBetsChannel = 'hot_bets';
  static const String _liveChannel = 'live_updates';

  /// Initialize local notifications
  Future<void> initialize() async {
    if (_initialized) return;

    // Initialize timezone
    tz_data.initializeTimeZones();

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      settings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Create notification channels for Android
    if (Platform.isAndroid) {
      final androidPlugin = _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();

      // Match Reminders channel
      await androidPlugin?.createNotificationChannel(
        const AndroidNotificationChannel(
          _matchRemindersChannel,
          'Match Reminders',
          description: 'Reminders about upcoming matches',
          importance: Importance.high,
        ),
      );

      // Results channel
      await androidPlugin?.createNotificationChannel(
        const AndroidNotificationChannel(
          _resultsChannel,
          'Match Results',
          description: 'Prediction results and match outcomes',
          importance: Importance.high,
        ),
      );

      // Hot Bets channel
      await androidPlugin?.createNotificationChannel(
        const AndroidNotificationChannel(
          _hotBetsChannel,
          'Hot Bets',
          description: 'High-confidence betting opportunities',
          importance: Importance.high,
        ),
      );

      // Live Updates channel
      await androidPlugin?.createNotificationChannel(
        const AndroidNotificationChannel(
          _liveChannel,
          'Live Updates',
          description: 'Goals and live match events',
          importance: Importance.defaultImportance,
        ),
      );
    }

    _initialized = true;
    if (kDebugMode) debugPrint('Local notifications initialized');
  }

  /// Show a notification immediately
  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    await _localNotifications.show(
      id,
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'match_reminders',
          'Match Reminders',
          channelDescription: 'Reminders about upcoming matches',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: payload,
    );
  }

  /// Schedule a notification for a specific time
  Future<void> scheduleMatchReminder({
    required int matchId,
    required String homeTeam,
    required String awayTeam,
    required DateTime matchTime,
    Duration reminderBefore = const Duration(minutes: 30),
  }) async {
    final reminderTime = matchTime.subtract(reminderBefore);

    // Don't schedule if reminder time is in the past
    if (reminderTime.isBefore(DateTime.now())) {
      return;
    }

    await _localNotifications.zonedSchedule(
      matchId,
      'Match starting soon!',
      '$homeTeam vs $awayTeam starts in ${reminderBefore.inMinutes} minutes',
      _convertToTZDateTime(reminderTime),
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'match_reminders',
          'Match Reminders',
          channelDescription: 'Reminders about upcoming matches',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      payload: 'match_$matchId',
    );

    if (kDebugMode) debugPrint('Scheduled reminder for match $matchId at $reminderTime');
  }

  /// Cancel a scheduled notification
  Future<void> cancelReminder(int matchId) async {
    await _localNotifications.cancel(matchId);
  }

  /// Cancel all notifications
  Future<void> cancelAll() async {
    await _localNotifications.cancelAll();
  }

  /// Handle notification tap
  void _onNotificationTapped(NotificationResponse response) {
    if (kDebugMode) debugPrint('Notification tapped: ${response.payload}');
    // Navigation can be handled here or via a stream
  }

  /// Convert DateTime to TZDateTime for scheduling
  tz.TZDateTime _convertToTZDateTime(DateTime dateTime) {
    // Use local timezone
    return tz.TZDateTime.from(dateTime, tz.local);
  }

  /// Show match result notification
  Future<void> showMatchResultNotification({
    required int matchId,
    required String homeTeam,
    required String awayTeam,
    required int homeScore,
    required int awayScore,
    required bool predictionCorrect,
  }) async {
    final result = predictionCorrect ? 'won' : 'lost';
    final emoji = predictionCorrect ? '🎉' : '😔';

    await _localNotifications.show(
      10000 + matchId,
      '$emoji Your prediction $result!',
      '$homeTeam $homeScore - $awayScore $awayTeam',
      NotificationDetails(
        android: AndroidNotificationDetails(
          _resultsChannel,
          'Match Results',
          channelDescription: 'Prediction results and match outcomes',
          importance: Importance.high,
          priority: Priority.high,
          color: predictionCorrect ? Colors.green : Colors.red,
          styleInformation: BigTextStyleInformation(
            predictionCorrect
                ? 'Congratulations! Your prediction was correct!'
                : 'Better luck next time. Keep analyzing!',
          ),
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: 'result_$matchId',
    );
  }

  /// Show hot bet notification
  Future<void> showHotBetNotification({
    required int matchId,
    required String matchName,
    required String betType,
    required double confidence,
    required double odds,
  }) async {
    await _localNotifications.show(
      20000 + matchId,
      '🔥 Hot Bet Alert!',
      '$matchName - $betType @ $odds',
      NotificationDetails(
        android: AndroidNotificationDetails(
          _hotBetsChannel,
          'Hot Bets',
          channelDescription: 'High-confidence betting opportunities',
          importance: Importance.high,
          priority: Priority.high,
          color: Colors.orange,
          styleInformation: BigTextStyleInformation(
            'High confidence: ${confidence.toStringAsFixed(0)}%\nTap to view analysis.',
          ),
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: 'hotbet_$matchId',
    );
  }

  /// Show live goal notification
  Future<void> showGoalNotification({
    required int matchId,
    required String homeTeam,
    required String awayTeam,
    required int homeScore,
    required int awayScore,
    required String scoringTeam,
  }) async {
    await _localNotifications.show(
      30000 + matchId,
      '⚽ GOAL! $scoringTeam',
      '$homeTeam $homeScore - $awayScore $awayTeam',
      NotificationDetails(
        android: AndroidNotificationDetails(
          _liveChannel,
          'Live Updates',
          channelDescription: 'Goals and live match events',
          importance: Importance.defaultImportance,
          priority: Priority.defaultPriority,
          color: Colors.blue,
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: 'goal_$matchId',
    );
  }
}

/// Notification preferences state
class NotificationPreferences {
  final bool matchResults;
  final bool hotBets;
  final bool matchReminders;
  final bool liveUpdates;
  final int reminderMinutes;

  const NotificationPreferences({
    this.matchResults = true,
    this.hotBets = true,
    this.matchReminders = true,
    this.liveUpdates = false,
    this.reminderMinutes = 15,
  });

  NotificationPreferences copyWith({
    bool? matchResults,
    bool? hotBets,
    bool? matchReminders,
    bool? liveUpdates,
    int? reminderMinutes,
  }) {
    return NotificationPreferences(
      matchResults: matchResults ?? this.matchResults,
      hotBets: hotBets ?? this.hotBets,
      matchReminders: matchReminders ?? this.matchReminders,
      liveUpdates: liveUpdates ?? this.liveUpdates,
      reminderMinutes: reminderMinutes ?? this.reminderMinutes,
    );
  }
}

/// Notifier for notification preferences
class NotificationPreferencesNotifier extends StateNotifier<NotificationPreferences> {
  NotificationPreferencesNotifier() : super(const NotificationPreferences()) {
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    state = NotificationPreferences(
      matchResults: prefs.getBool('notif_match_results') ?? true,
      hotBets: prefs.getBool('notif_hot_bets') ?? true,
      matchReminders: prefs.getBool('notif_match_reminders') ?? true,
      liveUpdates: prefs.getBool('notif_live_updates') ?? false,
      reminderMinutes: prefs.getInt('notif_reminder_minutes') ?? 15,
    );
  }

  Future<void> _savePreferences() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notif_match_results', state.matchResults);
    await prefs.setBool('notif_hot_bets', state.hotBets);
    await prefs.setBool('notif_match_reminders', state.matchReminders);
    await prefs.setBool('notif_live_updates', state.liveUpdates);
    await prefs.setInt('notif_reminder_minutes', state.reminderMinutes);
  }

  void setMatchResults(bool value) {
    state = state.copyWith(matchResults: value);
    _savePreferences();
  }

  void setHotBets(bool value) {
    state = state.copyWith(hotBets: value);
    _savePreferences();
  }

  void setMatchReminders(bool value) {
    state = state.copyWith(matchReminders: value);
    _savePreferences();
  }

  void setLiveUpdates(bool value) {
    state = state.copyWith(liveUpdates: value);
    _savePreferences();
  }

  void setReminderMinutes(int value) {
    state = state.copyWith(reminderMinutes: value);
    _savePreferences();
  }
}

// Providers
final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService();
});

final notificationPreferencesProvider =
    StateNotifierProvider<NotificationPreferencesNotifier, NotificationPreferences>((ref) {
  return NotificationPreferencesNotifier();
});
