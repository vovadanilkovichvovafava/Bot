import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import api from '../../../shared/api';
import { enrichMessage } from '../services/chatEnrichment';
import fonbetApi from '../../../services/fonbetApi';
import { getTrackingLink, addTrackingToUrl, openTrackingLink } from '../../betting/services/trackingService';
import FootballSpinner from '../../../shared/components/FootballSpinner';
import useKeyboardHeight from '../../../shared/hooks/useKeyboardHeight';
import { useBottomNav } from '../../../shared/context/BottomNavContext';

const CHAT_HISTORY_KEY = 'ai_chat_history';
const CHAT_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours in ms

// Secondary questions - locale-specific leagues first, then international
const SECONDARY_QUESTIONS_BY_LOCALE = {
  it: [
    { key: 'liveMatchesNow', emoji: '🔴' },
    { key: 'serieAToday', emoji: '🇮🇹' },
    { key: 'championsLeague', emoji: '⭐' },
    { key: 'premierLeagueToday', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { key: 'laLigaToday', emoji: '🇪🇸' },
  ],
  de: [
    { key: 'liveMatchesNow', emoji: '🔴' },
    { key: 'bundesligaToday', emoji: '🇩🇪' },
    { key: 'championsLeague', emoji: '⭐' },
    { key: 'premierLeagueToday', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { key: 'laLigaToday', emoji: '🇪🇸' },
  ],
  pl: [
    { key: 'liveMatchesNow', emoji: '🔴' },
    { key: 'ekstraklasaToday', emoji: '🇵🇱' },
    { key: 'championsLeague', emoji: '⭐' },
    { key: 'premierLeagueToday', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { key: 'bundesligaToday', emoji: '🇩🇪' },
  ],
};
const DEFAULT_SECONDARY = [
  { key: 'liveMatchesNow', emoji: '🔴' },
  { key: 'premierLeagueToday', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { key: 'championsLeague', emoji: '⭐' },
  { key: 'laLigaToday', emoji: '🇪🇸' },
  { key: 'serieAToday', emoji: '🇮🇹' },
];

/**
 * After AI responds with [BET], try to find a Fonbet deeplink for the recommended match.
 * Searches enrichment context and AI response for "Team vs Team" lines matching the bet's team.
 */
async function findFonbetDeeplinkForBet(parsedBet, matchContext, aiResponse) {
  if (!parsedBet) return null;
  try {
    // Extract team name from bet type (e.g., "Ferencvaros or Draw" → "Ferencvaros")
    const betTeam = parsedBet.type
      .replace(/\s*(or Draw|\/Draw|to Win|Win|DNB|Draw No Bet|& Draw|and Draw|Double Chance|1X|X2|12)$/i, '')
      .replace(/^(Over|Under|BTTS|Both Teams to Score|Handicap|Double Chance)\s*/i, '')
      .replace(/\s*[\d.]+\s*(Goals?)?$/i, '')
      .trim();
    if (betTeam.length < 3) return null;

    const betLower = betTeam.toLowerCase();
    const lines = ((matchContext || '') + '\n' + (aiResponse || '')).split('\n');

    for (const line of lines) {
      if (!/\bvs\.?\b/i.test(line)) continue;
      const parts = line.split(/\s+vs\.?\s+/i);
      if (parts.length < 2) continue;

      // Clean: remove time prefixes "14:00 | ", markdown "**", score suffixes "[FT 1-0]"
      const home = parts[0].replace(/^.*\|\s*/, '').replace(/\*+/g, '').trim();
      const away = parts[1].replace(/\s*[\(\[\{].*$/, '').replace(/\s*\d+-\d+.*$/, '').replace(/\*+/g, '').trim();
      if (home.length < 2 || away.length < 2) continue;

      const hLow = home.toLowerCase();
      const aLow = away.toLowerCase();
      if (hLow.includes(betLower) || aLow.includes(betLower) ||
          betLower.includes(hLow) || betLower.includes(aLow)) {
        const fb = await fonbetApi.findMatch(home, away);
        if (fb?.deeplink) return fb.deeplink;
      }
    }
  } catch (_) { /* Fonbet lookup failed — app works without it */ }
  return null;
}

export default function AIChat() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { advertiser, trackClick, countryCode } = useAdvertiser();
  // Only users registered on bookmaker (use_deeplink=true) or PRO users go directly to match
  // Everyone else must first register through the offer
  const isFunnel2 = user?.funnel === 'funnel-2' || user?.funnel === 'funnel-4';
  const canUseDeeplink = user?.use_deeplink === true || (user?.is_premium && !isFunnel2);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [questionsExpanded, setQuestionsExpanded] = useState(false);
  const [responseCount, setResponseCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const { keyboardOpen, viewportHeight } = useKeyboardHeight();
  const { hideBottomNav, showBottomNav } = useBottomNav();
  const [remaining, setRemaining] = useState(null); // null = loading, number = from server
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isPremium = user?.is_premium && !isFunnel2;

  // Hide BottomNav when keyboard is open
  useEffect(() => {
    if (keyboardOpen) {
      hideBottomNav();
      return () => showBottomNav();
    }
  }, [keyboardOpen, hideBottomNav, showBottomNav]);

  // Fetch AI chat limit from server
  useEffect(() => {
    if (isPremium || isFunnel2) {
      setRemaining(999);
      return;
    }
    api.getChatLimit()
      .then(data => setRemaining(data.remaining ?? data.limit ?? 3))
      .catch(() => setRemaining(3)); // Fallback to 3 on error
  }, [isPremium, isFunnel2]);

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
    return `\n\n[USER BETTING PREFERENCES: Odds range ${minOdds}-${maxOdds}, Risk: ${riskLevel.toUpperCase()} (${riskDesc[riskLevel]}). Only recommend bets within this range. IMPORTANT: If you recommend bets, end with a FINAL RECOMMENDATIONS section with 2-3 bets from different markets. Each line: [BET] Bet Type @ Odds. Example:\n**FINAL RECOMMENDATIONS**\n1. [BET] Over 2.5 Goals @ 1.85\n2. [BET] Home Win @ 2.10\n3. [BET] Both Teams to Score @ 1.75\nAll odds must be between ${minOdds} and ${maxOdds}.]`;
  };

  // Parse bets from AI response (multiple [BET] tags)
  const parseBetsFromMessage = (content) => {
    if (!content) return [];
    const bets = [];
    const seen = new Set();

    // 1) Explicit [BET] tags: [BET] Over 2.5 Goals @ 1.85
    const betTagRe = /\[BET\]\s*(.+?)\s*@\s*([\d.]+)/gi;
    let m;
    while ((m = betTagRe.exec(content)) !== null) {
      const key = m[1].trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        bets.push({ type: m[1].trim(), odds: parseFloat(m[2]) });
      }
    }

    // 2) Numbered list: "1. Over 2.5 Goals @ 1.85" or "1. **Over 2.5 Goals** @ 1.85"
    if (bets.length === 0) {
      const numberedRe = /^\s*\d+[.)]\s*\**\s*(.+?)\**\s*[@–—-]\s*([\d.]+)/gim;
      while ((m = numberedRe.exec(content)) !== null) {
        const type = m[1].replace(/\*+/g, '').replace(/\s*\(.*?\)\s*$/, '').trim();
        const odds = parseFloat(m[2]);
        if (odds >= 1.01 && odds <= 50 && type.length > 2) {
          const key = type.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            bets.push({ type, odds });
          }
        }
      }
    }

    // 3) Fallback: "Bet Type @ odds" or "Bet Type — odds" anywhere in text
    if (bets.length === 0) {
      const fallbackRe = /(?:^|\n)[•\-*]?\s*\**(.+?)\**\s*[@–—]\s*([\d.]+)/gim;
      while ((m = fallbackRe.exec(content)) !== null) {
        const type = m[1].replace(/\*+/g, '').replace(/\[BET\]/gi, '').replace(/\s*\(.*?\)\s*$/, '').trim();
        const odds = parseFloat(m[2]);
        if (odds >= 1.01 && odds <= 50 && type.length > 2 && !type.includes(':')) {
          const key = type.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            bets.push({ type, odds });
          }
        }
      }
    }

    return bets.slice(0, 4).map(b => ({
      ...b,
      homeTeam: 'Match',
      awayTeam: '',
      league: '',
      date: new Date().toLocaleDateString('en-GB'),
    }));
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    // Check free limit from server
    if (!isPremium && !isFunnel2 && remaining !== null && remaining <= 0) {
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
      let fonbetDeeplink = null;
      try {
        const enriched = await enrichMessage(text);
        if (enriched) {
          // enrichMessage now returns { context, fonbetDeeplink } or null
          matchContext = String(enriched.context || '');
          fonbetDeeplink = enriched.fonbetDeeplink || null;
        }
      } catch (e) {
        console.error('Enrichment failed:', e);
      }
      setEnriching(false);

      const locale = i18n.language?.slice(0, 2) || 'en';
      const data = await api.aiChat(textWithPrefs, history, matchContext, locale);

      // Refresh remaining count from server after each request
      if (!isPremium && !isFunnel2) {
        api.getChatLimit()
          .then(d => setRemaining(d.remaining ?? d.limit ?? 0))
          .catch(() => {});
      }

      const newCount = responseCount + 1;
      setResponseCount(newCount);

      // Parse bets from response
      const parsedBets = parseBetsFromMessage(data.response);
      const firstBet = parsedBets[0] || null;

      // Find Fonbet deeplinks for each parsed bet individually
      if (parsedBets.length > 0) {
        const deeplinkResults = await Promise.allSettled(
          parsedBets.map(bet => findFonbetDeeplinkForBet(bet, matchContext, data.response))
        );
        for (let i = 0; i < parsedBets.length; i++) {
          const result = deeplinkResults[i];
          parsedBets[i].fonbetDeeplink = (result.status === 'fulfilled' ? result.value : null) || fonbetDeeplink || null;
        }
        // Keep message-level deeplink for backwards compat (promo links, ad blocks)
        if (!fonbetDeeplink && firstBet) {
          fonbetDeeplink = parsedBets[0].fonbetDeeplink || null;
        }
      }

      const newMessages = [...messages, userMsg, {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response,
        hasData: !!matchContext,
        showAd: true,
        bet: firstBet,
        bets: parsedBets,
        fonbetDeeplink,
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
      className="flex flex-col"
      style={{ height: keyboardOpen ? `${viewportHeight}px` : '100%' }}
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
              {remaining >= 999 ? '\u221E' : remaining}
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

                {/* Best bets list — clean white card style */}
                {msg.bets?.length > 0 && msg.role === 'assistant' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                      {/* Header */}
                      <div className="px-3 pt-3 pb-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                          <span>🔥</span>
                          {t('matchDetail.bestBet', { defaultValue: 'BEST BET' })}
                        </p>
                      </div>
                      {/* Bet rows */}
                      <div className="px-3 pb-3 space-y-2">
                        {msg.bets.slice(0, 3).map((bet, idx) => {
                          const conf = bet.confidence || (70 + ((bet.type || '').length * 7 + Math.round(bet.odds * 13)) % 26);
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                trackClick(user?.id, 'aichat_bet_card');
                                if (canUseDeeplink) {
                                  openTrackingLink(user?.id, 'aichat_bet_card', user?.funnel, {
                                    deeplink: bet.fonbetDeeplink || null,
                                    meta: { bet_type: bet.type, odds: bet.odds },
                                  });
                                } else {
                                  navigate('/promo');
                                }
                              }}
                              className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${idx === 0 ? 'bg-emerald-500' : 'bg-blue-400'}`} />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-gray-900 truncate">{bet.type}</p>
                                  <p className="text-[11px] text-gray-400">{t('aiChat.aiConfidence', { defaultValue: 'AI confidence' })}: {conf}%</p>
                                </div>
                              </div>
                              <span className="text-lg font-black text-emerald-600 ml-3 tabular-nums">{bet.odds.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Simple promo link for messages without bet recommendation */}
                {!msg.bets?.length && msg.role === 'assistant' && msg.id !== 'welcome' && (
                  <button
                    onClick={() => {
                      trackClick(user?.id, 'aichat_promo_link');
                      if (canUseDeeplink) {
                        openTrackingLink(user?.id, 'aichat_promo_link', user?.funnel);
                      } else {
                        navigate('/promo');
                      }
                    }}
                    className="mt-3 pt-2 border-t border-gray-100 w-full flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-medium hover:text-emerald-700"
                  >
                    {isPremium ? t('aiChat.turnInsightsIntoWins', { defaultValue: 'Turn insights into wins' }) : t('advertiser.freeBet', { bonus: advertiser?.bonusBanner?.bonus })}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {/* Promo ad block — always shown after AI response */}
            {msg.showAd && (
              canUseDeeplink ? (
                <div
                  onClick={() => {
                    trackClick(user?.id, 'aichat_ad_place_bet');
                    openTrackingLink(user?.id, 'aichat_ad_place_bet', user?.funnel, {
                      deeplink: msg.fonbetDeeplink || null,
                    });
                  }}
                  className="mt-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    {/* Left icon */}
                    <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    {/* Center content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">{t('aiChat.bestBetLabel', { defaultValue: 'Best bet' })}</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{t('aiChat.placeBetsNow')}</p>
                    </div>
                    {/* Right arrow */}
                    <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                  {/* Header bar */}
                  <div className="bg-gray-900 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">{t('aiChat.exclusiveFor')}</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">{t('aiChat.limitedTime')}</span>
                  </div>

                  {/* Body */}
                  <div className="bg-white p-4">
                    {/* Dynamic text with match info */}
                    {(() => {
                      const userMsg = messages[messages.indexOf(msg) - 1];
                      const matchName = userMsg?.content?.slice(0, 40) || '';
                      const confidence = msg.bets?.[0] ? 70 + ((msg.bets[0].type || '').length * 7 + Math.round(msg.bets[0].odds * 13)) % 26 : 78;
                      return (
                        <p
                          className="text-sm text-gray-700 leading-relaxed mb-3"
                          dangerouslySetInnerHTML={{ __html: t('aiChat.bonusBannerText', {
                            match: matchName,
                            confidence,
                            bonus: advertiser.bonusBanner.bonus,
                          }) }}
                        />
                      );
                    })()}

                    {/* Free bet card — dark navy style */}
                    <div className="rounded-xl p-4 mb-3" style={{ background: 'linear-gradient(160deg, #0F2744 0%, #1B3A5C 40%, #2B5A8C 100%)' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🎁</span>
                        <div className="flex-1">
                          <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">{t('advertiser.freeBetLabel')}</p>
                          <p className="text-xl font-black text-emerald-400">{advertiser.bonusBanner.bonus}</p>
                          <p className="text-[11px] text-white/50 mt-0.5">
                            {t('aiChat.bonusBannerDeposit', {
                              deposit: advertiser.bonusBanner.deposit,
                              bonus: advertiser.bonusBanner.bonus,
                            })}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/30">{t('aiChat.noRisk')}</span>
                      </div>
                    </div>

                    {/* 3 steps */}
                    <div className="flex items-center justify-between mb-3 px-2">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1">1</div>
                        <p className="text-[10px] text-gray-500 text-center leading-tight">{t('aiChat.step1Label')}</p>
                        <p className="text-[10px] font-semibold text-gray-800">{advertiser.bonusBanner.deposit}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1">2</div>
                        <p className="text-[10px] text-gray-500 text-center leading-tight">{t('aiChat.step2Label')}</p>
                        <p className="text-[10px] font-semibold text-gray-800">{advertiser.bonusBanner.bonus}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1">3</div>
                        <p className="text-[10px] text-gray-500 text-center leading-tight">{t('aiChat.step3Label')}</p>
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <p className="text-[10px] text-gray-400 text-center mb-3">{t('aiChat.bonusDisclaimer')}</p>

                    {/* CTA button */}
                    <button
                      onClick={() => {
                        trackClick(user?.id, 'aichat_ad_get_bonus');
                        navigate('/promo');
                      }}
                      className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>
                      {t('aiChat.bonusCta', { bonus: advertiser.bonusBanner.bonus })}
                    </button>

                    {/* Trust badges */}
                    <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
                        {t('aiChat.trustSafe')}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
                        {t('aiChat.trustLicensed')}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        4.9/5
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        {t('aiChat.trustWithdrawal', { defaultValue: 'Withdrawal 15 min' })}
                      </span>
                    </div>
                  </div>
                </div>
              )
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
            {isPremium ? (
              <button
                onClick={() => sendMessage(t('aiChat.todaysBestBets'))}
                disabled={loading}
                className="flex-1 text-sm px-3 py-2.5 rounded-xl font-medium disabled:opacity-50 bg-emerald-600 text-white"
              >
                🎯 {t('advertiser.bestBets')}
              </button>
            ) : (
              <button
                onClick={() => { trackClick(user?.id, 'aichat_bonus_button'); navigate('/promo'); }}
                className="flex-1 text-sm px-3 py-2.5 rounded-xl font-medium bg-emerald-600 text-white"
              >
                {t('advertiser.bonusButton', { bonus: advertiser?.bonusBanner?.bonus })}
              </button>
            )}
            <button
              onClick={() => sendMessage(isPremium ? t('aiChat.liveMatchesNow') : t('aiChat.todaysBestBets'))}
              disabled={loading}
              className="flex-1 text-sm px-3 py-2.5 rounded-xl font-medium disabled:opacity-50 bg-primary-600 text-white"
            >
              {isPremium ? '🔴' : '🎯'} {isPremium ? t('aiChat.liveMatchesNow') : t('advertiser.bestBets')}
            </button>
          </div>

          {/* Secondary Questions - Expandable */}
          {questionsExpanded && (
            <div className="flex flex-wrap gap-2 mb-2">
              {(SECONDARY_QUESTIONS_BY_LOCALE[i18n.language] || DEFAULT_SECONDARY).map(q => (
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
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
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
                {t('aiChat.usedAllRequests', { count: 0 })}
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
                onClick={() => { setShowLimitModal(false); trackClick(user?.id, 'aichat_limit_unlock'); navigate('/promo'); }}
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
 * Escape HTML entities to prevent XSS via dangerouslySetInnerHTML.
 */
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
          const bold = escapeHtml(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className={isUser ? 'text-white/50' : 'text-gray-300'}>{'\u2022'}</span>
              <p dangerouslySetInnerHTML={{ __html: bold }}/>
            </div>
          );
        }

        // Regular text with bold support (escape HTML first, then apply bold)
        const bold = escapeHtml(line).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <p key={i} dangerouslySetInnerHTML={{ __html: bold }}/>;
      })}
    </div>
  );
}
