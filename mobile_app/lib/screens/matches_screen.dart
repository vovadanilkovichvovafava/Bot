import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../providers/matches_provider.dart';
import '../providers/live_matches_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
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
      ref.read(liveMatchesProvider.notifier).startLiveUpdates();
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
        title: const Text('Matches'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Today'),
            Tab(text: 'Live'),
            Tab(text: 'Leagues'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _TodayMatchesList(),
          _LiveMatchesList(),
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
            Text('Error: $error'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.read(matchesProvider.notifier).loadTodayMatches(forceRefresh: true),
              child: const Text('Retry'),
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
            const Text('No matches today'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.read(matchesProvider.notifier).loadTodayMatches(forceRefresh: true),
              child: const Text('Refresh'),
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
            Text('Error: $error'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.read(matchesProvider.notifier).loadTomorrowMatches(forceRefresh: true),
              child: const Text('Retry'),
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
            const Text('No matches tomorrow'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.read(matchesProvider.notifier).loadTomorrowMatches(forceRefresh: true),
              child: const Text('Refresh'),
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

// Live matches list with AI query support
class _LiveMatchesList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final liveState = ref.watch(liveMatchesProvider);
    final matches = liveState.matches;
    final isLoading = liveState.isLoading;

    if (isLoading && matches.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (matches.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.sports_soccer, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No Live Matches',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'There are no matches currently in play',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => ref.read(liveMatchesProvider.notifier).refresh(),
              icon: const Icon(Icons.refresh),
              label: const Text('Refresh'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(liveMatchesProvider.notifier).refresh(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: matches.length,
        itemBuilder: (context, index) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _LiveMatchCard(match: matches[index]),
          );
        },
      ),
    );
  }
}

class _LiveMatchCard extends ConsumerWidget {
  final Match match;

  const _LiveMatchCard({required this.match});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      elevation: 2,
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
            children: [
              // League and status row
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
                  _LiveBadge(status: match.status),
                ],
              ),
              const SizedBox(height: 12),

              // Teams and scores
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
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      children: [
                        Text(
                          '${match.homeScore ?? 0}',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '${match.awayScore ?? 0}',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Ask AI button
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _showAskAIDialog(context, ref),
                  icon: const Icon(Icons.smart_toy, size: 18),
                  label: const Text('Ask AI'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAskAIDialog(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _AskAIBottomSheet(match: match),
    );
  }
}

class _LiveBadge extends StatefulWidget {
  final String status;

  const _LiveBadge({required this.status});

  @override
  State<_LiveBadge> createState() => _LiveBadgeState();
}

class _LiveBadgeState extends State<_LiveBadge>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _animation = Tween<double>(begin: 1.0, end: 0.3).animate(
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
    final isHalftime = widget.status.toLowerCase() == 'halftime' ||
        widget.status.toLowerCase() == 'paused';

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: isHalftime
                ? Colors.orange.withOpacity(0.2)
                : Colors.red.withOpacity(0.2 * _animation.value + 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isHalftime ? Colors.orange : Colors.red,
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!isHalftime)
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(_animation.value),
                    shape: BoxShape.circle,
                  ),
                ),
              if (!isHalftime) const SizedBox(width: 6),
              Text(
                isHalftime ? 'HT' : 'LIVE',
                style: TextStyle(
                  color: isHalftime ? Colors.orange : Colors.red,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// Bottom sheet for AI queries about live match
class _AskAIBottomSheet extends ConsumerStatefulWidget {
  final Match match;

  const _AskAIBottomSheet({required this.match});

  @override
  ConsumerState<_AskAIBottomSheet> createState() => _AskAIBottomSheetState();
}

class _AskAIBottomSheetState extends ConsumerState<_AskAIBottomSheet> {
  final _controller = TextEditingController();
  bool _isLoading = false;
  String? _response;
  String? _error;

  final List<String> _quickQuestions = [
    'Best bet right now?',
    'More goals coming?',
    'Who wins?',
    'Over/under?',
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _askAI(String question) async {
    final authState = ref.read(authStateProvider);
    final user = authState.user;

    if (user == null) {
      setState(() => _error = 'Please log in to use AI');
      return;
    }

    if (!user.isPremium && user.remainingPredictions <= 0) {
      setState(() => _error = 'Daily limit reached. Upgrade to Premium!');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
      _response = null;
    });

    try {
      final api = ref.read(apiServiceProvider);
      final match = widget.match;
      final score = '${match.homeScore ?? 0}:${match.awayScore ?? 0}';

      final prompt = '''
Live match: ${match.homeTeam.name} vs ${match.awayTeam.name}
Current score: $score
League: ${match.league}
Status: ${match.status}

User question: $question

Please provide a brief analysis and recommendation.
''';

      final result = await api.sendChatMessage(
        message: prompt,
        history: [],
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
          _response = result['response'] as String;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final match = widget.match;

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) {
          return SingleChildScrollView(
            controller: scrollController,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[400],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Match info header
                Row(
                  children: [
                    const Icon(Icons.smart_toy, color: Colors.blue),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Ask AI: ${match.homeTeam.name} vs ${match.awayTeam.name}',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Score: ${match.homeScore ?? 0}:${match.awayScore ?? 0}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                ),
                const SizedBox(height: 16),

                // Quick questions
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _quickQuestions.map((q) {
                    return ActionChip(
                      label: Text(q, style: const TextStyle(fontSize: 12)),
                      onPressed: _isLoading ? null : () => _askAI(q),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),

                // Custom question input
                TextField(
                  controller: _controller,
                  decoration: InputDecoration(
                    hintText: 'Or ask your own question...',
                    border: const OutlineInputBorder(),
                    suffixIcon: IconButton(
                      icon: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.send),
                      onPressed: _isLoading || _controller.text.isEmpty
                          ? null
                          : () => _askAI(_controller.text),
                    ),
                  ),
                  onSubmitted: _isLoading
                      ? null
                      : (text) {
                          if (text.isNotEmpty) _askAI(text);
                        },
                ),
                const SizedBox(height: 16),

                // Response or error
                if (_isLoading)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Column(
                        children: [
                          CircularProgressIndicator(),
                          SizedBox(height: 12),
                          Text('AI is analyzing...'),
                        ],
                      ),
                    ),
                  ),

                if (_error != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.error_outline, color: Colors.red.shade700),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _error!,
                            style: TextStyle(color: Colors.red.shade700),
                          ),
                        ),
                      ],
                    ),
                  ),

                if (_response != null)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Theme.of(context)
                          .colorScheme
                          .primaryContainer
                          .withOpacity(0.3),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.smart_toy,
                              color: Theme.of(context).colorScheme.primary,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'AI Response',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(_response!),
                      ],
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

