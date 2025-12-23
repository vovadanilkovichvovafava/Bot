import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final user = ref.watch(authStateProvider).user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        children: [
          // Profile section
          if (user != null)
            ListTile(
              leading: CircleAvatar(
                child: Text(
                  (user.username ?? user.email)[0].toUpperCase(),
                ),
              ),
              title: Text(user.username ?? user.email),
              subtitle: Text(user.email),
            ),
          const Divider(),

          // Language
          ListTile(
            leading: const Icon(Icons.language),
            title: const Text('Language'),
            subtitle: Text(_getLanguageName(settings.language)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showLanguageDialog(context, ref),
          ),

          // Theme
          ListTile(
            leading: const Icon(Icons.palette),
            title: const Text('Theme'),
            subtitle: Text(_getThemeName(settings.themeMode)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showThemeDialog(context, ref),
          ),

          // Notifications
          SwitchListTile(
            secondary: const Icon(Icons.notifications),
            title: const Text('Notifications'),
            subtitle: const Text('Receive match alerts'),
            value: settings.notificationsEnabled,
            onChanged: (value) {
              ref.read(settingsProvider.notifier).setNotificationsEnabled(value);
            },
          ),

          const Divider(),

          // Betting preferences
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Betting Preferences',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ),

          ListTile(
            leading: const Icon(Icons.trending_down),
            title: const Text('Minimum Odds'),
            subtitle: Text('${settings.minOdds}'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showOddsDialog(context, ref, isMin: true),
          ),

          ListTile(
            leading: const Icon(Icons.trending_up),
            title: const Text('Maximum Odds'),
            subtitle: Text('${settings.maxOdds}'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showOddsDialog(context, ref, isMin: false),
          ),

          ListTile(
            leading: const Icon(Icons.warning_amber),
            title: const Text('Risk Level'),
            subtitle: Text(settings.riskLevel.toUpperCase()),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showRiskDialog(context, ref),
          ),

          const Divider(),

          // Premium
          if (user != null && !user.isPremium)
            ListTile(
              leading: const Icon(Icons.star, color: Colors.amber),
              title: const Text('Upgrade to Premium'),
              subtitle: const Text('Unlimited predictions'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/premium'),
            ),

          // About
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('About'),
            subtitle: const Text('Version 1.0.0'),
          ),

          // Logout
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text(
              'Sign Out',
              style: TextStyle(color: Colors.red),
            ),
            onTap: () async {
              await ref.read(authStateProvider.notifier).logout();
              if (context.mounted) {
                context.go('/login');
              }
            },
          ),
        ],
      ),
    );
  }

  String _getLanguageName(String code) {
    switch (code) {
      case 'en':
        return 'English';
      case 'ru':
        return 'Русский';
      case 'pt':
        return 'Português';
      case 'es':
        return 'Español';
      default:
        return code;
    }
  }

  String _getThemeName(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'Light';
      case ThemeMode.dark:
        return 'Dark';
      case ThemeMode.system:
        return 'System';
    }
  }

  void _showLanguageDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Select Language'),
        children: [
          _DialogOption(
            label: 'English',
            onTap: () {
              ref.read(settingsProvider.notifier).setLanguage('en');
              Navigator.pop(context);
            },
          ),
          _DialogOption(
            label: 'Русский',
            onTap: () {
              ref.read(settingsProvider.notifier).setLanguage('ru');
              Navigator.pop(context);
            },
          ),
          _DialogOption(
            label: 'Português',
            onTap: () {
              ref.read(settingsProvider.notifier).setLanguage('pt');
              Navigator.pop(context);
            },
          ),
          _DialogOption(
            label: 'Español',
            onTap: () {
              ref.read(settingsProvider.notifier).setLanguage('es');
              Navigator.pop(context);
            },
          ),
        ],
      ),
    );
  }

  void _showThemeDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Select Theme'),
        children: [
          _DialogOption(
            label: 'Light',
            onTap: () {
              ref.read(settingsProvider.notifier).setThemeMode(ThemeMode.light);
              Navigator.pop(context);
            },
          ),
          _DialogOption(
            label: 'Dark',
            onTap: () {
              ref.read(settingsProvider.notifier).setThemeMode(ThemeMode.dark);
              Navigator.pop(context);
            },
          ),
          _DialogOption(
            label: 'System',
            onTap: () {
              ref.read(settingsProvider.notifier).setThemeMode(ThemeMode.system);
              Navigator.pop(context);
            },
          ),
        ],
      ),
    );
  }

  void _showOddsDialog(BuildContext context, WidgetRef ref, {required bool isMin}) {
    final odds = [1.3, 1.5, 1.7, 2.0, 2.5, 3.0, 4.0, 5.0];

    showDialog(
      context: context,
      builder: (context) => SimpleDialog(
        title: Text(isMin ? 'Minimum Odds' : 'Maximum Odds'),
        children: odds.map((o) => _DialogOption(
          label: o.toString(),
          onTap: () {
            if (isMin) {
              ref.read(settingsProvider.notifier).setMinOdds(o);
            } else {
              ref.read(settingsProvider.notifier).setMaxOdds(o);
            }
            Navigator.pop(context);
          },
        )).toList(),
      ),
    );
  }

  void _showRiskDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Risk Level'),
        children: [
          _DialogOption(
            label: 'Low (safer bets)',
            onTap: () {
              ref.read(settingsProvider.notifier).setRiskLevel('low');
              Navigator.pop(context);
            },
          ),
          _DialogOption(
            label: 'Medium (balanced)',
            onTap: () {
              ref.read(settingsProvider.notifier).setRiskLevel('medium');
              Navigator.pop(context);
            },
          ),
          _DialogOption(
            label: 'High (higher odds)',
            onTap: () {
              ref.read(settingsProvider.notifier).setRiskLevel('high');
              Navigator.pop(context);
            },
          ),
        ],
      ),
    );
  }
}

class _DialogOption extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _DialogOption({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SimpleDialogOption(
      onPressed: onTap,
      child: Text(label),
    );
  }
}
