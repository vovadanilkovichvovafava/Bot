import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../providers/auth_provider.dart';
import '../providers/matches_provider.dart';
import '../providers/live_matches_provider.dart';
import '../providers/settings_provider.dart';
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
  bool _showWelcomeGuide = false;
  bool _predictionsTooltipShown = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(matchesProvider.notifier).loadTodayMatches();
      ref.read(liveMatchesProvider.notifier).startLiveUpdates();
      _checkFirstVisit();
    });
  }

  Future<void> _checkFirstVisit() async {
    final prefs = await SharedPreferences.getInstance();
    final hasSeenGuide = prefs.getBool('home_guide_seen') ?? false;
    if (!hasSeenGuide && mounted) {
      setState(() => _showWelcomeGuide = true);
    }
  }

  Future<void> _dismissGuide() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('home_guide_seen', true);
    setState(() => _showWelcomeGuide = false);
  }

  void _showPredictionsInfo(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.info_outline, color: Colors.blue),
            SizedBox(width: 8),
            Text('Daily Predictions'),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'You get 10 free AI predictions every day!',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 12),
            Text('• Each AI analysis for a match uses 1 prediction'),
            SizedBox(height: 4),
            Text('• Predictions reset at midnight (your timezone)'),
            SizedBox(height: 4),
            Text('• Match browsing and calculators are unlimited'),
            SizedBox(height: 12),
            Text(
              '⭐ Upgrade to Premium for unlimited predictions!',
              style: TextStyle(color: Colors.amber),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it!'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              context.push('/premium');
            },
            child: const Text('See Premium'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;
    final matchesState = ref.watch(matchesProvider);
    final todayMatches = matchesState.todayMatches;
    final liveMatchesState = ref.watch(liveMatchesProvider);
    final liveMatches = liveMatchesState.matches;
    final settings = ref.watch(settingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Betting Assistant'),
        actions: [
          if (user != null && user.isPremium)
            Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.amber.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(Icons.star, color: Colors.amber, size: 16),
                  SizedBox(width: 4),
                  Text('PRO', style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 12)),
                ],
              ),
            ),
        ],
      ),
      body: Stack(
        children: [
          RefreshIndicator(
            onRefresh: () async {
              await ref.read(authStateProvider.notifier).refreshUser();
              await ref.read(matchesProvider.notifier).loadTodayMatches();
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // User greeting with predictions info
                if (user != null) ...[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Hello, ${user.username ?? 'User'}!',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 4),
                            // Predictions left with tooltip
                            GestureDetector(
                              onTap: () => _showPredictionsInfo(context),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.primaryContainer,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.psychology,
                                      size: 16,
                                      color: Theme.of(context).colorScheme.primary,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      '${user.remainingPredictions} predictions left',
                                      style: TextStyle(
                                        color: Theme.of(context).colorScheme.primary,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Icon(
                                      Icons.help_outline,
                                      size: 14,
                                      color: Theme.of(context).colorScheme.primary,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Settings indicator
                      GestureDetector(
                        onTap: () => context.go('/settings'),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.grey.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            children: [
                              Icon(
                                _getRiskIcon(settings.riskLevel),
                                size: 20,
                                color: _getRiskColor(settings.riskLevel),
                              ),
                              Text(
                                settings.riskLevel.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: _getRiskColor(settings.riskLevel),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                ],

                // AI Quick Action - Prominent
                _AskAICard(
                  onTap: () => context.go('/chat'),
                ),
                const SizedBox(height: 16),

                // Live matches banner
                if (liveMatches.isNotEmpty) ...[
                  _LiveMatchesBanner(
                    liveCount: liveMatches.length,
                    onTap: () => context.push('/live'),
                  ),
                  const SizedBox(height: 16),
                ],

                // Quick stats with link to full stats
                GestureDetector(
                  onTap: () => context.go('/stats'),
                  child: const StatsCard(),
                ),
                const SizedBox(height: 20),

                // Smart Shortcuts
                Text(
                  'Quick Start',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _SmartChip(
                        icon: Icons.today,
                        label: "Today's Matches",
                        onTap: () => context.go('/matches'),
                      ),
                      const SizedBox(width: 8),
                      _SmartChip(
                        icon: Icons.bookmark,
                        label: 'My Predictions',
                        onTap: () => context.go('/stats'),
                      ),
                      const SizedBox(width: 8),
                      _SmartChip(
                        icon: Icons.calculate,
                        label: 'Value Bet Calc',
                        onTap: () => context.push('/calculators'),
                      ),
                      const SizedBox(width: 8),
                      _SmartChip(
                        icon: Icons.account_balance_wallet,
                        label: 'Bankroll',
                        onTap: () => context.push('/bankroll'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Today's top matches
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "Today's Top Matches",
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () => context.go('/matches'),
                      icon: const Icon(Icons.arrow_forward, size: 16),
                      label: const Text('All'),
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
                  _EmptyMatchesCard(
                    onRefresh: () => ref.read(matchesProvider.notifier).loadTodayMatches(forceRefresh: true),
                    onViewTomorrow: () => context.go('/matches'),
                  )
                else
                  ...todayMatches.take(3).map((match) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _HomeMatchCard(match: match),
                  )),

                const SizedBox(height: 80), // Space for welcome guide
              ],
            ),
          ),

          // Welcome Guide Overlay
          if (_showWelcomeGuide)
            _WelcomeGuide(onDismiss: _dismissGuide),
        ],
      ),
    );
  }

  IconData _getRiskIcon(String risk) {
    switch (risk.toLowerCase()) {
      case 'low': return Icons.shield;
      case 'high': return Icons.trending_up;
      default: return Icons.balance;
    }
  }

  Color _getRiskColor(String risk) {
    switch (risk.toLowerCase()) {
      case 'low': return Colors.green;
      case 'high': return Colors.red;
      default: return Colors.orange;
    }
  }
}

// Ask AI Card - Main action
class _AskAICard extends StatelessWidget {
  final VoidCallback onTap;

  const _AskAICard({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      elevation: 0,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.psychology,
                  color: Theme.of(context).colorScheme.primary,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Ask AI Assistant',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Get predictions, tips & match analysis',
                      style: TextStyle(
                        fontSize: 13,
                        color: Theme.of(context).colorScheme.onPrimaryContainer.withOpacity(0.7),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.arrow_forward_ios,
                color: Theme.of(context).colorScheme.primary,
                size: 18,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Smart Chip for quick actions
class _SmartChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _SmartChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
      onPressed: onTap,
    );
  }
}

// Empty matches card with actions
class _EmptyMatchesCard extends StatelessWidget {
  final VoidCallback onRefresh;
  final VoidCallback onViewTomorrow;

  const _EmptyMatchesCard({
    required this.onRefresh,
    required this.onViewTomorrow,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(Icons.sports_soccer, size: 48, color: Colors.grey),
            const SizedBox(height: 12),
            const Text(
              'No matches scheduled today',
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 4),
            Text(
              'Check tomorrow or browse all leagues',
              style: TextStyle(color: Colors.grey[600], fontSize: 13),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton.icon(
                  onPressed: onRefresh,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('Refresh'),
                ),
                const SizedBox(width: 12),
                FilledButton.icon(
                  onPressed: onViewTomorrow,
                  icon: const Icon(Icons.event, size: 18),
                  label: const Text('View All'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// Welcome Guide for first-time users
class _WelcomeGuide extends StatelessWidget {
  final VoidCallback onDismiss;

  const _WelcomeGuide({required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.blue.shade700,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Icon(Icons.waving_hand, color: Colors.amber, size: 24),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Welcome! Here\'s how to start:',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white70),
                  onPressed: onDismiss,
                  constraints: const BoxConstraints(),
                  padding: EdgeInsets.zero,
                ),
              ],
            ),
            const SizedBox(height: 12),
            const _GuideStep(
              number: '1',
              text: 'Tap "Ask AI" to get match predictions',
            ),
            const _GuideStep(
              number: '2',
              text: 'Browse matches and save your favourites',
            ),
            const _GuideStep(
              number: '3',
              text: 'Track your success in Stats tab',
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: onDismiss,
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.blue.shade700,
                ),
                child: const Text('Got it, let\'s go!'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GuideStep extends StatelessWidget {
  final String number;
  final String text;

  const _GuideStep({required this.number, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                number,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            text,
            style: const TextStyle(color: Colors.white, fontSize: 14),
          ),
        ],
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
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Icons.psychology,
                        color: Theme.of(context).colorScheme.primary,
                        size: 20,
                      ),
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
        return 'Upcoming';
      default:
        return status.toUpperCase();
    }
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
