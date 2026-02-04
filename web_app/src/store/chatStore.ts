'use client';

import { create } from 'zustand';
import { api } from '@/services/api';
import { Match, ChatMessage, ChatPreferences, MatchInfo } from '@/types';

// Chat history expiration time (30 minutes) - matching mobile app
const CHAT_HISTORY_EXPIRATION = 30 * 60 * 1000;
const LOCAL_TOKENS_KEY = 'ai_chat_tokens';
const LOCAL_TOKENS_RESET_KEY = 'ai_chat_tokens_reset';
const CHAT_HISTORY_KEY = 'chat_history';
const CHAT_HISTORY_TIME_KEY = 'chat_history_time';
const QUICK_QUESTIONS_KEY = 'quick_questions';

const DEFAULT_TOKENS = 5;

const DEFAULT_QUICK_QUESTIONS = [
  "Today's matches",
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
];

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  aiAvailable: boolean;
  quickQuestions: string[];
  suggestionsExpanded: boolean;

  // Local tokens for non-authenticated users
  localTokens: number;

  // Actions
  initializeChat: () => Promise<void>;
  sendMessage: (
    message: string,
    preferences?: ChatPreferences,
    matchInfo?: MatchInfo,
    isPremium?: boolean
  ) => Promise<void>;
  clearChat: () => void;
  setSuggestionsExpanded: (expanded: boolean) => void;

  // Quick questions
  addQuickQuestion: (question: string) => void;
  removeQuickQuestion: (index: number) => void;
  resetQuickQuestions: () => void;

  // Token management
  checkAndResetTokens: () => void;
  useToken: () => boolean;
  getTokenCount: () => number;
}

// Helper to load chat history from localStorage
function loadChatHistory(): { messages: ChatMessage[]; timestamp: Date | null } {
  if (typeof window === 'undefined') {
    return { messages: [], timestamp: null };
  }

  try {
    const timestampStr = localStorage.getItem(CHAT_HISTORY_TIME_KEY);
    if (!timestampStr) return { messages: [], timestamp: null };

    const timestamp = new Date(parseInt(timestampStr, 10));
    const isExpired = Date.now() - timestamp.getTime() > CHAT_HISTORY_EXPIRATION;

    if (isExpired) {
      localStorage.removeItem(CHAT_HISTORY_KEY);
      localStorage.removeItem(CHAT_HISTORY_TIME_KEY);
      return { messages: [], timestamp: null };
    }

    const messagesJson = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!messagesJson) return { messages: [], timestamp: null };

    const messagesData = JSON.parse(messagesJson);
    const messages: ChatMessage[] = messagesData.map((m: { text: string; isUser: boolean; timestamp: number }) => ({
      text: m.text,
      isUser: m.isUser,
      timestamp: new Date(m.timestamp),
    }));

    return { messages, timestamp };
  } catch {
    return { messages: [], timestamp: null };
  }
}

// Helper to save chat history to localStorage
function saveChatHistory(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;

  try {
    // Only save if there are user messages
    const hasUserMessages = messages.some(m => m.isUser);
    if (!hasUserMessages) return;

    const messagesData = messages.map(m => ({
      text: m.text,
      isUser: m.isUser,
      timestamp: m.timestamp.getTime(),
    }));

    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messagesData));
    localStorage.setItem(CHAT_HISTORY_TIME_KEY, Date.now().toString());
  } catch {
    // Silent fail
  }
}

// Helper to load quick questions
function loadQuickQuestions(): string[] {
  if (typeof window === 'undefined') return DEFAULT_QUICK_QUESTIONS;

  try {
    const saved = localStorage.getItem(QUICK_QUESTIONS_KEY);
    if (saved) {
      const questions = JSON.parse(saved);
      if (Array.isArray(questions) && questions.length > 0) {
        return questions;
      }
    }
  } catch {
    // Silent fail
  }
  return DEFAULT_QUICK_QUESTIONS;
}

