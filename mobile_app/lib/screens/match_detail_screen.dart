import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/match.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';

class MatchDetailScreen extends ConsumerStatefulWidget {
  final Match match;

  const MatchDetailScreen({super.key, required this.match});

  @override
  ConsumerState<MatchDetailScreen> createState() => _MatchDetailScreenState();
}

class _MatchDetailScreenState extends ConsumerState<MatchDetailScreen> {
  String? _aiAnalysis;
  bool _isLoadingAnalysis = false;
  bool _analysisError = false;
  bool _reminderSet = false;

  @override
  void initState() {
    super.initState();
    _loadAiAnalysis();
    _checkReminderStatus();
  }

  Future<void> _checkReminderStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final isSet = prefs.getBool('reminder_${widget.match.id}') ?? false;
    setState(() => _reminderSet = isSet);
  }

  Future<void> _toggleReminder() async {
    final notificationService = ref.read(notificationServiceProvider);
    final prefs = await SharedPreferences.getInstance();
    final match = widget.match;

    if (_reminderSet) {
      // Cancel reminder
      await notificationService.cancelReminder(match.id);
      await prefs.remove('reminder_${match.id}');
      setState(() => _reminderSet = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Reminder cancelled')),
        );
      }
    } else {
      // Set reminder
      await notificationService.initialize();
      await notificationService.scheduleMatchReminder(
        matchId: match.id,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        matchTime: match.matchDate,
      );
      await prefs.setBool('reminder_${match.id}', true);
      setState(() => _reminderSet = true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Reminder set for 30 minutes before kick-off')),
        );
      }
    }
  }

  Future<void> _loadAiAnalysis() async {
    // Don't load analysis for finished matches
    if (widget.match.isFinished) return;

    setState(() {
      _isLoadingAnalysis = true;
      _analysisError = false;
    });

    try {
      final api = ref.read(apiServiceProvider);

      // Check if AI is available first
      final available = await api.isChatAvailable();
      if (!available) {
        setState(() {
          _isLoadingAnalysis = false;
          _analysisError = true;
        });
        return;
      }

      // Request analysis for this specific match
      final result = await api.sendChatMessage(
        message: 'Match analysis ${widget.match.homeTeam.name} vs ${widget.match.awayTeam.name}',
        history: [],
      );

      setState(() {
        _aiAnalysis = result['response'] as String?;
        _isLoadingAnalysis = false;
      });
    } catch (e) {
      setState(() {
        _isLoadingAnalysis = false;
        _analysisError = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final match = widget.match;
    final dateFormat = DateFormat('dd MMM yyyy');
    final timeFormat = DateFormat('HH:mm');

    return Scaffold(
      appBar: AppBar(
        title: Text(match.league),
        actions: [
          // Reminder button (only for scheduled matches)
          if (match.isScheduled)
            IconButton(
              icon: Icon(
                _reminderSet ? Icons.notifications_active : Icons.notifications_none,
                color: _reminderSet ? Colors.amber : null,
              ),
              onPressed: _toggleReminder,
              tooltip: _reminderSet ? 'Cancel reminder' : 'Set reminder',
            ),
          if (!match.isFinished && (_analysisError || _aiAnalysis != null))
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _loadAiAnalysis,
              tooltip: 'Refresh analysis',
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Match header card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Text(
                      match.league,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    if (match.matchday != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Matchday ${match.matchday}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                    const SizedBox(height: 4),
                    Text(
                      '${dateFormat.format(match.matchDate.toLocal())} • ${timeFormat.format(match.matchDate.toLocal())}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 24),

                    // Teams
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            children: [
                              _TeamLogo(logoUrl: match.homeTeam.logo),
                              const SizedBox(height: 8),
                              Text(
                                match.homeTeam.name,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Home',
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Column(
                            children: [
                              if (match.homeScore != null && match.awayScore != null)
                                Text(
                                  '${match.homeScore} - ${match.awayScore}',
                                  style: const TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.bold,
                                  ),
                                )
                              else
                                Text(
                                  'VS',
                                  style: TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.grey[400],
                                  ),
                                ),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _getStatusColor(match.status).withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  _getStatusText(match.status),
                                  style: TextStyle(
                                    color: _getStatusColor(match.status),
                                    fontWeight: FontWeight.w600,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ],
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
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Away',
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 12,
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
            ),

            const SizedBox(height: 16),

            // AI Analysis card
            _buildAiAnalysisCard(context),

            const SizedBox(height: 16),

            // Match info card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Match Info',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _InfoRow(
                      icon: Icons.emoji_events,
                      label: 'Competition',
                      value: match.league,
                    ),
                    if (match.matchday != null)
                      _InfoRow(
                        icon: Icons.format_list_numbered,
                        label: 'Matchday',
                        value: '${match.matchday}',
                      ),
                    _InfoRow(
                      icon: Icons.calendar_today,
                      label: 'Date',
                      value: dateFormat.format(match.matchDate.toLocal()),
                    ),
                    _InfoRow(
                      icon: Icons.access_time,
                      label: 'Time',
                      value: timeFormat.format(match.matchDate.toLocal()),
                    ),
                    _InfoRow(
                      icon: Icons.info_outline,
                      label: 'Status',
                      value: _getStatusText(match.status),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Disclaimer
            Padding(
              padding: const EdgeInsets.all(8),
              child: Text(
                '⚠️ Делайте ставки ответственно. Прогнозы не гарантируют результат.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.grey[500],
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAiAnalysisCard(BuildContext context) {
    final match = widget.match;

    // For finished matches, show result
    if (match.isFinished) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.check_circle,
                    color: Colors.green[600],
                    size: 24,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Match Finished',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Final Score: ${match.homeScore} - ${match.awayScore}',
                style: const TextStyle(fontSize: 16),
              ),
            ],
          ),
        ),
      );
    }

    // Loading state
    if (_isLoadingAnalysis) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const SizedBox(
                width: 40,
                height: 40,
                child: CircularProgressIndicator(strokeWidth: 3),
              ),
              const SizedBox(height: 16),
              Text(
                'Loading AI analysis...',
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Claude AI is analyzing the match',
                style: TextStyle(
                  color: Colors.grey[500],
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Error state
    if (_analysisError) {
      return Card(
        color: Colors.orange[50],
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Icon(
                Icons.cloud_off,
                size: 48,
                color: Colors.orange[400],
              ),
              const SizedBox(height: 12),
              const Text(
                'AI Analysis Unavailable',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Server is waking up. Tap refresh to try again.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _loadAiAnalysis,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    // Analysis loaded
    if (_aiAnalysis != null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.psychology,
                    color: Theme.of(context).colorScheme.primary,
                    size: 24,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'AI-анализ',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Claude AI',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
              const Divider(height: 24),
              MarkdownBody(
                data: _aiAnalysis!,
                styleSheet: MarkdownStyleSheet(
                  p: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 15,
                    height: 1.5,
                  ),
                  strong: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                  em: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontStyle: FontStyle.italic,
                    fontSize: 14,
                  ),
                  listBullet: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 15,
                  ),
                ),
                shrinkWrap: true,
                softLineBreak: true,
              ),
            ],
          ),
        ),
      );
    }

    // Default - should not happen
    return const SizedBox.shrink();
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
        return 'Finished';
      case 'scheduled':
      case 'timed':
        return 'Upcoming';
      default:
        return status.toUpperCase();
    }
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
        width: 60,
        height: 60,
        errorBuilder: (_, __, ___) => _placeholder(),
      );
    }
    return _placeholder();
  }

  Widget _placeholder() {
    return Container(
      width: 60,
      height: 60,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        shape: BoxShape.circle,
      ),
      child: const Icon(Icons.sports_soccer, size: 30, color: Colors.grey),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Text(
            label,
            style: TextStyle(color: Colors.grey[600]),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}
