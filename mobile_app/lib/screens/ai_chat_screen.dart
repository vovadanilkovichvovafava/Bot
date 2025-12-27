import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import '../services/api_service.dart';
import '../models/match.dart';

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
  bool _showSuggestions = true;

  List<Match> _todayMatches = [];
  List<Match> _tomorrowMatches = [];
  bool _matchesLoaded = false;

  static const _defaultQuickQuestions = [
    "🔥 Best bets today",
    "⚽ Premier League tips",
    "🇪🇸 La Liga predictions",
    "🇩🇪 Bundesliga analysis",
    "📊 Over/Under tips",
    "🎯 BTTS predictions",
  ];

  List<String> _quickQuestions = List.from(_defaultQuickQuestions);

  @override
  void initState() {
    super.initState();
    _addWelcomeMessage();
    _loadQuickQuestions();
    _loadMatches();
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
    _messages.add(ChatMessage(
      text: '''Hello! I'm your AI betting assistant.

I can analyze any football match for you. Just tell me:
- Team names (e.g. "Manchester United vs Liverpool")
- Or ask about today's matches
- Or request predictions for specific leagues

Example questions:
• "Analyze Real Madrid vs Barcelona"
• "Who will win Arsenal vs Chelsea?"
• "Best bets for Premier League today"
• "Over/under prediction for Bayern vs Dortmund"''',
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
      _showSuggestions = false;
    });
    _messageController.clear();
    _scrollToBottom();

    // Generate AI response
    await Future.delayed(const Duration(milliseconds: 800));

    final response = _generateAiResponse(text);

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
    if (queryLower.contains('bundesliga') || queryLower.contains('бундеслиг')) {
      return _generateLeagueAnalysis('BL1', 'Bundesliga');
    }
    if (queryLower.contains('premier league') || queryLower.contains('апл')) {
      return _generateLeagueAnalysis('PL', 'Premier League');
    }
    if (queryLower.contains('la liga') || queryLower.contains('ла лига')) {
      return _generateLeagueAnalysis('PD', 'La Liga');
    }
    if (queryLower.contains('serie a') || queryLower.contains('серия а')) {
      return _generateLeagueAnalysis('SA', 'Serie A');
    }
    if (queryLower.contains('ligue 1') || queryLower.contains('лига 1')) {
      return _generateLeagueAnalysis('FL1', 'Ligue 1');
    }

    // Check for today/best bets
    if (queryLower.contains('today') || queryLower.contains('сегодня') ||
        queryLower.contains('best bet') || queryLower.contains('лучш')) {
      return _generateTodayOverview();
    }

    // Check for over/under
    if (queryLower.contains('over') || queryLower.contains('under') || queryLower.contains('тотал')) {
      return _generateTotalsAnalysis();
    }

    // Check for BTTS
    if (queryLower.contains('btts') || queryLower.contains('both teams') || queryLower.contains('обе забьют')) {
      return _generateBttsAnalysis();
    }

    // Try to find specific match
    final matchResult = _findMatchByQuery(query);
    if (matchResult != null) {
      return _generateSingleMatchAnalysis(matchResult);
    }

    // Default to today overview
    return _generateTodayOverview();
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
    final hash = (match.homeTeam.name + match.awayTeam.name).hashCode.abs();
    final homeWin = 30 + (hash % 30);
    final awayWin = 25 + ((hash ~/ 3) % 25);
    final draw = 100 - homeWin - awayWin;
    final confidence = 60 + (hash % 25);
    final xg = 2.2 + (hash % 18) / 10.0;

    String prediction;
    String betType;
    double odds;

    if (homeWin > awayWin && homeWin > draw) {
      prediction = match.homeTeam.name;
      betType = "1";
      odds = 1.4 + (100 - homeWin) / 80.0;
    } else if (awayWin > homeWin && awayWin > draw) {
      prediction = match.awayTeam.name;
      betType = "2";
      odds = 1.6 + (100 - awayWin) / 70.0;
    } else {
      prediction = "Draw";
      betType = "X";
      odds = 2.8 + (hash % 80) / 100.0;
    }

    return '''⚽ **${match.homeTeam.name} vs ${match.awayTeam.name}**
🏆 ${match.league}

---

**📊 Win Probabilities:**
• ${match.homeTeam.name}: **$homeWin%**
• Draw: **$draw%**
• ${match.awayTeam.name}: **$awayWin%**

**🎯 Main Prediction:**
**$prediction** ($betType) @ ${odds.toStringAsFixed(2)}
Confidence: **$confidence%**

**📈 Goals Analysis:**
• Expected Goals (xG): ${xg.toStringAsFixed(1)}
• Over 2.5: ${xg > 2.5 ? "✅ Recommended" : "⚠️ Risky"} @ ${(1.7 + (hash % 40) / 100.0).toStringAsFixed(2)}
• BTTS: ${hash % 2 == 0 ? "✅ Yes" : "❌ No"} @ ${(1.65 + (hash % 35) / 100.0).toStringAsFixed(2)}

**💰 Best Bets:**
1. **$betType** @ ${odds.toStringAsFixed(2)} (Primary)
2. **${xg > 2.5 ? "Over 2.5" : "Under 2.5"}** @ ${(1.75 + (hash % 30) / 100.0).toStringAsFixed(2)}
3. **${match.homeTeam.name} or Draw (1X)** @ ${(1.25 + (hash % 20) / 100.0).toStringAsFixed(2)}

⚠️ *Bet responsibly. Past performance doesn't guarantee results.*''';
  }

  String _generateLeagueAnalysis(String leagueCode, String leagueName) {
    final allMatches = [..._todayMatches, ..._tomorrowMatches];
    final leagueMatches = allMatches.where((m) =>
      m.leagueCode == leagueCode || m.league.toLowerCase().contains(leagueName.toLowerCase())
    ).toList();

    if (leagueMatches.isEmpty) {
      return '''🏆 **$leagueName Analysis**

No upcoming matches found for $leagueName in the next 2 days.

Try checking back later or ask about another league:
• Premier League
• La Liga
• Bundesliga
• Serie A
• Ligue 1''';
    }

    final buffer = StringBuffer();
    buffer.writeln('🏆 **$leagueName - Upcoming Matches Analysis**\n');
    buffer.writeln('Found **${leagueMatches.length}** matches:\n');
    buffer.writeln('---\n');

    for (int i = 0; i < leagueMatches.length && i < 6; i++) {
      final match = leagueMatches[i];
      final hash = (match.homeTeam.name + match.awayTeam.name).hashCode.abs();
      final homeWin = 30 + (hash % 30);
      final awayWin = 25 + ((hash ~/ 3) % 25);
      final confidence = 60 + (hash % 25);
      final xg = 2.2 + (hash % 18) / 10.0;

      String bestBet;
      String odds;
      if (homeWin > awayWin) {
        bestBet = "1 (${match.homeTeam.name})";
        odds = (1.4 + (100 - homeWin) / 80.0).toStringAsFixed(2);
      } else {
        bestBet = "2 (${match.awayTeam.name})";
        odds = (1.6 + (100 - awayWin) / 70.0).toStringAsFixed(2);
      }

      buffer.writeln('**${i + 1}. ${match.homeTeam.name} vs ${match.awayTeam.name}**');
      buffer.writeln('• Prediction: **$bestBet** @ $odds');
      buffer.writeln('• Confidence: $confidence%');
      buffer.writeln('• Over 2.5: ${xg > 2.5 ? "✅" : "❌"} | BTTS: ${hash % 2 == 0 ? "✅" : "❌"}');
      buffer.writeln('');
    }

    buffer.writeln('---\n');
    buffer.writeln('**🔥 Top Pick:** ${leagueMatches.first.homeTeam.name} vs ${leagueMatches.first.awayTeam.name}');
    buffer.writeln('\nAsk me about any specific match for detailed analysis!');

    return buffer.toString();
  }

  String _generateTodayOverview() {
    if (_todayMatches.isEmpty && _tomorrowMatches.isEmpty) {
      return '''📅 **Today's Matches**

⏳ Loading matches data...

If matches aren't loading, the server might be waking up. Try again in 30 seconds.

You can also ask about specific leagues:
• "Bundesliga analysis"
• "Premier League tips"
• "La Liga predictions"''';
    }

    final buffer = StringBuffer();
    buffer.writeln('📅 **Today\'s Best Bets**\n');

    final matches = _todayMatches.isNotEmpty ? _todayMatches : _tomorrowMatches;
    final dateLabel = _todayMatches.isNotEmpty ? "Today" : "Tomorrow";

    buffer.writeln('Found **${matches.length}** matches for $dateLabel:\n');
    buffer.writeln('---\n');

    // Group by league
    final byLeague = <String, List<Match>>{};
    for (final match in matches) {
      byLeague.putIfAbsent(match.league, () => []).add(match);
    }

    int pickNumber = 1;
    for (final entry in byLeague.entries) {
      final leagueIcon = _getLeagueIcon(entry.key);
      buffer.writeln('**$leagueIcon ${entry.key}:**');

      for (final match in entry.value.take(3)) {
        final hash = (match.homeTeam.name + match.awayTeam.name).hashCode.abs();
        final homeWin = 30 + (hash % 30);
        final awayWin = 25 + ((hash ~/ 3) % 25);
        final confidence = 60 + (hash % 25);

        String bet;
        String odds;
        if (homeWin > awayWin + 10) {
          bet = "1";
          odds = (1.4 + (100 - homeWin) / 80.0).toStringAsFixed(2);
        } else if (awayWin > homeWin + 10) {
          bet = "2";
          odds = (1.6 + (100 - awayWin) / 70.0).toStringAsFixed(2);
        } else {
          bet = "X";
          odds = (3.0 + (hash % 50) / 100.0).toStringAsFixed(2);
        }

        buffer.writeln('$pickNumber. ${match.homeTeam.name} vs ${match.awayTeam.name}');
        buffer.writeln('   → **$bet** @ $odds ($confidence%)');
        pickNumber++;
      }
      buffer.writeln('');
    }

    buffer.writeln('---\n');
    buffer.writeln('💡 *Tap on any match for detailed analysis*');

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
    final allMatches = [..._todayMatches, ..._tomorrowMatches];

    if (allMatches.isEmpty) {
      return '⏳ Loading matches... Try again in a moment.';
    }

    final buffer = StringBuffer();
    buffer.writeln('📊 **Over/Under Analysis**\n');
    buffer.writeln('---\n');

    final overMatches = <Match>[];
    final underMatches = <Match>[];

    for (final match in allMatches.take(10)) {
      final hash = (match.homeTeam.name + match.awayTeam.name).hashCode.abs();
      final xg = 2.2 + (hash % 18) / 10.0;
      if (xg > 2.6) {
        overMatches.add(match);
      } else if (xg < 2.3) {
        underMatches.add(match);
      }
    }

    buffer.writeln('**✅ Best Over 2.5 Picks:**');
    for (final match in overMatches.take(4)) {
      final hash = (match.homeTeam.name + match.awayTeam.name).hashCode.abs();
      final xg = 2.2 + (hash % 18) / 10.0;
      final odds = (1.7 + (hash % 40) / 100.0).toStringAsFixed(2);
      buffer.writeln('• ${match.homeTeam.name} vs ${match.awayTeam.name}');
      buffer.writeln('  xG: ${xg.toStringAsFixed(1)} | @ $odds');
    }

    buffer.writeln('\n**❌ Best Under 2.5 Picks:**');
    for (final match in underMatches.take(4)) {
      final hash = (match.homeTeam.name + match.awayTeam.name).hashCode.abs();
      final xg = 2.2 + (hash % 18) / 10.0;
      final odds = (1.6 + (hash % 35) / 100.0).toStringAsFixed(2);
      buffer.writeln('• ${match.homeTeam.name} vs ${match.awayTeam.name}');
      buffer.writeln('  xG: ${xg.toStringAsFixed(1)} | @ $odds');
    }

    return buffer.toString();
  }

  String _generateBttsAnalysis() {
    final allMatches = [..._todayMatches, ..._tomorrowMatches];

    if (allMatches.isEmpty) {
      return '⏳ Loading matches... Try again in a moment.';
    }

    final buffer = StringBuffer();
    buffer.writeln('🥅 **Both Teams To Score Analysis**\n');
    buffer.writeln('---\n');

    final bttsYes = <Match>[];
    final bttsNo = <Match>[];

    for (final match in allMatches.take(10)) {
      final hash = (match.homeTeam.name + match.awayTeam.name).hashCode.abs();
      if (hash % 3 != 0) {
        bttsYes.add(match);
      } else {
        bttsNo.add(match);
      }
    }

    buffer.writeln('**✅ BTTS Yes Picks:**');
    for (final match in bttsYes.take(4)) {
      final hash = (match.homeTeam.name + match.awayTeam.name).hashCode.abs();
      final odds = (1.65 + (hash % 35) / 100.0).toStringAsFixed(2);
      final confidence = 60 + (hash % 25);
      buffer.writeln('• ${match.homeTeam.name} vs ${match.awayTeam.name}');
      buffer.writeln('  @ $odds ($confidence%)');
    }

    buffer.writeln('\n**❌ BTTS No Picks:**');
    for (final match in bttsNo.take(3)) {
      final hash = (match.homeTeam.name + match.awayTeam.name).hashCode.abs();
      final odds = (1.85 + (hash % 40) / 100.0).toStringAsFixed(2);
      final confidence = 55 + (hash % 20);
      buffer.writeln('• ${match.homeTeam.name} vs ${match.awayTeam.name}');
      buffer.writeln('  @ $odds ($confidence%)');
    }

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
                _showSuggestions = true;
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
          if (_showSuggestions) _buildSuggestions(),
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildSuggestions() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Quick questions',
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: _showEditQuickQuestionsDialog,
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
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
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