// Helper to save quick questions
function saveQuickQuestions(questions: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUICK_QUESTIONS_KEY, JSON.stringify(questions));
  } catch {
    // Silent fail
  }
}

// Token management helpers
function loadLocalTokens(): number {
  if (typeof window === 'undefined') return DEFAULT_TOKENS;

  try {
    const resetTime = localStorage.getItem(LOCAL_TOKENS_RESET_KEY);
    if (resetTime) {
      const resetDate = new Date(parseInt(resetTime, 10));
      const now = new Date();
      // Reset after 24 hours
      if (now.getTime() - resetDate.getTime() > 24 * 60 * 60 * 1000) {
        localStorage.setItem(LOCAL_TOKENS_KEY, DEFAULT_TOKENS.toString());
        localStorage.setItem(LOCAL_TOKENS_RESET_KEY, now.getTime().toString());
        return DEFAULT_TOKENS;
      }
    }

    const tokens = localStorage.getItem(LOCAL_TOKENS_KEY);
    if (tokens !== null) {
      return parseInt(tokens, 10);
    }
  } catch {
    // Silent fail
  }
  return DEFAULT_TOKENS;
}

function saveLocalTokens(tokens: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_TOKENS_KEY, tokens.toString());
    // Set reset time if not set
    if (!localStorage.getItem(LOCAL_TOKENS_RESET_KEY)) {
      localStorage.setItem(LOCAL_TOKENS_RESET_KEY, Date.now().toString());
    }
  } catch {
    // Silent fail
  }
}

// Generate welcome message
function generateWelcomeMessage(aiAvailable: boolean): ChatMessage {
  const statusText = aiAvailable
    ? 'AI analysis **enabled** (Claude AI)'
    : 'AI analysis **disabled** (server unavailable)';

  return {
    text: `Hello!

I'm your AI assistant for football match analysis.

${statusText}

**What I can do:**
- Analyse specific matches with predictions
- Probabilities: Home/Draw/Away, totals, BTTS
- Match overview for today/tomorrow
- Betting recommendations

**Example queries:**
- "Analyse Bayern vs Dortmund"
- "West Ham vs Fulham prediction"
- "Premier League today"
- "Best bets for today"

Please bet responsibly`,
    isUser: false,
    timestamp: new Date(),
  };
}

// Generate match-specific fallback when AI is unavailable
function generateMatchAnalysisFallback(query: string, matchInfo: MatchInfo): string {
  const { homeTeam, awayTeam, leagueCode } = matchInfo;
  const queryLower = query.toLowerCase();

  // Who will win / prediction question
  if (queryLower.includes('win') || queryLower.includes('predict') || queryLower.includes('best bet')) {
    return `**${homeTeam} vs ${awayTeam}**

**Quick Analysis:**

This is a competitive match in ${leagueCode || 'top league'} football.

**Factors to consider:**
- Home advantage for ${homeTeam}
- Recent form of both teams
- Head-to-head history
- Key player availability

**Suggestion:** Check the "Head to Head" and "Match Statistics" sections below for detailed data before placing any bets.

*AI analysis temporarily unavailable - this is a general response.*`;
  }

  // Over/under goals
  if (queryLower.includes('goal') || queryLower.includes('over') || queryLower.includes('under')) {
    return `**${homeTeam} vs ${awayTeam} - Goals Analysis**

**Factors affecting goals:**
- Both teams' attacking and defensive records
- Recent scoring trends
- Historical meetings

**To estimate:**
- Check "Match Statistics" for average goals
- Look at recent form in "Head to Head"

*AI analysis temporarily unavailable - check the stats below.*`;
  }

  // BTTS (Both teams to score)
  if (queryLower.includes('btts') || queryLower.includes('both team')) {
    return `**${homeTeam} vs ${awayTeam} - BTTS Analysis**

**Key factors:**
- Defensive solidity of both teams
- Clean sheet percentages
- Recent games with both teams scoring

**Check:**
- Goals Conceded stats in "Match Statistics"
- Clean Sheets % for both teams

*AI analysis temporarily unavailable.*`;
  }

  // Score prediction
  if (queryLower.includes('score')) {
    return `**${homeTeam} vs ${awayTeam} - Score Prediction**

Score predictions require detailed analysis of:
- Recent goal-scoring records
- Defensive statistics
- Head-to-head scoring patterns

Check the "Match Statistics" section for detailed data.

*AI analysis temporarily unavailable.*`;
  }

  // Default response
  return `**${homeTeam} vs ${awayTeam}**

I can provide analysis on:
- **Who will win?** - Match outcome prediction
- **Best bet?** - Value betting suggestion
- **Over 2.5 goals?** - Goals market analysis
- **Both teams score?** - BTTS analysis
- **Predicted score?** - Scoreline prediction

Click one of the quick questions above or type your own!

*Note: Full AI analysis temporarily unavailable.*`;
}

