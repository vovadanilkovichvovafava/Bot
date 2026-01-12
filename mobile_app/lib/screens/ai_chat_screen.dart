import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import '../services/api_service.dart';
import '../models/match.dart';
import '../providers/settings_provider.dart';

class AiChatScreen extends ConsumerStatefulWidget {
  const AiChatScreen({super.key});

  @override
  ConsumerState<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends ConsumerState<AiChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMessage> _messages = [];
  bool _isLoading = false;
  bool _suggestionsExpanded = true;  // Panel expanded state
  bool _aiAvailable = false;

  List<Match> _todayMatches = [];
  List<Match> _tomorrowMatches = [];
  bool _matchesLoaded = false;

  static const _defaultQuickQuestions = [
    "📅 Today's matches",
    "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League",
    "🇪🇸 La Liga",
    "🇩🇪 Bundesliga",
    "🇮🇹 Serie A",
    "🇫🇷 Ligue 1",
  ];

  List<String> _quickQuestions = List.from(_defaultQuickQuestions);

  @override
  void initState() {
    super.initState();
    _loadQuickQuestions();
    _loadMatches();
    _initializeChat();
  }

  Future<void> _initializeChat() async {
    // Check AI availability first
    try {
      final api = ref.read(apiServiceProvider);
      final available = await api.isChatAvailable();
      _aiAvailable = available;
    } catch (e) {
      _aiAvailable = false;
    }

    // Then add welcome message with correct status
    setState(() {
      _addWelcomeMessage();
    });
  }

  Future<void> _loadMatches() async {
    try {
      final api = ref.read(apiServiceProvider);
      final today = await api.getTodayMatches();
      final tomorrow = await api.getTomorrowMatches();
      setState(() {
        _todayMatches = today;
        _tomorrowMatches = tomorrow;
        _matchesLoaded = true;
      });
    } catch (e) {
      // Silent fail - will use fallback responses
    }
  }

