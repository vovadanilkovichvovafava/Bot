import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/user.dart';
import '../models/match.dart';
import '../models/prediction.dart';
import '../utils/constants.dart';

/// Interceptor for automatic retry with exponential backoff
class RetryInterceptor extends Interceptor {
  final Dio dio;
  final int maxRetries;
  final List<Duration> retryDelays;

  RetryInterceptor({
    required this.dio,
    this.maxRetries = 3,
    this.retryDelays = const [
      Duration(seconds: 2),
      Duration(seconds: 4),
      Duration(seconds: 8),
    ],
  });

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final retryCount = err.requestOptions.extra['retryCount'] ?? 0;

    // Only retry on connection errors, timeouts, or 5xx server errors
    final shouldRetry = _shouldRetry(err) && retryCount < maxRetries;

    if (shouldRetry) {
      final delay = retryDelays[retryCount < retryDelays.length ? retryCount : retryDelays.length - 1];
      debugPrint('Retry ${retryCount + 1}/$maxRetries after ${delay.inSeconds}s for ${err.requestOptions.path}');

      await Future.delayed(delay);

      // Clone request with updated retry count
      final options = err.requestOptions;
      options.extra['retryCount'] = retryCount + 1;

      try {
        final response = await dio.fetch(options);
        return handler.resolve(response);
      } catch (e) {
        if (e is DioException) {
          return handler.reject(e);
        }
        return handler.reject(DioException(
          requestOptions: options,
          error: e,
          type: DioExceptionType.unknown,
        ));
      }
    }

    return handler.next(err);
  }

  bool _shouldRetry(DioException err) {
    // Retry on connection errors
    if (err.type == DioExceptionType.connectionError ||
        err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout) {
      return true;
    }

    // Retry on 5xx server errors (Railway waking up often returns 502/503)
    final statusCode = err.response?.statusCode;
    if (statusCode != null && statusCode >= 500 && statusCode < 600) {
      return true;
    }

    return false;
  }
}

class ApiService {
  final Dio _dio;
  String? _token;