// Generate fallback AI response (when server unavailable)
function generateFallbackResponse(
  query: string,
  todayMatches: Match[],
  tomorrowMatches: Match[],
  matchInfo?: MatchInfo
): string {
  // If we have specific match info, generate response for that match
  if (matchInfo?.homeTeam && matchInfo?.awayTeam) {
    return generateMatchAnalysisFallback(query, matchInfo);
  }

  const queryLower = query.toLowerCase();

  // Check for league-specific requests
  const leagueMatches = [
    { keywords: ['bundesliga', 'german'], code: 'BL1', name: 'Bundesliga' },
    { keywords: ['premier league', 'epl'], code: 'PL', name: 'Premier League' },
    { keywords: ['la liga', 'spanish'], code: 'PD', name: 'La Liga' },
    { keywords: ['serie a', 'italian'], code: 'SA', name: 'Serie A' },
    { keywords: ['ligue 1', 'french'], code: 'FL1', name: 'Ligue 1' },
  ];

  for (const league of leagueMatches) {
    if (league.keywords.some(k => queryLower.includes(k))) {
      return generateLeagueResponse(league.code, league.name, todayMatches, tomorrowMatches);
    }
  }

  // Today's matches
  if (queryLower.includes('today') || queryLower.includes('best bet') ||
      queryLower.includes('pick') || queryLower.includes('tip')) {
    return generateTodayResponse(todayMatches, tomorrowMatches);
  }

  // Default to today overview
  return generateTodayResponse(todayMatches, tomorrowMatches);
}

function generateLeagueResponse(
  leagueCode: string,
  leagueName: string,
  todayMatches: Match[],
  tomorrowMatches: Match[]
): string {
  const allMatches = [...todayMatches, ...tomorrowMatches];
  const leagueMatches = allMatches.filter(m =>
    m.leagueCode === leagueCode || m.league.toLowerCase().includes(leagueName.toLowerCase())
  );

  if (leagueMatches.length === 0) {
    return `**${leagueName}**

No matches found

No ${leagueName} matches scheduled for the next few days.

Try another league:
- Premier League
- La Liga
- Bundesliga
- Serie A
- Ligue 1`;
  }

  const lines = [`**${leagueName}**\n\n---\n`];

  for (let i = 0; i < Math.min(leagueMatches.length, 10); i++) {
    const match = leagueMatches[i];
    lines.push(`**${i + 1}. ${match.homeTeam.name} vs ${match.awayTeam.name}**`);
    lines.push(`${formatMatchDate(match.matchDate)}\n`);
  }

  lines.push('---\n');
  lines.push('Type a team name for detailed analysis');

  return lines.join('\n');
}