  Future<void> _loadQuickQuestions() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getStringList('quick_questions');
    if (saved != null && saved.isNotEmpty) {
      setState(() {
        _quickQuestions = saved;
      });
    }
  }

  Future<void> _saveQuickQuestions() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('quick_questions', _quickQuestions);
  }

  void _addQuickQuestion(String question) {
    if (question.trim().isEmpty) return;
    setState(() {
      _quickQuestions.add(question.trim());
    });
    _saveQuickQuestions();
  }

  void _removeQuickQuestion(int index) {
    setState(() {
      _quickQuestions.removeAt(index);
    });
    _saveQuickQuestions();
  }

  void _resetQuickQuestions() {
    setState(() {
      _quickQuestions = List.from(_defaultQuickQuestions);
    });
    _saveQuickQuestions();
  }

  void _showEditQuickQuestionsDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _EditQuickQuestionsSheet(
        questions: _quickQuestions,
        onAdd: _addQuickQuestion,
        onRemove: _removeQuickQuestion,
        onReset: _resetQuickQuestions,
      ),
    );
  }

  void _addWelcomeMessage() {
    final statusText = _aiAvailable
        ? '✅ AI analysis **enabled** (Claude AI)'
        : '⚠️ AI analysis **disabled** (server unavailable)';

    _messages.add(ChatMessage(
      text: '''Hello! 👋

I'm your AI assistant for football match analysis.

$statusText

**What I can do:**
• 📊 Analyse specific matches with predictions
• 🎯 Probabilities: Home/Draw/Away, totals, BTTS
• 📅 Match overview for today/tomorrow
• 💡 Betting recommendations

**Example queries:**
• "Analyse Bayern vs Dortmund"
• "West Ham vs Fulham prediction"
• "Premier League today"
• "Best bets for today"

⚠️ Please bet responsibly''',
      isUser: false,
      timestamp: DateTime.now(),
    ));
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendQuickQuestion(String question) {
    _messageController.text = question;
    _sendMessage();
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isLoading) return;

    setState(() {
      _messages.add(ChatMessage(
        text: text,
        isUser: true,
        timestamp: DateTime.now(),
      ));
      _isLoading = true;
      // Keep suggestions panel available, just collapse it after first message
      if (_messages.length == 2) {  // Welcome message + first user message
        _suggestionsExpanded = false;
      }
    });
    _messageController.clear();
    _scrollToBottom();

    String response;

    // Try real AI API first
    if (_aiAvailable) {
      try {
        final api = ref.read(apiServiceProvider);
        final settings = ref.read(settingsProvider);

        // Build chat history
        final history = _messages
            .where((m) => m != _messages.last)  // Exclude the message we just added
            .map((m) => {
              'role': m.isUser ? 'user' : 'assistant',
              'content': m.text,
            })
            .toList();

        final result = await api.sendChatMessage(
          message: text,
          history: history,
          minOdds: settings.minOdds,
          maxOdds: settings.maxOdds,
          riskLevel: settings.riskLevel,
        );

        response = result['response'] as String;
      } catch (e) {
        // Fallback to local responses on error
        response = _generateAiResponse(text);
      }
    } else {
      // Use local fallback responses
      response = _generateAiResponse(text);
    }

    setState(() {
      _messages.add(ChatMessage(
        text: response,
        isUser: false,
        timestamp: DateTime.now(),
      ));
      _isLoading = false;
    });
    _scrollToBottom();
  }

  String _generateAiResponse(String query) {
    final queryLower = query.toLowerCase();

    // Check for league-specific requests
    if (queryLower.contains('bundesliga') || queryLower.contains('german')) {
      return _generateLeagueAnalysis('BL1', 'Bundesliga');
    }
    if (queryLower.contains('premier league') || queryLower.contains('epl')) {
      return _generateLeagueAnalysis('PL', 'Premier League');
    }
    if (queryLower.contains('la liga') || queryLower.contains('spanish')) {
      return _generateLeagueAnalysis('PD', 'La Liga');
    }
    if (queryLower.contains('serie a') || queryLower.contains('italian')) {
      return _generateLeagueAnalysis('SA', 'Serie A');
    }
    if (queryLower.contains('ligue 1') || queryLower.contains('french')) {
      return _generateLeagueAnalysis('FL1', 'Ligue 1');
    }

    // Check for today/best bets
    if (queryLower.contains('today') || queryLower.contains('best bet') ||
        queryLower.contains('pick') || queryLower.contains('tip')) {
      return _generateTodayOverview();
    }

    // Check for over/under
    if (queryLower.contains('over') || queryLower.contains('under') || queryLower.contains('goals')) {
      return _generateTotalsAnalysis();
    }

    // Check for BTTS
    if (queryLower.contains('btts') || queryLower.contains('both teams to score')) {
      return _generateBttsAnalysis();
    }

    // Try to find specific match
    final matchResult = _findMatchByQuery(query);
    if (matchResult != null) {
      return _generateSingleMatchAnalysis(matchResult);
    }

    // Check if query looks like a match search (contains "vs" or team names)
    if (queryLower.contains('vs') || queryLower.contains(' - ') ||
        _looksLikeTeamSearch(queryLower)) {
      return _generateMatchNotFound(query);
    }

    // Default to today overview
    return _generateTodayOverview();
  }

  bool _looksLikeTeamSearch(String query) {
    // Common football team keywords
    final teamKeywords = ['fc', 'united', 'city', 'real', 'milan', 'inter',
      'bayern', 'chelsea', 'arsenal', 'liverpool', 'barcelona', 'juventus',
      'psg', 'dortmund', 'tottenham', 'villa', 'madrid'];
    return teamKeywords.any((keyword) => query.contains(keyword));
  }

  String _generateMatchNotFound(String query) {
    return '''❌ **Match not found**

Could not find a match for: "$query"

**Possible reasons:**
• Match is not scheduled for the next few days
• Check the team names are correct

**Try:**
• Ask about a specific league: "Bundesliga", "Premier League"
• View today's matches: "Today's matches"''';
  }

  Match? _findMatchByQuery(String query) {
    final queryLower = query.toLowerCase();
    final allMatches = [..._todayMatches, ..._tomorrowMatches];

    for (final match in allMatches) {
      if (queryLower.contains(match.homeTeam.name.toLowerCase()) ||
          queryLower.contains(match.awayTeam.name.toLowerCase())) {
        return match;
      }
    }
    return null;
  }

  String _generateSingleMatchAnalysis(Match match) {
    // If AI is not available, show a helpful message about enabling it
    if (!_aiAvailable) {
      return '''⚽ **${match.homeTeam.name} vs ${match.awayTeam.name}**

🏆 **${match.league}**
📅 ${_formatMatchDate(match.date)}

---

**📊 Basic information:**

🏠 **${match.homeTeam.name}** (Home)
🚌 **${match.awayTeam.name}** (Away)

---

⚠️ **AI analysis unavailable**

Server is temporarily unavailable. Please try again in a few seconds - the server may be waking up.

**When AI is available, you'll get:**
• Team form analysis
• Probability predictions (Home/Draw/Away)
• Betting recommendations
• Totals and BTTS predictions

---
⚠️ *Please bet responsibly.*''';
    }

    return '''⚽ **${match.homeTeam.name} vs ${match.awayTeam.name}**

🏆 **${match.league}**
📅 ${_formatMatchDate(match.date)}

---

🏠 **${match.homeTeam.name}** (Home)
🚌 **${match.awayTeam.name}** (Away)

---
⚠️ *Please bet responsibly.*''';
  }

  String _generateLeagueAnalysis(String leagueCode, String leagueName) {
    final allMatches = [..._todayMatches, ..._tomorrowMatches];
    final leagueMatches = allMatches.where((m) =>
      m.leagueCode == leagueCode || m.league.toLowerCase().contains(leagueName.toLowerCase())
    ).toList();

    if (!_matchesLoaded) {
      return '''🏆 **$leagueName**

⏳ Loading matches...

Server is starting, please try again in 30 seconds.''';
    }

    if (leagueMatches.isEmpty) {
      return '''🏆 **$leagueName**

❌ **No matches found**

No $leagueName matches scheduled for the next few days.

Try another league:
• Premier League
• La Liga
• Bundesliga
• Serie A
• Ligue 1''';
    }

    // Find the next matchday number
    final nextMatchdayNum = leagueMatches.first.matchday;

    // Get ALL matches from next matchday (entire round)
    final nextMatchdayMatches = nextMatchdayNum != null
        ? leagueMatches.where((m) => m.matchday == nextMatchdayNum).toList()
        : leagueMatches;

    final buffer = StringBuffer();
    buffer.writeln('🏆 **$leagueName - Matchday ${nextMatchdayNum ?? ""}**\n');
    buffer.writeln('---\n');

    for (int i = 0; i < nextMatchdayMatches.length; i++) {
      final match = nextMatchdayMatches[i];
      buffer.writeln('**${i + 1}. ${match.homeTeam.name} vs ${match.awayTeam.name}**');
      buffer.writeln('📅 ${_formatMatchDate(match.date)}');
      buffer.writeln('');
    }

    buffer.writeln('---\n');
    buffer.writeln('💡 Type a team name for detailed analysis');

    return buffer.toString();
  }

  String _formatMatchDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final matchDay = DateTime(date.year, date.month, date.day);

    if (matchDay == today) {
      return 'Today ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } else if (matchDay == today.add(const Duration(days: 1))) {
      return 'Tomorrow ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } else {
      return '${date.day}.${date.month} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    }
  }

  String _generateTodayOverview() {
    if (!_matchesLoaded) {
      return '''📅 **Today's matches**

⏳ Loading matches...

Server is starting, please try again in 30 seconds.''';
    }

    if (_todayMatches.isEmpty && _tomorrowMatches.isEmpty) {
      return '''📅 **Today's matches**

❌ **No matches found**

No matches scheduled for today or tomorrow.

Ask about a specific league:
• "Bundesliga"
• "Premier League"
• "La Liga"''';
    }

    final buffer = StringBuffer();

    final matches = _todayMatches.isNotEmpty ? _todayMatches : _tomorrowMatches;
    final dateLabel = _todayMatches.isNotEmpty ? "Today" : "Tomorrow";

    buffer.writeln('📅 **Matches for $dateLabel**\n');
    buffer.writeln('---\n');

    // Group by league, limit to 3 matches per league
    final byLeague = <String, List<Match>>{};
    for (final match in matches) {
      byLeague.putIfAbsent(match.league, () => []).add(match);
    }

    for (final entry in byLeague.entries) {
      final leagueIcon = _getLeagueIcon(entry.key);
      buffer.writeln('**$leagueIcon ${entry.key}:**');

      // Only show first 3 matches per league
      for (final match in entry.value.take(3)) {
        buffer.writeln('• ${match.homeTeam.name} vs ${match.awayTeam.name}');
        buffer.writeln('  📅 ${_formatMatchDate(match.date)}');
      }
      buffer.writeln('');
    }

    buffer.writeln('---\n');
    buffer.writeln('💡 Type a team name for analysis');

    return buffer.toString();
  }

  String _getLeagueIcon(String league) {
    if (league.contains('Premier')) return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
    if (league.contains('Liga') && !league.contains('Ligue')) return '🇪🇸';
    if (league.contains('Bundesliga')) return '🇩🇪';
    if (league.contains('Serie A')) return '🇮🇹';
    if (league.contains('Ligue 1')) return '🇫🇷';
    return '⚽';
  }

  String _generateTotalsAnalysis() {
    if (!_matchesLoaded) {
      return '''📊 **Totals (Over/Under)**

⏳ Loading matches...

Server is starting, please try again in 30 seconds.''';
    }

    final allMatches = [..._todayMatches, ..._tomorrowMatches];

    if (allMatches.isEmpty) {
      return '''📊 **Totals (Over/Under)**

❌ **No matches found**

No matches available for totals analysis.''';
    }

    final buffer = StringBuffer();
    buffer.writeln('📊 **Totals - Upcoming matches**\n');
    buffer.writeln('---\n');

    // Just list matches, no fake predictions
    for (final match in allMatches.take(5)) {
      buffer.writeln('• ${match.homeTeam.name} vs ${match.awayTeam.name}');
      buffer.writeln('  ${match.league} | ${_formatMatchDate(match.date)}');
      buffer.writeln('');
    }

    buffer.writeln('---\n');
    buffer.writeln('💡 Type team names to analyse a specific match');

    return buffer.toString();
  }

  String _generateBttsAnalysis() {
    if (!_matchesLoaded) {
      return '''🥅 **BTTS (Both Teams To Score)**

⏳ Loading matches...

Server is starting, please try again in 30 seconds.''';
    }

    final allMatches = [..._todayMatches, ..._tomorrowMatches];

    if (allMatches.isEmpty) {
      return '''🥅 **BTTS (Both Teams To Score)**

❌ **No matches found**

No matches available for BTTS analysis.''';
    }

    final buffer = StringBuffer();
    buffer.writeln('🥅 **BTTS - Upcoming matches**\n');
    buffer.writeln('---\n');

    // Just list matches, no fake predictions
    for (final match in allMatches.take(5)) {
      buffer.writeln('• ${match.homeTeam.name} vs ${match.awayTeam.name}');
      buffer.writeln('  ${match.league} | ${_formatMatchDate(match.date)}');
      buffer.writeln('');
    }

    buffer.writeln('---\n');
    buffer.writeln('💡 Type team names to analyse a specific match');

    return buffer.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Assistant'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () {
              setState(() {
                _messages.clear();
                _addWelcomeMessage();
                _suggestionsExpanded = true;  // Expand suggestions when chat cleared
              });
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length + (_isLoading ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == _messages.length && _isLoading) {
                  return const _TypingIndicator();
                }
                return _ChatBubble(message: _messages[index]);
              },
            ),
          ),
          // Always show suggestions panel (collapsible)
          _buildSuggestions(),
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildSuggestions() {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          top: BorderSide(
            color: Theme.of(context).dividerColor.withOpacity(0.2),
          ),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Toggle header - always visible
          GestureDetector(
            onTap: () => setState(() => _suggestionsExpanded = !_suggestionsExpanded),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  Icon(
                    Icons.lightbulb_outline,
                    size: 18,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Quick questions',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                  const Spacer(),
                  if (_suggestionsExpanded)
                    GestureDetector(
                      onTap: _showEditQuickQuestionsDialog,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.edit,
                              size: 14,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Edit',
                              style: TextStyle(
                                fontSize: 12,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  const SizedBox(width: 8),
                  AnimatedRotation(
                    turns: _suggestionsExpanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: Icon(
                      Icons.keyboard_arrow_down,
                      size: 20,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Collapsible content
          AnimatedCrossFade(
            firstChild: Container(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _quickQuestions.map((question) {
                  return ActionChip(
                    label: Text(
                      question,
                      style: const TextStyle(fontSize: 13),
                    ),
                    onPressed: _isLoading ? null : () => _sendQuickQuestion(question),
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                    side: BorderSide.none,
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  );
                }).toList(),
              ),
            ),
            secondChild: const SizedBox.shrink(),
            crossFadeState: _suggestionsExpanded
                ? CrossFadeState.showFirst
                : CrossFadeState.showSecond,
            duration: const Duration(milliseconds: 200),
          ),
        ],
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _messageController,
                decoration: InputDecoration(
                  hintText: 'Ask about any match...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                  filled: true,
                  fillColor: Theme.of(context).colorScheme.surfaceVariant,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                ),
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendMessage(),
                maxLines: null,
              ),
            ),
            const SizedBox(width: 12),
            Container(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: Icon(
                  Icons.send,
                  color: Theme.of(context).colorScheme.onPrimary,
                ),
                onPressed: _sendMessage,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;

  ChatMessage({
    required this.text,
    required this.isUser,
    required this.timestamp,
  });
}

class _ChatBubble extends StatelessWidget {
  final ChatMessage message;

  const _ChatBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.85,
        ),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: message.isUser
              ? Theme.of(context).colorScheme.primary
              : Theme.of(context).colorScheme.surfaceVariant,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(message.isUser ? 16 : 4),
            bottomRight: Radius.circular(message.isUser ? 4 : 16),
          ),
        ),
        child: message.isUser
            ? Text(
                message.text,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onPrimary,
                  fontSize: 15,
                ),
              )
            : MarkdownBody(
                data: message.text,
                styleSheet: MarkdownStyleSheet(
                  p: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 15,
                  ),
                  strong: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                  em: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontStyle: FontStyle.italic,
                    fontSize: 14,
                  ),
                  listBullet: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 15,
                  ),
                  h1: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                  h2: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                shrinkWrap: true,
                softLineBreak: true,
              ),
      ),
    );
  }
}

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceVariant,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(16),
            topRight: Radius.circular(16),
            bottomLeft: Radius.circular(4),
            bottomRight: Radius.circular(16),
          ),
        ),
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (index) {
                final delay = index * 0.2;
                final value = ((_controller.value + delay) % 1.0);
                final opacity = (value < 0.5) ? value * 2 : (1 - value) * 2;
                return Container(
                  margin: EdgeInsets.only(right: index < 2 ? 4 : 0),
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.3 + opacity * 0.5),
                    shape: BoxShape.circle,
                  ),
                );
              }),
            );
          },
        ),
      ),
    );
  }
}

