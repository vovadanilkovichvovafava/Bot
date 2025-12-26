import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../services/api_service.dart';
import '../models/user.dart';
import '../utils/error_handler.dart';

// Auth state
class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final bool isDemoMode;
  final User? user;
  final String? error;

  const AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.isDemoMode = false,
    this.user,
    this.error,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    bool? isDemoMode,
    User? user,
    String? error,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      isDemoMode: isDemoMode ?? this.isDemoMode,
      user: user ?? this.user,
      error: error,
    );
  }
}

// Auth notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _api;
  final FlutterSecureStorage _storage;

  AuthNotifier(this._api, this._storage) : super(const AuthState()) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    state = state.copyWith(isLoading: true);

    try {
      final token = await _storage.read(key: 'access_token');
      final isDemoMode = await _storage.read(key: 'demo_mode') == 'true';

      if (isDemoMode) {
        state = AuthState(
          isAuthenticated: true,
          isDemoMode: true,
          user: _createDemoUser(),
        );
      } else if (token != null) {
        _api.setToken(token);
        final user = await _api.getCurrentUser();
        state = AuthState(
          isAuthenticated: true,
          user: user,
        );
      } else {
        state = const AuthState();
      }
    } catch (e) {
      state = const AuthState();
    }
  }

  User _createDemoUser() {
    return User(
      id: 0,
      email: 'demo@aibettingbot.com',
      username: 'Demo User',
      language: 'en',
      timezone: 'UTC',
      isPremium: true,
      premiumUntil: DateTime.now().add(const Duration(days: 30)),
      dailyRequests: 0,
      dailyLimit: 100,
      bonusPredictions: 10,
      minOdds: 1.5,
      maxOdds: 3.0,
      riskLevel: 'medium',
      totalPredictions: 150,
      correctPredictions: 105,
      accuracy: 70.0,
      createdAt: DateTime.now(),
    );
  }

  Future<bool> loginDemo() async {
    state = state.copyWith(isLoading: true, error: null);

    await Future.delayed(const Duration(milliseconds: 500));
    await _storage.write(key: 'demo_mode', value: 'true');

    state = AuthState(
      isAuthenticated: true,
      isDemoMode: true,
      user: _createDemoUser(),
    );
    return true;
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final tokens = await _api.login(email, password);

      await _storage.write(key: 'access_token', value: tokens['access_token']);
      await _storage.write(key: 'refresh_token', value: tokens['refresh_token']);
      await _storage.delete(key: 'demo_mode');

      _api.setToken(tokens['access_token']!);
      final user = await _api.getCurrentUser();

      state = AuthState(
        isAuthenticated: true,
        user: user,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: ErrorHandler.getErrorMessage(e),
      );
      return false;
    }
  }

  Future<bool> register(String email, String password, {String? username, String? language}) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final tokens = await _api.register(
        email: email,
        password: password,
        username: username,
        language: language,
      );

      await _storage.write(key: 'access_token', value: tokens['access_token']);
      await _storage.write(key: 'refresh_token', value: tokens['refresh_token']);
      await _storage.delete(key: 'demo_mode');

      _api.setToken(tokens['access_token']!);
      final user = await _api.getCurrentUser();

      state = AuthState(
        isAuthenticated: true,
        user: user,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: ErrorHandler.getErrorMessage(e),
      );
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
    await _storage.delete(key: 'demo_mode');
    _api.clearToken();
    state = const AuthState();
  }

  Future<void> refreshUser() async {
    if (state.isDemoMode) return;

    try {
      final user = await _api.getCurrentUser();
      state = state.copyWith(user: user);
    } catch (e) {
      // Ignore errors
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

// Providers
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final api = ref.watch(apiServiceProvider);
  final storage = ref.watch(secureStorageProvider);
  return AuthNotifier(api, storage);
});
