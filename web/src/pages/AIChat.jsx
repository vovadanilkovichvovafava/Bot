import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdvertiser } from '../context/AdvertiserContext';
import api from '../api';
import { enrichMessage } from '../services/chatEnrichment';

const FREE_AI_LIMIT = 3;
const AI_REQUESTS_KEY = 'ai_requests_count';
const CHAT_HISTORY_KEY = 'ai_chat_history';
const CHAT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

const QUICK_QUESTIONS = [
  { label: "Today's best bets", emoji: '\uD83C\uDFAF' },
  { label: "Live matches now", emoji: '\uD83D\uDD34' },
  { label: 'Premier League today', emoji: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F' },
  { label: 'La Liga today', emoji: '\uD83C\uDDEA\uD83C\uDDF8' },
  { label: 'Champions League', emoji: '\u2B50' },
  { label: 'Serie A today', emoji: '\uD83C\uDDEE\uD83C\uDDF9' },
];

export default function AIChat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [responseCount, setResponseCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isPremium = user?.is_premium;

  // Load cached chat history from localStorage
  const loadCachedChat = () => {
    try {
      const cached = localStorage.getItem(CHAT_HISTORY_KEY);
      if (!cached) return null;
      const { messages: cachedMsgs, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CHAT_CACHE_TTL) {
        localStorage.removeItem(CHAT_HISTORY_KEY);
        return null;
      }
      return cachedMsgs;
    } catch {
      return null;
    }
  };

  // Save chat history to localStorage
  const saveChatHistory = (msgs) => {
    try {
      const toSave = msgs.filter(m => m.id !== 'welcome');
      if (toSave.length > 0) {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify({
          messages: toSave,
          timestamp: Date.now()
        }));
      }
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  };

  // Get AI request count from localStorage (for free users)
  const getAIRequestCount = () => {
    const count = localStorage.getItem(AI_REQUESTS_KEY);
    return count ? parseInt(count, 10) : 0;
  };

  const incrementAIRequestCount = () => {
    const newCount = getAIRequestCount() + 1;
    localStorage.setItem(AI_REQUESTS_KEY, newCount.toString());
    return newCount;
  };

  const aiRequestCount = getAIRequestCount();
  const remaining = isPremium ? 999 : Math.max(0, FREE_AI_LIMIT - aiRequestCount);

  useEffect(() => {
    // Try to load cached chat history first
    const cachedMessages = loadCachedChat();
    const welcomeMsg = {
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to **AI Football Assistant**!\n\nI have access to **real-time data** from 900+ leagues:\n\n\u2022 \uD83D\uDCCA **Match predictions** with real probabilities & odds\n\u2022 \uD83D\uDD34 **Live scores** and match statistics\n\u2022 \uD83C\uDFAF **Betting recommendations** based on actual data\n\u2022 \uD83E\uDE7A **Injuries & lineups** for upcoming matches\n\u2022 \uD83D\uDCC5 **Today's overview** with AI predictions\n\n**Try asking:**\n\u2022 "Arsenal vs Chelsea prediction"\n\u2022 "Best bets for today"\n\u2022 "Live matches now"\n\u2022 "Premier League today"`,
    };

    if (cachedMessages && cachedMessages.length > 0) {
      // Restore cached messages with welcome at the start
      setMessages([welcomeMsg, ...cachedMessages]);
      setShowQuick(false);
    } else {
      setMessages([welcomeMsg]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build user preferences string
  const getUserPreferencesPrompt = () => {
    const minOdds = user?.min_odds || 1.5;
    const maxOdds = user?.max_odds || 3.0;
    const riskLevel = user?.risk_level || 'medium';
    const riskDesc = {
      low: 'Conservative - safer bets, favorites, double chance. 1-2% stakes.',
      medium: 'Balanced - standard 1X2, over/under, BTTS. 2-5% stakes.',
      high: 'Aggressive - value picks, accumulators, correct scores. 5-10% stakes.'
    };
    return `\n\n[USER BETTING PREFERENCES: Odds range ${minOdds}-${maxOdds}, Risk: ${riskLevel.toUpperCase()} (${riskDesc[riskLevel]}). Only recommend bets within this range. IMPORTANT: If you recommend a bet, end with exactly this format: [BET] Bet Type @ Odds. Example: [BET] Over 2.5 Goals @ 1.85]`;
  };

  // Parse bet from AI response
  const parseBetFromMessage = (content) => {
    if (!content) return null;
    const betMatch = content.match(/\[BET\]\s*(.+?)\s*@\s*([\d.]+)/i);
    if (betMatch) {
      return {
        type: betMatch[1].trim(),
        odds: parseFloat(betMatch[2]),
        homeTeam: 'Match',
        awayTeam: '',
        league: '',
        date: new Date().toLocaleDateString('en-GB'),
      };
    }
    return null;
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    // Check free limit for non-premium users
    if (!isPremium && getAIRequestCount() >= FREE_AI_LIMIT) {
      setShowLimitModal(true);
      return;
    }

    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowQuick(false);
    setLoading(true);

    // Increment counter for free users
    if (!isPremium) {
      incrementAIRequestCount();
    }

    try {
      // Build conversation history (exclude welcome message)
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      // Add user preferences to the message
      const textWithPrefs = text + getUserPreferencesPrompt();
      history.push({ role: 'user', content: textWithPrefs });

      // Enrich with real-time football data from API-Football
      setEnriching(true);
      let matchContext = null;
      try {
        matchContext = await enrichMessage(text);
      } catch (e) {
        console.error('Enrichment failed:', e);
      }
      setEnriching(false);

      const data = await api.aiChat(textWithPrefs, history, matchContext);
      const newCount = responseCount + 1;
      setResponseCount(newCount);

      // Parse bet from response
      const parsedBet = parseBetFromMessage(data.response);

      const newMessages = [...messages, userMsg, {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response,
        hasData: !!matchContext,
        showAd: newCount % 2 === 0,
        bet: parsedBet,
      }];
      setMessages(newMessages);
      saveChatHistory(newMessages);
    } catch (e) {
      const errorMsg = e.message?.includes('402') || e.message?.includes('limit')
        ? 'You have reached your daily AI request limit. Upgrade to Premium for unlimited access.'
        : 'Sorry, I encountered an error. Please try again.';
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: errorMsg,
      }]);
    } finally {
      setLoading(false);
      setEnriching(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Chat cleared. How can I help you with football analysis?',
    }]);
    setShowQuick(true);
    localStorage.removeItem(CHAT_HISTORY_KEY);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">AI Assistant</h1>
            <p className="text-[10px] text-green-500 font-medium">Real-time data</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 bg-primary-50 text-primary-600 text-sm font-medium px-2.5 py-1 rounded-lg">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
            {remaining}
          </span>
          <button onClick={clearChat} className="w-8 h-8 flex items-center justify-center text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-sm'
                  : 'bg-white text-gray-800 rounded-tl-sm shadow-sm'
              }`}>
                {/* Data badge for enriched responses */}
                {msg.hasData && msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      Real-time data
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 font-medium">AI Analysis</span>
                  </div>
                )}
                <MessageContent content={msg.content} isUser={msg.role === 'user'} />

                {/* AI Recommended Bet - Display only */}
                {msg.bet && msg.role === 'assistant' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                          <span className="text-xs font-semibold text-green-700">Recommended</span>
                        </div>
                        <span className="bg-green-600 text-white text-sm font-bold px-2 py-0.5 rounded">
                          {msg.bet.odds.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{msg.bet.type}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Ad block after certain responses */}
            {msg.showAd && (
              <div className="mt-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-lg">🎁</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">Bet on AI predictions!</p>
                    <p className="text-xs text-gray-600 mt-0.5">Get {advertiser.bonus} bonus at {advertiser.name}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <a
                    href={user?.id ? trackClick(user.id) : advertiser.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold py-2 px-3 rounded-lg text-center"
                  >
                    Get Bonus
                  </a>
                  <button
                    onClick={() => navigate('/promo')}
                    className="px-3 py-2 bg-white text-gray-700 text-xs font-medium rounded-lg border border-gray-200"
                  >
                    Learn More
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm">
              {enriching ? (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"/>
                  Fetching real-time data...
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                  </div>
                  Analyzing...
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>

      {/* Quick Questions */}
      {showQuick && messages.length <= 1 && (
        <div className="px-5 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 .75a8.25 8.25 0 00-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 00.577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.714 6.714 0 01-.937-.171.75.75 0 11.374-1.453 5.261 5.261 0 002.626 0 .75.75 0 11.374 1.452 6.712 6.712 0 01-.937.172v4.66c0 .327.277.586.6.545.364-.047.722-.112 1.074-.195a.75.75 0 00.577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0012 .75z"/>
              </svg>
              Quick questions
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map(q => (
              <button
                key={q.label}
                onClick={() => sendMessage(q.label)}
                disabled={loading}
                className="bg-white text-gray-700 text-sm px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                {q.emoji} {q.label}
              </button>
            ))}
          </div>
          {/* Promo chip */}
          <div className="mt-3 flex items-center gap-2">
            <a
              href={user?.id ? trackClick(user.id) : advertiser.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full"
            >
              <span>🎁</span>
              Bonus {advertiser.bonus}
            </a>
            <button
              onClick={() => navigate('/promo')}
              className="inline-flex items-center gap-1 text-xs text-gray-500"
            >
              How to get it?
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-3 bg-white border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage(input)}
            placeholder="Ask about any match, league, or team..."
            className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Limit Reached Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => setShowLimitModal(false)}>
          <div className="absolute inset-0 bg-black/40"/>
          <div
            className="relative bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setShowLimitModal(false)} className="absolute top-3 right-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Free Limit Reached</h3>
              <p className="text-sm text-gray-500 mt-1">
                You've used all {FREE_AI_LIMIT} free AI requests
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
              <p className="text-sm font-medium text-green-800 mb-1">Unlock Unlimited AI</p>
              <p className="text-xs text-green-600">
                Make a deposit at {advertiser.name} → Unlimited AI requests
              </p>
            </div>

            <div className="space-y-2">
              <a
                href={user?.id ? trackClick(user.id) : advertiser.link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
              >
                Deposit & Unlock
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
                </svg>
              </a>
              <button
                onClick={() => setShowLimitModal(false)}
                className="w-full text-gray-500 text-sm py-2"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renders message content with markdown-like formatting.
 * Supports: **bold**, bullet points, --- separators
 */
function MessageContent({ content, isUser }) {
  if (!content) return null;

  // Remove the [BET] line from display
  const cleanContent = content.replace(/\[BET\]\s*.+?@\s*[\d.]+/gi, '').trim();

  return (
    <div className="space-y-0.5">
      {cleanContent.split('\n').map((line, i) => {
        if (line === '') return <div key={i} className="h-1.5"/>;

        // Horizontal rule
        if (line.match(/^---+$/)) {
          return <hr key={i} className={`my-2 ${isUser ? 'border-white/20' : 'border-gray-100'}`}/>;
        }

        // Bold headers (lines starting with ---)
        if (line.startsWith('---') && line.endsWith('---')) {
          const text = line.replace(/^-+\s*/, '').replace(/\s*-+$/, '');
          return (
            <p key={i} className={`font-semibold text-xs uppercase mt-2 mb-1 ${isUser ? 'text-white/70' : 'text-gray-400'}`}>
              {text}
            </p>
          );
        }

        // Bullet points
        if (line.startsWith('\u2022 ') || line.startsWith('- ') || line.startsWith('* ')) {
          const text = line.replace(/^[\u2022\-*]\s+/, '');
          const bold = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className={isUser ? 'text-white/50' : 'text-gray-300'}>{'\u2022'}</span>
              <p dangerouslySetInnerHTML={{ __html: bold }}/>
            </div>
          );
        }

        // Regular text with bold support
        const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <p key={i} dangerouslySetInnerHTML={{ __html: bold }}/>;
      })}
    </div>
  );
}
