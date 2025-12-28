import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

// Bankroll state
class BankrollState {
  final double initialBankroll;
  final double currentBankroll;
  final String strategy; // 'flat', 'kelly', 'percentage'
  final double flatStake;
  final double percentageStake;
  final List<BankrollTransaction> transactions;

  const BankrollState({
    this.initialBankroll = 100.0,
    this.currentBankroll = 100.0,
    this.strategy = 'flat',
    this.flatStake = 10.0,
    this.percentageStake = 5.0,
    this.transactions = const [],
  });

  BankrollState copyWith({
    double? initialBankroll,
    double? currentBankroll,
    String? strategy,
    double? flatStake,
    double? percentageStake,
    List<BankrollTransaction>? transactions,
  }) {
    return BankrollState(
      initialBankroll: initialBankroll ?? this.initialBankroll,
      currentBankroll: currentBankroll ?? this.currentBankroll,
      strategy: strategy ?? this.strategy,
      flatStake: flatStake ?? this.flatStake,
      percentageStake: percentageStake ?? this.percentageStake,
      transactions: transactions ?? this.transactions,
    );
  }

  double get profit => currentBankroll - initialBankroll;
  double get profitPercentage => initialBankroll > 0 ? (profit / initialBankroll * 100) : 0;
  bool get isProfit => profit > 0;

  double get suggestedStake {
    switch (strategy) {
      case 'flat':
        return flatStake;
      case 'percentage':
        return currentBankroll * (percentageStake / 100);
      case 'kelly':
        return currentBankroll * 0.05; // Default 5% for Kelly
      default:
        return flatStake;
    }
  }
}

class BankrollTransaction {
  final String id;
  final DateTime date;
  final String type; // 'bet', 'deposit', 'withdraw'
  final double amount;
  final String? description;
  final double? odds;
  final String? result; // 'win', 'loss', 'void'

  BankrollTransaction({
    required this.id,
    required this.date,
    required this.type,
    required this.amount,
    this.description,
    this.odds,
    this.result,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'date': date.toIso8601String(),
    'type': type,
    'amount': amount,
    'description': description,
    'odds': odds,
    'result': result,
  };

  factory BankrollTransaction.fromJson(Map<String, dynamic> json) => BankrollTransaction(
    id: json['id'],
    date: DateTime.parse(json['date']),
    type: json['type'],
    amount: json['amount'],
    description: json['description'],
    odds: json['odds'],
    result: json['result'],
  );
}

// Bankroll notifier
class BankrollNotifier extends StateNotifier<BankrollState> {
  BankrollNotifier() : super(const BankrollState()) {
    _loadState();
  }

  Future<void> _loadState() async {
    final prefs = await SharedPreferences.getInstance();
    final initialBankroll = prefs.getDouble('bankroll_initial') ?? 100.0;
    final currentBankroll = prefs.getDouble('bankroll_current') ?? 100.0;
    final strategy = prefs.getString('bankroll_strategy') ?? 'flat';
    final flatStake = prefs.getDouble('bankroll_flat_stake') ?? 10.0;
    final percentageStake = prefs.getDouble('bankroll_percentage_stake') ?? 5.0;

    final transactionsJson = prefs.getString('bankroll_transactions');
    List<BankrollTransaction> transactions = [];
    if (transactionsJson != null) {
      final List<dynamic> list = json.decode(transactionsJson);
      transactions = list.map((j) => BankrollTransaction.fromJson(j)).toList();
    }

    state = BankrollState(
      initialBankroll: initialBankroll,
      currentBankroll: currentBankroll,
      strategy: strategy,
      flatStake: flatStake,
      percentageStake: percentageStake,
      transactions: transactions,
    );
  }

  Future<void> _saveState() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('bankroll_initial', state.initialBankroll);
    await prefs.setDouble('bankroll_current', state.currentBankroll);
    await prefs.setString('bankroll_strategy', state.strategy);
    await prefs.setDouble('bankroll_flat_stake', state.flatStake);
    await prefs.setDouble('bankroll_percentage_stake', state.percentageStake);
    await prefs.setString('bankroll_transactions',
        json.encode(state.transactions.map((t) => t.toJson()).toList()));
  }

  Future<void> setInitialBankroll(double amount) async {
    state = state.copyWith(
      initialBankroll: amount,
      currentBankroll: amount,
      transactions: [],
    );
    await _saveState();
  }

  Future<void> setStrategy(String strategy) async {
    state = state.copyWith(strategy: strategy);
    await _saveState();
  }

  Future<void> setFlatStake(double stake) async {
    state = state.copyWith(flatStake: stake);
    await _saveState();
  }

  Future<void> setPercentageStake(double percentage) async {
    state = state.copyWith(percentageStake: percentage);
    await _saveState();
  }

  Future<void> addDeposit(double amount, {String? description}) async {
    final transaction = BankrollTransaction(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      date: DateTime.now(),
      type: 'deposit',
      amount: amount,
      description: description,
    );

    state = state.copyWith(
      currentBankroll: state.currentBankroll + amount,
      transactions: [transaction, ...state.transactions],
    );
    await _saveState();
  }