function generateTodayResponse(todayMatches: Match[], tomorrowMatches: Match[]): string {
  const matches = todayMatches.length > 0 ? todayMatches : tomorrowMatches;
  const dateLabel = todayMatches.length > 0 ? 'Today' : 'Tomorrow';

  if (matches.length === 0) {
    return `**${dateLabel}'s matches**

No matches found

No matches scheduled for today or tomorrow.

Ask about a specific league:
- "Bundesliga"
- "Premier League"
- "La Liga"`;
  }

  const lines = [`**Matches for ${dateLabel}**\n\n---\n`];

  // Group by league
  const byLeague: Record<string, Match[]> = {};
  for (const match of matches) {
    if (!byLeague[match.league]) byLeague[match.league] = [];
    byLeague[match.league].push(match);
  }

  for (const [league, leagueMatches] of Object.entries(byLeague)) {
    const icon = getLeagueIcon(league);
    lines.push(`**${icon} ${league}:**`);

    for (const match of leagueMatches.slice(0, 3)) {
      lines.push(`- ${match.homeTeam.name} vs ${match.awayTeam.name}`);
      lines.push(`  ${formatMatchDate(match.matchDate)}`);
    }
    lines.push('');
  }

  lines.push('---\n');
  lines.push('Type a team name for analysis');

  return lines.join('\n');
}

function getLeagueIcon(league: string): string {
  if (league.includes('Premier')) return '';
  if (league.includes('Liga') && !league.includes('Ligue')) return '';
  if (league.includes('Bundesliga')) return '';
  if (league.includes('Serie A')) return '';
  if (league.includes('Ligue 1')) return '';
  return '';
}

function formatMatchDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const matchDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (matchDay.getTime() === today.getTime()) {
    return `Today ${time}`;
  } else if (matchDay.getTime() === tomorrow.getTime()) {
    return `Tomorrow ${time}`;
  } else {
    return `${date.getDate()}.${date.getMonth() + 1} ${time}`;
  }
}

