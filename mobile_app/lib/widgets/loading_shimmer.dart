import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class LoadingShimmer extends StatelessWidget {
  final double height;
  final double width;
  final double borderRadius;

  const LoadingShimmer({
    super.key,
    this.height = 100,
    this.width = double.infinity,
    this.borderRadius = 12,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Shimmer.fromColors(
      baseColor: isDark ? Colors.grey.shade800 : Colors.grey.shade300,
      highlightColor: isDark ? Colors.grey.shade700 : Colors.grey.shade100,
      child: Container(
        height: height,
        width: width,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}

class MatchCardShimmer extends StatelessWidget {
  const MatchCardShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                LoadingShimmer(height: 14, width: 100),
                LoadingShimmer(height: 14, width: 50),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      LoadingShimmer(height: 18, width: 150),
                      SizedBox(height: 8),
                      LoadingShimmer(height: 18, width: 130),
                    ],
                  ),
                ),
                LoadingShimmer(
                  height: 60,
                  width: 60,
                  borderRadius: 8,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class MatchListShimmer extends StatelessWidget {
  final int count;

  const MatchListShimmer({super.key, this.count = 5});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: count,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, __) => const MatchCardShimmer(),
    );
  }
}
