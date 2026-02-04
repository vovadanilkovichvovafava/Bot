import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../utils/theme.dart';

class FavoritesScreen extends ConsumerStatefulWidget {
  const FavoritesScreen({super.key});

  @override
  ConsumerState<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends ConsumerState<FavoritesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Favorites',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  // Add button
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppTheme.darkCard,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.darkBorder),
                    ),
                    child: IconButton(
                      icon: const Icon(
                        Icons.add,
                        color: AppTheme.primaryColor,
                        size: 20,
                      ),
                      onPressed: () {
                        _showAddSheet(context);
                      },
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Tab Bar
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              decoration: BoxDecoration(
                color: AppTheme.darkCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.darkBorder),
              ),
              child: TabBar(
                controller: _tabController,
                indicatorSize: TabBarIndicatorSize.tab,
                indicator: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                dividerColor: Colors.transparent,
                labelColor: AppTheme.primaryColor,
                unselectedLabelColor: Colors.white.withOpacity(0.5),
                labelStyle: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
                tabs: const [
                  Tab(text: 'Teams'),
                  Tab(text: 'Leagues'),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Tab Content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: const [
                  _FavoriteTeamsTab(),
                  _FavoriteLeaguesTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.darkCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.darkBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Add to Favorites',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            // Search field
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: AppTheme.darkSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.darkBorder),
              ),
              child: TextField(
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Search teams or leagues...',
                  hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                  border: InputBorder.none,
                  prefixIcon: Icon(
                    Icons.search,
                    color: Colors.white.withOpacity(0.5),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            // Quick add options
            Row(
              children: [
                Expanded(
                  child: _QuickAddOption(
                    icon: Icons.shield,
                    label: 'Add Team',
                    onTap: () {},
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickAddOption(
                    icon: Icons.emoji_events,
                    label: 'Add League',
                    onTap: () {},
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

class _QuickAddOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickAddOption({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.darkSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.darkBorder),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: AppTheme.primaryColor,
              size: 28,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FavoriteTeamsTab extends StatelessWidget {
  const _FavoriteTeamsTab();

  @override
  Widget build(BuildContext context) {
    final teams = [
      _TeamData('Manchester City', 'Premier League', AppTheme.primaryColor),
      _TeamData('Real Madrid', 'La Liga', AppTheme.fc26Gold),
      _TeamData('Barcelona', 'La Liga', AppTheme.neonPink),
    ];

    if (teams.isEmpty) {
      return _EmptyState(
        icon: Icons.shield_outlined,
        title: 'No favorite teams yet',
        subtitle: 'Add teams to get personalized predictions',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
      itemCount: teams.length,
      itemBuilder: (context, index) {
        final team = teams[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _FavoriteTeamCard(team: team),
        );
      },
    );
  }
}

class _TeamData {
  final String name;
  final String league;
  final Color color;

  _TeamData(this.name, this.league, this.color);
}

class _FavoriteTeamCard extends StatelessWidget {
  final _TeamData team;

  const _FavoriteTeamCard({required this.team});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.darkBorder),
      ),
      child: Row(
        children: [
          // Team icon
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: team.color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: team.color.withOpacity(0.3)),
            ),
            child: Icon(
              Icons.shield,
              color: team.color,
              size: 24,
            ),
          ),
          const SizedBox(width: 14),

          // Team info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  team.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  team.league,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.4),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),

          // Notification toggle
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppTheme.darkSurface,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.notifications_active,
              color: AppTheme.primaryColor,
              size: 18,
            ),
          ),
          const SizedBox(width: 8),

          // Delete button
          GestureDetector(
            onTap: () {
              // Remove from favorites
            },
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppTheme.errorColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.delete_outline,
                color: AppTheme.errorColor,
                size: 18,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FavoriteLeaguesTab extends StatelessWidget {
  const _FavoriteLeaguesTab();

  @override
  Widget build(BuildContext context) {
    final leagues = [
      _LeagueData('Premier League', 'England', 'PL', AppTheme.neonPink),
      _LeagueData('Champions League', 'Europe', 'UCL', AppTheme.accentColor),
    ];

    if (leagues.isEmpty) {
      return _EmptyState(
        icon: Icons.emoji_events_outlined,
        title: 'No favorite leagues yet',
        subtitle: 'Add leagues to filter predictions',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
      itemCount: leagues.length,
      itemBuilder: (context, index) {
        final league = leagues[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _FavoriteLeagueCard(league: league),
        );
      },
    );
  }
}

class _LeagueData {
  final String name;
  final String country;
  final String code;
  final Color color;

  _LeagueData(this.name, this.country, this.code, this.color);
}

class _FavoriteLeagueCard extends StatelessWidget {
  final _LeagueData league;

  const _FavoriteLeagueCard({required this.league});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.darkBorder),
      ),
      child: Row(
        children: [
          // League icon
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: league.color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: league.color.withOpacity(0.3)),
            ),
            child: Center(
              child: Text(
                league.code,
                style: TextStyle(
                  color: league.color,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),

          // League info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  league.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  league.country,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.4),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),

          // Notification toggle
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppTheme.darkSurface,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.notifications_active,
              color: AppTheme.primaryColor,
              size: 18,
            ),
          ),
          const SizedBox(width: 8),

          // Delete button
          GestureDetector(
            onTap: () {
              // Remove from favorites
            },
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppTheme.errorColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.delete_outline,
                color: AppTheme.errorColor,
                size: 18,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                icon,
                size: 40,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white.withOpacity(0.5),
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Add Now'),
            ),
          ],
        ),
      ),
    );
  }
}
