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
        try {
          final user = await _api.getCurrentUser();
          state = AuthState(
            isAuthenticated: true,
            user: user,
          );
        } catch (e) {
          // Check if it's an authentication error (401)
          final isAuthError = e.toString().contains('401') ||
                              e.toString().contains('Unauthorized') ||
                              e.toString().contains('Token');

          if (isAuthError) {
            // Token is invalid, clear it
            await _storage.delete(key: 'access_token');
            await _storage.delete(key: 'refresh_token');
            _api.clearToken();
            state = const AuthState();
          } else {
            // Network error - keep user logged in with cached token
            // Create a placeholder user until we can refresh
            state = AuthState(
              isAuthenticated: true,
              user: User(
                id: -1,
                email: '',
                username: 'User',
                language: 'en',
                timezone: 'UTC',
                isPremium: false,
                dailyRequests: 0,
                dailyLimit: 10,
                bonusPredictions: 0,
                minOdds: 1.5,
                maxOdds: 3.0,
                riskLevel: 'medium',
                totalPredictions: 0,
                correctPredictions: 0,
                accuracy: 0,
                createdAt: DateTime.now(),
              ),
            );
          }
        }
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

  /// Decrement token count locally without API call
  /// This updates the UI immediately without reloading the app
  void decrementToken() {
    if (state.user == null || state.user!.isPremium) return;

    final user = state.user!;
    User updatedUser;

    // Use bonus predictions first, then daily limit (same logic as backend)
    if (user.bonusPredictions > 0) {
      updatedUser = User(
        id: user.id,
        email: user.email,
        username: user.username,
        language: user.language,
        timezone: user.timezone,
        isPremium: user.isPremium,
        premiumUntil: user.premiumUntil,
        dailyRequests: user.dailyRequests,
        dailyLimit: user.dailyLimit,
        bonusPredictions: user.bonusPredictions - 1,
        minOdds: user.minOdds,
        maxOdds: user.maxOdds,
        riskLevel: user.riskLevel,
        totalPredictions: user.totalPredictions,
        correctPredictions: user.correctPredictions,
        accuracy: user.accuracy,
        createdAt: user.createdAt,
      );
    } else {
      updatedUser = User(
        id: user.id,
        email: user.email,
        username: user.username,
        language: user.language,
        timezone: user.timezone,
        isPremium: user.isPremium,
        premiumUntil: user.premiumUntil,
        dailyRequests: user.dailyRequests + 1,
        dailyLimit: user.dailyLimit,
        bonusPredictions: user.bonusPredictions,
        minOdds: user.minOdds,
        maxOdds: user.maxOdds,
        riskLevel: user.riskLevel,
        totalPredictions: user.totalPredictions,
        correctPredictions: user.correctPredictions,
        accuracy: user.accuracy,
        createdAt: user.createdAt,
      );
    }

    state = state.copyWith(user: updatedUser);
  }

  void clearError() {
    state = state.copyWith(error: null);
  }

  // For testing purposes - activate premium locally
  void activatePremiumForTesting() {
    if (state.user == null) return;

    final premiumUser = User(
      id: state.user!.id,
      email: state.user!.email,
      username: state.user!.username,
      language: state.user!.language,
      timezone: state.user!.timezone,
      isPremium: true,
      premiumUntil: DateTime.now().add(const Duration(days: 30)),
      dailyRequests: state.user!.dailyRequests,
      dailyLimit: 999,
      bonusPredictions: 999,
      minOdds: state.user!.minOdds,
      maxOdds: state.user!.maxOdds,
      riskLevel: state.user!.riskLevel,
      totalPredictions: state.user!.totalPredictions,
      correctPredictions: state.user!.correctPredictions,
      accuracy: state.user!.accuracy,
      createdAt: state.user!.createdAt,
    );

    state = state.copyWith(user: premiumUser);
  }

  // For testing purposes - deactivate premium locally
  void deactivatePremiumForTesting() {
    if (state.user == null) return;

    final freeUser = User(
      id: state.user!.id,
      email: state.user!.email,
      username: state.user!.username,
      language: state.user!.language,
      timezone: state.user!.timezone,
      isPremium: false,
      premiumUntil: null,
      dailyRequests: state.user!.dailyRequests,
      dailyLimit: 3,
      bonusPredictions: 0,
      minOdds: state.user!.minOdds,
      maxOdds: state.user!.maxOdds,
      riskLevel: state.user!.riskLevel,
      totalPredictions: state.user!.totalPredictions,
      correctPredictions: state.user!.correctPredictions,
      accuracy: state.user!.accuracy,
      createdAt: state.user!.createdAt,
    );

    state = state.copyWith(user: freeUser);
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
