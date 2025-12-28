import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../services/api_service.dart';

class SocialScreen extends ConsumerStatefulWidget {
  const SocialScreen({super.key});

  @override
  ConsumerState<SocialScreen> createState() => _SocialScreenState();
}

class _SocialScreenState extends ConsumerState<SocialScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _leaderboardPeriod = 'weekly';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Community'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.leaderboard), text: 'Leaderboard'),
            Tab(icon: Icon(Icons.people), text: 'Tipsters'),
            Tab(icon: Icon(Icons.dynamic_feed), text: 'Feed'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _LeaderboardTab(
            period: _leaderboardPeriod,
            onPeriodChanged: (p) => setState(() => _leaderboardPeriod = p),
          ),
          const _TipstersTab(),
          const _FeedTab(),
        ],
      ),
    );
  }
}

// Leaderboard Tab
class _LeaderboardTab extends StatelessWidget {
  final String period;
  final ValueChanged<String> onPeriodChanged;

  const _LeaderboardTab({
    required this.period,
    required this.onPeriodChanged,
  });

  @override
  Widget build(BuildContext context) {
    // Mock leaderboard data
    final leaders = [
      _LeaderboardEntry(1, 'BetMaster', 156, 72.5, 15, true),
      _LeaderboardEntry(2, 'FootballKing', 143, 71.2, 8, true),
      _LeaderboardEntry(3, 'AccuratePunter', 128, 68.9, 5, true),
      _LeaderboardEntry(4, 'WinningStreak', 112, 67.8, 12, false),
      _LeaderboardEntry(5, 'PremierPro', 98, 66.3, -2, false),
      _LeaderboardEntry(6, 'GoalPredictor', 87, 64.4, 3, false),
      _LeaderboardEntry(7, 'SharpBetter', 76, 63.2, 7, false),
      _LeaderboardEntry(8, 'OddsFinder', 65, 61.5, -1, false),
      _LeaderboardEntry(9, 'ValueHunter', 54, 60.8, 4, false),
      _LeaderboardEntry(10, 'TipsterAce', 43, 59.3, 2, false),
    ];

    return Column(
      children: [
        // Period selector
        Container(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _PeriodChip('Daily', 'daily', period, onPeriodChanged),
              const SizedBox(width: 8),
              _PeriodChip('Weekly', 'weekly', period, onPeriodChanged),
              const SizedBox(width: 8),
              _PeriodChip('Monthly', 'monthly', period, onPeriodChanged),
              const SizedBox(width: 8),
              _PeriodChip('All Time', 'alltime', period, onPeriodChanged),
            ],
          ),
        ),

        // Top 3 podium
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              _PodiumCard(leaders[1], Colors.grey.shade400, 80),
              const SizedBox(width: 8),
              _PodiumCard(leaders[0], Colors.amber, 100),
              const SizedBox(width: 8),
              _PodiumCard(leaders[2], Colors.brown.shade300, 60),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Rest of leaderboard
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: leaders.length - 3,
            itemBuilder: (context, index) {
              final entry = leaders[index + 3];
              return _LeaderboardListItem(entry: entry);
            },
          ),
        ),
      ],
    );
  }
}

class _LeaderboardEntry {
  final int rank;
  final String username;
  final int wins;
  final double accuracy;
  final int streak;
  final bool isVerified;

  _LeaderboardEntry(this.rank, this.username, this.wins, this.accuracy, this.streak, this.isVerified);
}

class _PeriodChip extends StatelessWidget {
  final String label;
  final String value;
  final String selected;
  final ValueChanged<String> onSelected;

  const _PeriodChip(this.label, this.value, this.selected, this.onSelected);

  @override
  Widget build(BuildContext context) {
    final isSelected = value == selected;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onSelected(value),
    );
  }
}

class _PodiumCard extends StatelessWidget {
  final _LeaderboardEntry entry;
  final Color color;
  final double height;

