import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:intl/intl.dart';

import '../models/match.dart';
import '../providers/live_matches_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/local_token_service.dart';
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
                  _LiveBadge(status: match.status, minute: match.minute),
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

              const SizedBox(height: 16),

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
    'Best live bet right now?',
    'Will there be more goals?',
    'Next goal prediction?',
    'Over/Under for remaining time?',
    'Is current score likely to change?',
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _askAI(String question) async {
    final authState = ref.read(authStateProvider);
    final user = authState.user;
    final isPremium = user?.isPremium ?? false;

    if (user == null) {
      setState(() => _error = 'Please log in to use AI');
      return;
    }

    // Use local tokens for non-premium users
    if (!isPremium) {
      final canUse = await ref.read(localTokenProvider.notifier).useToken();
      if (!canUse) {
        setState(() => _error = 'No AI requests remaining. Watch an ad or wait 24h for reset.');
        return;
      }
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
      final minute = match.minute != null ? '${match.minute}\'' : match.status;
      final htScore = match.halfTimeScore ?? 'N/A';

      // Build detailed prompt for live match analysis
      final prompt = '''
🔴 LIVE MATCH ANALYSIS REQUEST

⚽ ${match.homeTeam.name} vs ${match.awayTeam.name}
🏆 ${match.league}
⏱️ Current time: $minute
📊 Score: $score
📋 Half-time: $htScore

USER QUESTION: $question

Please analyze:
1. Current match situation based on the score and time
2. Betting recommendations for live bets (considering the current state)
3. Over/Under assessment based on current goals and remaining time
4. Risk level for suggested bets

Keep response focused and actionable for live betting.
''';

      final result = await api.sendChatMessage(
        message: prompt,
        history: [],
        matchId: match.id.toString(),
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        leagueCode: match.leagueCode,
        matchDate: match.matchDate.toIso8601String(),
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
          _error = e.toString().contains('429')
              ? 'Daily limit reached. Upgrade to Premium for unlimited access.'
              : 'Failed to get AI response. Please try again.';
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
                        'Ask AI about ${match.homeTeam.name} vs ${match.awayTeam.name}',
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
                const SizedBox(height: 20),

                // Quick questions
                Text(
                  'Quick questions:',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: 8),
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
                const SizedBox(height: 20),

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
                  onSubmitted: _isLoading ? null : (text) {
                    if (text.isNotEmpty) _askAI(text);
                  },
                ),
                const SizedBox(height: 20),

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
                      color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
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
                              'AI Live Analysis',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        MarkdownBody(
                          data: _response!,
                          styleSheet: MarkdownStyleSheet(
                            p: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ),
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

class _LiveBadge extends StatefulWidget {
  final String status;
  final int? minute;

  const _LiveBadge({required this.status, this.minute});

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

    // Show minute if available
    String displayText;
    if (isHalftime) {
      displayText = 'HT';
    } else if (widget.minute != null) {
      displayText = '${widget.minute}\'';
    } else {
      displayText = 'LIVE';
    }

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
                displayText,
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
        color: Theme.of(context).colorScheme.surfaceVariant,
      ),
      child: const Icon(Icons.sports_soccer, size: 24),
    );
  }
}
