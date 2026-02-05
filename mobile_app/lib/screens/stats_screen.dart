import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../utils/theme.dart';

class StatsScreen extends ConsumerWidget {
  const StatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistics'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Overall accuracy
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    'Overall Accuracy',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 120,
                    width: 120,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          height: 120,
                          width: 120,
                          child: CircularProgressIndicator(
                            value: 0.72,
                            strokeWidth: 12,
                            backgroundColor: Colors.grey.shade200,
                            valueColor: const AlwaysStoppedAnimation<Color>(
                              AppTheme.highConfidence,
                            ),
                          ),
                        ),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '72%',
                              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              '36/50',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _StatItem(label: 'Wins', value: '36', color: Colors.green),
                      _StatItem(label: 'Losses', value: '14', color: Colors.red),
                      _StatItem(label: 'Pending', value: '3', color: Colors.orange),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // ROI by category
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Accuracy by Bet Type',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _CategoryRow(
                    category: 'Home Wins',
                    accuracy: 75,
                    total: 20,
                  ),
                  const SizedBox(height: 8),
                  _CategoryRow(
                    category: 'Away Wins',
                    accuracy: 68,
                    total: 15,
                  ),
                  const SizedBox(height: 8),
                  _CategoryRow(
                    category: 'Over 2.5',
                    accuracy: 78,
                    total: 18,
                  ),
                  const SizedBox(height: 8),
                  _CategoryRow(
                    category: 'BTTS',
                    accuracy: 71,
                    total: 12,
                  ),
                  const SizedBox(height: 8),
                  _CategoryRow(
                    category: 'Double Chance',
                    accuracy: 82,
                    total: 10,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Recent predictions
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Recent Predictions',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _PredictionRow(
                    match: 'Man City vs Arsenal',
                    bet: 'П1',
                    result: true,
                  ),
                  const Divider(),
                  _PredictionRow(
                    match: 'Real Madrid vs Barcelona',
                    bet: 'ТБ2.5',
                    result: true,
                  ),
                  const Divider(),
                  _PredictionRow(
                    match: 'Bayern vs Dortmund',
                    bet: 'П1',
                    result: false,
                  ),
                  const Divider(),
                  _PredictionRow(
                    match: 'Inter vs Milan',
                    bet: 'BTTS',
                    result: true,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatItem({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            color: color,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

class _CategoryRow extends StatelessWidget {
  final String category;
  final int accuracy;
  final int total;

  const _CategoryRow({
    required this.category,
    required this.accuracy,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          flex: 2,
          child: Text(category),
        ),
        Expanded(
          flex: 3,
          child: LinearProgressIndicator(
            value: accuracy / 100,
            backgroundColor: Colors.grey.shade200,
            valueColor: AlwaysStoppedAnimation<Color>(
              AppTheme.getConfidenceColor(accuracy.toDouble()),
            ),
          ),
        ),
        const SizedBox(width: 12),
        SizedBox(
          width: 50,
          child: Text(
            '$accuracy%',
            textAlign: TextAlign.right,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: AppTheme.getConfidenceColor(accuracy.toDouble()),
            ),
          ),
        ),
      ],
    );
  }
}

class _PredictionRow extends StatelessWidget {
  final String match;
  final String bet;
  final bool result;

  const _PredictionRow({
    required this.match,
    required this.bet,
    required this.result,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          result ? Icons.check_circle : Icons.cancel,
          color: result ? Colors.green : Colors.red,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(match),
              Text(
                bet,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
