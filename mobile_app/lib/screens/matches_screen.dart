import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../providers/matches_provider.dart';
import '../models/match.dart';
import '../widgets/loading_shimmer.dart';
import 'match_detail_screen.dart';
import 'league_matches_screen.dart';

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
    // Load matches when screen opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(matchesProvider.notifier).refresh();
    });
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
        title: const Text('Матчи'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Сегодня'),
            Tab(text: 'Завтра'),
            Tab(text: 'Лиги'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _TodayMatchesList(),
          _TomorrowMatchesList(),
          _LeaguesList(),
        ],
      ),
    );
  }
}

class _TodayMatchesList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matchesState = ref.watch(matchesProvider);
    final matches = matchesState.todayMatches;
    final isLoading = matchesState.isLoading;
    final error = matchesState.error;
    final offlineMessage = matchesState.offlineMessage;

    if (isLoading && matches.isEmpty) {
      return const MatchListShimmer(count: 5);
    }

    if (error != null && matches.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text('Ошибка: $error'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.read(matchesProvider.notifier).loadTodayMatches(forceRefresh: true),
              child: const Text('Повторить'),
            ),
          ],
        ),
      );
    }

    if (matches.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.sports_soccer, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('Нет матчей сегодня'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.read(matchesProvider.notifier).loadTodayMatches(forceRefresh: true),
              child: const Text('Обновить'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(matchesProvider.notifier).loadTodayMatches(forceRefresh: true),
      child: Column(
        children: [
          // Offline banner
          if (offlineMessage != null)
            _OfflineBanner(message: offlineMessage),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: matches.length,
              itemBuilder: (context, index) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _MatchCard(match: matches[index]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _TomorrowMatchesList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matchesState = ref.watch(matchesProvider);
    final matches = matchesState.tomorrowMatches;
    final isLoading = matchesState.isLoading;
    final error = matchesState.error;
    final offlineMessage = matchesState.offlineMessage;

    if (isLoading && matches.isEmpty) {
      return const MatchListShimmer(count: 5);
    }

    if (error != null && matches.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text('Ошибка: $error'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.read(matchesProvider.notifier).loadTomorrowMatches(forceRefresh: true),
              child: const Text('Повторить'),
            ),
          ],
        ),
      );
    }

    if (matches.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.sports_soccer, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('Нет матчей завтра'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.read(matchesProvider.notifier).loadTomorrowMatches(forceRefresh: true),
              child: const Text('Обновить'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(matchesProvider.notifier).loadTomorrowMatches(forceRefresh: true),
      child: Column(
        children: [
          if (offlineMessage != null)
            _OfflineBanner(message: offlineMessage),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: matches.length,
              itemBuilder: (context, index) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _MatchCard(match: matches[index]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// Offline mode banner
class _OfflineBanner extends StatelessWidget {
  final String message;

  const _OfflineBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      color: Colors.orange.shade100,
      child: Row(
        children: [
          Icon(Icons.cloud_off, size: 18, color: Colors.orange.shade800),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: Colors.orange.shade800,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MatchCard extends StatelessWidget {
  final Match match;

  const _MatchCard({required this.match});

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
                        const SizedBox(height: 4),
                        Text(
                          '${match.awayScore}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                        ),
                      ],
                    )
                  else
                    Icon(Icons.chevron_right, color: Colors.grey[400]),
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
      case 'scheduled':
      case 'timed':
        return Colors.orange;
      default:
        return Colors.grey;
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

class _LeaguesList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final leagues = [
      ('PL', 'Premier League', Icons.sports_soccer, '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
      ('PD', 'La Liga', Icons.sports_soccer, '🇪🇸'),
      ('BL1', 'Bundesliga', Icons.sports_soccer, '🇩🇪'),
      ('SA', 'Serie A', Icons.sports_soccer, '🇮🇹'),
      ('FL1', 'Ligue 1', Icons.sports_soccer, '🇫🇷'),
      ('CL', 'Champions League', Icons.emoji_events, '🏆'),
      ('EL', 'Europa League', Icons.emoji_events, '🥈'),
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: leagues.length,
      itemBuilder: (context, index) {
        final league = leagues[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Text(league.$4, style: const TextStyle(fontSize: 28)),
            title: Text(league.$2, style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(league.$1, style: TextStyle(color: Colors.grey[600])),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => LeagueMatchesScreen(
                    leagueCode: league.$1,
                    leagueName: league.$2,
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

