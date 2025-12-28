import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'utils/theme.dart';
import 'utils/router.dart';
import 'providers/settings_provider.dart';
import 'services/auto_results_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: BettingBotApp()));
}

class BettingBotApp extends ConsumerStatefulWidget {
  const BettingBotApp({super.key});

  @override
  ConsumerState<BettingBotApp> createState() => _BettingBotAppState();
}

class _BettingBotAppState extends ConsumerState<BettingBotApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Start auto-results service after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(autoResultsServiceProvider).start();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final autoResultsService = ref.read(autoResultsServiceProvider);
    if (state == AppLifecycleState.resumed) {
      autoResultsService.start();
    } else if (state == AppLifecycleState.paused) {
      autoResultsService.stop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'AI Betting Bot',
      debugShowCheckedModeBanner: false,

      // Theme
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: settings.themeMode,

      // Routing
      routerConfig: router,

      // Localization
      locale: Locale(settings.language),
      supportedLocales: const [
        Locale('en'),
        Locale('es'),
        Locale('de'),
        Locale('fr'),
        Locale('it'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
