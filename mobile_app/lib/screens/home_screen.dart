import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../widgets/match_card.dart';
import '../widgets/stats_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Betting Bot'),
        actions: [
          if (user != null && !user.isPremium)
            TextButton.icon(
              onPressed: () => context.push('/premium'),
              icon: const Icon(Icons.star, color: Colors.amber),
              label: const Text('Premium'),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(authStateProvider.notifier).refreshUser();
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // User greeting
            if (user != null) ...[
              Text(
                'Hello, ${user.username ?? 'User'}!',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 4),
              Text(
                user.isPremium
                    ? 'Premium member'
                    : '${user.remainingPredictions} predictions left today',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Quick stats
            const StatsCard(),
            const SizedBox(height: 24),

            // Quick actions
            Text(
              'Quick Actions',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _ActionButton(
                    icon: Icons.today,
                    label: 'Today',
                    onTap: () => context.go('/matches'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _ActionButton(
                    icon: Icons.event,
                    label: 'Tomorrow',
                    onTap: () => context.go('/matches'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _ActionButton(
                    icon: Icons.emoji_events,
                    label: 'Leagues',
                    onTap: () => context.go('/matches'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Today's top matches
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Today's Matches",
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                TextButton(
                  onPressed: () => context.go('/matches'),
                  child: const Text('See all'),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Placeholder for matches
            const MatchCard(
              homeTeam: 'Manchester City',
              awayTeam: 'Arsenal',
              competition: 'Premier League',
              time: '17:30',
              confidence: 72,
            ),
            const SizedBox(height: 8),
            const MatchCard(
              homeTeam: 'Real Madrid',
              awayTeam: 'Barcelona',
              competition: 'La Liga',
              time: '21:00',
              confidence: 68,
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            children: [
              Icon(icon, size: 28),
              const SizedBox(height: 4),
              Text(label, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}
