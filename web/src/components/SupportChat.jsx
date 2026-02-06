import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Manager info (configurable)
const MANAGER = {
  name: 'Алекс',
  avatar: null, // Can add URL
  role: 'Менеджер поддержки',
};

// Bookmaker info (configurable)
const BOOKMAKER = {
  name: '1xBet',
  bonus: '$100',
  minDeposit: '$10',
  link: 'https://refpa.top/L?tag=d_3931543m_24795c_&site=3931543&ad=24795', // Affiliate link placeholder
};

export default function SupportChat({ isOpen, onClose, initialMessage = '' }) {
  const navigate = useNavigate();
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
        text: `👋 Привет! Я ${MANAGER.name}, на связи!\n\nЯ помогу тебе:\n\n• Открыть PRO-доступ к Value Bet Finder, Bankroll Tracker и другим инструментам\n• Зарегистрироваться у проверенного букмекера и получить бонус\n• Разобраться с любыми вопросами по приложению\n\nНапиши мне, и я всё расскажу! 😉`,
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

  // Simulate manager response
  const getManagerResponse = (userMessage) => {
    const lower = userMessage.toLowerCase();

    // PRO access questions
    if (lower.includes('pro') || lower.includes('про') || lower.includes('доступ') || lower.includes('unlock') || lower.includes('разблокир')) {
      return `Отлично! PRO-доступ включает:\n\n✅ Value Bet Finder — AI находит ставки с завышенными коэффициентами\n✅ Bankroll Tracker — учёт банка и ставок\n✅ Неограниченные AI-прогнозы\n✅ Приоритетная поддержка\n\n🎁 И хорошая новость — ты можешь получить PRO **бесплатно**!\n\nДля этого зарегистрируйся у нашего партнёра ${BOOKMAKER.name} и пополни счёт от ${BOOKMAKER.minDeposit}.\n\nЭто надёжный букмекер с быстрыми выплатами. После регистрации напиши мне — я проверю и сразу открою PRO на 30 дней! 🚀`;
    }

    // Registration questions
    if (lower.includes('регистр') || lower.includes('зарег') || lower.includes('как начать') || lower.includes('новичок') || lower.includes('начинающ')) {
      return `Круто, что решил начать! 💪\n\nРекомендую ${BOOKMAKER.name} — мы с ними сотрудничаем, и для наших пользователей есть бонус **${BOOKMAKER.bonus}**!\n\nПошагово:\n1️⃣ Перейди по ссылке и зарегистрируйся\n2️⃣ Пополни счёт от ${BOOKMAKER.minDeposit}\n3️⃣ Напиши мне — я открою тебе PRO!\n\n👉 Нажми кнопку ниже для регистрации`;
    }

    // Bonus questions
    if (lower.includes('бонус') || lower.includes('bonus') || lower.includes('фрибет') || lower.includes('промо')) {
      return `🎁 Сейчас в ${BOOKMAKER.name} отличный бонус для новых игроков — **${BOOKMAKER.bonus}** на первый депозит!\n\nЧтобы получить:\n1. Зарегистрируйся по нашей ссылке\n2. Пополни счёт от ${BOOKMAKER.minDeposit}\n3. Бонус зачислится автоматически\n\n+ Я открою тебе PRO-доступ бесплатно! 🔓`;
    }

    // Bookmaker questions
    if (lower.includes('букмекер') || lower.includes('где ставить') || lower.includes('какой бк') || lower.includes('1xbet') || lower.includes('1хбет')) {
      return `Мы рекомендуем ${BOOKMAKER.name} — наш официальный партнёр.\n\n✅ Лицензированный букмекер\n✅ Быстрые выплаты (до 24 часов)\n✅ Широкая линия и высокие коэффициенты\n✅ Бонус ${BOOKMAKER.bonus} для новых\n\nПлюс — при регистрации через нас ты получаешь PRO-доступ к нашим инструментам бесплатно! 🎉`;
    }

    // Withdrawal/payout questions
    if (lower.includes('вывод') || lower.includes('выплат') || lower.includes('деньги') || lower.includes('withdrawal')) {
      return `В ${BOOKMAKER.name} выплаты обычно происходят в течение 24 часов.\n\nДоступные способы:\n• Банковские карты\n• Электронные кошельки\n• Криптовалюта\n\nПервый вывод может потребовать верификации (загрузить документы). Это стандартная процедура для безопасности.\n\nЕсли будут вопросы — пиши, помогу! 🤝`;
    }

    // Gratitude
    if (lower.includes('спасибо') || lower.includes('благодар') || lower.includes('thanks')) {
      return `Всегда рад помочь! 😊\n\nЕсли будут ещё вопросы — пиши в любое время.\n\nУдачных ставок! 🍀⚽`;
    }

    // Default response
    return `Понял тебя! 👍\n\nЕсли тебя интересует PRO-доступ или регистрация у букмекера — я помогу с этим.\n\nПросто напиши:\n• "Хочу PRO" — расскажу как получить бесплатно\n• "Как зарегистрироваться" — помогу пошагово\n• "Расскажи про бонус" — расскажу про акции\n\nИли задай свой вопрос! 💬`;
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
    window.open(BOOKMAKER.link, '_blank');
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
              Онлайн
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
              Зарегистрироваться в {BOOKMAKER.name}
            </button>
            <button
              onClick={() => setInput('Хочу PRO доступ')}
              className="flex-shrink-0 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-full"
            >
              Хочу PRO
            </button>
            <button
              onClick={() => setInput('Как начать?')}
              className="flex-shrink-0 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-full"
            >
              Как начать?
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
              placeholder="Напишите сообщение..."
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

// Export bookmaker config for use in other components
export { BOOKMAKER, MANAGER };
