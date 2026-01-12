import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:math';

import '../providers/matches_provider.dart';
import '../models/match.dart';

class CalculatorsScreen extends ConsumerWidget {
  const CalculatorsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Betting Tools'),
          bottom: const TabBar(
            tabs: [
              Tab(icon: Icon(Icons.calculate), text: 'Value Bet'),
              Tab(icon: Icon(Icons.receipt_long), text: 'Bet Slip'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            ValueBetCalculator(),
            BetSlipBuilder(),
          ],
        ),
      ),
    );
  }
}

// ============================================
// VALUE BET CALCULATOR
// ============================================

class ValueBetCalculator extends StatefulWidget {
  const ValueBetCalculator({super.key});

  @override
  State<ValueBetCalculator> createState() => _ValueBetCalculatorState();
}

class _ValueBetCalculatorState extends State<ValueBetCalculator> {
  final _oddsController = TextEditingController();
  final _probabilityController = TextEditingController();

  double? _value;
  double? _expectedValue;
  double? _kellyStake;
  bool _isValueBet = false;

  void _calculate() {
    final odds = double.tryParse(_oddsController.text);
    final probability = double.tryParse(_probabilityController.text);

    if (odds == null || probability == null || odds < 1.01 || probability <= 0 || probability > 100) {
      setState(() {
        _value = null;
        _expectedValue = null;
        _kellyStake = null;
        _isValueBet = false;
      });
      return;
    }

    final probDecimal = probability / 100;
    final impliedProb = 1 / odds;

    // Value = (Probability * Odds) - 1
    final value = (probDecimal * odds) - 1;

    // Expected Value per £1 bet
    final ev = (probDecimal * (odds - 1)) - (1 - probDecimal);

    // Kelly Criterion: (bp - q) / b where b = odds-1, p = prob, q = 1-prob
    final b = odds - 1;
    final kelly = ((b * probDecimal) - (1 - probDecimal)) / b;

    setState(() {
      _value = value * 100; // As percentage
      _expectedValue = ev * 100; // As percentage of stake
      _kellyStake = kelly > 0 ? kelly * 100 : 0; // As percentage of bankroll
      _isValueBet = value > 0;
    });
  }

  @override
  void dispose() {
    _oddsController.dispose();
    _probabilityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Info card
          Card(
            color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'A value bet exists when the probability of an outcome is higher than what the odds suggest.',
                      style: TextStyle(color: Colors.grey[700]),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Input: Odds
          TextField(
            controller: _oddsController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              labelText: 'Bookmaker Odds',
              hintText: 'e.g., 2.50',
              prefixIcon: const Icon(Icons.monetization_on),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              helperText: 'Enter the decimal odds offered by bookmaker',
            ),
            onChanged: (_) => _calculate(),
          ),

          const SizedBox(height: 16),

          // Input: Your Probability
          TextField(
            controller: _probabilityController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              labelText: 'Your Estimated Probability (%)',
              hintText: 'e.g., 45',
              prefixIcon: const Icon(Icons.percent),
              suffixText: '%',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              helperText: 'Your assessment of the outcome probability',
            ),
            onChanged: (_) => _calculate(),
          ),

          const SizedBox(height: 24),

