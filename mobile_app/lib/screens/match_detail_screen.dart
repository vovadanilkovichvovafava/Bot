import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../utils/theme.dart';

class MatchDetailScreen extends ConsumerWidget {
  final int matchId;

  const MatchDetailScreen({super.key, required this.matchId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // TODO: Fetch match details from API

    return Scaffold(
      appBar: AppBar(
        title: const Text('Match Analysis'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Match header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    'Premier League',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      Expanded(
                        child: Column(
                          children: [
                            const CircleAvatar(
                              radius: 30,
                              child: Icon(Icons.sports_soccer, size: 30),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Manchester City',
                              style: Theme.of(context).textTheme.titleMedium,
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                      Column(
                        children: [
                          Text(
                            'VS',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '17:30',
                            style: Theme.of(context).textTheme.bodyLarge,
                          ),
                        ],
                      ),
                      Expanded(
                        child: Column(
                          children: [
                            const CircleAvatar(
                              radius: 30,
                              child: Icon(Icons.sports_soccer, size: 30),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Arsenal',
                              style: Theme.of(context).textTheme.titleMedium,
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // AI Prediction
          Card(
            color: AppTheme.highConfidence.withOpacity(0.1),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.psychology, color: AppTheme.highConfidence),
                      const SizedBox(width: 8),
                      Text(
                        'AI Prediction',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Main Bet',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                            Text(
                              'Home Win (П1)',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppTheme.highConfidence,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '72%',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Manchester City has been dominant at home, winning 8 of their last 10 matches. Arsenal has struggled away this season.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Alternative bet
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Alternative Bet',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Over 2.5 Goals',
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.mediumConfidence.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '68%',
                          style: TextStyle(
                            color: AppTheme.mediumConfidence,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Form comparison
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Recent Form',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _FormRow(team: 'Manchester City', form: 'WWDWW'),
                  const SizedBox(height: 8),
                  _FormRow(team: 'Arsenal', form: 'WDLWW'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Get prediction button
          FilledButton.icon(
            onPressed: () {
              // TODO: Get full prediction
            },
            icon: const Icon(Icons.psychology),
            label: const Text('Get Full Analysis'),
          ),
        ],
      ),
    );
  }
}

class _FormRow extends StatelessWidget {
  final String team;
  final String form;

  const _FormRow({required this.team, required this.form});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(team),
        ),
        Row(
          children: form.split('').map((r) {
            Color color;
            switch (r) {
              case 'W':
                color = Colors.green;
                break;
              case 'D':
                color = Colors.orange;
                break;
              case 'L':
                color = Colors.red;
                break;
              default:
                color = Colors.grey;
            }
            return Container(
              width: 24,
              height: 24,
              margin: const EdgeInsets.only(left: 4),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(4),
              ),
              alignment: Alignment.center,
              child: Text(
                r,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
