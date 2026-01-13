import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Bet slip item model with JSON serialization
class BetSlipItem {
  final String match;
  final String selection;
  final double odds;
  final String league;
  final DateTime? addedAt;

  BetSlipItem({
    required this.match,
    required this.selection,
    required this.odds,
    required this.league,
    DateTime? addedAt,
  }) : addedAt = addedAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'match': match,
    'selection': selection,
    'odds': odds,
    'league': league,
    'addedAt': addedAt?.toIso8601String(),
  };

  factory BetSlipItem.fromJson(Map<String, dynamic> json) => BetSlipItem(
    match: json['match'] as String,
    selection: json['selection'] as String,
    odds: (json['odds'] as num).toDouble(),
    league: json['league'] as String,
    addedAt: json['addedAt'] != null
        ? DateTime.tryParse(json['addedAt'] as String)
        : null,
  );
}

// Bet slip state
class BetSlipState {
  final List<BetSlipItem> selections;
  final double stake;
  final bool isLoading;

  const BetSlipState({
    this.selections = const [],
    this.stake = 10.0,
    this.isLoading = false,
  });

  BetSlipState copyWith({
    List<BetSlipItem>? selections,
    double? stake,
    bool? isLoading,
  }) {
    return BetSlipState(
      selections: selections ?? this.selections,
      stake: stake ?? this.stake,
      isLoading: isLoading ?? this.isLoading,
    );
  }

  double get totalOdds {
    if (selections.isEmpty) return 0;
    return selections.fold(1.0, (prev, item) => prev * item.odds);
  }

  double get potentialReturn => stake * totalOdds;
  double get potentialProfit => potentialReturn - stake;
}

// Bet slip notifier with persistence
class BetSlipNotifier extends StateNotifier<BetSlipState> {
  static const _storageKey = 'bet_slip_selections';
  static const _stakeKey = 'bet_slip_stake';

  BetSlipNotifier() : super(const BetSlipState(isLoading: true)) {
    _loadFromStorage();
  }

  Future<void> _loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Load selections
      final selectionsJson = prefs.getString(_storageKey);
      List<BetSlipItem> selections = [];
      if (selectionsJson != null) {
        final List<dynamic> decoded = jsonDecode(selectionsJson);
        selections = decoded
            .map((item) => BetSlipItem.fromJson(item as Map<String, dynamic>))
            .toList();
      }

      // Load stake
      final stake = prefs.getDouble(_stakeKey) ?? 10.0;

      state = BetSlipState(
        selections: selections,
        stake: stake,
        isLoading: false,
      );
    } catch (e) {
      // If there's an error, just start with empty state
      state = const BetSlipState(isLoading: false);
    }
  }

  Future<void> _saveToStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Save selections
      final selectionsJson = jsonEncode(
        state.selections.map((item) => item.toJson()).toList(),
      );
      await prefs.setString(_storageKey, selectionsJson);

      // Save stake
      await prefs.setDouble(_stakeKey, state.stake);
    } catch (e) {
      // Silently fail on save errors
    }
  }

  void addSelection(BetSlipItem item) {
    state = state.copyWith(
      selections: [...state.selections, item],
    );
    _saveToStorage();
  }

  void removeSelection(int index) {
    final newSelections = List<BetSlipItem>.from(state.selections);
    if (index >= 0 && index < newSelections.length) {
      newSelections.removeAt(index);
      state = state.copyWith(selections: newSelections);
      _saveToStorage();
    }
  }

  void updateStake(double stake) {
    if (stake >= 0) {
      state = state.copyWith(stake: stake);
      _saveToStorage();
    }
  }

  void clearAll() {
    state = state.copyWith(selections: []);
    _saveToStorage();
  }

  // For saving/archiving a completed bet slip
  Future<void> saveBetSlip() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Get saved bet slips history
      final historyJson = prefs.getString('bet_slip_history');
      List<dynamic> history = [];
      if (historyJson != null) {
        history = jsonDecode(historyJson);
      }

      // Add current slip to history
      history.add({
        'selections': state.selections.map((s) => s.toJson()).toList(),
        'stake': state.stake,
        'totalOdds': state.totalOdds,
        'potentialReturn': state.potentialReturn,
        'savedAt': DateTime.now().toIso8601String(),
      });

      // Keep only last 50 saved slips
      if (history.length > 50) {
        history = history.sublist(history.length - 50);
      }

      await prefs.setString('bet_slip_history', jsonEncode(history));

      // Clear current slip after saving
      clearAll();
    } catch (e) {
      // Handle error
    }
  }
}

// Provider
final betSlipProvider = StateNotifierProvider<BetSlipNotifier, BetSlipState>((ref) {
  return BetSlipNotifier();
});

// Saved bet slip model
class SavedBetSlip {
  final List<BetSlipItem> selections;
  final double stake;
  final double totalOdds;
  final double potentialReturn;
  final DateTime savedAt;

  SavedBetSlip({
    required this.selections,
    required this.stake,
    required this.totalOdds,
    required this.potentialReturn,
    required this.savedAt,
  });

  factory SavedBetSlip.fromJson(Map<String, dynamic> json) {
    return SavedBetSlip(
      selections: (json['selections'] as List)
          .map((s) => BetSlipItem.fromJson(s as Map<String, dynamic>))
          .toList(),
      stake: (json['stake'] as num).toDouble(),
      totalOdds: (json['totalOdds'] as num).toDouble(),
      potentialReturn: (json['potentialReturn'] as num).toDouble(),
      savedAt: DateTime.parse(json['savedAt'] as String),
    );
  }
}

// Bet slip history provider
final betSlipHistoryProvider = FutureProvider<List<SavedBetSlip>>((ref) async {
  final prefs = await SharedPreferences.getInstance();
  final historyJson = prefs.getString('bet_slip_history');

  if (historyJson == null) return [];

  try {
    final List<dynamic> decoded = jsonDecode(historyJson);
    return decoded
        .map((item) => SavedBetSlip.fromJson(item as Map<String, dynamic>))
        .toList()
        .reversed  // Most recent first
        .toList();
  } catch (e) {
    return [];
  }
});

// Clear history function
Future<void> clearBetSlipHistory() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove('bet_slip_history');
}