class _EditQuickQuestionsSheet extends StatefulWidget {
  final List<String> questions;
  final Function(String) onAdd;
  final Function(int) onRemove;
  final VoidCallback onReset;

  const _EditQuickQuestionsSheet({
    required this.questions,
    required this.onAdd,
    required this.onRemove,
    required this.onReset,
  });

  @override
  State<_EditQuickQuestionsSheet> createState() => _EditQuickQuestionsSheetState();
}

class _EditQuickQuestionsSheetState extends State<_EditQuickQuestionsSheet> {
  final TextEditingController _addController = TextEditingController();

  @override
  void dispose() {
    _addController.dispose();
    super.dispose();
  }

  void _addQuestion() {
    if (_addController.text.trim().isNotEmpty) {
      widget.onAdd(_addController.text);
      _addController.clear();
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    const Text(
                      'Edit Quick Questions',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: () {
                        widget.onReset();
                        setState(() {});
                      },
                      icon: const Icon(Icons.restart_alt, size: 18),
                      label: const Text('Reset'),
                    ),
                  ],
                ),
              ),
              const Divider(),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _addController,
                        decoration: InputDecoration(
                          hintText: 'Add new question...',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                        ),
                        onSubmitted: (_) => _addQuestion(),
                      ),
                    ),
                    const SizedBox(width: 12),
                    IconButton.filled(
                      onPressed: _addQuestion,
                      icon: const Icon(Icons.add),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: widget.questions.length,
                  itemBuilder: (context, index) {
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text(widget.questions[index]),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline, color: Colors.red),
                          onPressed: () {
                            widget.onRemove(index);
                            setState(() {});
                          },
                        ),
                      ),
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Done'),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
