import 'package:flutter/material.dart';

/// A reusable empty state widget for when there's no data to display
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Color? iconColor;
  final double iconSize;

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
    this.iconColor,
    this.iconSize = 64,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: const Duration(milliseconds: 500),
              builder: (context, value, child) {
                return Transform.scale(
                  scale: 0.5 + (0.5 * value),
                  child: Opacity(
                    opacity: value,
                    child: child,
                  ),
                );
              },
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: (iconColor ?? theme.colorScheme.primary).withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  size: iconSize,
                  color: iconColor ?? theme.colorScheme.primary.withOpacity(0.6),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              title,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(
                subtitle!,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.refresh),
                label: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// Empty state for no matches
  factory EmptyState.noMatches({VoidCallback? onRefresh}) {
    return EmptyState(
      icon: Icons.sports_soccer,
      title: 'No Matches',
      subtitle: 'There are no matches scheduled for this period',
      actionLabel: onRefresh != null ? 'Refresh' : null,
      onAction: onRefresh,
      iconColor: Colors.grey,
    );
  }

  /// Empty state for no predictions
  factory EmptyState.noPredictions({VoidCallback? onAction}) {
    return EmptyState(
      icon: Icons.auto_graph,
      title: 'No Predictions Yet',
      subtitle: 'Start making predictions to track your performance',
      actionLabel: onAction != null ? 'Browse Matches' : null,
      onAction: onAction,
      iconColor: Colors.blue,
    );
  }

  /// Empty state for no favourites
  factory EmptyState.noFavourites({VoidCallback? onAction}) {
    return EmptyState(
      icon: Icons.star_border,
      title: 'No Favourites',
      subtitle: 'Add teams and leagues to your favourites for quick access',
      actionLabel: onAction != null ? 'Browse Leagues' : null,
      onAction: onAction,
      iconColor: Colors.amber,
    );
  }

  /// Empty state for no live matches
  factory EmptyState.noLiveMatches({VoidCallback? onRefresh}) {
    return EmptyState(
      icon: Icons.live_tv,
      title: 'No Live Matches',
      subtitle: 'There are no matches currently in play',
      actionLabel: onRefresh != null ? 'Refresh' : null,
      onAction: onRefresh,
      iconColor: Colors.red,
    );
  }

  /// Empty state for no search results
  factory EmptyState.noSearchResults({String? query}) {
    return EmptyState(
      icon: Icons.search_off,
      title: 'No Results Found',
      subtitle: query != null
          ? 'No matches found for "$query"'
          : 'Try adjusting your search or filters',
      iconColor: Colors.grey,
    );
  }

  /// Empty state for network error
  factory EmptyState.networkError({VoidCallback? onRetry}) {
    return EmptyState(
      icon: Icons.wifi_off,
      title: 'Connection Error',
      subtitle: 'Please check your internet connection and try again',
      actionLabel: onRetry != null ? 'Try Again' : null,
      onAction: onRetry,
      iconColor: Colors.red,
    );
  }

  /// Empty state for loading error
  factory EmptyState.error({String? message, VoidCallback? onRetry}) {
    return EmptyState(
      icon: Icons.error_outline,
      title: 'Something Went Wrong',
      subtitle: message ?? 'An unexpected error occurred',
      actionLabel: onRetry != null ? 'Try Again' : null,
      onAction: onRetry,
      iconColor: Colors.red,
    );
  }
}

/// A smaller inline empty state for lists
class EmptyStateSmall extends StatelessWidget {
  final IconData icon;
  final String message;
  final Color? color;

  const EmptyStateSmall({
    super.key,
    required this.icon,
    required this.message,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveColor = color ?? theme.colorScheme.onSurfaceVariant;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 20, color: effectiveColor),
          const SizedBox(width: 8),
          Text(
            message,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: effectiveColor,
            ),
          ),
        ],
      ),
    );
  }
}
