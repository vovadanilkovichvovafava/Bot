import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../utils/theme.dart';

class MatchesScreen extends ConsumerStatefulWidget {
  const MatchesScreen({super.key});

  @override
  ConsumerState<MatchesScreen> createState() => _MatchesScreenState();
}

class _MatchesScreenState extends ConsumerState<MatchesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Matches',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  // Filter button
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppTheme.darkCard,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.darkBorder),
                    ),
                    child: IconButton(
                      icon: const Icon(
                        Icons.filter_list,
                        color: AppTheme.primaryColor,
                        size: 20,
                      ),
                      onPressed: () {
                        _showFilterSheet(context);
                      },
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Tab Bar
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              decoration: BoxDecoration(
                color: AppTheme.darkCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.darkBorder),
              ),
              child: TabBar(
                controller: _tabController,
                indicatorSize: TabBarIndicatorSize.tab,
                indicator: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                dividerColor: Colors.transparent,
                labelColor: AppTheme.primaryColor,
                unselectedLabelColor: Colors.white.withOpacity(0.5),
                labelStyle: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
                tabs: const [
                  Tab(text: 'Today'),
                  Tab(text: 'Tomorrow'),
                  Tab(text: 'Leagues'),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Tab Content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _MatchesList(title: 'Today'),
                  _MatchesList(title: 'Tomorrow'),
                  _LeaguesList(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showFilterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.darkCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.darkBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Filter Matches',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            // Filter options
            _FilterOption(
              icon: Icons.trending_up,
              label: 'High Confidence Only',
              subtitle: 'Show matches with 75%+ confidence',
            ),
            const SizedBox(height: 12),
            _FilterOption(
              icon: Icons.sports_soccer,
              label: 'Top Leagues',
              subtitle: 'Premier League, La Liga, etc.',
            ),
            const SizedBox(height: 12),
            _FilterOption(
              icon: Icons.access_time,
              label: 'Starting Soon',
              subtitle: 'Matches starting within 2 hours',
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Apply Filters'),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}

class _FilterOption extends StatefulWidget {
  final IconData icon;
  final String label;
  final String subtitle;

  const _FilterOption({
    required this.icon,
    required this.label,
    required this.subtitle,
  });

  @override
  State<_FilterOption> createState() => _FilterOptionState();
}

class _FilterOptionState extends State<_FilterOption> {
  bool _isSelected = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => setState(() => _isSelected = !_isSelected),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _isSelected
              ? AppTheme.primaryColor.withOpacity(0.1)
              : AppTheme.darkSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _isSelected ? AppTheme.primaryColor : AppTheme.darkBorder,
          ),
        ),
        child: Row(
          children: [
            Icon(
              widget.icon,
              color: _isSelected ? AppTheme.primaryColor : Colors.white.withOpacity(0.5),
              size: 24,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.label,
                    style: TextStyle(
                      color: _isSelected ? AppTheme.primaryColor : Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    widget.subtitle,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.4),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              _isSelected ? Icons.check_circle : Icons.circle_outlined,
              color: _isSelected ? AppTheme.primaryColor : AppTheme.darkBorder,
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}

class _MatchesList extends StatelessWidget {
  final String title;

  const _MatchesList({required this.title});

  @override
  Widget build(BuildContext context) {
    // Sample matches data
    final matches = [
      _MatchData(
        homeTeam: 'Manchester City',
        awayTeam: 'Arsenal',
        league: 'Premier League',
        time: '17:30',
        confidence: 78,
        prediction: 'Over 2.5',
        matchId: 1,
      ),
      _MatchData(
        homeTeam: 'Real Madrid',
        awayTeam: 'Barcelona',
        league: 'La Liga',
        time: '21:00',
        confidence: 72,
        prediction: 'BTTS Yes',
        matchId: 2,
      ),
      _MatchData(
        homeTeam: 'Bayern Munich',
        awayTeam: 'Dortmund',
        league: 'Bundesliga',
        time: '18:30',
        confidence: 85,
        prediction: 'Home Win',
        matchId: 3,
      ),
      _MatchData(
        homeTeam: 'Inter Milan',
        awayTeam: 'AC Milan',
        league: 'Serie A',
        time: '20:45',
        confidence: 68,
        prediction: 'Under 3.5',
        matchId: 4,
      ),
      _MatchData(
        homeTeam: 'PSG',
        awayTeam: 'Lyon',
        league: 'Ligue 1',
        time: '21:00',
        confidence: 82,
        prediction: 'Home Win',
        matchId: 5,
      ),
    ];

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
      itemCount: matches.length,
      itemBuilder: (context, index) {
        final match = matches[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _MatchCard(match: match),
        );
      },
    );
  }
}

class _MatchData {
  final String homeTeam;
  final String awayTeam;
  final String league;
  final String time;
  final int confidence;
  final String prediction;
  final int matchId;

  _MatchData({
    required this.homeTeam,
    required this.awayTeam,
    required this.league,
    required this.time,
    required this.confidence,
    required this.prediction,
    required this.matchId,
  });
}

class _MatchCard extends StatelessWidget {
  final _MatchData match;

  const _MatchCard({required this.match});

  @override
  Widget build(BuildContext context) {
    final confidenceColor = AppTheme.getConfidenceColor(match.confidence.toDouble());

    return GestureDetector(
      onTap: () => context.push('/match/${match.matchId}'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.darkCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.darkBorder),
        ),
        child: Column(
          children: [
            // League and time row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    match.league,
                    style: const TextStyle(
                      color: AppTheme.primaryColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Row(
                  children: [
                    Icon(
                      Icons.access_time,
                      size: 14,
                      color: Colors.white.withOpacity(0.4),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      match.time,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.4),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Teams and prediction row
            Row(
              children: [
                // Teams
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: AppTheme.darkSurface,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.shield,
                                color: Colors.white,
                                size: 18,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              match.homeTeam,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      Padding(
                        padding: const EdgeInsets.only(left: 16),
                        child: Container(
                          width: 1,
                          height: 8,
                          color: AppTheme.darkBorder,
                        ),
                      ),
                      Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: AppTheme.darkSurface,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.shield_outlined,
                                color: Colors.white,
                                size: 18,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              match.awayTeam,
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.7),
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Prediction badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: confidenceColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: confidenceColor.withOpacity(0.4),
                    ),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '${match.confidence}%',
                        style: TextStyle(
                          color: confidenceColor,
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        match.prediction,
                        style: TextStyle(
                          color: confidenceColor.withOpacity(0.8),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _LeaguesList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final leagues = [
      _LeagueData('Premier League', 'England', 'PL', AppTheme.neonPink, 12),
      _LeagueData('La Liga', 'Spain', 'ES', AppTheme.fc26Gold, 10),
      _LeagueData('Bundesliga', 'Germany', 'BL', AppTheme.errorColor, 8),
      _LeagueData('Serie A', 'Italy', 'IT', AppTheme.neonGreen, 9),
      _LeagueData('Ligue 1', 'France', 'FR', AppTheme.primaryColor, 7),
      _LeagueData('Champions League', 'Europe', 'UCL', AppTheme.accentColor, 4),
      _LeagueData('Europa League', 'Europe', 'UEL', AppTheme.fc26Orange, 3),
    ];

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
      itemCount: leagues.length,
      itemBuilder: (context, index) {
        final league = leagues[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _LeagueCard(league: league),
        );
      },
    );
  }
}

class _LeagueData {
  final String name;
  final String country;
  final String code;
  final Color color;
  final int matchCount;

  _LeagueData(this.name, this.country, this.code, this.color, this.matchCount);
}

class _LeagueCard extends StatelessWidget {
  final _LeagueData league;

  const _LeagueCard({required this.league});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        // Navigate to league matches
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.darkCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.darkBorder),
        ),
        child: Row(
          children: [
            // League icon
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: league.color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: league.color.withOpacity(0.3),
                ),
              ),
              child: Center(
                child: Text(
                  league.code,
                  style: TextStyle(
                    color: league.color,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),

            // League info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    league.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    league.country,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.4),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

            // Match count
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.darkSurface,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${league.matchCount} matches',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.6),
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(width: 8),

            Icon(
              Icons.chevron_right,
              color: Colors.white.withOpacity(0.3),
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}
