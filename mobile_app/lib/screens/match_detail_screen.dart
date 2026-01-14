import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/match.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';
import '../providers/predictions_provider.dart';
import '../providers/settings_provider.dart';

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
  bool _hasPrediction = false;

  // AI limits state
  int _remainingRequests = 0;
  bool _isPremium = false;
  bool _limitsLoaded = false;

  @override
  void initState() {
    super.initState();
    // Don't auto-load AI analysis - wait for button click
    _loadAiLimits();
    _checkReminderStatus();
    _checkPredictionStatus();
  }

  Future<void> _loadAiLimits() async {
    try {
      final api = ref.read(apiServiceProvider);
      final limits = await api.getAiLimits();
      final isPremium = limits['is_premium'] as bool? ?? false;
      final remaining = limits['remaining'] as int? ?? 0;

      setState(() {
        _remainingRequests = remaining;
        _isPremium = isPremium;
        _limitsLoaded = true;
      });

      // Auto-load AI analysis for Premium users (match not finished)
      if (isPremium && !widget.match.isFinished) {
        _loadAiAnalysis();
      }
    } catch (e) {
      // If can't load limits, assume 0 to be safe
      setState(() {
        _limitsLoaded = true;
      });
    }
  }

  void _checkPredictionStatus() {
    final hasPrediction = ref.read(predictionsProvider.notifier).hasPrediction(widget.match.id);
    setState(() => _hasPrediction = hasPrediction);
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

  /// Extract bet type recommendation from AI analysis text
  String? _extractBetTypeFromAnalysis(String? analysis) {
    if (analysis == null || analysis.isEmpty) return null;

    final lowerAnalysis = analysis.toLowerCase();

    // Map of patterns to bet types
    final betTypePatterns = {
      'Home Win': [
        'home win', 'home team win', 'recommend home', 'backing home',
        'home to win', 'pick: home', '1x2: 1', 'home victory',
      ],
      'Away Win': [
        'away win', 'away team win', 'recommend away', 'backing away',
        'away to win', 'pick: away', '1x2: 2', 'away victory',
      ],
      'Draw': [
        'draw', 'ends in a draw', 'stalemate', '1x2: x',
      ],
      'Over 2.5': [
        'over 2.5', 'over 2.5 goals', 'o2.5', 'more than 2.5',
      ],
      'Under 2.5': [
        'under 2.5', 'under 2.5 goals', 'u2.5', 'fewer than 2.5',
      ],
      'Over 1.5': [
        'over 1.5', 'over 1.5 goals', 'o1.5', 'more than 1.5',
      ],
      'Under 3.5': [
        'under 3.5', 'under 3.5 goals', 'u3.5', 'fewer than 3.5',
      ],
      'BTTS Yes': [
        'btts yes', 'both teams to score: yes', 'btts - yes', 'both teams score',
        'both to score',
      ],
      'BTTS No': [
        'btts no', 'both teams to score: no', 'btts - no', 'clean sheet',
      ],
      'Double Chance': [
        'double chance', '1x', 'x2', '12',
      ],
    };

    // Check for primary recommendation patterns
    final primaryPatterns = [
      RegExp(r'(?:primary|main|recommended|top)\s*(?:bet|pick|prediction)[:\s]+([^\n]+)', caseSensitive: false),
      RegExp(r'(?:bet|prediction|pick):\s*([^\n]+)', caseSensitive: false),
      RegExp(r'🎯\s*([^\n]+)', caseSensitive: false),
    ];

    for (final pattern in primaryPatterns) {
      final match = pattern.firstMatch(analysis);
      if (match != null) {
        final recommendation = match.group(1)?.toLowerCase() ?? '';
        for (final entry in betTypePatterns.entries) {
          for (final keyword in entry.value) {
            if (recommendation.contains(keyword)) {
              return entry.key;
            }
          }
        }
      }
    }

    // Fallback: search entire analysis for bet type mentions
    for (final entry in betTypePatterns.entries) {
      for (final keyword in entry.value) {
        if (lowerAnalysis.contains(keyword)) {
          return entry.key;
        }
      }
    }

    return null;
  }

  Future<void> _showSavePredictionDialog() async {
    final match = widget.match;

    // Try to extract bet type from AI analysis
    String? selectedBetType = _extractBetTypeFromAnalysis(_aiAnalysis);
    double confidence = 70;
    double? odds;
    String? oddsError;
    final oddsController = TextEditingController();

    final betTypes = [
      'Home Win',
      'Draw',
      'Away Win',
      'Over 2.5',
      'Under 2.5',
      'Over 1.5',
      'Under 3.5',
      'BTTS Yes',
      'BTTS No',
      'Home +1.5',
      'Away +1.5',
      'Double Chance',
      'Other',
    ];

    String? validateOdds(String? value) {
      if (value == null || value.isEmpty) return null; // Optional field
      final parsed = double.tryParse(value);
      if (parsed == null) return 'Enter a valid number';
      if (parsed < 1.01) return 'Minimum odds: 1.01';
      if (parsed > 1000) return 'Maximum odds: 1000';
      return null;
    }

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Icon(Icons.bookmark_add),
                  const SizedBox(width: 8),
                  const Text(
                    'Save Prediction',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${match.homeTeam.name} vs ${match.awayTeam.name}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                match.league,
                style: TextStyle(color: Colors.grey[600]),
              ),
              const SizedBox(height: 20),

              // Bet type selection
              const Text(
                'Bet Type',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: betTypes.map((type) => ChoiceChip(
                  label: Text(type),
                  selected: selectedBetType == type,
                  onSelected: (selected) {
                    setModalState(() => selectedBetType = selected ? type : null);
                  },
                )).toList(),
              ),
              const SizedBox(height: 20),

              // Confidence slider
              Row(
                children: [
                  const Text(
                    'Confidence',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const Spacer(),
                  Text(
                    '${confidence.toStringAsFixed(0)}%',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              Slider(
                value: confidence,
                min: 10,
                max: 100,
                divisions: 18,
                onChanged: (value) => setModalState(() => confidence = value),
              ),
              const SizedBox(height: 12),

              // Odds input with validation
              TextField(
                controller: oddsController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  labelText: 'Odds (optional)',
                  hintText: 'e.g., 1.85',
                  helperText: 'Valid range: 1.01 - 1000',
                  errorText: oddsError,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixText: '@ ',
                ),
                onChanged: (value) {
                  final error = validateOdds(value);
                  setModalState(() {
                    oddsError = error;
                    if (error == null && value.isNotEmpty) {
                      odds = double.tryParse(value);
                    } else {
                      odds = null;
                    }
                  });
                },
              ),
              const SizedBox(height: 24),

              // Save button
              FilledButton.icon(
                onPressed: selectedBetType == null || oddsError != null
                    ? null
                    : () async {
                        await ref.read(predictionsProvider.notifier).savePrediction(
                          match: match,
                          betType: selectedBetType!,
                          confidence: confidence,
                          odds: odds,
                          analysis: _aiAnalysis,
                        );
                        setState(() => _hasPrediction = true);
                        if (mounted) {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: const Text('Prediction saved!'),
                              action: SnackBarAction(
                                label: 'View All',
                                onPressed: () => context.go('/stats'),
                              ),
                              duration: const Duration(seconds: 4),
                            ),
                          );
                        }
                      },
                icon: const Icon(Icons.save),
                label: const Text('Save Prediction'),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _removePrediction() async {
    await ref.read(predictionsProvider.notifier).removePrediction(widget.match.id);
    setState(() => _hasPrediction = false);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Prediction removed')),
      );
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

      // Get user settings for personalized analysis
      final settings = ref.read(settingsProvider);

      // Request analysis for this specific match with user preferences
      // Include full match details so AI doesn't hallucinate date/league
      final match = widget.match;
      final matchDate = match.matchDate;
      final formattedDate = '${matchDate.day.toString().padLeft(2, '0')}.${matchDate.month.toString().padLeft(2, '0')}.${matchDate.year} at ${matchDate.hour.toString().padLeft(2, '0')}:${matchDate.minute.toString().padLeft(2, '0')}';
      final matchdayInfo = match.matchday != null ? ', Matchday ${match.matchday}' : '';

      final result = await api.sendChatMessage(
        message: 'Analyze this match:\n'
            '⚽ ${match.homeTeam.name} vs ${match.awayTeam.name}\n'
            '🏆 ${match.league}$matchdayInfo\n'
            '📅 $formattedDate',
        history: [],
        minOdds: settings.minOdds,
        maxOdds: settings.maxOdds,
        riskLevel: settings.riskLevel,
        // Pass match info for ML data collection
        matchId: match.id.toString(),
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        leagueCode: match.leagueCode,
        matchDate: match.matchDate.toIso8601String(),
      );

      setState(() {
        _aiAnalysis = result['response'] as String?;
        _isLoadingAnalysis = false;
        // Decrease remaining count after successful request
        if (!_isPremium && _remainingRequests > 0) {
          _remainingRequests--;
        }
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
          // Save prediction button (only for scheduled matches)
          if (match.isScheduled)
            IconButton(
              icon: Icon(
                _hasPrediction ? Icons.bookmark : Icons.bookmark_border,
                color: _hasPrediction ? Theme.of(context).colorScheme.primary : null,
              ),
              onPressed: _hasPrediction ? _removePrediction : _showSavePredictionDialog,
              tooltip: _hasPrediction ? 'Remove prediction' : 'Save prediction',
            ),
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
                '⚠️ Please bet responsibly. Predictions do not guarantee results.',
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

    // Initial state - show button to request analysis
    if (_aiAnalysis == null && !_isLoadingAnalysis) {
      final bool canRequest = _isPremium || _remainingRequests > 0;

      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Icon(
                Icons.psychology,
                size: 48,
                color: Theme.of(context).colorScheme.primary.withOpacity(0.7),
              ),
              const SizedBox(height: 12),
              const Text(
                'AI Match Analysis',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Get detailed analysis from Claude AI including predictions, team form, and betting recommendations.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 16),

              // Limit warning
              if (!_isPremium && _limitsLoaded)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: _remainingRequests > 3
                        ? Colors.blue.withOpacity(0.1)
                        : Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _remainingRequests > 3
                          ? Colors.blue.withOpacity(0.3)
                          : Colors.orange.withOpacity(0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.info_outline,
                        size: 16,
                        color: _remainingRequests > 3 ? Colors.blue : Colors.orange,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _remainingRequests > 0
                            ? 'This uses 1 of your $_remainingRequests daily AI requests'
                            : 'No AI requests remaining today',
                        style: TextStyle(
                          fontSize: 12,
                          color: _remainingRequests > 3 ? Colors.blue[700] : Colors.orange[700],
                        ),
                      ),
                    ],
                  ),
                ),
              if (_isPremium && _limitsLoaded)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.star, size: 16, color: Colors.green),
                      SizedBox(width: 8),
                      Text(
                        'Premium: Unlimited AI requests',
                        style: TextStyle(fontSize: 12, color: Colors.green),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: canRequest ? _loadAiAnalysis : null,
                icon: const Icon(Icons.auto_awesome),
                label: Text(canRequest ? 'Get AI Analysis' : 'Limit Reached'),
              ),

              if (!canRequest && !_isPremium) ...[
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => context.go('/premium'),
                  child: const Text('Upgrade to Premium for unlimited'),
                ),
              ],
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
                    'AI Analysis',
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
