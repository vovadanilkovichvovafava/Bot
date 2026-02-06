import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BOOKMAKER } from '../components/SupportChat';

const GUIDE_CARDS = [
  {
    icon: '👋',
    title: 'Добро пожаловать!',
    subtitle: 'Как пользоваться AI Betting Bot',
    content: 'Наш бот анализирует матчи с помощью искусственного интеллекта и даёт точные прогнозы. Листай дальше, чтобы узнать больше!',
    color: 'from-primary-500 to-indigo-600',
  },
  {
    icon: '🤖',
    title: 'Как работает AI',
    subtitle: 'Машинное обучение + большие данные',
    content: 'AI анализирует статистику команд, форму игроков, историю встреч и десятки других факторов для каждого прогноза.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: '📊',
    title: 'Понимание коэффициентов',
    subtitle: 'Что значат эти числа?',
    content: 'Коэффициент показывает, сколько вы выиграете. Коэф 2.0 означает: ставка 100₽ → выигрыш 200₽ (включая ставку). Чем выше коэф — тем менее вероятно событие.',
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: '🎯',
    title: 'Как делать ставки',
    subtitle: '3 простых шага',
    content: '1. Выбери матч в разделе Matches\n2. Посмотри AI-прогноз и рекомендацию\n3. Сделай ставку в букмекерской конторе на рекомендованный исход',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: '💬',
    title: 'AI-ассистент',
    subtitle: 'Спрашивай что угодно!',
    content: 'В разделе AI Chat ты можешь спросить про любой матч, команду или игрока. AI даст прогноз с реальными данными в реальном времени.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: '⚡',
    title: 'PRO-инструменты',
    subtitle: 'Для серьёзных игроков',
    content: 'Value Finder находит недооценённые ставки. Bankroll Manager помогает управлять банком. История прогнозов показывает твою статистику.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: '💎',
    title: 'Что такое Value Bet?',
    subtitle: 'Ставки с перевесом',
    content: 'Value Bet — это когда реальная вероятность выше, чем показывает коэффициент букмекера. AI находит такие ставки автоматически!',
    color: 'from-teal-500 to-green-500',
  },
  {
    icon: '💰',
    title: 'Управление банком',
    subtitle: 'Не ставь больше 5%',
    content: 'Золотое правило: одна ставка = 1-5% от банка. Так ты защитишь себя от проигрышей и будешь в плюсе на дистанции.',
    color: 'from-rose-500 to-red-500',
  },
  {
    icon: '🔴',
    title: 'Live-ставки',
    subtitle: 'Ставки во время матча',
    content: 'В разделе Live ты видишь матчи в реальном времени. AI анализирует ход игры и может дать live-прогноз на основе текущей ситуации.',
    color: 'from-red-500 to-pink-600',
  },
  {
    icon: '🎁',
    title: 'Начни с бонуса!',
    subtitle: `${BOOKMAKER.bonus} на первый депозит`,
    content: `Зарегистрируйся в ${BOOKMAKER.name} и получи бонус ${BOOKMAKER.bonus}. Это отличный старт для применения AI-прогнозов!`,
    color: 'from-amber-400 to-orange-500',
    cta: true,
  },
];

export default function BeginnerGuide() {
  const navigate = useNavigate();
  const [currentCard, setCurrentCard] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  const nextCard = () => {
    if (currentCard < GUIDE_CARDS.length - 1) {
      setCurrentCard(currentCard + 1);
    }
  };

  const prevCard = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
    }
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextCard();
      else prevCard();
    }
    setTouchStart(null);
  };

  const card = GUIDE_CARDS[currentCard];
  const isLast = currentCard === GUIDE_CARDS.length - 1;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
        </button>
        <span className="text-white/60 text-sm">{currentCard + 1} / {GUIDE_CARDS.length}</span>
        <button
          onClick={() => navigate('/')}
          className="text-white/60 text-sm"
        >
          Пропустить
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-5 py-2">
        <div className="flex gap-1">
          {GUIDE_CARDS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= currentCard ? 'bg-white' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card */}
      <div
        className="flex-1 px-5 py-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`h-full bg-gradient-to-br ${card.color} rounded-3xl p-6 flex flex-col relative overflow-hidden`}>
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"/>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"/>

          <div className="relative flex-1 flex flex-col">
            {/* Icon */}
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-5xl">{card.icon}</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-black text-white mb-2">{card.title}</h1>
            <p className="text-white/80 text-lg font-medium mb-6">{card.subtitle}</p>

            {/* Content */}
            <p className="text-white/90 text-base leading-relaxed whitespace-pre-line flex-1">
              {card.content}
            </p>

            {/* CTA for last card */}
            {card.cta && (
              <div className="mt-6 space-y-3">
                <a
                  href={BOOKMAKER.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-white text-amber-600 font-bold py-4 rounded-2xl text-lg"
                >
                  Зарегистрироваться
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
                  </svg>
                </a>
                <button
                  onClick={() => navigate('/')}
                  className="w-full text-white/80 font-medium py-3"
                >
                  Начать пользоваться ботом
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      {!card.cta && (
        <div className="px-5 pb-8 flex gap-3">
          <button
            onClick={prevCard}
            disabled={currentCard === 0}
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              currentCard === 0 ? 'bg-white/10 text-white/30' : 'bg-white/20 text-white'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <button
            onClick={nextCard}
            className="flex-1 bg-white text-gray-900 font-bold py-4 rounded-2xl text-lg"
          >
            {isLast ? 'Готово!' : 'Далее'}
          </button>
        </div>
      )}
    </div>
  );
}
