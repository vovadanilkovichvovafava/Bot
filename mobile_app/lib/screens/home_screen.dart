import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../providers/auth_provider.dart';
import '../providers/matches_provider.dart';
import '../providers/live_matches_provider.dart';
import '../models/match.dart';
import '../widgets/stats_card.dart';
import '../widgets/loading_shimmer.dart';
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
      ref.read(liveMatchesProvider.notifier).startLiveUpdates();
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;
    final matchesState = ref.watch(matchesProvider);
    final todayMatches = matchesState.todayMatches;
    final liveMatchesState = ref.watch(liveMatchesProvider);
    final liveMatches = liveMatchesState.matches;

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
                '${user.remainingPredictions} predictions left today',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Live matches banner
            if (liveMatches.isNotEmpty) ...[
              _LiveMatchesBanner(
                liveCount: liveMatches.length,
                onTap: () => context.push('/live'),
              ),
              const SizedBox(height: 16),
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

            // Betting Tools section
            Text(
              'Betting Tools',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _ToolCard(
                    icon: Icons.calculate,
                    title: 'Value Bet',
                    subtitle: 'Find value bets',
                    color: Colors.green,
                    onTap: () => context.push('/calculators'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _ToolCard(
                    icon: Icons.account_balance_wallet,
                    title: 'Bankroll',
                    subtitle: 'Track stakes',
                    color: Colors.blue,
                    onTap: () => context.push('/bankroll'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _ToolCard(
                    icon: Icons.people,
                    title: 'Community',
                    subtitle: 'Leaderboards & tips',
                    color: Colors.purple,
                    onTap: () => context.push('/social'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _ToolCard(
                    icon: Icons.star_border,
                    title: 'Favourites',
                    subtitle: 'Saved teams',
                    color: Colors.orange,
                    onTap: () => context.go('/favorites'),
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
              ...List.generate(3, (_) => const Padding(
                padding: EdgeInsets.only(bottom: 8),
                child: MatchCardShimmer(),
              ))
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
                        onPressed: () => ref.read(matchesProvider.notifier).loadTodayMatches(forceRefresh: true),
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

class _ToolCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _ToolCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.grey[400]),
            ],
          ),
        ),
      ),
    );
  }
}

class _LiveMatchesBanner extends StatefulWidget {
  final int liveCount;
  final VoidCallback onTap;

  const _LiveMatchesBanner({
    required this.liveCount,
    required this.onTap,
  });

  @override
  State<_LiveMatchesBanner> createState() => _LiveMatchesBannerState();
}

class _LiveMatchesBannerState extends State<_LiveMatchesBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 0.4).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
    _controller.repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        return Card(
          color: Colors.red.shade50,
          elevation: 2,
          child: InkWell(
            onTap: widget.onTap,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(_pulseAnimation.value),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.red.withOpacity(0.4 * _pulseAnimation.value),
                          blurRadius: 8,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Live Now',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.red,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          '${widget.liveCount} ${widget.liveCount == 1 ? 'match' : 'matches'} in progress',
                          style: TextStyle(
                            color: Colors.red.shade700,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.arrow_forward_ios,
                    color: Colors.red.shade400,
                    size: 18,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
