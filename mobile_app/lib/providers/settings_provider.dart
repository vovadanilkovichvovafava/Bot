import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Settings state
class SettingsState {
  final String language;
  final String timezone;
  final ThemeMode themeMode;
  final bool notificationsEnabled;
  final double minOdds;
  final double maxOdds;
  final String riskLevel;

  const SettingsState({
    this.language = 'en',
    this.timezone = 'UTC',
    this.themeMode = ThemeMode.system,
    this.notificationsEnabled = true,
    this.minOdds = 1.5,
    this.maxOdds = 3.0,
    this.riskLevel = 'medium',
  });

  SettingsState copyWith({
    String? language,
    String? timezone,
    ThemeMode? themeMode,
    bool? notificationsEnabled,
    double? minOdds,
    double? maxOdds,
    String? riskLevel,
  }) {
    return SettingsState(
      language: language ?? this.language,
      timezone: timezone ?? this.timezone,
      themeMode: themeMode ?? this.themeMode,
      notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
      minOdds: minOdds ?? this.minOdds,
      maxOdds: maxOdds ?? this.maxOdds,
      riskLevel: riskLevel ?? this.riskLevel,
    );
  }
}

// Settings notifier
class SettingsNotifier extends StateNotifier<SettingsState> {
  final SharedPreferences? _prefs;

  SettingsNotifier(SharedPreferences prefs) : _prefs = prefs, super(const SettingsState()) {
    _loadSettings();
  }

  // Factory for when SharedPreferences is not yet available
  SettingsNotifier.withDefaults() : _prefs = null, super(const SettingsState());

  void _loadSettings() {
    if (_prefs == null) return;

    final language = _prefs!.getString('language') ?? 'en';
    final timezone = _prefs!.getString('timezone') ?? 'UTC';
    final themeModeIndex = _prefs!.getInt('themeMode') ?? 0;
    final notificationsEnabled = _prefs!.getBool('notificationsEnabled') ?? true;
    final minOdds = _prefs!.getDouble('minOdds') ?? 1.5;
    final maxOdds = _prefs!.getDouble('maxOdds') ?? 3.0;
    final riskLevel = _prefs!.getString('riskLevel') ?? 'medium';

    state = SettingsState(
      language: language,
      timezone: timezone,
      themeMode: ThemeMode.values[themeModeIndex],
      notificationsEnabled: notificationsEnabled,
      minOdds: minOdds,
      maxOdds: maxOdds,
      riskLevel: riskLevel,
    );
  }

  Future<void> setLanguage(String language) async {
    await _prefs?.setString('language', language);
    state = state.copyWith(language: language);
  }

  Future<void> setTimezone(String timezone) async {
    await _prefs?.setString('timezone', timezone);
    state = state.copyWith(timezone: timezone);
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    await _prefs?.setInt('themeMode', mode.index);
    state = state.copyWith(themeMode: mode);
  }

  Future<void> setNotificationsEnabled(bool enabled) async {
    await _prefs?.setBool('notificationsEnabled', enabled);
    state = state.copyWith(notificationsEnabled: enabled);
  }

  Future<void> setMinOdds(double odds) async {
    await _prefs?.setDouble('minOdds', odds);
    state = state.copyWith(minOdds: odds);
  }

  Future<void> setMaxOdds(double odds) async {
    await _prefs?.setDouble('maxOdds', odds);
    state = state.copyWith(maxOdds: odds);
  }

  Future<void> setRiskLevel(String level) async {
    await _prefs?.setString('riskLevel', level);
    state = state.copyWith(riskLevel: level);
  }
}

// Provider
final sharedPreferencesProvider = FutureProvider<SharedPreferences>((ref) async {
  return await SharedPreferences.getInstance();
});

// Async settings provider that properly handles loading/error states
final settingsProvider = StateNotifierProvider<SettingsNotifier, SettingsState>((ref) {
  final prefsAsync = ref.watch(sharedPreferencesProvider);
  return prefsAsync.maybeWhen(
    data: (prefs) => SettingsNotifier(prefs),
    orElse: () => SettingsNotifier.withDefaults(),
  );
});
