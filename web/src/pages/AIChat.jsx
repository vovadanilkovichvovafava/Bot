import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAdvertiser } from '../context/AdvertiserContext';
import api from '../api';
import { enrichMessage } from '../services/chatEnrichment';
import FootballSpinner from '../components/FootballSpinner';

const FREE_AI_LIMIT = 3;
const AI_REQUESTS_KEY = 'ai_requests_count';
const CHAT_HISTORY_KEY = 'ai_chat_history';
const CHAT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

// Secondary questions - shown on expand (keys for i18n)
const SECONDARY_QUESTIONS = [
  { key: 'liveMatchesNow', emoji: '🔴' },
  { key: 'premierLeagueToday', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { key: 'laLigaToday', emoji: '🇪🇸' },
  { key: 'championsLeague', emoji: '⭐' },
  { key: 'serieAToday', emoji: '🇮🇹' },
];

export default function AIChat() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [questionsExpanded, setQuestionsExpanded] = useState(false);
  const [responseCount, setResponseCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const isPremium = user?.is_premium;

  // Track keyboard open/close — hide BottomNav when keyboard is up
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const threshold = window.innerHeight * 0.75;
    const onResize = () => {
      const isKb = vv.height < threshold;
      setKeyboardOpen(isKb);
      // Hide BottomNav when keyboard is open so it doesn't sit above keyboard
      const nav = document.getElementById('bottom-nav');
      if (nav) nav.style.display = isKb ? 'none' : '';
    };
    vv.addEventListener('resize', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      const nav = document.getElementById('bottom-nav');
      if (nav) nav.style.display = '';
    };
  }, []);

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
      content: t('aiChat.welcomeMessage'),
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
  }, [messages, keyboardOpen]);

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

    try {
      // Build conversation history (exclude welcome message)
      // Filter out any invalid messages to prevent 422 validation errors
      const history = messages
        .filter(m => m.id !== 'welcome' && m.role && m.content)
        .map(m => ({ role: String(m.role), content: String(m.content) }));

      // Add user preferences to the message
      const textWithPrefs = text + getUserPreferencesPrompt();
      history.push({ role: 'user', content: textWithPrefs });

      // Enrich with real-time football data from API-Football
      setEnriching(true);
      let matchContext = null;
      try {
        const enriched = await enrichMessage(text);
        // Ensure match_context is always a string or null (prevent 422 validation errors)
        matchContext = enriched ? String(enriched) : null;
      } catch (e) {
        console.error('Enrichment failed:', e);
      }
      setEnriching(false);

      const data = await api.aiChat(textWithPrefs, history, matchContext);

      // Increment counter for free users only AFTER successful response
      if (!isPremium) {
        incrementAIRequestCount();
      }

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
      console.error('AI Chat error:', e);
      // Safely extract error message
      const errStr = typeof e === 'string' ? e : (e?.message || String(e));
      let errorMsg;
      if (errStr.includes('402') || errStr.includes('limit')) {
        errorMsg = t('aiChat.errLimit');
      } else if (errStr.includes('401') || errStr.includes('Unauthorized')) {
        errorMsg = t('aiChat.errAuth');
      } else if (errStr.includes('500')) {
        errorMsg = t('aiChat.errServer');
      } else {
        errorMsg = `${t('aiChat.error')}: ${errStr}`;
      }
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
      content: t('aiChat.chatCleared'),
    }]);
    setShowQuick(true);
    localStorage.removeItem(CHAT_HISTORY_KEY);
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full"
    >
      {/* Header — compact when keyboard open */}
      <div className={`bg-white px-4 flex items-center justify-between border-b border-gray-100 shrink-0 ${keyboardOpen ? 'py-1.5' : 'py-3'}`}>
        <div className="flex items-center gap-2">
          {!keyboardOpen && (
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
            </div>
          )}
          <div>
            <h1 className={`font-bold text-gray-900 leading-none ${keyboardOpen ? 'text-sm' : 'text-lg'}`}>{t('aiChat.title')}</h1>
            {!keyboardOpen && <p className="text-[10px] text-green-500 font-medium">{t('aiChat.realTimeData')}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!keyboardOpen && (
            <span className="flex items-center gap-1 bg-primary-50 text-primary-600 text-sm font-medium px-2.5 py-1 rounded-lg">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
              {remaining}
            </span>
          )}
          <button onClick={clearChat} className="w-8 h-8 flex items-center justify-center text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
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
                      {t('aiChat.realTimeData')}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 font-medium">{t('aiChat.aiAnalysis')}</span>
                  </div>
                )}
                <MessageContent content={msg.content} isUser={msg.role === 'user'} />

                {/* AI Recommended Bet - Clean green card with shimmer */}
                {msg.bet && msg.role === 'assistant' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => navigate('/promo?banner=aichat_bet_card')}
                      className="w-full text-left relative overflow-hidden rounded-xl shadow-lg"
                      style={{ background: '#059669' }}
                    >
                      {/* Animated shimmer overlay */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 60%, transparent 80%)',
                          animation: 'shimmer 5s infinite',
                          backgroundSize: '200% 100%',
                        }}
                      />

                      {/* Top section - Recommendation */}
                      <div className="relative p-3 pb-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                            <span className="text-xs font-semibold text-emerald-100">{t('aiChat.recommended')}</span>
                          </div>
                          <span className="bg-white text-emerald-700 text-sm font-bold px-2.5 py-0.5 rounded-lg shadow">
                            {msg.bet.odds.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white">{msg.bet.type}</p>
                      </div>

                      {/* Bottom section - Free bet bonus calculation */}
                      <div
                        className="relative px-3 py-3"
                        style={{
                          background: 'rgba(0,0,0,0.15)',
                          borderTop: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            {/* Free bet label */}
                            <span className="text-emerald-200 text-xs font-medium uppercase tracking-wide">{t('advertiser.freeBetLabel')}</span>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-bold text-lg">{advertiser.currency}1,500</span>
                              <span className="text-emerald-200 text-sm">×</span>
                              <span className="text-white font-semibold">{msg.bet.odds.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-200 text-xs">=</span>
                              <span
                                className="font-bold text-lg"
                                style={{ color: '#fbbf24' }}
                              >
                                {advertiser.currency}{(1500 * msg.bet.odds).toLocaleString()}
                              </span>
                              <span className="text-emerald-200 text-xs ml-1">{t('advertiser.potentialWin')}</span>
                            </div>
                            {/* Call to action text */}
                            <p className="text-white text-xs font-medium mt-1.5 opacity-90">{t('advertiser.betAndTakeIt')}</p>
                          </div>
                          <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                          </svg>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Simple promo link for messages without bet recommendation */}
                {!msg.bet && msg.role === 'assistant' && msg.id !== 'welcome' && (
                  <button
                    onClick={() => navigate('/promo?banner=aichat_promo_link')}
                    className="mt-3 pt-2 border-t border-gray-100 w-full flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-medium hover:text-emerald-700"
                  >
                    {t('advertiser.freeBet', { bonus: advertiser.bonusAmount })}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {/* Ad block after certain responses */}
            {msg.showAd && (
              <div className="mt-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xs">{advertiser.currency}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{t('aiChat.betOnPredictions')}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{t('aiChat.getBonus', { bonus: advertiser.bonusAmount, name: advertiser.name })}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate('/promo?banner=aichat_ad_get_bonus')}
                    className="flex-1 bg-emerald-600 text-white text-xs font-semibold py-2 px-3 rounded-lg text-center"
                  >
                    {t('aiChat.getBonus2')}
                  </button>
                  <button
                    onClick={() => navigate('/promo?banner=aichat_ad_learn_more')}
                    className="px-3 py-2 bg-white text-gray-700 text-xs font-medium rounded-lg border border-gray-200"
                  >
                    {t('aiChat.learnMore')}
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
                  <FootballSpinner size="xs" />
                  {t('aiChat.fetchingData')}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <FootballSpinner size="xs" />
                  {t('aiChat.analyzing')}
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>

      {/* Quick Questions - Compact (hidden when keyboard is open) */}
      {showQuick && messages.length <= 1 && !keyboardOpen && (
        <div className="px-5 pb-2 shrink-0">
          {/* Primary Questions - Always visible */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => navigate('/promo?banner=aichat_bonus_button')}
              className="flex-1 text-sm px-3 py-2.5 rounded-xl font-medium bg-emerald-600 text-white"
            >
              {t('advertiser.bonusButton', { bonus: advertiser.bonusAmount })}
            </button>
            <button
              onClick={() => sendMessage(t('aiChat.todaysBestBets'))}
              disabled={loading}
              className="flex-1 text-sm px-3 py-2.5 rounded-xl font-medium disabled:opacity-50 bg-primary-600 text-white"
            >
              🎯 {t('advertiser.bestBets')}
            </button>
          </div>

          {/* Secondary Questions - Expandable */}
          {questionsExpanded && (
            <div className="flex flex-wrap gap-2 mb-2">
              {SECONDARY_QUESTIONS.map(q => (
                <button
                  key={q.key}
                  onClick={() => sendMessage(t(`aiChat.${q.key}`))}
                  disabled={loading}
                  className="bg-white text-gray-700 text-sm px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  {q.emoji} {t(`aiChat.${q.key}`)}
                </button>
              ))}
            </div>
          )}

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setQuestionsExpanded(!questionsExpanded)}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 py-2 hover:text-gray-700"
          >
            {questionsExpanded ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/>
                </svg>
                {t('aiChat.showLess')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
                </svg>
                {t('aiChat.moreQuestions')}
              </>
            )}
          </button>
        </div>
      )}

      {/* Input — compact like Telegram */}
      <div className={`px-4 bg-white border-t border-gray-100 shrink-0 ${keyboardOpen ? 'py-1.5' : 'py-2.5'}`}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage(input)}
            placeholder={t('aiChat.inputPlaceholder')}
            className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary-200"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            {loading ? (
              <FootballSpinner size="xs" light />
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
              <h3 className="text-lg font-bold text-gray-900">{t('aiChat.freeLimitReached')}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('aiChat.usedAllRequests', { count: FREE_AI_LIMIT })}
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
              <p className="text-sm font-medium text-green-800 mb-1">{t('aiChat.unlockUnlimitedAI')}</p>
              <p className="text-xs text-green-600">
                {t('aiChat.depositForUnlimited', { name: advertiser.name })}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => { setShowLimitModal(false); navigate('/promo?banner=aichat_limit_unlock'); }}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
              >
                {t('aiChat.depositAndUnlock')}
              </button>
              <button
                onClick={() => setShowLimitModal(false)}
                className="w-full text-gray-500 text-sm py-2"
              >
                {t('aiChat.maybeLater')}
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
