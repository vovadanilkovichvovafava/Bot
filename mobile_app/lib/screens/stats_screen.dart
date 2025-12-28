import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models/prediction.dart';
import '../providers/predictions_provider.dart';

class StatsScreen extends ConsumerWidget {
  const StatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final predictionsState = ref.watch(predictionsProvider);
    final stats = ref.watch(predictionStatsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistics'),
        centerTitle: true,
        actions: [
          if (stats.hasData)
            PopupMenuButton<String>(
              onSelected: (value) async {
                if (value == 'clear') {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Clear All Predictions'),
                      content: const Text(
                        'Are you sure you want to delete all saved predictions? This cannot be undone.',
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context, false),
                          child: const Text('Cancel'),
                        ),
                        FilledButton(
                          onPressed: () => Navigator.pop(context, true),
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.red,
                          ),
                          child: const Text('Delete All'),
                        ),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    ref.read(predictionsProvider.notifier).clearAll();
                  }
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'clear',
                  child: Row(
                    children: [
                      Icon(Icons.delete_outline, color: Colors.red),
                      SizedBox(width: 8),
                      Text('Clear All'),
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
      body: predictionsState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : stats.hasData
              ? _buildStatsContent(context, ref, stats, predictionsState.predictions)
              : _buildEmptyState(context),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.bar_chart_rounded,
                size: 64,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No Predictions Yet',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Save your predictions from match details to track your accuracy and build your statistics.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 32),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _FeatureRow(
                      icon: Icons.bookmark_add,
                      title: 'Save Predictions',
                      description: 'Tap the bookmark icon on any match',
                    ),
                    const Divider(height: 24),
                    _FeatureRow(
                      icon: Icons.check_circle_outline,
                      title: 'Mark Results',
                      description: 'Update outcomes when matches finish',
                    ),
                    const Divider(height: 24),
                    _FeatureRow(
                      icon: Icons.trending_up,
                      title: 'Track Accuracy',
                      description: 'See your win rate and streaks',
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

  Widget _buildStatsContent(
    BuildContext context,
    WidgetRef ref,
    PredictionStats stats,
    List<Prediction> predictions,
  ) {
    return RefreshIndicator(
      onRefresh: () => ref.read(predictionsProvider.notifier).refresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Main stats card
            _buildOverviewCard(context, stats),

            const SizedBox(height: 16),

            // Streak card
            if (stats.hasDecidedPredictions)
              _buildStreakCard(context, stats),

            if (stats.hasDecidedPredictions)
              const SizedBox(height: 16),

            // Stats breakdown
            _buildBreakdownCard(context, stats),

            const SizedBox(height: 16),

            // Recent predictions
            _buildRecentPredictions(context, ref, predictions),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewCard(BuildContext context, PredictionStats stats) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              children: [
                Icon(
                  Icons.analytics,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Overview',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Accuracy circle
            SizedBox(
              width: 120,
              height: 120,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 120,
                    height: 120,
                    child: CircularProgressIndicator(
                      value: stats.hasDecidedPredictions ? stats.accuracy / 100 : 0,
                      strokeWidth: 12,
                      backgroundColor: Colors.grey[200],
                      valueColor: AlwaysStoppedAnimation<Color>(
                        _getAccuracyColor(stats.accuracy),
                      ),
                    ),
                  ),
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        stats.hasDecidedPredictions
                            ? '${stats.accuracy.toStringAsFixed(1)}%'
                            : '—',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: _getAccuracyColor(stats.accuracy),
                        ),
                      ),
                      const Text(
                        'Accuracy',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Stats row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _StatItem(
                  label: 'Total',
                  value: stats.total.toString(),
                  color: Theme.of(context).colorScheme.primary,
                ),
                _StatItem(
                  label: 'Wins',
                  value: stats.wins.toString(),
                  color: Colors.green,
                ),
                _StatItem(
                  label: 'Losses',
                  value: stats.losses.toString(),
                  color: Colors.red,
                ),
                _StatItem(
                  label: 'Pending',
                  value: stats.pending.toString(),
                  color: Colors.orange,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStreakCard(BuildContext context, PredictionStats stats) {
    final isWinStreak = stats.streak > 0;
    final streakCount = stats.streak.abs();

    if (streakCount == 0) return const SizedBox.shrink();

    return Card(
      color: isWinStreak ? Colors.green[50] : Colors.red[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isWinStreak ? Colors.green : Colors.red,
                shape: BoxShape.circle,
              ),
              child: Icon(
                isWinStreak ? Icons.local_fire_department : Icons.trending_down,
                color: Colors.white,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isWinStreak ? 'Win Streak' : 'Losing Streak',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: isWinStreak ? Colors.green[800] : Colors.red[800],
                  ),
                ),
                Text(
                  '$streakCount in a row',
                  style: TextStyle(
                    color: isWinStreak ? Colors.green[600] : Colors.red[600],
                  ),
                ),
              ],
            ),
            const Spacer(),
            Text(
              streakCount.toString(),
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: isWinStreak ? Colors.green : Colors.red,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBreakdownCard(BuildContext context, PredictionStats stats) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.pie_chart,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Breakdown',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // By bet type
            if (stats.byBetType.isNotEmpty) ...[
              const Text(
                'By Bet Type',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 8),
              ...stats.byBetType.entries.map((entry) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(
                        _formatBetType(entry.key),
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                    ),
                    Expanded(
                      flex: 3,
                      child: LinearProgressIndicator(
                        value: entry.value.accuracy / 100,
                        backgroundColor: Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _getAccuracyColor(entry.value.accuracy),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 60,
                      child: Text(
                        '${entry.value.wins}/${entry.value.total}',
                        textAlign: TextAlign.end,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              )),
              const SizedBox(height: 16),
            ],

            // By league
            if (stats.byLeague.isNotEmpty) ...[
              const Text(
                'By League',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: stats.byLeague.entries.map((entry) => Chip(
                  label: Text('${entry.key}: ${entry.value}'),
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                )).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildRecentPredictions(
    BuildContext context,
    WidgetRef ref,
    List<Prediction> predictions,
  ) {
    final sortedPredictions = List<Prediction>.from(predictions)
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.history,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Recent Predictions',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            ...sortedPredictions.take(10).map((prediction) => _PredictionTile(
              prediction: prediction,
              onUpdateResult: (result) {
                ref.read(predictionsProvider.notifier).updateResult(
                  prediction.matchId,
                  result,
                );
              },
              onDelete: () {
                ref.read(predictionsProvider.notifier).removePrediction(
                  prediction.matchId,
                );
              },
            )),

            if (predictions.length > 10)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  '+ ${predictions.length - 10} more predictions',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Color _getAccuracyColor(double accuracy) {
    if (accuracy >= 60) return Colors.green;
    if (accuracy >= 45) return Colors.orange;
    return Colors.red;
  }

  String _formatBetType(String betType) {
    return betType
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word.isNotEmpty
            ? '${word[0].toUpperCase()}${word.substring(1)}'
            : '')
        .join(' ');
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatItem({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }
}

class _FeatureRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _FeatureRow({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primaryContainer,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: Theme.of(context).colorScheme.primary),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              Text(
                description,
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PredictionTile extends StatelessWidget {
  final Prediction prediction;
  final Function(String) onUpdateResult;
  final VoidCallback onDelete;

  const _PredictionTile({
    required this.prediction,
    required this.onUpdateResult,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _getResultColor().withOpacity(0.3),
          width: 2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      prediction.matchName,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${prediction.competition} • ${dateFormat.format(prediction.matchDate ?? prediction.createdAt)}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              _buildResultBadge(context),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  prediction.betType,
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${prediction.confidence.toStringAsFixed(0)}% confidence',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
              if (prediction.odds != null) ...[
                const SizedBox(width: 8),
                Text(
                  '@${prediction.odds!.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
              const Spacer(),
              if (prediction.isPending)
                PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'delete') {
                      onDelete();
                    } else {
                      onUpdateResult(value);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.orange[100],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Mark result',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.orange[800],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Icon(
                          Icons.arrow_drop_down,
                          size: 16,
                          color: Colors.orange[800],
                        ),
                      ],
                    ),
                  ),
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'win',
                      child: Row(
                        children: [
                          Icon(Icons.check_circle, color: Colors.green),
                          SizedBox(width: 8),
                          Text('Won'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'loss',
                      child: Row(
                        children: [
                          Icon(Icons.cancel, color: Colors.red),
                          SizedBox(width: 8),
                          Text('Lost'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'void',
                      child: Row(
                        children: [
                          Icon(Icons.block, color: Colors.grey),
                          SizedBox(width: 8),
                          Text('Void'),
                        ],
                      ),
                    ),
                    const PopupMenuDivider(),
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(Icons.delete_outline, color: Colors.red),
                          SizedBox(width: 8),
                          Text('Delete'),
                        ],
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildResultBadge(BuildContext context) {
    if (prediction.isPending) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.orange[100],
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          'Pending',
          style: TextStyle(
            fontSize: 12,
            color: Colors.orange[800],
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: _getResultColor().withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        prediction.resultDisplay,
        style: TextStyle(
          fontSize: 12,
          color: _getResultColor(),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Color _getResultColor() {
    if (prediction.isWin) return Colors.green;
    if (prediction.isLoss) return Colors.red;
    if (prediction.isVoid) return Colors.grey;
    return Colors.orange;
  }
}