          // Results
          if (_value != null) ...[
            // Value indicator
            Card(
              color: _isValueBet ? Colors.green[50] : Colors.red[50],
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Icon(
                      _isValueBet ? Icons.thumb_up : Icons.thumb_down,
                      size: 48,
                      color: _isValueBet ? Colors.green : Colors.red,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _isValueBet ? 'VALUE BET!' : 'NO VALUE',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: _isValueBet ? Colors.green[800] : Colors.red[800],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Value: ${_value!.toStringAsFixed(2)}%',
                      style: TextStyle(
                        fontSize: 18,
                        color: _isValueBet ? Colors.green[700] : Colors.red[700],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Detailed results
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Analysis',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Divider(height: 24),

                    _ResultRow(
                      label: 'Implied Probability',
                      value: '${(100 / double.parse(_oddsController.text)).toStringAsFixed(1)}%',
                      description: 'What odds suggest',
                    ),
                    _ResultRow(
                      label: 'Your Probability',
                      value: '${_probabilityController.text}%',
                      description: 'Your estimation',
                    ),
                    _ResultRow(
                      label: 'Expected Value',
                      value: '${_expectedValue!.toStringAsFixed(2)}%',
                      description: 'EV per £1 staked',
                      isPositive: _expectedValue! > 0,
                    ),
                    _ResultRow(
                      label: 'Kelly Stake',
                      value: '${_kellyStake!.toStringAsFixed(1)}%',
                      description: '% of bankroll to bet',
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Kelly recommendation
            if (_kellyStake! > 0)
              Card(
                color: Colors.blue[50],
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.lightbulb, color: Colors.blue[700]),
                          const SizedBox(width: 8),
                          Text(
                            'Kelly Criterion Suggestion',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue[800],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Stake ${_kellyStake!.toStringAsFixed(1)}% of your bankroll.\n'
                        'For a £100 bankroll: £${_kellyStake!.toStringAsFixed(2)}',
                        style: TextStyle(color: Colors.blue[700]),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '* Consider using ½ or ¼ Kelly for more conservative approach',
                        style: TextStyle(
                          fontSize: 12,
                          fontStyle: FontStyle.italic,
                          color: Colors.blue[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _ResultRow extends StatelessWidget {
  final String label;
  final String value;
  final String description;
  final bool? isPositive;

  const _ResultRow({
    required this.label,
    required this.value,
    required this.description,
    this.isPositive,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isPositive == null
                  ? null
                  : isPositive!
                      ? Colors.green
                      : Colors.red,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================
// BET SLIP BUILDER
// ============================================

class BetSlipBuilder extends ConsumerStatefulWidget {
  const BetSlipBuilder({super.key});

  @override
  ConsumerState<BetSlipBuilder> createState() => _BetSlipBuilderState();
}

class _BetSlipBuilderState extends ConsumerState<BetSlipBuilder> {
  final List<BetSlipItem> _selections = [];
  final _stakeController = TextEditingController(text: '10');
  double _stake = 10;

  @override
  void initState() {
    super.initState();
    // Load matches when screen opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(matchesProvider.notifier).loadTodayMatches();
    });
  }

  void _addSelection() {
    final matchesState = ref.read(matchesProvider);
    final matches = matchesState.todayMatches;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _AddSelectionSheet(
        matches: matches,
        onAdd: (item) {
          setState(() => _selections.add(item));
          Navigator.pop(context);
        },
      ),
    );
  }

  void _removeSelection(int index) {
    setState(() => _selections.removeAt(index));
  }

  double get _totalOdds {
    if (_selections.isEmpty) return 0;
    return _selections.fold(1.0, (prev, item) => prev * item.odds);
  }

  double get _potentialReturn => _stake * _totalOdds;
  double get _potentialProfit => _potentialReturn - _stake;

  @override
  void dispose() {
    _stakeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: _selections.isEmpty
              ? _buildEmptyState()
              : _buildSelectionsList(),
        ),

        // Bottom summary
        if (_selections.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              child: Column(
                children: [
                  // Stake input
                  Row(
                    children: [
                      const Text(
                        'Stake:',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _stakeController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: InputDecoration(
                            prefixText: '£ ',
                            isDense: true,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          onChanged: (value) {
                            setState(() {
                              _stake = double.tryParse(value) ?? 0;
                            });
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Quick stake buttons
                      ...['5', '10', '25'].map((v) => Padding(
                        padding: const EdgeInsets.only(left: 4),
                        child: InkWell(
                          onTap: () {
                            _stakeController.text = v;
                            setState(() => _stake = double.parse(v));
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primaryContainer,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text('£$v'),
                          ),
                        ),
                      )),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Summary
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${_selections.length} selection${_selections.length > 1 ? 's' : ''}',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Total Odds: ${_totalOdds.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'Potential Return',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '£${_potentialReturn.toStringAsFixed(2)}',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Place bet button (simulated)
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Bet slip saved! Potential profit: £${_potentialProfit.toStringAsFixed(2)}',
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.check),
                      label: Text('Save Bet Slip (£${_stake.toStringAsFixed(2)})'),
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          const Text(
            'Your bet slip is empty',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Add selections to build an accumulator',
            style: TextStyle(color: Colors.grey[600]),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _addSelection,
            icon: const Icon(Icons.add),
            label: const Text('Add Selection'),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectionsList() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Add button
        OutlinedButton.icon(
          onPressed: _addSelection,
          icon: const Icon(Icons.add),
          label: const Text('Add Selection'),
        ),

        const SizedBox(height: 16),

        // Selections
        ...List.generate(_selections.length, (index) {
          final item = _selections[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              title: Text(
                item.match,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.selection),
                  Text(
                    item.league,
                    style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                  ),
                ],
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      item.odds.toStringAsFixed(2),
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.red),
                    onPressed: () => _removeSelection(index),
                  ),
                ],
              ),
              isThreeLine: true,
            ),
          );
        }),

        const SizedBox(height: 100), // Space for bottom bar
      ],
    );
  }
}

class _AddSelectionSheet extends StatefulWidget {
  final List<Match> matches;
  final Function(BetSlipItem) onAdd;

  const _AddSelectionSheet({
    required this.matches,
    required this.onAdd,
  });

  @override
  State<_AddSelectionSheet> createState() => _AddSelectionSheetState();
}

class _AddSelectionSheetState extends State<_AddSelectionSheet> {
  final _searchController = TextEditingController();
  final _customOddsController = TextEditingController();
  Match? _selectedMatch;
  String? _selectedBetType;
  double? _selectedOdds;
  bool _showCustomOdds = false;

  // All bet types that AI can recommend
  static const _betTypes = [
    // Main outcomes
    _BetTypeOption('Home Win', '1', Icons.home, Colors.blue),
    _BetTypeOption('Draw', 'X', Icons.balance, Colors.grey),
    _BetTypeOption('Away Win', '2', Icons.flight_takeoff, Colors.orange),
    // Double chance
    _BetTypeOption('1X', '1X', Icons.looks_two, Colors.indigo),
    _BetTypeOption('X2', 'X2', Icons.looks_two, Colors.teal),
    _BetTypeOption('12', '12', Icons.looks_two, Colors.purple),
    // Goals
    _BetTypeOption('Over 1.5', 'O1.5', Icons.arrow_upward, Colors.green),
    _BetTypeOption('Over 2.5', 'O2.5', Icons.arrow_upward, Colors.green),
    _BetTypeOption('Over 3.5', 'O3.5', Icons.arrow_upward, Colors.green),
    _BetTypeOption('Under 1.5', 'U1.5', Icons.arrow_downward, Colors.red),
    _BetTypeOption('Under 2.5', 'U2.5', Icons.arrow_downward, Colors.red),
    _BetTypeOption('Under 3.5', 'U3.5', Icons.arrow_downward, Colors.red),
    // BTTS
    _BetTypeOption('BTTS Yes', 'GG', Icons.sports_soccer, Colors.amber),
    _BetTypeOption('BTTS No', 'NG', Icons.block, Colors.brown),
    // Handicaps
    _BetTypeOption('Home -1', 'H-1', Icons.remove_circle, Colors.blue),
    _BetTypeOption('Away +1', 'A+1', Icons.add_circle, Colors.orange),
    // Correct score (examples)
    _BetTypeOption('1-0', '1-0', Icons.scoreboard, Colors.cyan),
    _BetTypeOption('2-1', '2-1', Icons.scoreboard, Colors.cyan),
    _BetTypeOption('0-0', '0-0', Icons.scoreboard, Colors.grey),
  ];

  // Quick odds presets based on bet type
  static const _oddsPresets = {
    'Home Win': [1.50, 1.80, 2.10, 2.50, 3.00],
    'Draw': [3.00, 3.25, 3.50, 3.75, 4.00],
    'Away Win': [2.00, 2.50, 3.00, 4.00, 5.00],
    '1X': [1.20, 1.30, 1.40, 1.50, 1.60],
    'X2': [1.30, 1.45, 1.60, 1.75, 1.90],
    '12': [1.15, 1.25, 1.35, 1.45, 1.55],
    'Over 1.5': [1.25, 1.35, 1.45, 1.55, 1.65],
    'Over 2.5': [1.70, 1.85, 2.00, 2.20, 2.50],
    'Over 3.5': [2.50, 2.80, 3.20, 3.60, 4.00],
    'Under 1.5': [3.00, 3.50, 4.00, 4.50, 5.00],
    'Under 2.5': [1.80, 2.00, 2.20, 2.40, 2.60],
    'Under 3.5': [1.30, 1.40, 1.50, 1.60, 1.70],
    'BTTS Yes': [1.60, 1.75, 1.90, 2.00, 2.20],
    'BTTS No': [1.80, 2.00, 2.20, 2.40, 2.60],
    'Home -1': [2.00, 2.50, 3.00, 3.50, 4.00],
    'Away +1': [1.40, 1.55, 1.70, 1.85, 2.00],
    '1-0': [6.00, 7.00, 8.00, 9.00, 10.00],
    '2-1': [7.00, 8.00, 9.00, 10.00, 12.00],
    '0-0': [8.00, 10.00, 12.00, 14.00, 16.00],
  };

  List<Match> get _filteredMatches {
    final query = _searchController.text.toLowerCase();
    if (query.isEmpty) return widget.matches;
    return widget.matches.where((m) =>
      m.homeTeam.name.toLowerCase().contains(query) ||
      m.awayTeam.name.toLowerCase().contains(query) ||
      m.league.toLowerCase().contains(query)
    ).toList();
  }

  List<double> get _currentOddsPresets {
    if (_selectedBetType == null) return [1.50, 2.00, 2.50, 3.00, 4.00];
    return _oddsPresets[_selectedBetType] ?? [1.50, 2.00, 2.50, 3.00, 4.00];
  }

  @override
  void dispose() {
    _searchController.dispose();
    _customOddsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E2E) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[400],
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.add_circle,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(width: 12),
                const Text(
                  'Add to Bet Slip',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Step 1: Select Match
                  _buildSectionTitle('1. Select Match', Icons.sports_soccer),
                  const SizedBox(height: 8),

                  // Search bar
                  TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search matches...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      filled: true,
                      fillColor: isDark ? Colors.grey[900] : Colors.grey[100],
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 12),

                  // Matches list
                  if (widget.matches.isEmpty)
                    _buildNoMatchesCard()
                  else
                    Container(
                      height: 180,
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.withOpacity(0.3)),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(8),
                        itemCount: _filteredMatches.length,
                        itemBuilder: (context, index) {
                          final match = _filteredMatches[index];
                          final isSelected = _selectedMatch?.id == match.id;
                          return _MatchSelectTile(
                            match: match,
                            isSelected: isSelected,
                            onTap: () => setState(() => _selectedMatch = match),
                          );
                        },
                      ),
                    ),

                  const SizedBox(height: 24),

                  // Step 2: Select Bet Type
                  _buildSectionTitle('2. Bet Type', Icons.category),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _betTypes.map((bt) {
                      final isSelected = _selectedBetType == bt.name;
                      return GestureDetector(
                        onTap: () => setState(() {
                          _selectedBetType = bt.name;
                          _selectedOdds = null; // Reset odds when bet type changes
                        }),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? bt.color.withOpacity(0.2)
                                : isDark ? Colors.grey[850] : Colors.grey[100],
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSelected ? bt.color : Colors.transparent,
                              width: 2,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(bt.icon, size: 16, color: isSelected ? bt.color : Colors.grey),
                              const SizedBox(width: 6),
                              Text(
                                bt.name,
                                style: TextStyle(
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                  color: isSelected ? bt.color : null,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 24),

                  // Step 3: Select Odds
                  _buildSectionTitle('3. Odds', Icons.monetization_on),
                  const SizedBox(height: 8),

                  // Quick odds selection
                  Row(
                    children: [
                      ..._currentOddsPresets.map((odds) {
                        final isSelected = _selectedOdds == odds && !_showCustomOdds;
                        return Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 2),
                            child: GestureDetector(
                              onTap: () => setState(() {
                                _selectedOdds = odds;
                                _showCustomOdds = false;
                              }),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? Theme.of(context).colorScheme.primary
                                      : isDark ? Colors.grey[850] : Colors.grey[100],
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: isSelected
                                        ? Theme.of(context).colorScheme.primary
                                        : Colors.grey.withOpacity(0.3),
                                  ),
                                ),
                                child: Text(
                                  odds.toStringAsFixed(2),
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: isSelected ? Colors.white : null,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Custom odds toggle
                  GestureDetector(
                    onTap: () => setState(() => _showCustomOdds = !_showCustomOdds),
                    child: Row(
                      children: [
                        Icon(
                          _showCustomOdds ? Icons.check_box : Icons.check_box_outline_blank,
                          size: 20,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 8),
                        const Text('Custom odds'),
                      ],
                    ),
                  ),

                  if (_showCustomOdds) ...[
                    const SizedBox(height: 8),
                    TextField(
                      controller: _customOddsController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        hintText: 'Enter odds (e.g., 2.75)',
                        prefixText: '@ ',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        filled: true,
                      ),
                      onChanged: (value) {
                        final odds = double.tryParse(value);
                        if (odds != null && odds >= 1.01) {
                          setState(() => _selectedOdds = odds);
                        }
                      },
                    ),
                  ],

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),

          // Bottom add button
          Container(
            padding: EdgeInsets.fromLTRB(
              16, 16, 16,
              MediaQuery.of(context).padding.bottom + 16,
            ),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E1E2E) : Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 10,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: Column(
              children: [
                // Preview
                if (_selectedMatch != null && _selectedBetType != null && _selectedOdds != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${_selectedMatch!.homeTeam.name} vs ${_selectedMatch!.awayTeam.name}',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                '$_selectedBetType @ ${_selectedOdds!.toStringAsFixed(2)}',
                                style: TextStyle(color: Colors.grey[600]),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.primary,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _selectedOdds!.toStringAsFixed(2),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: FilledButton.icon(
                    onPressed: _canAdd
                        ? () {
                            widget.onAdd(BetSlipItem(
                              match: '${_selectedMatch!.homeTeam.name} vs ${_selectedMatch!.awayTeam.name}',
                              selection: _selectedBetType!,
                              odds: _selectedOdds!,
                              league: _selectedMatch!.league,
                            ));
                          }
                        : null,
                    icon: const Icon(Icons.add),
                    label: const Text('Add to Slip', style: TextStyle(fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  bool get _canAdd =>
      _selectedMatch != null &&
      _selectedBetType != null &&
      _selectedOdds != null &&
      _selectedOdds! >= 1.01;

  Widget _buildSectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildNoMatchesCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.orange.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orange.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          const Icon(Icons.warning_amber, color: Colors.orange, size: 32),
          const SizedBox(height: 8),
          const Text(
            'No matches loaded',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            'Go to Matches tab to load today\'s matches',
            style: TextStyle(color: Colors.grey[600], fontSize: 13),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

// Helper class for bet type options
class _BetTypeOption {
  final String name;
  final String shortName;
  final IconData icon;
  final Color color;

  const _BetTypeOption(this.name, this.shortName, this.icon, this.color);
}

// Match selection tile
class _MatchSelectTile extends StatelessWidget {
  final Match match;
  final bool isSelected;
  final VoidCallback onTap;

  const _MatchSelectTile({
    required this.match,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected
              ? Theme.of(context).colorScheme.primary.withOpacity(0.1)
              : isDark ? Colors.grey[850] : Colors.grey[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? Theme.of(context).colorScheme.primary
                : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            if (isSelected)
              Container(
                margin: const EdgeInsets.only(right: 12),
                child: Icon(
                  Icons.check_circle,
                  color: Theme.of(context).colorScheme.primary,
                  size: 20,
                ),
              ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${match.homeTeam.name} vs ${match.awayTeam.name}',
                    style: TextStyle(
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    match.league,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            Text(
              _formatTime(match.matchDate),
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime date) {
    return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}

class BetSlipItem {
  final String match;
  final String selection;
  final double odds;
  final String league;

  BetSlipItem({
    required this.match,
    required this.selection,
    required this.odds,
    required this.league,
  });
}
