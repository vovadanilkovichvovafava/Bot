import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';
import '../services/notification_service.dart';
import '../services/api_service.dart';

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

          // Notifications header
          ListTile(
            leading: const Icon(Icons.notifications),
            title: const Text('Notifications'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showNotificationSettings(context, ref),
          ),

          const Divider(),

          // Betting preferences
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AI Betting Preferences',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'These settings personalize AI recommendations for you',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),

          // Preview card showing current profile
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Theme.of(context).colorScheme.primary.withOpacity(0.2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.psychology,
                      size: 20,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Your AI Profile',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  '📊 Odds range: ${settings.minOdds} - ${settings.maxOdds}',
                  style: const TextStyle(fontSize: 13),
                ),
                const SizedBox(height: 4),
                Text(
                  '${_getRiskEmoji(settings.riskLevel)} Risk: ${settings.riskLevel.toUpperCase()} (${_getRiskStake(settings.riskLevel)})',
                  style: const TextStyle(fontSize: 13),
                ),
                const SizedBox(height: 8),
                Text(
                  _getRiskDescription(settings.riskLevel),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          ListTile(
            leading: const Icon(Icons.trending_down),
            title: const Text('Minimum Odds'),
            subtitle: Text('AI won\'t recommend below ${settings.minOdds}'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showOddsDialog(context, ref, isMin: true),
          ),

          ListTile(
            leading: const Icon(Icons.trending_up),
            title: const Text('Maximum Odds'),
            subtitle: Text('AI won\'t recommend above ${settings.maxOdds}'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showOddsDialog(context, ref, isMin: false),
          ),

          ListTile(
            leading: Icon(
              _getRiskIcon(settings.riskLevel),
              color: _getRiskColor(settings.riskLevel),
            ),
            title: const Text('Risk Level'),
            subtitle: Text('${settings.riskLevel.toUpperCase()} - ${_getRiskStake(settings.riskLevel)}'),
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

          const Divider(),

          // Developer Section (for testing)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Developer Options',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: Colors.orange,
              ),
            ),
          ),

          if (user != null && user.isPremium)
            ListTile(
              leading: const Icon(Icons.remove_circle, color: Colors.red),
              title: const Text('Deactivate Premium (Test)'),
              subtitle: const Text('Remove premium for testing'),
              onTap: () {
                ref.read(authStateProvider.notifier).deactivatePremiumForTesting();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Premium deactivated (local only)')),
                );
              },
            )
          else if (user != null)
            ListTile(
              leading: const Icon(Icons.workspace_premium, color: Colors.amber),
              title: const Text('Activate Premium (Test)'),
              subtitle: const Text('Get free premium for testing'),
              onTap: () {
                ref.read(authStateProvider.notifier).activatePremiumForTesting();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Premium activated! (local only)'),
                    backgroundColor: Colors.green,
                  ),
                );
              },
            ),

          // Reset AI Limit button
          ListTile(
            leading: const Icon(Icons.refresh, color: Colors.blue),
            title: const Text('Reset AI Limit'),
            subtitle: const Text('Restore 10 daily AI requests'),
            onTap: () async {
              try {
                final api = ref.read(apiServiceProvider);
                await api.resetAiLimit();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('AI limit reset! You now have 10 requests.'),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Failed to reset: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
          ),

          const Divider(),

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
      case 'es':
        return 'Español';
      case 'de':
        return 'Deutsch';
      case 'fr':
        return 'Français';
      case 'it':
        return 'Italiano';
      default:
        return 'English';
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

  String _getRiskEmoji(String risk) {
    switch (risk.toLowerCase()) {
      case 'low': return '🛡️';
      case 'high': return '🚀';
      default: return '⚖️';
    }
  }

  String _getRiskStake(String risk) {
    switch (risk.toLowerCase()) {
      case 'low': return '1-2% stakes';
      case 'high': return '5-10% stakes';
      default: return '2-5% stakes';
    }
  }

  String _getRiskDescription(String risk) {
    switch (risk.toLowerCase()) {
      case 'low': return 'AI focuses on safer bets like double chance, under goals';
      case 'high': return 'AI may suggest accumulators, correct scores, higher odds';
      default: return 'AI suggests balanced mix of 1X2, over/under, BTTS';
    }
  }

  IconData _getRiskIcon(String risk) {
    switch (risk.toLowerCase()) {
      case 'low': return Icons.shield;
      case 'high': return Icons.trending_up;
      default: return Icons.balance;
    }
  }

  Color _getRiskColor(String risk) {
    switch (risk.toLowerCase()) {
      case 'low': return Colors.green;
      case 'high': return Colors.red;
      default: return Colors.orange;
    }
  }

  void _showLanguageDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Select Language'),
        children: [
          _DialogOption(
            label: '🇬🇧 English',
            onTap: () {
              ref.read(settingsProvider.notifier).setLanguage('en');
              Navigator.pop(context);
            },
          ),
          _DialogOption(
            label: '🇪🇸 Español',
            onTap: () {
              ref.read(settingsProvider.notifier).setLanguage('es');
              Navigator.pop(context);
            },
          ),
          _DialogOption(
            label: '🇩🇪 Deutsch',
            onTap: () {
              ref.read(settingsProvider.notifier).setLanguage('de');
              Navigator.pop(context);
            },
          ),
          _DialogOption(
            label: '🇫🇷 Français',
            onTap: () {
              ref.read(settingsProvider.notifier).setLanguage('fr');
              Navigator.pop(context);
            },
          ),
          _DialogOption(
            label: '🇮🇹 Italiano',
            onTap: () {
              ref.read(settingsProvider.notifier).setLanguage('it');
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
      builder: (context) => AlertDialog(
        title: const Text('Risk Level'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Choose how aggressive AI recommendations should be:',
              style: TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 16),
            _RiskOption(
              icon: Icons.shield,
              color: Colors.green,
              title: 'LOW',
              subtitle: 'Safer bets • 1-2% stakes',
              description: 'Double chance, under goals, low odds favorites',
              onTap: () {
                ref.read(settingsProvider.notifier).setRiskLevel('low');
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 8),
            _RiskOption(
              icon: Icons.balance,
              color: Colors.orange,
              title: 'MEDIUM',
              subtitle: 'Balanced • 2-5% stakes',
              description: '1X2, over/under, BTTS, moderate odds',
              onTap: () {
                ref.read(settingsProvider.notifier).setRiskLevel('medium');
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 8),
            _RiskOption(
              icon: Icons.trending_up,
              color: Colors.red,
              title: 'HIGH',
              subtitle: 'Aggressive • 5-10% stakes',
              description: 'Accumulators, correct scores, value picks',
              onTap: () {
                ref.read(settingsProvider.notifier).setRiskLevel('high');
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showNotificationSettings(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => const _NotificationSettingsSheet(),
    );
  }
}

class _NotificationSettingsSheet extends ConsumerWidget {
  const _NotificationSettingsSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifPrefs = ref.watch(notificationPreferencesProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(16),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[400],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Notification Settings',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Choose which notifications you want to receive',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 24),

              // Match Results
              SwitchListTile(
                secondary: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.check_circle, color: Colors.green),
                ),
                title: const Text('Match Results'),
                subtitle: const Text('Get notified when your predictions settle'),
                value: notifPrefs.matchResults,
                onChanged: (value) {
                  ref.read(notificationPreferencesProvider.notifier).setMatchResults(value);
                },
              ),

              const Divider(),

              // Hot Bets
              SwitchListTile(
                secondary: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.local_fire_department, color: Colors.orange),
                ),
                title: const Text('Hot Bets'),
                subtitle: const Text('High-confidence betting opportunities'),
                value: notifPrefs.hotBets,
                onChanged: (value) {
                  ref.read(notificationPreferencesProvider.notifier).setHotBets(value);
                },
              ),

              const Divider(),

              // Match Reminders
              SwitchListTile(
                secondary: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.alarm, color: Colors.blue),
                ),
                title: const Text('Match Reminders'),
                subtitle: Text('Remind me ${notifPrefs.reminderMinutes} min before kick-off'),
                value: notifPrefs.matchReminders,
                onChanged: (value) {
                  ref.read(notificationPreferencesProvider.notifier).setMatchReminders(value);
                },
              ),

              if (notifPrefs.matchReminders) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      const Text('Reminder time: '),
                      const Spacer(),
                      DropdownButton<int>(
                        value: notifPrefs.reminderMinutes,
                        items: [5, 10, 15, 30, 60].map((mins) {
                          return DropdownMenuItem(
                            value: mins,
                            child: Text('$mins min'),
                          );
                        }).toList(),
                        onChanged: (value) {
                          if (value != null) {
                            ref.read(notificationPreferencesProvider.notifier).setReminderMinutes(value);
                          }
                        },
                      ),
                    ],
                  ),
                ),
              ],

              const Divider(),

              // Live Updates
              SwitchListTile(
                secondary: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.sports_soccer, color: Colors.red),
                ),
                title: const Text('Live Updates'),
                subtitle: const Text('Goals and match events (may be frequent)'),
                value: notifPrefs.liveUpdates,
                onChanged: (value) {
                  ref.read(notificationPreferencesProvider.notifier).setLiveUpdates(value);
                },
              ),

              const SizedBox(height: 24),

              // Test notification button
              OutlinedButton.icon(
                onPressed: () async {
                  final notifService = ref.read(notificationServiceProvider);
                  await notifService.showNotification(
                    id: 99999,
                    title: 'Test Notification',
                    body: 'Notifications are working correctly!',
                  );
                },
                icon: const Icon(Icons.notifications_active),
                label: const Text('Send Test Notification'),
              ),
            ],
          ),
        );
      },
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

class _RiskOption extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final String description;
  final VoidCallback onTap;

  const _RiskOption({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.description,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: color.withOpacity(0.3)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: color,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        subtitle,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
