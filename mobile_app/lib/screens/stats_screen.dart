import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../utils/theme.dart';

class StatsScreen extends ConsumerWidget {
  const StatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Statistics',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    // Period selector
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.darkCard,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.darkBorder),
                      ),
                      child: Row(
                        children: [
                          Text(
                            'Last 30 days',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.8),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.keyboard_arrow_down,
                            color: Colors.white.withOpacity(0.5),
                            size: 18,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Overall accuracy card
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _AccuracyCard(),
              ),
            ),

            // Quick stats row
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    Expanded(
                      child: _QuickStatCard(
                        label: 'Wins',
                        value: '36',
                        icon: Icons.check_circle,
                        color: AppTheme.highConfidence,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickStatCard(
                        label: 'Losses',
                        value: '14',
                        icon: Icons.cancel,
                        color: AppTheme.errorColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickStatCard(
                        label: 'Pending',
                        value: '3',
                        icon: Icons.schedule,
                        color: AppTheme.warningColor,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Accuracy by bet type
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: Text(
                  'ACCURACY BY BET TYPE',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.5),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.darkCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.darkBorder),
                  ),
                  child: Column(
                    children: [
                      _BetTypeRow(
                        betType: 'Home Win',
                        accuracy: 75,
                        total: 20,
                      ),
                      const SizedBox(height: 16),
                      _BetTypeRow(
                        betType: 'Away Win',
                        accuracy: 68,
                        total: 15,
                      ),
                      const SizedBox(height: 16),
                      _BetTypeRow(
                        betType: 'Over 2.5',
                        accuracy: 78,
                        total: 18,
                      ),
                      const SizedBox(height: 16),
                      _BetTypeRow(
                        betType: 'BTTS',
                        accuracy: 71,
                        total: 12,
                      ),
                      const SizedBox(height: 16),
                      _BetTypeRow(
                        betType: 'Double Chance',
                        accuracy: 82,
                        total: 10,
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Recent predictions title
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                child: Text(
                  'RECENT PREDICTIONS',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.5),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
            ),

            // Recent predictions list
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  _RecentPredictionCard(
                    homeTeam: 'Man City',
                    awayTeam: 'Arsenal',
                    prediction: 'Home Win',
                    isWin: true,
                    date: 'Today',
                  ),
                  const SizedBox(height: 12),
                  _RecentPredictionCard(
                    homeTeam: 'Real Madrid',
                    awayTeam: 'Barcelona',
                    prediction: 'Over 2.5',
                    isWin: true,
                    date: 'Yesterday',
                  ),
                  const SizedBox(height: 12),
                  _RecentPredictionCard(
                    homeTeam: 'Bayern',
                    awayTeam: 'Dortmund',
                    prediction: 'Home Win',
                    isWin: false,
                    date: 'Yesterday',
                  ),
                  const SizedBox(height: 12),
                  _RecentPredictionCard(
                    homeTeam: 'Inter',
                    awayTeam: 'Milan',
                    prediction: 'BTTS Yes',
                    isWin: true,
                    date: '2 days ago',
                  ),
                  const SizedBox(height: 12),
                  _RecentPredictionCard(
                    homeTeam: 'Liverpool',
                    awayTeam: 'Chelsea',
                    prediction: 'Over 2.5',
                    isWin: true,
                    date: '2 days ago',
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AccuracyCard extends StatelessWidget {
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
                'Overall Accuracy',
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
                      '+3.2%',
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
          const SizedBox(height: 24),
          // Circular progress
          SizedBox(
            height: 140,
            width: 140,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Background circle
                SizedBox(
                  height: 140,
                  width: 140,
                  child: CircularProgressIndicator(
                    value: 1,
                    strokeWidth: 12,
                    backgroundColor: AppTheme.darkSurface,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      AppTheme.darkBorder,
                    ),
                  ),
                ),
                // Progress circle
                SizedBox(
                  height: 140,
                  width: 140,
                  child: CircularProgressIndicator(
                    value: 0.72,
                    strokeWidth: 12,
                    strokeCap: StrokeCap.round,
                    backgroundColor: Colors.transparent,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppTheme.highConfidence,
                    ),
                  ),
                ),
                // Center content
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      '72%',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 36,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '36/50 bets',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.5),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickStatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _QuickStatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.darkBorder),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            color: color,
            size: 24,
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withOpacity(0.5),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _BetTypeRow extends StatelessWidget {
  final String betType;
  final int accuracy;
  final int total;

  const _BetTypeRow({
    required this.betType,
    required this.accuracy,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.getConfidenceColor(accuracy.toDouble());

    return Row(
      children: [
        SizedBox(
          width: 100,
          child: Text(
            betType,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: accuracy / 100,
              backgroundColor: AppTheme.darkSurface,
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 8,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Container(
          width: 48,
          alignment: Alignment.centerRight,
          child: Text(
            '$accuracy%',
            style: TextStyle(
              color: color,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '($total)',
          style: TextStyle(
            color: Colors.white.withOpacity(0.3),
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}

class _RecentPredictionCard extends StatelessWidget {
  final String homeTeam;
  final String awayTeam;
  final String prediction;
  final bool isWin;
  final String date;

  const _RecentPredictionCard({
    required this.homeTeam,
    required this.awayTeam,
    required this.prediction,
    required this.isWin,
    required this.date,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.darkBorder),
      ),
      child: Row(
        children: [
          // Result icon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isWin
                  ? AppTheme.highConfidence.withOpacity(0.15)
                  : AppTheme.errorColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              isWin ? Icons.check : Icons.close,
              color: isWin ? AppTheme.highConfidence : AppTheme.errorColor,
              size: 22,
            ),
          ),
          const SizedBox(width: 14),

          // Match info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$homeTeam vs $awayTeam',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        prediction,
                        style: const TextStyle(
                          color: AppTheme.primaryColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      date,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.4),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Result badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: isWin
                  ? AppTheme.highConfidence.withOpacity(0.15)
                  : AppTheme.errorColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              isWin ? 'WIN' : 'LOSS',
              style: TextStyle(
                color: isWin ? AppTheme.highConfidence : AppTheme.errorColor,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