  Future<void> addWithdraw(double amount, {String? description}) async {
    final transaction = BankrollTransaction(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      date: DateTime.now(),
      type: 'withdraw',
      amount: -amount,
      description: description,
    );

    state = state.copyWith(
      currentBankroll: state.currentBankroll - amount,
      transactions: [transaction, ...state.transactions],
    );
    await _saveState();
  }

  Future<void> addBetResult({
    required double stake,
    required double odds,
    required String result,
    String? description,
  }) async {
    double amount;
    switch (result) {
      case 'win':
        amount = stake * (odds - 1); // Profit only
        break;
      case 'loss':
        amount = -stake;
        break;
      default:
        amount = 0; // Void
    }

    final transaction = BankrollTransaction(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      date: DateTime.now(),
      type: 'bet',
      amount: amount,
      description: description,
      odds: odds,
      result: result,
    );

    state = state.copyWith(
      currentBankroll: state.currentBankroll + amount,
      transactions: [transaction, ...state.transactions],
    );
    await _saveState();
  }

  Future<void> resetBankroll() async {
    state = const BankrollState();
    await _saveState();
  }
}

final bankrollProvider = StateNotifierProvider<BankrollNotifier, BankrollState>((ref) {
  return BankrollNotifier();
});

// Screen
class BankrollScreen extends ConsumerWidget {
  const BankrollScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(bankrollProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bankroll'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) async {
              if (value == 'reset') {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Reset Bankroll'),
                    content: const Text('This will clear all history. Are you sure?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context, false),
                        child: const Text('Cancel'),
                      ),
                      FilledButton(
                        onPressed: () => Navigator.pop(context, true),
                        style: FilledButton.styleFrom(backgroundColor: Colors.red),
                        child: const Text('Reset'),
                      ),
                    ],
                  ),
                );
                if (confirm == true) {
                  ref.read(bankrollProvider.notifier).resetBankroll();
                }
              } else if (value == 'settings') {
                _showSettingsSheet(context, ref, state);
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings),
                    SizedBox(width: 8),
                    Text('Settings'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'reset',
                child: Row(
                  children: [
                    Icon(Icons.refresh, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Reset', style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Main balance card
            _buildBalanceCard(context, state),

            const SizedBox(height: 16),

            // Stats cards
            Row(
              children: [
                Expanded(child: _buildStatCard(
                  context,
                  'Profit/Loss',
                  '${state.isProfit ? '+' : ''}£${state.profit.toStringAsFixed(2)}',
                  state.isProfit ? Colors.green : Colors.red,
                  Icons.trending_up,
                )),
                const SizedBox(width: 12),
                Expanded(child: _buildStatCard(
                  context,
                  'ROI',
                  '${state.isProfit ? '+' : ''}${state.profitPercentage.toStringAsFixed(1)}%',
                  state.isProfit ? Colors.green : Colors.red,
                  Icons.percent,
                )),
              ],
            ),

            const SizedBox(height: 16),

            // Strategy card
            _buildStrategyCard(context, ref, state),

            const SizedBox(height: 16),

            // Quick actions
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showAddDepositSheet(context, ref),
                    icon: const Icon(Icons.add, color: Colors.green),
                    label: const Text('Deposit'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showAddWithdrawSheet(context, ref),
                    icon: const Icon(Icons.remove, color: Colors.red),
                    label: const Text('Withdraw'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: () => _showAddBetSheet(context, ref, state),
              icon: const Icon(Icons.sports_soccer),
              label: const Text('Record Bet Result'),
            ),

            const SizedBox(height: 24),

            // Transactions
            if (state.transactions.isNotEmpty) ...[
              const Text(
                'Recent Transactions',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              ...state.transactions.take(20).map((t) => _buildTransactionTile(context, t)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBalanceCard(BuildContext context, BankrollState state) {
    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Text(
              'Current Bankroll',
              style: TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              '£${state.currentBankroll.toStringAsFixed(2)}',
              style: TextStyle(
                fontSize: 42,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onPrimaryContainer,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Started with £${state.initialBankroll.toStringAsFixed(2)}',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(BuildContext context, String label, String value, Color color, IconData icon) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(color: Colors.grey[600], fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStrategyCard(BuildContext context, WidgetRef ref, BankrollState state) {
    final strategies = {
      'flat': ('Flat Stake', '£${state.flatStake.toStringAsFixed(0)} per bet'),
      'percentage': ('Percentage', '${state.percentageStake.toStringAsFixed(0)}% of bankroll'),
      'kelly': ('Kelly', 'Based on edge'),
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.psychology, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 8),
                const Text(
                  'Staking Strategy',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              children: strategies.entries.map((e) => ChoiceChip(
                label: Text(e.value.$1),
                selected: state.strategy == e.key,
                onSelected: (selected) {
                  if (selected) {
                    ref.read(bankrollProvider.notifier).setStrategy(e.key);
                  }
                },
              )).toList(),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.recommend, size: 20),
                  const SizedBox(width: 8),
                  Text('Suggested stake: '),
                  Text(
                    '£${state.suggestedStake.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionTile(BuildContext context, BankrollTransaction t) {
    IconData icon;
    Color color;
    String title;

    switch (t.type) {
      case 'deposit':
        icon = Icons.add_circle;
        color = Colors.green;
        title = 'Deposit';
        break;
      case 'withdraw':
        icon = Icons.remove_circle;
        color = Colors.red;
        title = 'Withdraw';
        break;
      case 'bet':
        icon = Icons.sports_soccer;
        color = t.result == 'win' ? Colors.green : (t.result == 'loss' ? Colors.red : Colors.grey);
        title = t.result == 'win' ? 'Bet Won' : (t.result == 'loss' ? 'Bet Lost' : 'Bet Void');
        break;
      default:
        icon = Icons.help;
        color = Colors.grey;
        title = 'Unknown';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: color),
        title: Text(title),
        subtitle: Text(
          t.description ?? '${t.date.day}/${t.date.month}/${t.date.year}',
        ),
        trailing: Text(
          '${t.amount >= 0 ? '+' : ''}£${t.amount.toStringAsFixed(2)}',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: t.amount >= 0 ? Colors.green : Colors.red,
          ),
        ),
      ),
    );
  }

  void _showSettingsSheet(BuildContext context, WidgetRef ref, BankrollState state) {
    final flatController = TextEditingController(text: state.flatStake.toString());
    final percentController = TextEditingController(text: state.percentageStake.toString());
    final initialController = TextEditingController(text: state.initialBankroll.toString());

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
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
            const Text(
              'Bankroll Settings',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: initialController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Initial Bankroll',
                prefixText: '£ ',
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: flatController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Flat Stake Amount',
                prefixText: '£ ',
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: percentController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Percentage Stake',
                suffixText: '%',
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () {
                final flat = double.tryParse(flatController.text);
                final percent = double.tryParse(percentController.text);
                final initial = double.tryParse(initialController.text);

                if (flat != null) ref.read(bankrollProvider.notifier).setFlatStake(flat);
                if (percent != null) ref.read(bankrollProvider.notifier).setPercentageStake(percent);
                if (initial != null) ref.read(bankrollProvider.notifier).setInitialBankroll(initial);

                Navigator.pop(context);
              },
              child: const Text('Save'),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _showAddDepositSheet(BuildContext context, WidgetRef ref) {
    final amountController = TextEditingController();
    final descController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
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
            const Text(
              'Add Deposit',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Amount',
                prefixText: '£ ',
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: descController,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () {
                final amount = double.tryParse(amountController.text);
                if (amount != null && amount > 0) {
                  ref.read(bankrollProvider.notifier).addDeposit(
                    amount,
                    description: descController.text.isEmpty ? null : descController.text,
                  );
                  Navigator.pop(context);
                }
              },
              child: const Text('Add Deposit'),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _showAddWithdrawSheet(BuildContext context, WidgetRef ref) {
    final amountController = TextEditingController();
    final descController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
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
            const Text(
              'Withdraw',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Amount',
                prefixText: '£ ',
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: descController,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () {
                final amount = double.tryParse(amountController.text);
                if (amount != null && amount > 0) {
                  ref.read(bankrollProvider.notifier).addWithdraw(
                    amount,
                    description: descController.text.isEmpty ? null : descController.text,
                  );
                  Navigator.pop(context);
                }
              },
              child: const Text('Withdraw'),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _showAddBetSheet(BuildContext context, WidgetRef ref, BankrollState state) {
    final stakeController = TextEditingController(text: state.suggestedStake.toStringAsFixed(2));
    final oddsController = TextEditingController();
    final descController = TextEditingController();
    String? result;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
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
              const Text(
                'Record Bet Result',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: descController,
                decoration: const InputDecoration(
                  labelText: 'Match/Description',
                  hintText: 'e.g., Arsenal vs Chelsea',
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: stakeController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Stake',
                        prefixText: '£ ',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: oddsController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Odds',
                        prefixText: '@ ',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text('Result', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Won'),
                      selected: result == 'win',
                      selectedColor: Colors.green[100],
                      onSelected: (s) => setModalState(() => result = s ? 'win' : null),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Lost'),
                      selected: result == 'loss',
                      selectedColor: Colors.red[100],
                      onSelected: (s) => setModalState(() => result = s ? 'loss' : null),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Void'),
                      selected: result == 'void',
                      onSelected: (s) => setModalState(() => result = s ? 'void' : null),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: result == null
                    ? null
                    : () {
                        final stake = double.tryParse(stakeController.text);
                        final odds = double.tryParse(oddsController.text);
                        if (stake != null && odds != null && stake > 0 && odds >= 1.01) {
                          ref.read(bankrollProvider.notifier).addBetResult(
                            stake: stake,
                            odds: odds,
                            result: result!,
                            description: descController.text.isEmpty ? null : descController.text,
                          );
                          Navigator.pop(context);
                        }
                      },
                child: const Text('Record Result'),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
