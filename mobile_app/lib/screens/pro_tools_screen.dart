import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';

class ProToolsScreen extends ConsumerWidget {
  const ProToolsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;
    final isPremium = user?.isPremium ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pro Tools'),
        actions: [
          if (!isPremium)
            TextButton.icon(
              onPressed: () => context.push('/premium'),
              icon: const Icon(Icons.workspace_premium, color: Colors.amber),
              label: const Text('Upgrade', style: TextStyle(color: Colors.amber)),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Premium status card
            if (isPremium)
              _PremiumStatusCard(user: user)
            else
              _UpgradeCard(onUpgrade: () => context.push('/premium')),

            const SizedBox(height: 24),

            // Tools section
            Text(
              'Betting Tools',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 12),

            // Kelly Calculator
            _ToolCard(
              icon: Icons.calculate,
              title: 'Kelly Calculator',
              description: 'Calculate optimal bet size based on edge and bankroll',
              isPremium: true,
              isLocked: !isPremium,
              onTap: isPremium ? () => _showKellyCalculator(context) : null,
            ),

            // Value Bet Finder
            _ToolCard(
              icon: Icons.search,
              title: 'Value Bet Finder',
              description: 'AI-powered analysis to find valuable betting opportunities',
              isPremium: true,
              isLocked: !isPremium,
              onTap: isPremium ? () => context.push('/chat') : null,
            ),

            // Odds Converter
            _ToolCard(
              icon: Icons.swap_horiz,
              title: 'Odds Converter',
              description: 'Convert between decimal, fractional, and American odds',
              isPremium: false,
              isLocked: false,
              onTap: () => _showOddsConverter(context),
            ),

            // Bankroll Tracker
            _ToolCard(
              icon: Icons.account_balance_wallet,
              title: 'Bankroll Tracker',
              description: 'Track your betting bankroll and performance',
              isPremium: true,
              isLocked: !isPremium,
              onTap: isPremium ? () => context.push('/bankroll') : null,
            ),

            // Bet History
            _ToolCard(
              icon: Icons.history,
              title: 'Prediction History',
              description: 'View all your past AI predictions and their results',
              isPremium: true,
              isLocked: !isPremium,
              onTap: isPremium ? () => context.push('/favorites') : null,
            ),

            const SizedBox(height: 24),

            // Premium features list
            if (!isPremium) ...[
              Text(
                'Premium Benefits',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 12),
              _BenefitItem(
                icon: Icons.all_inclusive,
                title: 'Unlimited AI Predictions',
                description: 'No daily limits on AI queries',
              ),
              _BenefitItem(
                icon: Icons.bolt,
                title: 'Priority Response',
                description: 'Faster AI response times',
              ),
              _BenefitItem(
                icon: Icons.analytics,
                title: 'Advanced Analytics',
                description: 'Detailed stats and performance tracking',
              ),
              _BenefitItem(
                icon: Icons.support_agent,
                title: 'Priority Support',
                description: '24/7 premium customer support',
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.push('/premium'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.amber,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text(
                    'Upgrade to Premium',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showKellyCalculator(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => const _KellyCalculatorSheet(),
    );
  }

  void _showOddsConverter(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => const _OddsConverterSheet(),
    );
  }
}

class _PremiumStatusCard extends StatelessWidget {
  final dynamic user;

  const _PremiumStatusCard({required this.user});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFD700), Color(0xFFFFA500)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.amber.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.workspace_premium,
              color: Colors.white,
              size: 32,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Premium Active',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Unlimited AI predictions',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.check_circle, color: Colors.white, size: 28),
        ],
      ),
    );
  }
}

class _UpgradeCard extends StatelessWidget {
  final VoidCallback onUpgrade;

  const _UpgradeCard({required this.onUpgrade});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.amber.withOpacity(0.5)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.lock_outline,
              color: Colors.amber,
              size: 32,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Free Plan',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Upgrade to unlock all pro tools',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: onUpgrade,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.amber,
              foregroundColor: Colors.black,
            ),
            child: const Text('Upgrade'),
          ),
        ],
      ),
    );
  }
}

