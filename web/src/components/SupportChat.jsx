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

export default function SupportChat({ isOpen, onClose, initialMessage = '' }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { advertiser, trackClick } = useAdvertiser();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]); // For API context
  const [input, setInput] = useState(initialMessage);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [managerMsgCount, setManagerMsgCount] = useState(0); // For PRO banner
  const [viewportHeight, setViewportHeight] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // Get current locale and agent name
  const locale = i18n.language?.slice(0, 2) || 'en';
  const agentName = AGENT_NAMES[locale] || 'Alex';

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 1,
        from: 'manager',
        text: t('support.welcomeMessage', { name: agentName }),
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
    const onResize = () => {
      setViewportHeight(vv.height);
      if (document.activeElement === inputRef.current) {
        setTimeout(() => {
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
      }
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [isOpen]);

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
      const response = await api.supportChat(userText, updatedHistory, locale);

      const newCount = managerMsgCount + 1;
      setManagerMsgCount(newCount);

      const managerMessage = {
        id: Date.now() + 1,
        from: 'manager',
        text: response.response,
        time: new Date(),
        showAd: newCount % 2 === 0, // Show PRO banner every 2nd response
      };

      setMessages(prev => [...prev, managerMessage]);

      // Update history with assistant response
      setChatHistory([
        ...updatedHistory,
        { role: 'assistant', content: response.response }
      ]);

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
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {agentName[0]}
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"/>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{agentName}</h3>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"/>
              {t('support.online')}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
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

              {/* Simple promo link under each manager response */}
              {msg.from === 'manager' && msg.id !== 1 && !msg.showAd && (
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

        {/* Quick Actions */}
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

        {/* Input */}
        <div className="px-5 pt-3 pb-3 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('support.placeholder')}
              className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isTyping}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="w-12 h-12 bg-primary-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
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
