import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models/match.dart';
import '../providers/live_matches_provider.dart';
import 'match_detail_screen.dart';

class LiveMatchesScreen extends ConsumerStatefulWidget {
  const LiveMatchesScreen({super.key});

  @override
  ConsumerState<LiveMatchesScreen> createState() => _LiveMatchesScreenState();
}

class _LiveMatchesScreenState extends ConsumerState<LiveMatchesScreen> {
  @override
  void initState() {
    super.initState();
    // Start live updates when screen opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(liveMatchesProvider.notifier).startLiveUpdates();
    });
  }

  @override
  void dispose() {
    // Don't stop updates here - let the provider manage it
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final liveState = ref.watch(liveMatchesProvider);
    final matches = liveState.matches;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: const BoxDecoration(
                color: Colors.red,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            const Text('Live Matches'),
          ],
        ),
        actions: [
          if (liveState.lastUpdated != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Text(
                  'Updated ${_formatTime(liveState.lastUpdated!)}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ),
          IconButton(
            icon: liveState.isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh),
            onPressed: liveState.isLoading
                ? null
                : () => ref.read(liveMatchesProvider.notifier).refresh(),
          ),
        ],
      ),
      body: matches.isEmpty
          ? _buildEmptyState(context, liveState)
          : RefreshIndicator(
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
            ),
    );
  }

  Widget _buildEmptyState(BuildContext context, LiveMatchesState state) {
    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.sports_soccer,
            size: 64,
            color: Colors.grey[400],
          ),
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

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inSeconds < 60) {
      return 'just now';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else {
      return DateFormat('HH:mm').format(time);
    }
  }
}

class _LiveMatchCard extends StatelessWidget {
  final Match match;

  const _LiveMatchCard({required this.match});

  @override
  Widget build(BuildContext context) {
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
              const SizedBox(height: 16),

              // Teams and scores
              Row(
                children: [
                  // Home team
                  Expanded(
                    child: Column(
                      children: [
                        _TeamLogo(logoUrl: match.homeTeam.logo),
                        const SizedBox(height: 8),
                        Text(
                          match.homeTeam.name,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),

                  // Score
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _AnimatedScore(score: match.homeScore ?? 0),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8),
                          child: Text(
                            ':',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        _AnimatedScore(score: match.awayScore ?? 0),
                      ],
                    ),
                  ),

                  // Away team
                  Expanded(
                    child: Column(
                      children: [
                        _TeamLogo(logoUrl: match.awayTeam.logo),
                        const SizedBox(height: 8),
                        Text(
                          match.awayTeam.name,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
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

class _AnimatedScore extends StatelessWidget {
  final int score;

  const _AnimatedScore({required this.score});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: score.toDouble(), end: score.toDouble()),
      duration: const Duration(milliseconds: 500),
      builder: (context, value, child) {
        return Text(
          score.toString(),
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
        );
      },
    );
  }
}

class _TeamLogo extends StatelessWidget {
  final String? logoUrl;

  const _TeamLogo({this.logoUrl});

  @override
  Widget build(BuildContext context) {
    if (logoUrl != null && logoUrl!.isNotEmpty) {
      return ClipOval(
        child: Image.network(
          logoUrl!,
          width: 48,
          height: 48,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            return _defaultLogo(context);
          },
        ),
      );
    }
    return _defaultLogo(context);
  }

  Widget _defaultLogo(BuildContext context) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
      ),
      child: const Icon(Icons.sports_soccer, size: 24),
    );
  }
}
