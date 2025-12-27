import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../services/api_service.dart';
import '../models/match.dart';
import 'match_detail_screen.dart';

class LeagueMatchesScreen extends ConsumerStatefulWidget {
  final String leagueCode;
  final String leagueName;

  const LeagueMatchesScreen({
    super.key,
    required this.leagueCode,
    required this.leagueName,
  });

  @override
  ConsumerState<LeagueMatchesScreen> createState() => _LeagueMatchesScreenState();
}

class _LeagueMatchesScreenState extends ConsumerState<LeagueMatchesScreen> {
  List<Match> _matches = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMatches();
  }

  Future<void> _loadMatches() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final api = ref.read(apiServiceProvider);
      // Fetch matches for the next 7 days for this league
      final matches = await api.getMatches(league: widget.leagueCode);
      setState(() {
        _matches = matches;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.leagueName),
        centerTitle: true,
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text('Error loading matches', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                _error!,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[600]),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadMatches,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_matches.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.sports_soccer, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No upcoming matches',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Check back later for ${widget.leagueName} fixtures',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    // Group matches by date
    final groupedMatches = <String, List<Match>>{};
    for (final match in _matches) {
      final dateKey = DateFormat('EEEE, d MMMM').format(match.matchDate.toLocal());
      groupedMatches.putIfAbsent(dateKey, () => []).add(match);
    }

    return RefreshIndicator(
      onRefresh: _loadMatches,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: groupedMatches.length,
        itemBuilder: (context, index) {
          final dateKey = groupedMatches.keys.elementAt(index);
          final matches = groupedMatches[dateKey]!;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  dateKey,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ),
              ...matches.map((match) => _MatchCard(match: match)),
              const SizedBox(height: 8),
            ],
          );
        },
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
    final prediction = _generateQuickPrediction(match);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
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
          child: Row(
            children: [
              // Time
              SizedBox(
                width: 50,
                child: Column(
                  children: [
                    Text(
                      matchTime,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: _getStatusColor(match.status).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        _getStatusText(match.status),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: _getStatusColor(match.status),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              // Teams
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      match.homeTeam.name,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      match.awayTeam.name,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              // Score or Prediction
              if (match.homeScore != null && match.awayScore != null)
                Column(
                  children: [
                    Text(
                      '${match.homeScore}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${match.awayScore}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ],
                )
              else
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _getConfidenceColor(prediction.confidence).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            prediction.betType,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: _getConfidenceColor(prediction.confidence),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '${prediction.confidence}%',
                            style: TextStyle(
                              fontSize: 12,
                              color: _getConfidenceColor(prediction.confidence),
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
    );
  }

  _QuickPrediction _generateQuickPrediction(Match match) {
    final homeHash = match.homeTeam.name.hashCode.abs();
    final awayHash = match.awayTeam.name.hashCode.abs();

    final homeWinProb = 30 + (homeHash % 30);
    final awayWinProb = 25 + (awayHash % 25);
    final drawProb = 100 - homeWinProb - awayWinProb;

    String betType;
    int confidence;

    if (homeWinProb > awayWinProb && homeWinProb > drawProb) {
      betType = '1';
      confidence = homeWinProb;
    } else if (awayWinProb > homeWinProb && awayWinProb > drawProb) {
      betType = '2';
      confidence = awayWinProb;
    } else {
      betType = 'X';
      confidence = drawProb;
    }

    confidence = (confidence * 1.3).clamp(50, 85).toInt();

    return _QuickPrediction(betType: betType, confidence: confidence);
  }

  Color _getConfidenceColor(int confidence) {
    if (confidence >= 70) return Colors.green;
    if (confidence >= 55) return Colors.orange;
    return Colors.red;
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'live':
      case 'in_play':
        return Colors.red;
      case 'finished':
        return Colors.green;
      default:
        return Colors.blue;
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

class _QuickPrediction {
  final String betType;
  final int confidence;

  _QuickPrediction({required this.betType, required this.confidence});
}
