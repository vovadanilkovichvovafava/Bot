import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz_data;

/// Local notification service for match reminders and app notifications
class NotificationService {
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

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

    // Create notification channel for Android
    if (Platform.isAndroid) {
      const channel = AndroidNotificationChannel(
        'match_reminders',
        'Match Reminders',
        description: 'Reminders about upcoming matches',
        importance: Importance.high,
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);
    }

    _initialized = true;
    debugPrint('Local notifications initialized');
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

    debugPrint('Scheduled reminder for match $matchId at $reminderTime');
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
    debugPrint('Notification tapped: ${response.payload}');
    // Navigation can be handled here or via a stream
  }

  /// Convert DateTime to TZDateTime for scheduling
  tz.TZDateTime _convertToTZDateTime(DateTime dateTime) {
    // Use local timezone
    return tz.TZDateTime.from(dateTime, tz.local);
  }
}

// Provider
final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService();
});
