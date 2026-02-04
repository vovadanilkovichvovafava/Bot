import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';
import '../utils/theme.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final user = ref.watch(authStateProvider).user;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: const Text(
                  'Settings',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),

            // Profile section
            if (user != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          AppTheme.darkCard,
                          AppTheme.darkSurface.withOpacity(0.5),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: AppTheme.primaryColor.withOpacity(0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            gradient: AppTheme.neonGradient,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Center(
                            child: Text(
                              (user.username ?? user.email)[0].toUpperCase(),
                              style: const TextStyle(
                                color: Colors.black,
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user.username ?? 'User',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                user.email,
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.5),
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (user.isPremium)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              gradient: AppTheme.goldGradient,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.star,
                                  color: Colors.black,
                                  size: 14,
                                ),
                                SizedBox(width: 4),
                                Text(
                                  'PRO',
                                  style: TextStyle(
                                    color: Colors.black,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),

            // Settings sections
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                child: Text(
                  'PREFERENCES',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.5),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppTheme.darkCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.darkBorder),
                  ),
                  child: Column(
                    children: [
                      _SettingsItem(
                        icon: Icons.dark_mode,
                        label: 'Dark Mode',
                        value: 'Always On',
                        showChevron: false,
                        trailing: Switch(
                          value: true,
                          onChanged: (value) {},
                          activeColor: AppTheme.primaryColor,
                        ),
                      ),
                      _SettingsDivider(),
                      _SettingsItem(
                        icon: Icons.notifications,
                        label: 'Notifications',
                        value: settings.notificationsEnabled ? 'Enabled' : 'Disabled',
                        onTap: () {
                          ref.read(settingsProvider.notifier).setNotificationsEnabled(
                                !settings.notificationsEnabled,
                              );
                        },
                      ),
                      _SettingsDivider(),
                      _SettingsItem(
                        icon: Icons.language,
                        label: 'Language',
                        value: 'English',
                        onTap: () {},
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Betting preferences
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                child: Text(
                  'BETTING PREFERENCES',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.5),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppTheme.darkCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.darkBorder),
                  ),
                  child: Column(
                    children: [
                      _SettingsItem(
                        icon: Icons.trending_down,
                        label: 'Minimum Odds',
                        value: '${settings.minOdds}',
                        onTap: () => _showOddsDialog(context, ref, isMin: true),
                      ),
                      _SettingsDivider(),
                      _SettingsItem(
                        icon: Icons.trending_up,
                        label: 'Maximum Odds',
                        value: '${settings.maxOdds}',
                        onTap: () => _showOddsDialog(context, ref, isMin: false),
                      ),
                      _SettingsDivider(),
                      _SettingsItem(
                        icon: Icons.warning_amber,
                        label: 'Risk Level',
                        value: settings.riskLevel.toUpperCase(),
                        valueColor: _getRiskColor(settings.riskLevel),
                        onTap: () => _showRiskDialog(context, ref),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Premium section
            if (user != null && !user.isPremium)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                  child: GestureDetector(
                    onTap: () => context.push('/premium'),
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: AppTheme.goldGradient,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: AppTheme.neonGlow(
                          AppTheme.fc26Gold,
                          blur: 15,
                          spread: 0,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.star,
                              color: Colors.black,
                              size: 28,
                            ),
                          ),
                          const SizedBox(width: 16),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Upgrade to PRO',
                                  style: TextStyle(
                                    color: Colors.black,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'Unlock unlimited predictions',
                                  style: TextStyle(
                                    color: Colors.black87,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(
                            Icons.chevron_right,
                            color: Colors.black,
                            size: 28,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

            // About & logout
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                child: Text(
                  'OTHER',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.5),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppTheme.darkCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.darkBorder),
                  ),
                  child: Column(
                    children: [
                      _SettingsItem(
                        icon: Icons.info_outline,
                        label: 'About',
                        value: 'Version 1.0.0',
                        onTap: () {},
                      ),
                      _SettingsDivider(),
                      _SettingsItem(
                        icon: Icons.help_outline,
                        label: 'Help & Support',
                        value: '',
                        onTap: () {},
                      ),
                      _SettingsDivider(),
                      _SettingsItem(
                        icon: Icons.logout,
                        label: 'Sign Out',
                        value: '',
                        iconColor: AppTheme.errorColor,
                        labelColor: AppTheme.errorColor,
                        showChevron: false,
                        onTap: () async {
                          await ref.read(authStateProvider.notifier).logout();
                          if (context.mounted) {
                            context.go('/login');
                          }
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Bottom padding
            const SliverToBoxAdapter(
              child: SizedBox(height: 100),
            ),
          ],
        ),
      ),
    );
  }

  Color _getRiskColor(String risk) {
    switch (risk.toLowerCase()) {
      case 'low':
        return AppTheme.highConfidence;
      case 'medium':
        return AppTheme.warningColor;
      case 'high':
        return AppTheme.errorColor;
      default:
        return Colors.white;
    }
  }

  void _showOddsDialog(BuildContext context, WidgetRef ref, {required bool isMin}) {
    final odds = [1.3, 1.5, 1.7, 2.0, 2.5, 3.0, 4.0, 5.0];

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
            Text(
              isMin ? 'Minimum Odds' : 'Maximum Odds',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: odds.map((o) => GestureDetector(
                onTap: () {
                  if (isMin) {
                    ref.read(settingsProvider.notifier).setMinOdds(o);
                  } else {
                    ref.read(settingsProvider.notifier).setMaxOdds(o);
                  }
                  Navigator.pop(context);
                },
                child: Container(
                  width: 70,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: AppTheme.darkSurface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.darkBorder),
                  ),
                  child: Center(
                    child: Text(
                      o.toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              )).toList(),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _showRiskDialog(BuildContext context, WidgetRef ref) {
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
              'Risk Level',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            _RiskOption(
              label: 'Low',
              subtitle: 'Safer bets, lower returns',
              color: AppTheme.highConfidence,
              onTap: () {
                ref.read(settingsProvider.notifier).setRiskLevel('low');
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 12),
            _RiskOption(
              label: 'Medium',
              subtitle: 'Balanced risk and reward',
              color: AppTheme.warningColor,
              onTap: () {
                ref.read(settingsProvider.notifier).setRiskLevel('medium');
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 12),
            _RiskOption(
              label: 'High',
              subtitle: 'Higher odds, higher risk',
              color: AppTheme.errorColor,
              onTap: () {
                ref.read(settingsProvider.notifier).setRiskLevel('high');
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

class _SettingsItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? iconColor;
  final Color? labelColor;
  final Color? valueColor;
  final bool showChevron;
  final Widget? trailing;
  final VoidCallback? onTap;

  const _SettingsItem({
    required this.icon,
    required this.label,
    required this.value,
    this.iconColor,
    this.labelColor,
    this.valueColor,
    this.showChevron = true,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(
              icon,
              color: iconColor ?? AppTheme.primaryColor,
              size: 22,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: labelColor ?? Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            if (trailing != null)
              trailing!
            else ...[
              if (value.isNotEmpty)
                Text(
                  value,
                  style: TextStyle(
                    color: valueColor ?? Colors.white.withOpacity(0.5),
                    fontSize: 14,
                  ),
                ),
              if (showChevron) ...[
                const SizedBox(width: 8),
                Icon(
                  Icons.chevron_right,
                  color: Colors.white.withOpacity(0.3),
                  size: 22,
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _SettingsDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 1,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      color: AppTheme.darkBorder,
    );
  }
}

class _RiskOption extends StatelessWidget {
  final String label;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _RiskOption({
    required this.label,
    required this.subtitle,
    required this.color,
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
          border: Border.all(
            color: color.withOpacity(0.3),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(6),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      color: color,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.4),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: Colors.white.withOpacity(0.3),
            ),
          ],
        ),
      ),
    );
  }
}
