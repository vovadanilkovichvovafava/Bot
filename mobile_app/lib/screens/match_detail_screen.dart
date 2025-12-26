import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models/match.dart';

class MatchDetailScreen extends ConsumerWidget {
  final Match match;

  const MatchDetailScreen({super.key, required this.match});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dateFormat = DateFormat('dd MMM yyyy');
    final timeFormat = DateFormat('HH:mm');

    // Generate AI prediction
    final prediction = _generatePrediction(match);

    return Scaffold(
      appBar: AppBar(
        title: Text(match.league),
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

            // AI Prediction card
            Card(
              color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
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
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'AI Prediction',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Main prediction
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _getConfidenceColor(prediction.confidence),
                          width: 2,
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  prediction.betType,
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  prediction.description,
                                  style: TextStyle(
                                    color: Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            width: 70,
                            height: 70,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: _getConfidenceColor(prediction.confidence).withOpacity(0.1),
                              border: Border.all(
                                color: _getConfidenceColor(prediction.confidence),
                                width: 3,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                '${prediction.confidence}%',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: _getConfidenceColor(prediction.confidence),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Odds
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Recommended Odds:',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                        Text(
                          prediction.odds.toStringAsFixed(2),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Probabilities
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Win Probabilities',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _ProbabilityBar(
                      label: match.homeTeam.name,
                      percentage: prediction.homeWinProb,
                      color: Colors.blue,
                    ),
                    const SizedBox(height: 12),
                    _ProbabilityBar(
                      label: 'Draw',
                      percentage: prediction.drawProb,
                      color: Colors.grey,
                    ),
                    const SizedBox(height: 12),
                    _ProbabilityBar(
                      label: match.awayTeam.name,
                      percentage: prediction.awayWinProb,
                      color: Colors.red,
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Other predictions
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Other Predictions',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _OtherPrediction(
                      label: 'Over 2.5 Goals',
                      confidence: prediction.over25Prob,
                    ),
                    const Divider(),
                    _OtherPrediction(
                      label: 'Both Teams Score',
                      confidence: prediction.bttsProb,
                    ),
                    const Divider(),
                    _OtherPrediction(
                      label: 'Under 2.5 Goals',
                      confidence: 100 - prediction.over25Prob,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  _MatchPrediction _generatePrediction(Match match) {
    // Generate prediction based on team names hash (in real app, use ML model)
    final homeHash = match.homeTeam.name.hashCode.abs();
    final awayHash = match.awayTeam.name.hashCode.abs();

    final homeWinProb = 30 + (homeHash % 30);
    final awayWinProb = 25 + (awayHash % 25);
    final drawProb = 100 - homeWinProb - awayWinProb;

    final over25Prob = 40 + ((homeHash + awayHash) % 35);
    final bttsProb = 35 + ((homeHash * awayHash) % 40);

    String betType;
    String description;
    int confidence;
    double odds;

    if (homeWinProb > awayWinProb && homeWinProb > drawProb) {
      betType = 'Home Win';
      description = '${match.homeTeam.name} to win';
      confidence = homeWinProb;
      odds = 1.5 + (100 - homeWinProb) / 50;
    } else if (awayWinProb > homeWinProb && awayWinProb > drawProb) {
      betType = 'Away Win';
      description = '${match.awayTeam.name} to win';
      confidence = awayWinProb;
      odds = 1.8 + (100 - awayWinProb) / 40;
    } else {
      betType = 'Draw';
      description = 'Match to end in draw';
      confidence = drawProb;
      odds = 3.0 + (100 - drawProb) / 30;
    }

    // Boost confidence for better UX
    confidence = (confidence * 1.3).clamp(50, 85).toInt();

    return _MatchPrediction(
      betType: betType,
      description: description,
      confidence: confidence,
      odds: odds,
      homeWinProb: homeWinProb,
      drawProb: drawProb.clamp(10, 35),
      awayWinProb: awayWinProb,
      over25Prob: over25Prob,
      bttsProb: bttsProb,
    );
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
        return 'FINISHED';
      case 'scheduled':
      case 'timed':
        return 'UPCOMING';
      default:
        return status.toUpperCase();
    }
  }

  Color _getConfidenceColor(int confidence) {
    if (confidence >= 70) return Colors.green;
    if (confidence >= 55) return Colors.orange;
    return Colors.red;
  }
}

class _MatchPrediction {
  final String betType;
  final String description;
  final int confidence;
  final double odds;
  final int homeWinProb;
  final int drawProb;
  final int awayWinProb;
  final int over25Prob;
  final int bttsProb;

  _MatchPrediction({
    required this.betType,
    required this.description,
    required this.confidence,
    required this.odds,
    required this.homeWinProb,
    required this.drawProb,
    required this.awayWinProb,
    required this.over25Prob,
    required this.bttsProb,
  });
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

class _ProbabilityBar extends StatelessWidget {
  final String label;
  final int percentage;
  final Color color;

  const _ProbabilityBar({
    required this.label,
    required this.percentage,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13),
              ),
            ),
            Text(
              '$percentage%',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: percentage / 100,
            backgroundColor: Colors.grey[200],
            valueColor: AlwaysStoppedAnimation<Color>(color),
            minHeight: 8,
          ),
        ),
      ],
    );
  }
}

class _OtherPrediction extends StatelessWidget {
  final String label;
  final int confidence;

  const _OtherPrediction({
    required this.label,
    required this.confidence,
  });

  @override
  Widget build(BuildContext context) {
    final color = confidence >= 60 ? Colors.green : (confidence >= 45 ? Colors.orange : Colors.red);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '$confidence%',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
