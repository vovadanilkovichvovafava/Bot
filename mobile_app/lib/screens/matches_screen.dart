import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../widgets/match_card.dart';

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
      appBar: AppBar(
        title: const Text('Matches'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Today'),
            Tab(text: 'Tomorrow'),
            Tab(text: 'Leagues'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _MatchesList(title: 'Today'),
          _MatchesList(title: 'Tomorrow'),
          _LeaguesList(),
        ],
      ),
    );
  }
}

class _MatchesList extends StatelessWidget {
  final String title;

  const _MatchesList({required this.title});

  @override
  Widget build(BuildContext context) {
    // TODO: Fetch from API
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        MatchCard(
          homeTeam: 'Manchester City',
          awayTeam: 'Arsenal',
          competition: 'Premier League',
          time: '17:30',
          confidence: 72,
        ),
        SizedBox(height: 8),
        MatchCard(
          homeTeam: 'Real Madrid',
          awayTeam: 'Barcelona',
          competition: 'La Liga',
          time: '21:00',
          confidence: 68,
        ),
        SizedBox(height: 8),
        MatchCard(
          homeTeam: 'Bayern Munich',
          awayTeam: 'Dortmund',
          competition: 'Bundesliga',
          time: '18:30',
          confidence: 75,
        ),
      ],
    );
  }
}

class _LeaguesList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final leagues = [
      ('PL', 'Premier League', Icons.sports_soccer),
      ('PD', 'La Liga', Icons.sports_soccer),
      ('BL1', 'Bundesliga', Icons.sports_soccer),
      ('SA', 'Serie A', Icons.sports_soccer),
      ('FL1', 'Ligue 1', Icons.sports_soccer),
      ('CL', 'Champions League', Icons.emoji_events),
      ('EL', 'Europa League', Icons.emoji_events),
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: leagues.length,
      itemBuilder: (context, index) {
        final league = leagues[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Icon(league.$3),
            title: Text(league.$2),
            subtitle: Text(league.$1),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              // TODO: Navigate to league matches
            },
          ),
        );
      },
    );
  }
}
