import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:math';

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
                        'For a £100 bankroll: £${(_kellyStake! * 1).toStringAsFixed(2)}',
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

class BetSlipBuilder extends StatefulWidget {
  const BetSlipBuilder({super.key});

  @override
  State<BetSlipBuilder> createState() => _BetSlipBuilderState();
}

class _BetSlipBuilderState extends State<BetSlipBuilder> {
  final List<BetSlipItem> _selections = [];
  final _stakeController = TextEditingController(text: '10');
  double _stake = 10;

  void _addSelection() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _AddSelectionSheet(
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
  final Function(BetSlipItem) onAdd;

  const _AddSelectionSheet({required this.onAdd});

  @override
  State<_AddSelectionSheet> createState() => _AddSelectionSheetState();
}

class _AddSelectionSheetState extends State<_AddSelectionSheet> {
  final _matchController = TextEditingController();
  final _oddsController = TextEditingController();
  String? _selectedSelection;
  String _selectedLeague = 'Premier League';

  final _selections = [
    'Home Win',
    'Draw',
    'Away Win',
    'Over 2.5',
    'Under 2.5',
    'BTTS Yes',
    'BTTS No',
  ];

  final _leagues = [
    'Premier League',
    'La Liga',
    'Bundesliga',
    'Serie A',
    'Ligue 1',
    'Champions League',
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 20,
        right: 20,
        top: 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.add_circle),
              const SizedBox(width: 8),
              const Text(
                'Add Selection',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Match name
          TextField(
            controller: _matchController,
            decoration: InputDecoration(
              labelText: 'Match',
              hintText: 'e.g., Arsenal vs Chelsea',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // League dropdown
          DropdownButtonFormField<String>(
            value: _selectedLeague,
            decoration: InputDecoration(
              labelText: 'League',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            items: _leagues.map((l) => DropdownMenuItem(
              value: l,
              child: Text(l),
            )).toList(),
            onChanged: (v) => setState(() => _selectedLeague = v!),
          ),
          const SizedBox(height: 16),

          // Selection type
          const Text('Selection', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _selections.map((s) => ChoiceChip(
              label: Text(s),
              selected: _selectedSelection == s,
              onSelected: (selected) {
                setState(() => _selectedSelection = selected ? s : null);
              },
            )).toList(),
          ),
          const SizedBox(height: 16),

          // Odds
          TextField(
            controller: _oddsController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              labelText: 'Odds',
              hintText: 'e.g., 2.10',
              prefixText: '@ ',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Add button
          FilledButton(
            onPressed: _matchController.text.isNotEmpty &&
                _selectedSelection != null &&
                _oddsController.text.isNotEmpty
                ? () {
                    final odds = double.tryParse(_oddsController.text);
                    if (odds != null && odds >= 1.01) {
                      widget.onAdd(BetSlipItem(
                        match: _matchController.text,
                        selection: _selectedSelection!,
                        odds: odds,
                        league: _selectedLeague,
                      ));
                    }
                  }
                : null,
            child: const Text('Add to Slip'),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
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
