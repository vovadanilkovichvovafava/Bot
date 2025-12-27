import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../providers/auth_provider.dart';
import '../providers/matches_provider.dart';
import '../models/match.dart';
import '../widgets/stats_card.dart';
import 'match_detail_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    // Load matches when home screen opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(matchesProvider.notifier).loadTodayMatches();
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;
    final matchesState = ref.watch(matchesProvider);
    final todayMatches = matchesState.todayMatches;

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Betting Bot'),
        actions: [
          if (user != null && user.isPremium)
            const Padding(
              padding: EdgeInsets.only(right: 8),
              child: Row(
                children: [
                  Icon(Icons.star, color: Colors.amber, size: 20),
                  SizedBox(width: 4),
                  Text('Premium', style: TextStyle(color: Colors.amber)),
                ],
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(authStateProvider.notifier).refreshUser();
          await ref.read(matchesProvider.notifier).loadTodayMatches();
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
                    ? '${user.remainingPredictions} predictions left today'
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

            // Real matches from API
            if (matchesState.isLoading && todayMatches.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (todayMatches.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      const Icon(Icons.sports_soccer, size: 48, color: Colors.grey),
                      const SizedBox(height: 8),
                      const Text('No matches today'),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () => ref.read(matchesProvider.notifier).loadTodayMatches(),
                        child: const Text('Refresh'),
                      ),
                    ],
                  ),
                ),
              )
            else
              ...todayMatches.take(3).map((match) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _HomeMatchCard(match: match),
              )),
          ],
        ),
      ),
    );
  }
}

class _HomeMatchCard extends StatelessWidget {
  final Match match;

  const _HomeMatchCard({required this.match});

  @override
  Widget build(BuildContext context) {
    final timeFormat = DateFormat('HH:mm');
    final matchTime = timeFormat.format(match.matchDate.toLocal());

    return Card(
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => MatchDetailScreen(match: match),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    match.league,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.w500,
                      fontSize: 12,
                    ),
                  ),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: _getStatusColor(match.status).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          _getStatusText(match.status),
                          style: TextStyle(
                            color: _getStatusColor(match.status),
                            fontWeight: FontWeight.w600,
                            fontSize: 11,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        matchTime,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          match.homeTeam.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          match.awayTeam.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Show score if available, otherwise show chevron
                  if (match.homeScore != null && match.awayScore != null)
                    Column(
                      children: [
                        Text(
                          '${match.homeScore}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                        ),
                        Text(
                          '${match.awayScore}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                        ),
                      ],
                    )
                  else
                    Icon(
                      Icons.chevron_right,
                      color: Colors.grey[400],
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'live':
      case 'in_play':
        return Colors.red;
      case 'finished':
        return Colors.green;
      default:
        return Colors.orange;
    }
  }

  String _getStatusText(String status) {
    switch (status.toLowerCase()) {
      case 'live':
      case 'in_play':
        return 'LIVE';
      case 'finished':
        return 'FT';
      case 'scheduled':
      case 'timed':
        return 'Soon';
      default:
        return status.toUpperCase();
    }
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
