import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<OnboardingPage> _pages = [
    OnboardingPage(
      title: 'Welcome to AI Betting Assistant',
      description: 'Your intelligent companion for smarter football betting decisions.',
      icon: Icons.sports_soccer,
      color: Colors.blue,
      tips: [
        '🤖 AI analyzes 1000+ data points per match',
        '📊 Real-time odds from top bookmakers',
        '🎯 Personalized to your betting style',
      ],
    ),
    OnboardingPage(
      title: 'How It Works',
      description: 'Get predictions in 3 simple steps:',
      icon: Icons.lightbulb,
      color: Colors.amber,
      tips: [
        '1️⃣ Browse matches or ask AI about any game',
        '2️⃣ Get analysis with win probabilities & value bets',
        '3️⃣ Save predictions and track your success',
      ],
    ),
    OnboardingPage(
      title: 'Daily Free Predictions',
      description: 'Start with 10 free AI predictions every day!',
      icon: Icons.card_giftcard,
      color: Colors.green,
      tips: [
        '✅ 10 predictions reset daily at midnight',
        '✅ Unlimited match browsing & stats',
        '✅ Full access to betting calculators',
        '⭐ Upgrade to Premium for unlimited predictions',
      ],
    ),
    OnboardingPage(
      title: 'Set Your Preferences',
      description: 'AI will tailor recommendations to your style:',
      icon: Icons.tune,
      color: Colors.purple,
      tips: [
        '🎚️ Set preferred odds range (e.g., 1.5 - 3.0)',
        '📈 Choose risk level: Low, Medium, or High',
        '💰 AI suggests stake based on your profile',
      ],
      showSetupHint: true,
    ),
    OnboardingPage(
      title: 'Ready to Start!',
      description: 'Try Demo Mode to explore, or create an account.',
      icon: Icons.rocket_launch,
      color: Colors.deepOrange,
      tips: [
        '🎮 Demo Mode — explore all features instantly',
        '👤 Create Account — save your predictions & stats',
        '🔐 Your data is secure and private',
      ],
      showDemoButton: true,
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      _completeOnboarding();
    }
  }

  void _completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_complete', true);
    if (mounted) {
      context.go('/login');
    }
  }

  void _tryDemoMode() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_complete', true);
    await prefs.setBool('demo_mode', true);
    if (mounted) {
      context.go('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Skip button
            Align(
              alignment: Alignment.topRight,
              child: TextButton(
                onPressed: _completeOnboarding,
                child: Text(
                  'Skip',
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ),
            ),

            // Page view
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _pages.length,
                onPageChanged: (index) {
                  setState(() => _currentPage = index);
                },
                itemBuilder: (context, index) {
                  return _OnboardingPageWidget(
                    page: _pages[index],
                    onDemoTap: _tryDemoMode,
                  );
                },
              ),
            ),

            // Page indicators
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  _pages.length,
                  (index) => AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: index == _currentPage ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: index == _currentPage
                          ? _pages[index].color
                          : Colors.grey[300],
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ),
            ),

            // Next/Get Started button
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _nextPage,
                      style: FilledButton.styleFrom(
                        backgroundColor: _pages[_currentPage].color,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: Text(
                        _currentPage == _pages.length - 1
                            ? 'Create Account'
                            : 'Next',
                        style: const TextStyle(fontSize: 16),
                      ),
                    ),
                  ),
                  if (_currentPage == _pages.length - 1) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: _tryDemoMode,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          side: BorderSide(color: _pages[_currentPage].color),
                        ),
                        child: Text(
                          '🎮 Try Demo Mode',
                          style: TextStyle(
                            fontSize: 16,
                            color: _pages[_currentPage].color,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class OnboardingPage {
  final String title;
  final String description;
  final IconData icon;
  final Color color;
  final List<String> tips;
  final bool showSetupHint;
  final bool showDemoButton;

  OnboardingPage({
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
    required this.tips,
    this.showSetupHint = false,
    this.showDemoButton = false,
  });
}

class _OnboardingPageWidget extends StatelessWidget {
  final OnboardingPage page;
  final VoidCallback? onDemoTap;

  const _OnboardingPageWidget({
    required this.page,
    this.onDemoTap,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 16),

          // Animated icon container
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(milliseconds: 500),
            builder: (context, value, child) {
              return Transform.scale(
                scale: value,
                child: Opacity(
                  opacity: value,
                  child: child,
                ),
              );
            },
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: page.color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                page.icon,
                size: 60,
                color: page.color,
              ),
            ),
          ),
          const SizedBox(height: 32),

          // Title
          Text(
            page.title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),

          // Description
          Text(
            page.description,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: Colors.grey[600],
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),

          // Tips list
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: page.color.withOpacity(0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: page.color.withOpacity(0.2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: page.tips.map((tip) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  tip,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.4,
                    color: Colors.grey[800],
                  ),
                ),
              )).toList(),
            ),
          ),

          // Setup hint
          if (page.showSetupHint) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue[700], size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'You can change these anytime in Settings',
                      style: TextStyle(
                        color: Colors.blue[700],
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

/// Provider to check if onboarding is complete
final onboardingCompleteProvider = FutureProvider<bool>((ref) async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool('onboarding_complete') ?? false;
});
