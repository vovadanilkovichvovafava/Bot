import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/api_service.dart';

// Favorites state
class FavoritesState {
  final List<String> teams;
  final List<Map<String, dynamic>> leagues;
  final bool isLoading;
  final String? error;

  const FavoritesState({
    this.teams = const [],
    this.leagues = const [],
    this.isLoading = false,
    this.error,
  });

  FavoritesState copyWith({
    List<String>? teams,
    List<Map<String, dynamic>>? leagues,
    bool? isLoading,
    String? error,
  }) {
    return FavoritesState(
      teams: teams ?? this.teams,
      leagues: leagues ?? this.leagues,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// Favorites notifier
class FavoritesNotifier extends StateNotifier<FavoritesState> {
  final ApiService _api;

  FavoritesNotifier(this._api) : super(const FavoritesState()) {
    loadFavorites();
  }

  Future<void> loadFavorites() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final teams = await _api.getFavoriteTeams();
      final leagues = await _api.getFavoriteLeagues();
      state = state.copyWith(
        teams: teams,
        leagues: leagues,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> addTeam(String teamName) async {
    try {
      await _api.addFavoriteTeam(teamName);
      state = state.copyWith(teams: [...state.teams, teamName]);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> removeTeam(String teamName) async {
    try {
      await _api.removeFavoriteTeam(teamName);
      state = state.copyWith(
        teams: state.teams.where((t) => t != teamName).toList(),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> addLeague(String leagueCode) async {
    try {
      await _api.addFavoriteLeague(leagueCode);
      await loadFavorites(); // Reload to get full league info
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> removeLeague(String leagueCode) async {
    try {
      await _api.removeFavoriteLeague(leagueCode);
      state = state.copyWith(
        leagues: state.leagues.where((l) => l['code'] != leagueCode).toList(),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}

// Provider
final favoritesProvider = StateNotifierProvider<FavoritesNotifier, FavoritesState>((ref) {
  final api = ref.watch(apiServiceProvider);
  return FavoritesNotifier(api);
});

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Избранное'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Команды'),
              Tab(text: 'Лиги'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _FavoriteTeamsTab(),
            _FavoriteLeaguesTab(),
          ],
        ),
      ),
    );
  }
}

class _FavoriteTeamsTab extends ConsumerWidget {
  const _FavoriteTeamsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(favoritesProvider);

    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.teams.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.star_outline,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'Нет избранных команд',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Добавьте команды для быстрого доступа',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => _showAddTeamDialog(context, ref),
              icon: const Icon(Icons.add),
              label: const Text('Добавить команду'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(favoritesProvider.notifier).loadFavorites(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: state.teams.length + 1,
        itemBuilder: (context, index) {
          if (index == state.teams.length) {
            return Padding(
              padding: const EdgeInsets.only(top: 8),
              child: OutlinedButton.icon(
                onPressed: () => _showAddTeamDialog(context, ref),
                icon: const Icon(Icons.add),
                label: const Text('Добавить команду'),
              ),
            );
          }

          final team = state.teams[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: const CircleAvatar(
                child: Icon(Icons.sports_soccer),
              ),
              title: Text(team),
              trailing: IconButton(
                icon: const Icon(Icons.delete_outline, color: Colors.red),
                onPressed: () {
                  ref.read(favoritesProvider.notifier).removeTeam(team);
                },
              ),
            ),
          );
        },
      ),
    );
  }

  void _showAddTeamDialog(BuildContext context, WidgetRef ref) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Добавить команду'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Название команды',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена'),
          ),
          FilledButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                ref.read(favoritesProvider.notifier).addTeam(controller.text.trim());
                Navigator.pop(context);
              }
            },
            child: const Text('Добавить'),
          ),
        ],
      ),
    );
  }
}

class _FavoriteLeaguesTab extends ConsumerWidget {
  const _FavoriteLeaguesTab();

  static const _availableLeagues = [
    ('PL', 'Premier League', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
    ('PD', 'La Liga', '🇪🇸'),
    ('BL1', 'Bundesliga', '🇩🇪'),
    ('SA', 'Serie A', '🇮🇹'),
    ('FL1', 'Ligue 1', '🇫🇷'),
    ('CL', 'Champions League', '🏆'),
    ('EL', 'Europa League', '🥈'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(favoritesProvider);
    final favoriteCodes = state.leagues.map((l) => l['code'] as String?).toSet();

    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(favoritesProvider.notifier).loadFavorites(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _availableLeagues.length,
        itemBuilder: (context, index) {
          final league = _availableLeagues[index];
          final isFavorite = favoriteCodes.contains(league.$1);

          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Text(league.$3, style: const TextStyle(fontSize: 28)),
              title: Text(league.$2),
              subtitle: Text(league.$1),
              trailing: IconButton(
                icon: Icon(
                  isFavorite ? Icons.star : Icons.star_outline,
                  color: isFavorite ? Colors.amber : Colors.grey,
                ),
                onPressed: () {
                  if (isFavorite) {
                    ref.read(favoritesProvider.notifier).removeLeague(league.$1);
                  } else {
                    ref.read(favoritesProvider.notifier).addLeague(league.$1);
                  }
                },
              ),
            ),
          );
        },
      ),
    );
  }
}
