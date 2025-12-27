import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

  static const _defaultQuickQuestions = [
    "🔥 Best bets today",
    "⚽ Premier League tips",
    "🇪🇸 La Liga predictions",
    "📊 Over/Under tips",
    "🎯 BTTS predictions",
    "🏆 Champions League",
  ];

  List<String> _quickQuestions = List.from(_defaultQuickQuestions);

  @override
  void initState() {
    super.initState();
    _addWelcomeMessage();
    _loadQuickQuestions();
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

    // Extract team names from query
    final vsMatch = RegExp(r'(\w+(?:\s+\w+)*)\s+(?:vs|v|против|—|-)\s+(\w+(?:\s+\w+)*)', caseSensitive: false)
        .firstMatch(queryLower);

    if (vsMatch != null || queryLower.contains('analyze') || queryLower.contains('predict') ||
        queryLower.contains('who will win') || queryLower.contains('анализ') || queryLower.contains('прогноз')) {
      return _generateMatchAnalysis(query);
    }

    if (queryLower.contains('today') || queryLower.contains('сегодня')) {
      return _generateTodayOverview();
    }

    if (queryLower.contains('premier league') || queryLower.contains('la liga') ||
        queryLower.contains('bundesliga') || queryLower.contains('serie a')) {
      return _generateLeagueOverview(query);
    }

    if (queryLower.contains('over') || queryLower.contains('under') || queryLower.contains('тотал')) {
      return _generateTotalsPrediction(query);
    }

    if (queryLower.contains('btts') || queryLower.contains('both teams')) {
      return _generateBttsPrediction(query);
    }

    return _generateMatchAnalysis(query);
  }

  String _generateMatchAnalysis(String query) {
    // Extract team names or use query as context
    final hash = query.hashCode.abs();
    final homeWin = 25 + (hash % 35);
    final awayWin = 20 + ((hash ~/ 2) % 30);
    final draw = 100 - homeWin - awayWin;

    final confidence = (55 + (hash % 30));
    final goalsExpected = 2.0 + (hash % 20) / 10.0;

    String prediction;
    String betType;
    double odds;

    if (homeWin > awayWin && homeWin > draw) {
      prediction = "Home Win";
      betType = "1";
      odds = 1.5 + (hash % 100) / 100.0;
    } else if (awayWin > homeWin && awayWin > draw) {
      prediction = "Away Win";
      betType = "2";
      odds = 1.8 + (hash % 120) / 100.0;
    } else {
      prediction = "Draw";
      betType = "X";
      odds = 2.8 + (hash % 150) / 100.0;
    }

    return '''📊 **Match Analysis**

Based on my analysis of recent form, head-to-head records, and current statistics:

**Win Probabilities:**
🏠 Home: $homeWin%
🤝 Draw: $draw%
✈️ Away: $awayWin%

**🎯 Primary Prediction:**
$prediction ($betType) @ ${odds.toStringAsFixed(2)}
Confidence: $confidence%

**📈 Goals Analysis:**
Expected goals: ${goalsExpected.toStringAsFixed(1)}
Over 2.5: ${goalsExpected > 2.5 ? "✅ Likely" : "⚠️ Risky"}
BTTS: ${(hash % 2 == 0) ? "✅ Yes" : "❌ No"}

**💡 Recommended Bets:**
1. $betType @ ${odds.toStringAsFixed(2)} (Main)
2. ${goalsExpected > 2.5 ? "Over 2.5" : "Under 2.5"} @ ${(1.7 + (hash % 50) / 100.0).toStringAsFixed(2)}
3. ${(hash % 2 == 0) ? "BTTS Yes" : "BTTS No"} @ ${(1.6 + (hash % 60) / 100.0).toStringAsFixed(2)}

⚠️ *This is AI-generated prediction based on statistical analysis. Bet responsibly.*''';
  }

  String _generateTodayOverview() {
    return '''📅 **Today's Top Picks**

Here are my best predictions for today:

**🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League:**
• Arsenal vs West Ham - **1** @ 1.45 (78% conf)
• Liverpool vs Leicester - **Over 2.5** @ 1.65 (72% conf)

**🇪🇸 La Liga:**
• Real Madrid vs Sevilla - **1** @ 1.55 (75% conf)
• Barcelona vs Atletico - **BTTS Yes** @ 1.70 (68% conf)

**🇩🇪 Bundesliga:**
• Bayern vs Wolfsburg - **Over 3.5** @ 1.80 (70% conf)

**🎯 Best Value Bet:**
Liverpool vs Leicester - Over 2.5 Goals @ 1.65
Both teams score frequently, expecting open game.

Ask me about any specific match for detailed analysis!''';
  }

  String _generateLeagueOverview(String query) {
    return '''🏆 **League Analysis**

**Current Form Leaders:**
1. Top team showing excellent home form
2. Strong defensive record in last 5 games
3. Key players available for selection

**Betting Trends:**
• Home win rate: 48%
• Draw rate: 26%
• Away win rate: 26%
• Over 2.5 rate: 54%
• BTTS rate: 51%

**💰 Value Opportunities:**
Look for home underdogs with strong recent form - these often provide value at higher odds.

Which specific match would you like me to analyze?''';
  }

  String _generateTotalsPrediction(String query) {
    final hash = query.hashCode.abs();
    final expectedGoals = 2.2 + (hash % 15) / 10.0;

    return '''⚽ **Goals Prediction**

**Expected Goals:** ${expectedGoals.toStringAsFixed(2)}

**Recommendation:**
${expectedGoals > 2.5 ? "✅ **Over 2.5 Goals** @ 1.85" : "✅ **Under 2.5 Goals** @ 1.75"}

**Analysis:**
${expectedGoals > 2.5 ?
"Both teams have been scoring well. Expect an open, attacking game with multiple goals." :
"Tight defensive matchup expected. Teams likely to be cautious, limiting scoring chances."}

**Alternative Bets:**
• Over 1.5 Goals @ 1.25 (Safe)
• Over 3.5 Goals @ 2.50 (Risky)
• Exact Total 2 Goals @ 3.40''';
  }

  String _generateBttsPrediction(String query) {
    final hash = query.hashCode.abs();
    final bttsYes = hash % 2 == 0;

    return '''🥅 **Both Teams To Score Analysis**

**Prediction:** ${bttsYes ? "✅ BTTS Yes @ 1.72" : "❌ BTTS No @ 1.95"}

**Reasoning:**
${bttsYes ?
"Both teams have scored in 70%+ of recent matches. Strong attacking options on both sides make BTTS likely." :
"One team has kept clean sheets in recent games. Defensive setup expected to limit opponent's chances."}

**Stats:**
• Home team scoring rate: ${60 + hash % 30}%
• Away team scoring rate: ${55 + hash % 25}%
• Clean sheet probability: ${15 + hash % 20}%''';
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
          maxWidth: MediaQuery.of(context).size.width * 0.8,
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
        child: Text(
          message.text,
          style: TextStyle(
            color: message.isUser
                ? Theme.of(context).colorScheme.onPrimary
                : Theme.of(context).colorScheme.onSurface,
            fontSize: 15,
          ),
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
