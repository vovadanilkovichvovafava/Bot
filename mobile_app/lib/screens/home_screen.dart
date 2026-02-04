import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../utils/theme.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await ref.read(authStateProvider.notifier).refreshUser();
          },
          color: AppTheme.primaryColor,
          backgroundColor: AppTheme.darkCard,
          child: CustomScrollView(
            slivers: [
              // Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Top row - Logo and Premium
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // Logo/Title
                          Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  gradient: AppTheme.neonGradient,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: AppTheme.neonGlow(
                                    AppTheme.primaryColor,
                                    blur: 15,
                                    spread: 1,
                                  ),
                                ),
                                child: const Center(
                                  child: Icon(
                                    Icons.smart_toy,
                                    color: Colors.black,
                                    size: 22,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              const Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'AI Betting Bot',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  Text(
                                    'MATCH ANALYSIS',
                                    style: TextStyle(
                                      color: AppTheme.primaryColor,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      letterSpacing: 1.5,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          // Premium button
                          if (user != null && !user.isPremium)
                            GestureDetector(
                              onTap: () => context.push('/premium'),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  gradient: AppTheme.goldGradient,
                                  borderRadius: BorderRadius.circular(20),
                                  boxShadow: AppTheme.neonGlow(
                                    AppTheme.fc26Gold,
                                    blur: 10,
                                    spread: 0,
                                  ),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.star,
                                      color: Colors.black,
                                      size: 16,
                                    ),
                                    SizedBox(width: 4),
                                    Text(
                                      'PRO',
                                      style: TextStyle(
                                        color: Colors.black,
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Greeting
                      if (user != null) ...[
                        Text(
                          'Welcome back,',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.6),
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user.username ?? 'Player',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        // Predictions remaining
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.darkSurface,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppTheme.darkBorder),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                user.isPremium ? Icons.all_inclusive : Icons.bolt,
                                color: user.isPremium ? AppTheme.fc26Gold : AppTheme.primaryColor,
                                size: 16,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                user.isPremium
                                    ? 'Unlimited predictions'
                                    : '${user.remainingPredictions} predictions left',
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.8),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              // Stats Overview Card
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: _StatsOverviewCard(),
                ),
              ),

              // Quick Actions Title
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                  child: Text(
                    'QUICK ACCESS',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.5),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
              ),

              // Quick Action Cards
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 100,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    children: [
                      _QuickActionCard(
                        icon: Icons.sports_soccer,
                        label: "Today's Matches",
                        color: AppTheme.primaryColor,
                        onTap: () => context.go('/matches'),
                      ),
                      const SizedBox(width: 12),
                      _QuickActionCard(
                        icon: Icons.trending_up,
                        label: 'Hot Picks',
                        color: AppTheme.neonPink,
                        onTap: () => context.go('/matches'),
                      ),
                      const SizedBox(width: 12),
                      _QuickActionCard(
                        icon: Icons.emoji_events,
                        label: 'Top Leagues',
                        color: AppTheme.fc26Gold,
                        onTap: () => context.go('/matches'),
                      ),
                      const SizedBox(width: 12),
                      _QuickActionCard(
                        icon: Icons.bar_chart,
                        label: 'Statistics',
                        color: AppTheme.neonGreen,
                        onTap: () => context.go('/stats'),
                      ),
                    ],
                  ),
                ),
              ),

              // Featured Predictions Title
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'TOP PREDICTIONS',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => context.go('/matches'),
                        child: const Text(
                          'See all',
                          style: TextStyle(
                            color: AppTheme.primaryColor,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Featured Matches
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _FeaturedMatchCard(
                      homeTeam: 'Manchester City',
                      awayTeam: 'Arsenal',
                      league: 'Premier League',
                      time: '17:30',
                      confidence: 78,
                      prediction: 'Over 2.5',
                      onTap: () => context.push('/match/1'),
                    ),
                    const SizedBox(height: 12),
                    _FeaturedMatchCard(
                      homeTeam: 'Real Madrid',
                      awayTeam: 'Barcelona',
                      league: 'La Liga',
                      time: '21:00',
                      confidence: 72,
                      prediction: 'BTTS Yes',
                      onTap: () => context.push('/match/2'),
                    ),
                    const SizedBox(height: 12),
                    _FeaturedMatchCard(
                      homeTeam: 'Bayern Munich',
                      awayTeam: 'Dortmund',
                      league: 'Bundesliga',
                      time: '18:30',
                      confidence: 85,
                      prediction: 'Home Win',
                      onTap: () => context.push('/match/3'),
                    ),
                    const SizedBox(height: 100), // Bottom padding for nav bar
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatsOverviewCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppTheme.darkCard,
            AppTheme.darkSurface.withOpacity(0.5),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppTheme.primaryColor.withOpacity(0.3),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withOpacity(0.1),
            blurRadius: 20,
            spreadRadius: 0,
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Performance',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.highConfidence.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Icon(
                      Icons.trending_up,
                      color: AppTheme.highConfidence,
                      size: 14,
                    ),
                    SizedBox(width: 4),
                    Text(
                      '+5.2%',
                      style: TextStyle(
                        color: AppTheme.highConfidence,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _StatItem(
                value: '72%',
                label: 'Win Rate',
                color: AppTheme.highConfidence,
              ),
              Container(
                width: 1,
                height: 40,
                color: AppTheme.darkBorder,
              ),
              _StatItem(
                value: '156',
                label: 'Total Bets',
                color: AppTheme.primaryColor,
              ),
              Container(
                width: 1,
                height: 40,
                color: AppTheme.darkBorder,
              ),
              _StatItem(
                value: '112',
                label: 'Wins',
                color: AppTheme.fc26Gold,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String value;
  final String label;
  final Color color;

  const _StatItem({
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withOpacity(0.5),
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 100,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.darkCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: color.withOpacity(0.3),
            width: 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: color,
                size: 22,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white.withOpacity(0.8),
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class _FeaturedMatchCard extends StatelessWidget {
  final String homeTeam;
  final String awayTeam;
  final String league;
  final String time;
  final int confidence;
  final String prediction;
  final VoidCallback onTap;

  const _FeaturedMatchCard({
    required this.homeTeam,
    required this.awayTeam,
    required this.league,
    required this.time,
    required this.confidence,
    required this.prediction,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final confidenceColor = AppTheme.getConfidenceColor(confidence.toDouble());

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.darkCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppTheme.darkBorder,
            width: 1,
          ),
        ),
        child: Row(
          children: [
            // Teams info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // League and time
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          league,
                          style: const TextStyle(
                            color: AppTheme.primaryColor,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(
                        Icons.access_time,
                        size: 12,
                        color: Colors.white.withOpacity(0.4),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        time,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.4),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Teams
                  Text(
                    homeTeam,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Text(
                        'vs',
                        style: TextStyle(
                          color: AppTheme.primaryColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        awayTeam,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.7),
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Confidence badge
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 12,
              ),
              decoration: BoxDecoration(
                color: confidenceColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: confidenceColor.withOpacity(0.5),
                  width: 1,
                ),
              ),
              child: Column(
                children: [
                  Text(
                    '$confidence%',
                    style: TextStyle(
                      color: confidenceColor,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    prediction,
                    style: TextStyle(
                      color: confidenceColor.withOpacity(0.8),
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
