import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/match.dart';

class H2HScreen extends ConsumerStatefulWidget {
  final Match match;

  const H2HScreen({super.key, required this.match});

  @override
  ConsumerState<H2HScreen> createState() => _H2HScreenState();
}

class _H2HScreenState extends ConsumerState<H2HScreen> {
  bool _isLoading = true;
  H2HData? _h2hData;

  @override
  void initState() {
    super.initState();
    _loadH2HData();
  }

  Future<void> _loadH2HData() async {
    setState(() => _isLoading = true);

    // Simulate loading H2H data - in production this would come from API
    await Future.delayed(const Duration(seconds: 1));

    // Generate mock H2H data based on teams
    final homeTeam = widget.match.homeTeam.name;
    final awayTeam = widget.match.awayTeam.name;

    setState(() {
      _h2hData = H2HData(
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        totalMatches: 12,
        homeWins: 5,
        draws: 3,
        awayWins: 4,
        homeGoals: 18,
        awayGoals: 15,
        lastMatches: [
          H2HMatch(date: DateTime(2024, 3, 15), homeScore: 2, awayScore: 1, wasHomeTeamHome: true),
          H2HMatch(date: DateTime(2023, 11, 20), homeScore: 1, awayScore: 1, wasHomeTeamHome: false),
          H2HMatch(date: DateTime(2023, 5, 10), homeScore: 0, awayScore: 2, wasHomeTeamHome: true),
          H2HMatch(date: DateTime(2022, 12, 5), homeScore: 3, awayScore: 2, wasHomeTeamHome: false),
          H2HMatch(date: DateTime(2022, 8, 22), homeScore: 1, awayScore: 0, wasHomeTeamHome: true),
        ],
        homeForm: ['W', 'W', 'D', 'L', 'W'],
        awayForm: ['L', 'W', 'W', 'D', 'W'],
      );
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final match = widget.match;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Head to Head'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _h2hData == null
              ? _buildNoDataState()
              : _buildContent(context, match),
    );
  }

  Widget _buildNoDataState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.compare_arrows, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          const Text('No H2H data available'),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, Match match) {
    final data = _h2hData!;

    return RefreshIndicator(
      onRefresh: _loadH2HData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Teams header
            _buildTeamsHeader(match),

            const SizedBox(height: 24),

            // Overall record
            _buildOverallRecord(data),

            const SizedBox(height: 24),

            // Goals comparison
            _buildGoalsComparison(data),

            const SizedBox(height: 24),

            // Form comparison
            _buildFormComparison(data),

            const SizedBox(height: 24),

            // Last matches
            _buildLastMatches(data),

            const SizedBox(height: 24),

            // Win probability (calculated)
            _buildWinProbability(data),
          ],
        ),
      ),
    );
  }

  Widget _buildTeamsHeader(Match match) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Expanded(
              child: Column(
                children: [
                  _TeamLogo(logoUrl: match.homeTeam.logo),
                  const SizedBox(height: 8),
                  Text(
                    match.homeTeam.name,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'VS',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            Expanded(
              child: Column(
                children: [
                  _TeamLogo(logoUrl: match.awayTeam.logo),
                  const SizedBox(height: 8),
                  Text(
                    match.awayTeam.name,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOverallRecord(H2HData data) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.history, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Overall Record (${data.totalMatches} matches)',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Win distribution bar
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Row(
                children: [
                  Expanded(
                    flex: data.homeWins,
                    child: Container(
                      height: 40,
                      color: Colors.green,
                      alignment: Alignment.center,
                      child: Text(
                        '${data.homeWins}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: data.draws,
                    child: Container(
                      height: 40,
                      color: Colors.grey,
                      alignment: Alignment.center,
                      child: Text(
                        '${data.draws}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: data.awayWins,
                    child: Container(
                      height: 40,
                      color: Colors.red,
                      alignment: Alignment.center,
                      child: Text(
                        '${data.awayWins}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Legend
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _LegendItem(color: Colors.green, label: data.homeTeam, value: data.homeWins),
                _LegendItem(color: Colors.grey, label: 'Draw', value: data.draws),
                _LegendItem(color: Colors.red, label: data.awayTeam, value: data.awayWins),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGoalsComparison(H2HData data) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.sports_soccer, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 8),
                const Text(
                  'Goals Scored',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        '${data.homeGoals}',
                        style: TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                      Text(
                        data.homeTeam,
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 2,
                  height: 60,
                  color: Colors.grey[300],
                ),
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        '${data.awayGoals}',
                        style: TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.secondary,
                        ),
                      ),
                      Text(
                        data.awayTeam,
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Avg goals per match
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.analytics, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Avg ${((data.homeGoals + data.awayGoals) / data.totalMatches).toStringAsFixed(1)} goals/match',
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFormComparison(H2HData data) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.trending_up, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 8),
                const Text(
                  'Recent Form',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Home team form
            Row(
              children: [
                SizedBox(
                  width: 100,
                  child: Text(
                    data.homeTeam,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 12),
                ...data.homeForm.map((result) => _FormBadge(result: result)),
              ],
            ),
            const SizedBox(height: 12),

            // Away team form
            Row(
              children: [
                SizedBox(
                  width: 100,
                  child: Text(
                    data.awayTeam,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 12),
                ...data.awayForm.map((result) => _FormBadge(result: result)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLastMatches(H2HData data) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.schedule, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 8),
                const Text(
                  'Last 5 Meetings',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            ...data.lastMatches.map((match) => _buildMatchRow(data, match)),
          ],
        ),
      ),
    );
  }

  Widget _buildMatchRow(H2HData data, H2HMatch match) {
    final homeTeam = match.wasHomeTeamHome ? data.homeTeam : data.awayTeam;
    final awayTeam = match.wasHomeTeamHome ? data.awayTeam : data.homeTeam;
    final homeScore = match.wasHomeTeamHome ? match.homeScore : match.awayScore;
    final awayScore = match.wasHomeTeamHome ? match.awayScore : match.homeScore;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 60,
            child: Text(
              '${match.date.day}/${match.date.month}/${match.date.year % 100}',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
          ),
          Expanded(
            child: Text(
              homeTeam,
              textAlign: TextAlign.end,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 12),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '$homeScore - $awayScore',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: Text(
              awayTeam,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWinProbability(H2HData data) {
    final total = data.totalMatches.toDouble();
    final homeProb = (data.homeWins / total * 100).round();
    final drawProb = (data.draws / total * 100).round();
    final awayProb = (data.awayWins / total * 100).round();

    return Card(
      color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.analytics, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 8),
                const Text(
                  'Historical Probability',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _ProbabilityItem(
                  label: 'Home',
                  team: data.homeTeam,
                  probability: homeProb,
                  color: Colors.green,
                ),
                _ProbabilityItem(
                  label: 'Draw',
                  team: 'X',
                  probability: drawProb,
                  color: Colors.grey,
                ),
                _ProbabilityItem(
                  label: 'Away',
                  team: data.awayTeam,
                  probability: awayProb,
                  color: Colors.red,
                ),
              ],
            ),

            const SizedBox(height: 16),
            Text(
              '* Based on historical head-to-head results',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TeamLogo extends StatelessWidget {
  final String? logoUrl;

  const _TeamLogo({this.logoUrl});

  @override
  Widget build(BuildContext context) {
    if (logoUrl != null && logoUrl!.isNotEmpty) {
      return Image.network(
        logoUrl!,
        width: 48,
        height: 48,
        errorBuilder: (_, __, ___) => _placeholder(),
      );
    }
    return _placeholder();
  }

  Widget _placeholder() {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        shape: BoxShape.circle,
      ),
      child: const Icon(Icons.sports_soccer, size: 24, color: Colors.grey),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;
  final int value;

  const _LegendItem({
    required this.color,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label.length > 10 ? '${label.substring(0, 10)}...' : label,
          style: const TextStyle(fontSize: 12),
        ),
      ],
    );
  }
}

class _FormBadge extends StatelessWidget {
  final String result;

  const _FormBadge({required this.result});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (result) {
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
      width: 28,
      height: 28,
      margin: const EdgeInsets.only(right: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
      ),
      alignment: Alignment.center,
      child: Text(
        result,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }
}

class _ProbabilityItem extends StatelessWidget {
  final String label;
  final String team;
  final int probability;
  final Color color;

  const _ProbabilityItem({
    required this.label,
    required this.team,
    required this.probability,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 4),
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 3),
          ),
          alignment: Alignment.center,
          child: Text(
            '$probability%',
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          team.length > 8 ? '${team.substring(0, 8)}...' : team,
          style: const TextStyle(fontSize: 11),
        ),
      ],
    );
  }
}

// Data models
class H2HData {
  final String homeTeam;
  final String awayTeam;
  final int totalMatches;
  final int homeWins;
  final int draws;
  final int awayWins;
  final int homeGoals;
  final int awayGoals;
  final List<H2HMatch> lastMatches;
  final List<String> homeForm;
  final List<String> awayForm;

  H2HData({
    required this.homeTeam,
    required this.awayTeam,
    required this.totalMatches,
    required this.homeWins,
    required this.draws,
    required this.awayWins,
    required this.homeGoals,
    required this.awayGoals,
    required this.lastMatches,
    required this.homeForm,
    required this.awayForm,
  });
}

class H2HMatch {
  final DateTime date;
  final int homeScore;
  final int awayScore;
  final bool wasHomeTeamHome;

  H2HMatch({
    required this.date,
    required this.homeScore,
    required this.awayScore,
    required this.wasHomeTeamHome,
  });
}
