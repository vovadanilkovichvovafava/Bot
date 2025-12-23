import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/user.dart';
import '../models/match.dart';
import '../models/prediction.dart';
import '../utils/constants.dart';

class ApiService {
  final Dio _dio;
  String? _token;

  ApiService() : _dio = Dio(BaseOptions(
    baseUrl: ApiConstants.baseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
    headers: {
      'Content-Type': 'application/json',
    },
  )) {
    _dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
    ));
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
    if (date != null) params['date'] = date;
    if (league != null) params['league'] = league;

    final response = await _dio.get('/matches', queryParameters: params);
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
    final response = await _dio.get('/leagues');
    return List<Map<String, dynamic>>.from(response.data);
  }

  Future<List<Map<String, dynamic>>> getStandings(String leagueCode) async {
    final response = await _dio.get('/leagues/$leagueCode/standings');
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
}

// Provider
final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});