export const useChatStore = create<ChatState>((set, get) => {
  // Load initial data
  const cached = loadChatHistory();
  const quickQuestions = loadQuickQuestions();
  const localTokens = loadLocalTokens();

  return {
    messages: cached.messages,
    isLoading: false,
    aiAvailable: false,
    quickQuestions,
    suggestionsExpanded: cached.messages.length === 0,
    localTokens,

    initializeChat: async () => {
      // Check AI availability
      let aiAvailable = false;
      try {
        aiAvailable = await api.isChatAvailable();
      } catch {
        aiAvailable = false;
      }

      set({ aiAvailable });

      // Add welcome message if no history
      const state = get();
      if (state.messages.length === 0) {
        set({
          messages: [generateWelcomeMessage(aiAvailable)],
        });
      }
    },

    sendMessage: async (message, preferences, matchInfo?, isPremium = false) => {
      const state = get();
      if (!message.trim() || state.isLoading) return;

      // Check tokens for non-premium users when AI is available
      if (state.aiAvailable && !isPremium) {
        const canUse = get().useToken();
        if (!canUse) {
          // Add error message about limit
          set({
            messages: [
              ...state.messages,
              {
                text: message,
                isUser: true,
                timestamp: new Date(),
              },
              {
                text: `**Daily Limit Reached**

You've used all your free predictions for today.

**Options:**
- Wait 24 hours for tokens to reset
- Upgrade to Premium for unlimited AI analysis

Premium benefits:
- Unlimited AI Predictions
- Pro Analysis Tools
- Priority Support`,
                isUser: false,
                timestamp: new Date(),
              },
            ],
          });
          saveChatHistory(get().messages);
          return;
        }
      }

      // Add user message
      const newMessages: ChatMessage[] = [
        ...state.messages,
        {
          text: message,
          isUser: true,
          timestamp: new Date(),
        },
      ];

      set({
        messages: newMessages,
        isLoading: true,
        suggestionsExpanded: false,
      });

      let response: string;

      // Try real AI API
      if (state.aiAvailable) {
        try {
          // Build history for API (last 10 messages max)
          const history = state.messages
            .slice(-10)
            .filter(m => m.isUser || state.messages.some(other => other.isUser))
            .map(m => ({
              role: m.isUser ? 'user' : 'assistant',
              content: m.text,
            }));

          console.log('[AI Chat] Sending message to API...', { message, hasMatchInfo: !!matchInfo });
          const result = await api.sendChatMessage(message, history, preferences, matchInfo);
          console.log('[AI Chat] Got response:', result);
          response = result.response;
        } catch (error) {
          // Log the actual error for debugging
          console.error('[AI Chat] API Error:', error);
          const errorStr = String(error);
          const errorMessage = error instanceof Error ? error.message : errorStr;

          if (errorStr.includes('429') || errorStr.includes('limit')) {
            response = `**Rate Limit Reached**

The AI service is temporarily unavailable due to high demand.

Please try again in a few minutes.`;
          } else if (errorStr.includes('401') || errorStr.includes('Unauthorized')) {
            response = `**Authentication Required**

Please sign in to use AI analysis.`;
          } else if (errorStr.includes('500') || errorStr.includes('Internal Server')) {
            response = `**Server Error**

The AI service encountered an error. Please try again later.

Error: ${errorMessage}`;
          } else if (errorStr.includes('fetch') || errorStr.includes('network') || errorStr.includes('Failed to fetch')) {
            response = `**Connection Error**

Could not connect to the AI service. Please check your internet connection.`;
          } else {
            // Show actual error instead of generic fallback
            response = `**AI Error**

${errorMessage}

If this persists, please try again later.`;
          }
        }
      } else {
        // AI not available - use fallback
        console.log('[AI Chat] AI not available, using fallback');
        response = generateFallbackResponse(message, [], [], matchInfo);
      }

      // Add assistant response
      set({
        messages: [
          ...get().messages,
          {
            text: response,
            isUser: false,
            timestamp: new Date(),
          },
        ],
        isLoading: false,
      });

      // Save to localStorage
      saveChatHistory(get().messages);
    },

    clearChat: () => {
      const state = get();
      set({
        messages: [generateWelcomeMessage(state.aiAvailable)],
        suggestionsExpanded: true,
      });

      // Clear from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CHAT_HISTORY_KEY);
        localStorage.removeItem(CHAT_HISTORY_TIME_KEY);
      }
    },

    setSuggestionsExpanded: (expanded) => {
      set({ suggestionsExpanded: expanded });
    },

    addQuickQuestion: (question) => {
      if (!question.trim()) return;
      const newQuestions = [...get().quickQuestions, question.trim()];
      set({ quickQuestions: newQuestions });
      saveQuickQuestions(newQuestions);
    },

    removeQuickQuestion: (index) => {
      const newQuestions = get().quickQuestions.filter((_, i) => i !== index);
      set({ quickQuestions: newQuestions });
      saveQuickQuestions(newQuestions);
    },

    resetQuickQuestions: () => {
      set({ quickQuestions: DEFAULT_QUICK_QUESTIONS });
      saveQuickQuestions(DEFAULT_QUICK_QUESTIONS);
    },

    checkAndResetTokens: () => {
      if (typeof window === 'undefined') return;

      const resetTime = localStorage.getItem(LOCAL_TOKENS_RESET_KEY);
      if (resetTime) {
        const resetDate = new Date(parseInt(resetTime, 10));
        const now = new Date();
        // Reset after 24 hours
        if (now.getTime() - resetDate.getTime() > 24 * 60 * 60 * 1000) {
          set({ localTokens: DEFAULT_TOKENS });
          saveLocalTokens(DEFAULT_TOKENS);
          localStorage.setItem(LOCAL_TOKENS_RESET_KEY, now.getTime().toString());
        }
      }
    },

    useToken: () => {
      const state = get();
      if (state.localTokens <= 0) return false;

      const newTokens = state.localTokens - 1;
      set({ localTokens: newTokens });
      saveLocalTokens(newTokens);
      return true;
    },

    getTokenCount: () => {
      return get().localTokens;
    },
  };
});

// Selectors
export const selectMessages = (state: ChatState) => state.messages;
export const selectIsLoading = (state: ChatState) => state.isLoading;
export const selectAiAvailable = (state: ChatState) => state.aiAvailable;
export const selectQuickQuestions = (state: ChatState) => state.quickQuestions;
export const selectLocalTokens = (state: ChatState) => state.localTokens;
