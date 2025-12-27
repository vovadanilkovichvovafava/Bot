import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/prediction.dart';

class PredictionsStorageService {
  static const String _storageKey = 'saved_predictions';

  Future<List<Prediction>> loadPredictions() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonString = prefs.getString(_storageKey);
      if (jsonString == null || jsonString.isEmpty) {
        return [];
      }

      final List<dynamic> jsonList = json.decode(jsonString);
      return jsonList.map((j) => Prediction.fromJson(j)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<void> savePredictions(List<Prediction> predictions) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = predictions.map((p) => p.toJson()).toList();
      await prefs.setString(_storageKey, json.encode(jsonList));
    } catch (e) {
      // Silent fail
    }
  }

  Future<void> addPrediction(Prediction prediction) async {
    final predictions = await loadPredictions();

    // Check if prediction for this match already exists
    final existingIndex = predictions.indexWhere((p) => p.matchId == prediction.matchId);
    if (existingIndex >= 0) {
      predictions[existingIndex] = prediction;
    } else {
      predictions.insert(0, prediction);
    }

    await savePredictions(predictions);
  }

  Future<void> updatePredictionResult(int matchId, String result, {int? homeScore, int? awayScore}) async {
    final predictions = await loadPredictions();
    final index = predictions.indexWhere((p) => p.matchId == matchId);

    if (index >= 0) {
      predictions[index] = predictions[index].copyWith(
        result: result,
        homeScore: homeScore,
        awayScore: awayScore,
      );
      await savePredictions(predictions);
    }
  }

  Future<void> removePrediction(int matchId) async {
    final predictions = await loadPredictions();
    predictions.removeWhere((p) => p.matchId == matchId);
    await savePredictions(predictions);
  }

  Future<Prediction?> getPrediction(int matchId) async {
    final predictions = await loadPredictions();
    try {
      return predictions.firstWhere((p) => p.matchId == matchId);
    } catch (e) {
      return null;
    }
  }

  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }

  Future<int> generateId() async {
    final predictions = await loadPredictions();
    if (predictions.isEmpty) return 1;
    return predictions.map((p) => p.id).reduce((a, b) => a > b ? a : b) + 1;
  }
}

// Provider
final predictionsStorageProvider = Provider<PredictionsStorageService>((ref) {
  return PredictionsStorageService();
});
