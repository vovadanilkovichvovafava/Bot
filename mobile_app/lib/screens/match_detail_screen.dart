import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:intl/intl.dart';

import '../models/match.dart';
import '../services/api_service.dart';

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

  @override
  void initState() {
    super.initState();
    _loadAiAnalysis();
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
        message: 'Анализ матча ${widget.match.homeTeam.name} vs ${widget.match.awayTeam.name}',
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
          if (!match.isFinished && (_analysisError || _aiAnalysis != null))
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _loadAiAnalysis,
              tooltip: 'Обновить анализ',
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
                        'Тур ${match.matchday}',
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
                                'Дома',
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
                                'В гостях',
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
                      'Информация о матче',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _InfoRow(
                      icon: Icons.emoji_events,
                      label: 'Турнир',
                      value: match.league,
                    ),
                    if (match.matchday != null)
                      _InfoRow(
                        icon: Icons.format_list_numbered,
                        label: 'Тур',
                        value: '${match.matchday}',
                      ),
                    _InfoRow(
                      icon: Icons.calendar_today,
                      label: 'Дата',
                      value: dateFormat.format(match.matchDate.toLocal()),
                    ),
                    _InfoRow(
                      icon: Icons.access_time,
                      label: 'Время',
                      value: timeFormat.format(match.matchDate.toLocal()),
                    ),
                    _InfoRow(
                      icon: Icons.info_outline,
                      label: 'Статус',
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
                    'Матч завершён',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Финальный счёт: ${match.homeScore} - ${match.awayScore}',
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
                'Загрузка AI-анализа...',
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Claude AI анализирует матч',
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
                'AI-анализ недоступен',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Сервер просыпается. Нажмите кнопку обновления.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _loadAiAnalysis,
                icon: const Icon(Icons.refresh),
                label: const Text('Повторить'),
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
        return 'Завершён';
      case 'scheduled':
      case 'timed':
        return 'Скоро';
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
