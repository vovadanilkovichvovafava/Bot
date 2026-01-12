import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models/prediction.dart';
import '../providers/predictions_provider.dart';
import '../providers/auth_provider.dart';

class StatsScreen extends ConsumerWidget {
  const StatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final predictionsState = ref.watch(predictionsProvider);
    final localStats = ref.watch(predictionStatsProvider);
    final authState = ref.watch(authStateProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistics'),
        centerTitle: true,
        actions: [
          if (localStats.hasData)
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
                      Text('Clear Saved'),
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // User's AI prediction stats from profile
            if (user != null) _buildUserStatsCard(context, user),

            if (user != null) const SizedBox(height: 16),

            // Local saved predictions
            if (localStats.hasData) ...[
              _buildLocalPredictionsCard(context, ref, localStats, predictionsState.predictions),
            ] else ...[
              _buildEmptyLocalCard(context),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildUserStatsCard(BuildContext context, dynamic user) {
    final totalPredictions = user.totalPredictions ?? 0;
    final correctPredictions = user.correctPredictions ?? 0;
    final accuracy = user.accuracy ?? 0.0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              children: [
                Icon(
                  Icons.auto_awesome,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                const Text(
                  'AI Predictions',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                if (user.isPremium)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFFFD700), Color(0xFFFFA000)],
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'PRO',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
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
                      value: totalPredictions > 0 ? accuracy / 100 : 0,
                      strokeWidth: 12,
                      backgroundColor: Colors.grey[200],
                      valueColor: AlwaysStoppedAnimation<Color>(
                        _getAccuracyColor(accuracy),
                      ),
                    ),
                  ),
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        totalPredictions > 0
                            ? '${accuracy.toStringAsFixed(1)}%'
                            : '—',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: _getAccuracyColor(accuracy),
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
                  value: totalPredictions.toString(),
                  color: Theme.of(context).colorScheme.primary,
                ),
                _StatItem(
                  label: 'Correct',
                  value: correctPredictions.toString(),
                  color: Colors.green,
                ),
                _StatItem(
                  label: 'Wrong',
                  value: (totalPredictions - correctPredictions).toString(),
                  color: Colors.red,
                ),
              ],
            ),

            if (totalPredictions == 0) ...[
              const SizedBox(height: 16),
              Text(
                'Ask AI about matches to build your stats',
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 13,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyLocalCard(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              children: [
                Icon(
                  Icons.bookmark_outline,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Saved Predictions',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.bookmark_add,
                    size: 32,
                    color: Theme.of(context).colorScheme.primary.withOpacity(0.5),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'No saved predictions',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Save predictions from match details\nto track your personal picks',
                    style: TextStyle(
                      color: Colors.grey[500],
                      fontSize: 12,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocalPredictionsCard(
    BuildContext context,
    WidgetRef ref,
    PredictionStats stats,
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
                  Icons.bookmark,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Saved Predictions',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Mini stats row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _MiniStat(label: 'Total', value: stats.total, color: Colors.blue),
                _MiniStat(label: 'Wins', value: stats.wins, color: Colors.green),
                _MiniStat(label: 'Losses', value: stats.losses, color: Colors.red),
                _MiniStat(label: 'Pending', value: stats.pending, color: Colors.orange),
              ],
            ),

            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),

            // Recent predictions list
            ...sortedPredictions.take(5).map((prediction) => _PredictionTile(
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

            if (predictions.length > 5)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  '+ ${predictions.length - 5} more',
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

class _MiniStat extends StatelessWidget {
  final String label;
  final int value;
  final Color color;

  const _MiniStat({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value.toString(),
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
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
