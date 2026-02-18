import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAdvertiser } from '../context/AdvertiserContext';
import { useAuth } from '../context/AuthContext';
import api from '../api';

// Agent names per locale (matches backend PERSONA_NAMES)
const AGENT_NAMES = {
  en: 'Alex',
  it: 'Marco',
  de: 'Max',
  pl: 'Kuba',
};

// Safe hooks that don't crash outside their providers
function useSafeAuth() {
  try { return useAuth(); } catch { return { user: null }; }
}
function useSafeAdvertiser() {
  try { return useAdvertiser(); } catch { return { advertiser: null, trackClick: () => {} }; }
}

export default function SupportChat({ isOpen, onClose, onUnread, initialMessage = '', guest = false }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { advertiser, trackClick } = useSafeAdvertiser();
  const { user } = useSafeAuth();
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]); // For API context
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID?.() || Date.now().toString());
  const [isPro, setIsPro] = useState(false);
  const [input, setInput] = useState(initialMessage);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [managerMsgCount, setManagerMsgCount] = useState(0); // For PRO banner
  const [viewportHeight, setViewportHeight] = useState(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const followUpTimerRef = useRef(null);

  // Get current locale and agent name
  const locale = i18n.language?.slice(0, 2) || 'en';
  const agentName = AGENT_NAMES[locale] || 'Alex';

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeText = guest
        ? t('support.guestWelcome', { name: agentName, defaultValue: `Hi! I'm ${agentName}, support manager. Need help with your password or account? I'm here to help!` })
        : t('support.welcomeMessage', { name: agentName });
      setMessages([{
        id: 1,
        from: 'manager',
        text: welcomeText,
        time: new Date(),
      }]);
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Track visual viewport for mobile keyboard
  useEffect(() => {
    if (!isOpen || !window.visualViewport) return;
    const vv = window.visualViewport;
    const threshold = window.innerHeight * 0.75;
    const onResize = () => {
      setViewportHeight(vv.height);
      setKeyboardOpen(vv.height < threshold);
      if (document.activeElement === inputRef.current) {
        setTimeout(() => {
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
      }
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [isOpen]);

  // Clear follow-up timer when user types
  useEffect(() => {
    if (input.trim()) {
      if (followUpTimerRef.current) clearTimeout(followUpTimerRef.current);
    }
  }, [input]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (followUpTimerRef.current) clearTimeout(followUpTimerRef.current);
    };
  }, []);

  // Mark as read when opened
  useEffect(() => {
    if (isOpen && onUnread) onUnread(false);
  }, [isOpen]);

  // Hide BottomNav when SupportChat is open (same approach as AIChat)
  useEffect(() => {
    const nav = document.getElementById('bottom-nav');
    if (nav) nav.style.display = isOpen ? 'none' : '';
    return () => {
      if (nav) nav.style.display = '';
    };
  }, [isOpen]);

  const scheduleFollowUp = async (lastResponse, history) => {
    // Don't follow up if user already typed something
    if (input.trim()) return;

    setIsTyping(true);
    try {
      const followUpMsg = locale === 'it' ? 'Hai altre domande? Posso aiutarti con qualcos\'altro?'
        : locale === 'de' ? 'Hast du noch Fragen? Kann ich dir noch mit etwas helfen?'
        : locale === 'pl' ? 'Masz jeszcze pytania? Mogę w czymś jeszcze pomóc?'
        : 'Anything else I can help you with? 😊';

      // Small delay before follow-up
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

      const followUpMessage = {
        id: Date.now(),
        from: 'manager',
        text: followUpMsg,
        time: new Date(),
      };
      setMessages(prev => [...prev, followUpMessage]);
      if (!isOpen && onUnread) onUnread(true);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    const userMessage = {
      id: Date.now(),
      from: 'user',
      text: userText,
      time: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setError(null);

    // Update chat history for API context
    const updatedHistory = [...chatHistory, { role: 'user', content: userText }];

    try {
      const response = guest
        ? await api.guestSupportChat(userText, updatedHistory, locale, sessionId)
        : await api.supportChat(userText, updatedHistory, locale, sessionId);
      if (response.session_id) setSessionId(response.session_id);
      if (response.is_pro !== undefined) setIsPro(response.is_pro);

      // Random delay 4-6s to feel human, not instant bot
      const humanDelay = 4000 + Math.random() * 2000;
      await new Promise(resolve => setTimeout(resolve, humanDelay));

      const newCount = managerMsgCount + 1;
      setManagerMsgCount(newCount);

      const managerMessage = {
        id: Date.now() + 1,
        from: 'manager',
        text: response.response,
        time: new Date(),
        showAd: !guest && !isPro && newCount % 2 === 0, // Show PRO banner every 2nd response (not for PRO/guest users)
      };

      setMessages(prev => [...prev, managerMessage]);

      // Notify parent if chat is closed (unread badge)
      if (!isOpen && onUnread) onUnread(true);

      // Update history with assistant response
      setChatHistory([
        ...updatedHistory,
        { role: 'assistant', content: response.response }
      ]);

      // Schedule follow-up if user doesn't respond in 25-40s
      if (followUpTimerRef.current) clearTimeout(followUpTimerRef.current);
      followUpTimerRef.current = setTimeout(() => {
        scheduleFollowUp(response.response, [...updatedHistory, { role: 'assistant', content: response.response }]);
      }, 25000 + Math.random() * 15000);

    } catch (err) {
      console.error('Support chat error:', err);

      // Fallback message on error
      const fallbackMessage = {
        id: Date.now() + 1,
        from: 'manager',
        text: t('support.errorFallback', {
          defaultValue: "Sorry, I'm having a connection issue. Please try again in a moment!"
        }),
        time: new Date(),
      };
      setMessages(prev => [...prev, fallbackMessage]);
      setError(err.message);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickAction = (text) => {
    setInput(text);
    // Auto-send after a tiny delay for UX
    setTimeout(() => {
      const fakeEvent = { target: { value: text } };
      setInput(text);
    }, 50);
  };

  const openBookmakerLink = () => {
    if (user?.id) trackClick(user.id);
    navigate('/promo?banner=support_chat_bonus');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>

      {/* Chat Panel */}
      <div
        ref={panelRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl flex flex-col animate-slide-up"
        style={{ maxHeight: viewportHeight ? `${viewportHeight * 0.92}px` : '90vh' }}
      >
        {/* Header — compact when keyboard open */}
        <div className={`flex items-center gap-3 px-4 shrink-0 border-b border-gray-100 ${keyboardOpen ? 'py-2' : 'py-3'} ${guest ? 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-3xl' : ''}`}>
          <div className="relative">
            {guest ? (
              <div className={`${keyboardOpen ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white transition-all`}>
                <svg className={`${keyboardOpen ? 'w-4 h-4' : 'w-5 h-5'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/>
                </svg>
              </div>
            ) : (
              <div className={`${keyboardOpen ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-lg'} bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold transition-all`}>
                {agentName[0]}
              </div>
            )}
            {!keyboardOpen && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"/>}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-gray-900 ${keyboardOpen ? 'text-sm' : ''}`}>
              {guest ? t('support.guestTitle', { defaultValue: 'Account Recovery' }) : agentName}
            </h3>
            {!keyboardOpen && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"/>
                {t('support.online')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id}>
              <div className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.from === 'user'
                    ? 'bg-primary-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.from === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                    {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Simple promo link under each manager response (not for PRO or guest) */}
              {!guest && !isPro && msg.from === 'manager' && msg.id !== 1 && !msg.showAd && (
                <div className="flex justify-start mt-1">
                  <button
                    onClick={() => navigate('/promo?banner=support_promo_link')}
                    className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium hover:text-emerald-700 ml-1"
                  >
                    {t('advertiser.freeBet', { bonus: advertiser.bonusAmount })}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* PRO banner after every 2nd manager response */}
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
                      onClick={() => navigate('/promo?banner=support_ad_get_bonus')}
                      className="flex-1 bg-emerald-600 text-white text-xs font-semibold py-2 px-3 rounded-lg text-center"
                    >
                      {t('aiChat.getBonus2')}
                    </button>
                    <button
                      onClick={() => navigate('/promo?banner=support_ad_learn_more')}
                      className="px-3 py-2 bg-white text-gray-700 text-xs font-medium rounded-lg border border-gray-200"
                    >
                      {t('aiChat.learnMore')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef}/>
        </div>

        {/* Quick Actions — hidden when keyboard is open for clean Telegram-like UX */}
        {!keyboardOpen && !guest && (
          <div className="px-5 py-2 border-t border-gray-100">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={openBookmakerLink}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-full"
              >
                <span>🎁</span>
                {t('support.getBonus', { bonus: advertiser.bonusAmount })}
              </button>
              <button
                onClick={() => setInput(t('support.wantPro'))}
                className="flex-shrink-0 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-full"
              >
                {t('support.wantPro')}
              </button>
              <button
                onClick={() => setInput(t('support.howToStart'))}
                className="flex-shrink-0 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-full"
              >
                {t('support.howToStart')}
              </button>
            </div>
          </div>
        )}
        {!keyboardOpen && guest && (
          <div className="px-5 py-2 border-t border-gray-100 bg-amber-50/50">
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setInput(t('support.forgotMyPassword', { defaultValue: 'I forgot my password' }))}
                className="flex-shrink-0 px-2.5 py-1.5 bg-white border border-amber-200 text-gray-700 text-[11px] font-medium rounded-full shadow-sm"
              >
                {t('support.forgotMyPassword', { defaultValue: 'Forgot password' })}
              </button>
              <button
                onClick={() => setInput(t('support.cantLogin', { defaultValue: "I can't log in" }))}
                className="flex-shrink-0 px-2.5 py-1.5 bg-white border border-amber-200 text-gray-700 text-[11px] font-medium rounded-full shadow-sm"
              >
                {t('support.cantLogin', { defaultValue: "Can't log in" })}
              </button>
              <button
                onClick={() => setInput(t('support.resetPassword', { defaultValue: 'Reset my password' }))}
                className="flex-shrink-0 px-2.5 py-1.5 bg-white border border-amber-200 text-gray-700 text-[11px] font-medium rounded-full shadow-sm"
              >
                {t('support.resetPassword', { defaultValue: 'Reset password' })}
              </button>
              <button
                onClick={() => setInput(t('support.changePhone', { defaultValue: 'I changed my phone number' }))}
                className="flex-shrink-0 px-2.5 py-1.5 bg-white border border-amber-200 text-gray-700 text-[11px] font-medium rounded-full shadow-sm"
              >
                {t('support.changePhone', { defaultValue: 'Changed number' })}
              </button>
            </div>
          </div>
        )}

        {/* Input — compact like Telegram */}
        <div className={`px-4 border-t border-gray-100 bg-white shrink-0 ${keyboardOpen ? 'py-1.5' : 'py-2.5'}`}>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('support.placeholder')}
              className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isTyping}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 shrink-0"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// Export agent names for use in other components
export { AGENT_NAMES };