class _ToolCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final bool isPremium;
  final bool isLocked;
  final VoidCallback? onTap;

  const _ToolCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.isPremium,
    required this.isLocked,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: isLocked ? null : onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isLocked
                      ? Colors.grey.withOpacity(0.1)
                      : Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: isLocked
                      ? Colors.grey
                      : Theme.of(context).colorScheme.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: isLocked ? Colors.grey : null,
                          ),
                        ),
                        if (isPremium) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.amber.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'PRO',
                              style: TextStyle(
                                color: Colors.amber,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                isLocked ? Icons.lock : Icons.chevron_right,
                color: isLocked ? Colors.grey : Colors.grey[400],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BenefitItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _BenefitItem({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.amber.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.amber, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  description,
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Kelly Calculator Bottom Sheet
class _KellyCalculatorSheet extends StatefulWidget {
  const _KellyCalculatorSheet();

  @override
  State<_KellyCalculatorSheet> createState() => _KellyCalculatorSheetState();
}

class _KellyCalculatorSheetState extends State<_KellyCalculatorSheet> {
  final _oddsController = TextEditingController();
  final _probabilityController = TextEditingController();
  final _bankrollController = TextEditingController();
  double? _result;

  void _calculate() {
    final odds = double.tryParse(_oddsController.text);
    final probability = double.tryParse(_probabilityController.text);
    final bankroll = double.tryParse(_bankrollController.text);

    if (odds != null && probability != null && bankroll != null) {
      final prob = probability / 100;
      final q = 1 - prob;
      final b = odds - 1;
      final kelly = (b * prob - q) / b;

      setState(() {
        _result = kelly > 0 ? kelly * bankroll : 0;
      });
    }
  }

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Kelly Calculator',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Calculate optimal bet size based on your edge',
            style: TextStyle(color: Colors.grey[600]),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _oddsController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Decimal Odds',
              hintText: 'e.g., 2.50',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _probabilityController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Win Probability (%)',
              hintText: 'e.g., 50',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _bankrollController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Bankroll',
              hintText: 'e.g., 1000',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _calculate,
              child: const Text('Calculate'),
            ),
          ),
          if (_result != null) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Recommended Bet:',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                  Text(
                    '\$${_result!.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 20,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}

// Odds Converter Bottom Sheet
class _OddsConverterSheet extends StatefulWidget {
  const _OddsConverterSheet();

  @override
  State<_OddsConverterSheet> createState() => _OddsConverterSheetState();
}

class _OddsConverterSheetState extends State<_OddsConverterSheet> {
  final _controller = TextEditingController();
  String _selectedFormat = 'decimal';
  Map<String, String> _results = {};

  void _convert() {
    final value = double.tryParse(_controller.text);
    if (value == null) return;

    double decimal;

    switch (_selectedFormat) {
      case 'decimal':
        decimal = value;
        break;
      case 'american':
        if (value > 0) {
          decimal = (value / 100) + 1;
        } else {
          decimal = (100 / value.abs()) + 1;
        }
        break;
      case 'fractional':
        decimal = value + 1;
        break;
      default:
        decimal = value;
    }

    // Convert to all formats
    final american = decimal >= 2
        ? '+${((decimal - 1) * 100).round()}'
        : '-${(100 / (decimal - 1)).round()}';
    final fractional = '${((decimal - 1) * 100).round()}/100';
    final impliedProbability = (1 / decimal * 100).toStringAsFixed(1);

    setState(() {
      _results = {
        'Decimal': decimal.toStringAsFixed(2),
        'American': american,
        'Fractional': fractional,
        'Implied Prob.': '$impliedProbability%',
      };
    });
  }

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Odds Converter',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 20),
          DropdownButtonFormField<String>(
            value: _selectedFormat,
            decoration: const InputDecoration(
              labelText: 'Input Format',
              border: OutlineInputBorder(),
            ),
            items: const [
              DropdownMenuItem(value: 'decimal', child: Text('Decimal')),
              DropdownMenuItem(value: 'american', child: Text('American')),
              DropdownMenuItem(value: 'fractional', child: Text('Fractional')),
            ],
            onChanged: (value) => setState(() => _selectedFormat = value!),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Enter Odds',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _convert,
              child: const Text('Convert'),
            ),
          ),
          if (_results.isNotEmpty) ...[
            const SizedBox(height: 20),
            ...(_results.entries.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(e.key, style: TextStyle(color: Colors.grey[600])),
                      Text(
                        e.value,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ))),
          ],
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}
