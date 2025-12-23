import 'package:flutter/material.dart';
import '../utils/theme.dart';

class ConfidenceBadge extends StatelessWidget {
  final double confidence;
  final String? label;
  final bool showIcon;
  final double size;

  const ConfidenceBadge({
    super.key,
    required this.confidence,
    this.label,
    this.showIcon = true,
    this.size = 1.0,
  });

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.getConfidenceColor(confidence);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: 12 * size,
        vertical: 6 * size,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20 * size),
        border: Border.all(color: color, width: 1.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showIcon) ...[
            Icon(
              _getIcon(),
              color: color,
              size: 16 * size,
            ),
            SizedBox(width: 4 * size),
          ],
          Text(
            label ?? '${confidence.toInt()}%',
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 14 * size,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getIcon() {
    if (confidence >= 75) return Icons.trending_up;
    if (confidence >= 60) return Icons.trending_flat;
    return Icons.trending_down;
  }
}

class ConfidenceIndicator extends StatelessWidget {
  final double confidence;
  final double height;
  final double width;

  const ConfidenceIndicator({
    super.key,
    required this.confidence,
    this.height = 8,
    this.width = double.infinity,
  });

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.getConfidenceColor(confidence);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Confidence',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            Text(
              '${confidence.toInt()}%',
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(height / 2),
          child: SizedBox(
            height: height,
            width: width,
            child: LinearProgressIndicator(
              value: confidence / 100,
              backgroundColor: Colors.grey.shade200,
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ),
      ],
    );
  }
}