  ApiService() : _dio = Dio(BaseOptions(
    baseUrl: ApiConstants.baseUrl,
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
    headers: {
      'Content-Type': 'application/json',
    },
  )) {
    // Add retry interceptor first
    _dio.interceptors.add(RetryInterceptor(dio: _dio));

    // Add logging in debug mode
    if (kDebugMode) {
      _dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
      ));
    }
  }

  void setToken(String token) {
    _token = token;
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  void clearToken() {
    _token = null;
    _dio.options.headers.remove('Authorization');
  }

  // Auth
  Future<Map<String, String>> login(String email, String password) async {
    final response = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return {
      'access_token': response.data['access_token'],
      'refresh_token': response.data['refresh_token'],
    };
  }

  Future<Map<String, String>> register({
    required String email,
    required String password,
    String? username,
    String? language,
  }) async {
    final response = await _dio.post('/auth/register', data: {
      'email': email,
      'password': password,
      if (username != null) 'username': username,
      if (language != null) 'language': language,
    });
    return {
      'access_token': response.data['access_token'],
      'refresh_token': response.data['refresh_token'],
    };
  }

  // User
  Future<User> getCurrentUser() async {
    final response = await _dio.get('/users/me');
    return User.fromJson(response.data);
  }

  Future<User> updateUser({
    String? language,
    String? timezone,
    double? minOdds,
    double? maxOdds,
    String? riskLevel,
  }) async {
    final response = await _dio.patch('/users/me', data: {
      if (language != null) 'language': language,
      if (timezone != null) 'timezone': timezone,
      if (minOdds != null) 'min_odds': minOdds,
      if (maxOdds != null) 'max_odds': maxOdds,
      if (riskLevel != null) 'risk_level': riskLevel,
    });
    return User.fromJson(response.data);
  }

  // Matches
  Future<List<Match>> getMatches({String? date, String? league}) async {
    final params = <String, dynamic>{};
    if (league != null) params['league'] = league;
    params['days'] = 14; // Get matches for next 14 days

    final response = await _dio.get('/matches/upcoming', queryParameters: params);
    return (response.data as List).map((m) => Match.fromJson(m)).toList();
  }

  Future<List<Match>> getTodayMatches() async {
    final response = await _dio.get('/matches/today');
    return (response.data as List).map((m) => Match.fromJson(m)).toList();
  }

  Future<List<Match>> getTomorrowMatches() async {
    final response = await _dio.get('/matches/tomorrow');
    return (response.data as List).map((m) => Match.fromJson(m)).toList();
  }

  Future<List<Match>> getLiveMatches() async {
    final response = await _dio.get('/matches/live');
    return (response.data as List).map((m) => Match.fromJson(m)).toList();
  }

  Future<MatchDetail> getMatchDetail(int matchId) async {
    final response = await _dio.get('/matches/$matchId');
    return MatchDetail.fromJson(response.data);
  }

  // Predictions
  Future<Prediction> createPrediction(int matchId) async {
    final response = await _dio.post('/predictions/$matchId');
    return Prediction.fromJson(response.data);
  }

  Future<List<Prediction>> getPredictionHistory({int limit = 50, int offset = 0}) async {
    final response = await _dio.get('/predictions/history', queryParameters: {
      'limit': limit,
      'offset': offset,
    });
    return (response.data as List).map((p) => Prediction.fromJson(p)).toList();
  }

  // Stats
  Future<Map<String, dynamic>> getAccuracy({int days = 30}) async {
    final response = await _dio.get('/stats/accuracy', queryParameters: {'days': days});
    return response.data;
  }

  Future<List<Map<String, dynamic>>> getRoiByCategory({int days = 30}) async {
    final response = await _dio.get('/stats/roi', queryParameters: {'days': days});
    return List<Map<String, dynamic>>.from(response.data);
  }

  // Leagues
  Future<List<Map<String, dynamic>>> getLeagues() async {
    final response = await _dio.get('/matches/leagues');
    return List<Map<String, dynamic>>.from(response.data);
  }

  Future<List<Map<String, dynamic>>> getStandings(String leagueCode) async {
    final response = await _dio.get('/matches/standings/$leagueCode');
    return List<Map<String, dynamic>>.from(response.data);
  }

  // Favorites
  Future<List<String>> getFavoriteTeams() async {
    final response = await _dio.get('/favorites/teams');
    return (response.data as List).map((t) => t['team_name'] as String).toList();
  }

  Future<void> addFavoriteTeam(String teamName) async {
    await _dio.post('/favorites/teams/$teamName');
  }

  Future<void> removeFavoriteTeam(String teamName) async {
    await _dio.delete('/favorites/teams/$teamName');
  }

  Future<List<Map<String, dynamic>>> getFavoriteLeagues() async {
    final response = await _dio.get('/favorites/leagues');
    return List<Map<String, dynamic>>.from(response.data);
  }

  Future<void> addFavoriteLeague(String leagueCode) async {
    await _dio.post('/favorites/leagues/$leagueCode');
  }

  Future<void> removeFavoriteLeague(String leagueCode) async {
    await _dio.delete('/favorites/leagues/$leagueCode');
  }

  // Match Results (for auto-results feature)
  Future<List<Map<String, dynamic>>> getMatchResults(List<int> matchIds) async {
    if (matchIds.isEmpty) return [];

    final response = await _dio.post('/matches/results', data: {
      'match_ids': matchIds,
    });
    return List<Map<String, dynamic>>.from(response.data);
  }

  // AI Chat
  Future<Map<String, dynamic>> sendChatMessage({
    required String message,
    List<Map<String, String>> history = const [],
    double? minOdds,
    double? maxOdds,
    String? riskLevel,
  }) async {
    final data = <String, dynamic>{
      'message': message,
      'history': history,
    };

    // Add user preferences if provided
    if (minOdds != null || maxOdds != null || riskLevel != null) {
      data['preferences'] = {
        'min_odds': minOdds ?? 1.5,
        'max_odds': maxOdds ?? 3.0,
        'risk_level': riskLevel ?? 'medium',
      };
    }

    final response = await _dio.post('/chat/send', data: data);
    return response.data;
  }

  Future<bool> isChatAvailable() async {
    try {
      final response = await _dio.get('/chat/status');
      return response.data['available'] == true;
    } catch (e) {
      return false;
    }
  }
}

// Provider
final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});
