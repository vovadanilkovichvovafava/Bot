import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAdvertiser } from '../context/AdvertiserContext';
import { useAuth } from '../context/AuthContext';

// Manager info (configurable)
const MANAGER = {
  name: 'Alex',
  avatar: null, // Can add URL
};

export default function SupportChat({ isOpen, onClose, initialMessage = '' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { advertiser, trackClick, countryCode } = useAdvertiser();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(initialMessage);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 1,
        from: 'manager',
        text: t('support.welcomeMessage', { name: MANAGER.name }),
        time: new Date(),
      }]);
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Simulate manager response (localized)
  const getManagerResponse = (userMessage) => {
    const lower = userMessage.toLowerCase();
    const vars = { name: advertiser.name, bonus: advertiser.bonus, minDeposit: advertiser.minDeposit };

    // PRO access questions
    if (lower.includes('pro') || lower.includes('access') || lower.includes('unlock') || lower.includes('premium')) {
      return t('support.replyPro', vars);
    }

    // Registration questions
    if (lower.includes('register') || lower.includes('sign up') || lower.includes('start') || lower.includes('beginner') || lower.includes('new')) {
      return t('support.replyRegister', vars);
    }

    // Bonus questions
    if (lower.includes('bonus') || lower.includes('free bet') || lower.includes('promo') || lower.includes('offer')) {
      return t('support.replyBonus', vars);
    }

    // Bookmaker questions
    if (lower.includes('bookmaker') || lower.includes('where to bet') || lower.includes('which bk') || lower.includes('1xbet') || lower.includes('betting site')) {
      return t('support.replyBookmaker', vars);
    }

    // Withdrawal/payout questions
    if (lower.includes('withdraw') || lower.includes('payout') || lower.includes('cash out') || lower.includes('money')) {
      return t('support.replyWithdraw', vars);
    }

    // Gratitude
    if (lower.includes('thank') || lower.includes('appreciate') || lower.includes('helpful')) {
      return t('support.replyThanks');
    }

    // Default response
    return t('support.replyDefault');
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      from: 'user',
      text: input.trim(),
      time: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = getManagerResponse(userMessage.text);
      setMessages(prev => [...prev, {
        id: Date.now(),
        from: 'manager',
        text: response,
        time: new Date(),
      }]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openBookmakerLink = () => {
    const link = user?.id ? trackClick(user.id) : advertiser.link;
    window.open(link, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>

      {/* Chat Panel */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] flex flex-col animate-slide-up pb-safe">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {MANAGER.avatar ? (
                <img src={MANAGER.avatar} alt="" className="w-full h-full rounded-full object-cover"/>
              ) : (
                MANAGER.name[0]
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"/>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{MANAGER.name}</h3>
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
            <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.from === 'user'
                  ? 'bg-primary-600 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.text.split('**').map((part, i) =>
                  i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                )}</p>
                <p className={`text-[10px] mt-1 ${msg.from === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                  {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
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
              {t('support.getBonus', { bonus: advertiser.bonus })}
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
        <div className="px-5 pt-4 pb-6 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('support.placeholder')}
              className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
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

// Export manager config for use in other components
export { MANAGER };