  const _PodiumCard(this.entry, this.color, this.height);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (entry.isVerified)
          const Icon(Icons.verified, color: Colors.blue, size: 16),
        CircleAvatar(
          radius: 24,
          backgroundColor: color,
          child: Text(
            entry.username[0],
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 20,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          entry.username,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        Text(
          '${entry.accuracy.toStringAsFixed(1)}%',
          style: TextStyle(
            color: Theme.of(context).colorScheme.primary,
            fontWeight: FontWeight.bold,
          ),
        ),
        Container(
          width: 60,
          height: height,
          decoration: BoxDecoration(
            color: color.withOpacity(0.3),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
          ),
          child: Center(
            child: Text(
              '#${entry.rank}',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
                color: color,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _LeaderboardListItem extends StatelessWidget {
  final _LeaderboardEntry entry;

  const _LeaderboardListItem({required this.entry});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 24,
              child: Text(
                '#${entry.rank}',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 8),
            CircleAvatar(
              child: Text(entry.username[0]),
            ),
          ],
        ),
        title: Row(
          children: [
            Text(entry.username),
            if (entry.isVerified) ...[
              const SizedBox(width: 4),
              const Icon(Icons.verified, color: Colors.blue, size: 16),
            ],
          ],
        ),
        subtitle: Text('${entry.wins} wins'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${entry.accuracy.toStringAsFixed(1)}%',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  entry.streak >= 0 ? Icons.trending_up : Icons.trending_down,
                  size: 14,
                  color: entry.streak >= 0 ? Colors.green : Colors.red,
                ),
                Text(
                  '${entry.streak >= 0 ? '+' : ''}${entry.streak}',
                  style: TextStyle(
                    fontSize: 12,
                    color: entry.streak >= 0 ? Colors.green : Colors.red,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// Tipsters Tab
class _TipstersTab extends StatelessWidget {
  const _TipstersTab();

  @override
  Widget build(BuildContext context) {
    // Mock tipsters data
    final tipsters = [
      _Tipster('PremierExpert', 'Premier League specialist', 'Premier League', 68.5, 3420, true, true),
      _Tipster('LaLigaPro', 'Spanish football analyst', 'La Liga', 65.2, 2100, true, false),
      _Tipster('BundesligaGuru', 'German football expert', 'Bundesliga', 63.8, 1850, true, true),
      _Tipster('SerieAKing', 'Italian football specialist', 'Serie A', 61.5, 1200, false, false),
      _Tipster('EuroChampion', 'Champions League focus', 'Champions League', 59.3, 980, false, true),
      _Tipster('ValueFinder', 'Finding value across leagues', null, 57.8, 650, false, false),
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: tipsters.length,
      itemBuilder: (context, index) {
        return _TipsterCard(tipster: tipsters[index]);
      },
    );
  }
}

class _Tipster {
  final String username;
  final String bio;
  final String? bestLeague;
  final double accuracy;
  final int followers;
  final bool isVerified;
  final bool isFollowing;

  _Tipster(this.username, this.bio, this.bestLeague, this.accuracy, this.followers, this.isVerified, this.isFollowing);
}

class _TipsterCard extends StatefulWidget {
  final _Tipster tipster;

  const _TipsterCard({required this.tipster});

  @override
  State<_TipsterCard> createState() => _TipsterCardState();
}

class _TipsterCardState extends State<_TipsterCard> {
  late bool _isFollowing;

  @override
  void initState() {
    super.initState();
    _isFollowing = widget.tipster.isFollowing;
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  child: Text(
                    widget.tipster.username[0],
                    style: const TextStyle(fontSize: 24),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            widget.tipster.username,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          if (widget.tipster.isVerified) ...[
                            const SizedBox(width: 4),
                            const Icon(Icons.verified, color: Colors.blue, size: 18),
                          ],
                        ],
                      ),
                      Text(
                        widget.tipster.bio,
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _StatBadge(
                  icon: Icons.percent,
                  label: 'Accuracy',
                  value: '${widget.tipster.accuracy.toStringAsFixed(1)}%',
                  color: Colors.green,
                ),
                const SizedBox(width: 12),
                _StatBadge(
                  icon: Icons.people,
                  label: 'Followers',
                  value: _formatNumber(widget.tipster.followers),
                  color: Colors.blue,
                ),
                if (widget.tipster.bestLeague != null) ...[
                  const SizedBox(width: 12),
                  _StatBadge(
                    icon: Icons.emoji_events,
                    label: 'Best',
                    value: widget.tipster.bestLeague!.split(' ').first,
                    color: Colors.orange,
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: _isFollowing
                  ? OutlinedButton.icon(
                      onPressed: () => setState(() => _isFollowing = false),
                      icon: const Icon(Icons.check),
                      label: const Text('Following'),
                    )
                  : FilledButton.icon(
                      onPressed: () => setState(() => _isFollowing = true),
                      icon: const Icon(Icons.add),
                      label: const Text('Follow'),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatNumber(int n) {
    if (n >= 1000) {
      return '${(n / 1000).toStringAsFixed(1)}K';
    }
    return n.toString();
  }
}

class _StatBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatBadge({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: color,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

// Feed Tab
class _FeedTab extends StatelessWidget {
  const _FeedTab();

  @override
  Widget build(BuildContext context) {
    // Mock feed data
    final predictions = [
      _SharedPrediction('BetMaster', 'Arsenal vs Chelsea', 'Premier League', 'Over 2.5 Goals', 1.85, 75, 42, true, null),
      _SharedPrediction('PremierPro', 'Barcelona vs Real Madrid', 'La Liga', 'BTTS Yes', 1.72, 80, 38, false, 'win'),
      _SharedPrediction('GoalPredictor', 'Bayern vs Dortmund', 'Bundesliga', 'Home Win', 1.65, 70, 25, true, null),
      _SharedPrediction('TipsterAce', 'Inter vs AC Milan', 'Serie A', 'Under 2.5 Goals', 2.10, 65, 18, false, 'loss'),
      _SharedPrediction('FormAnalyst', 'PSG vs Marseille', 'Ligue 1', 'Home Win', 1.45, 85, 56, true, null),
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: predictions.length,
      itemBuilder: (context, index) {
        return _PredictionFeedCard(prediction: predictions[index]);
      },
    );
  }
}

class _SharedPrediction {
  final String username;
  final String matchName;
  final String league;
  final String betType;
  final double odds;
  final int confidence;
  final int likes;
  final bool isLiked;
  final String? result;

  _SharedPrediction(this.username, this.matchName, this.league, this.betType, this.odds, this.confidence, this.likes, this.isLiked, this.result);
}

class _PredictionFeedCard extends StatefulWidget {
  final _SharedPrediction prediction;

  const _PredictionFeedCard({required this.prediction});

  @override
  State<_PredictionFeedCard> createState() => _PredictionFeedCardState();
}

class _PredictionFeedCardState extends State<_PredictionFeedCard> {
  late bool _isLiked;
  late int _likes;

  @override
  void initState() {
    super.initState();
    _isLiked = widget.prediction.isLiked;
    _likes = widget.prediction.likes;
  }

  void _toggleLike() {
    setState(() {
      if (_isLiked) {
        _likes--;
      } else {
        _likes++;
      }
      _isLiked = !_isLiked;
    });
  }

  void _sharePrediction() {
    Share.share(
      '${widget.prediction.username}\'s prediction:\n'
      '${widget.prediction.matchName}\n'
      '${widget.prediction.betType} @ ${widget.prediction.odds}\n'
      'Confidence: ${widget.prediction.confidence}%\n\n'
      'Shared from AI Betting Bot',
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasResult = widget.prediction.result != null;
    final isWin = widget.prediction.result == 'win';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        children: [
          // Header
          ListTile(
            leading: CircleAvatar(
              child: Text(widget.prediction.username[0]),
            ),
            title: Text(widget.prediction.username),
            subtitle: Text(widget.prediction.league),
            trailing: hasResult
                ? Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isWin ? Colors.green.withOpacity(0.2) : Colors.red.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      isWin ? 'Won' : 'Lost',
                      style: TextStyle(
                        color: isWin ? Colors.green : Colors.red,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  )
                : null,
          ),

          // Prediction content
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.prediction.matchName,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        widget.prediction.betType,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '@ ${widget.prediction.odds}',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        const Icon(Icons.trending_up, size: 16, color: Colors.green),
                        const SizedBox(width: 4),
                        Text(
                          '${widget.prediction.confidence}%',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.green,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Actions
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              children: [
                TextButton.icon(
                  onPressed: _toggleLike,
                  icon: Icon(
                    _isLiked ? Icons.favorite : Icons.favorite_border,
                    color: _isLiked ? Colors.red : null,
                  ),
                  label: Text('$_likes'),
                ),
                TextButton.icon(
                  onPressed: _sharePrediction,
                  icon: const Icon(Icons.share),
                  label: const Text('Share'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
