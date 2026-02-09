import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BOOKMAKER } from '../components/SupportChat';

const GUIDE_CARDS = [
  {
    icon: '👋',
    title: 'Welcome!',
    subtitle: 'How to use AI Betting Bot',
    content: 'Our bot analyzes matches using artificial intelligence and provides accurate predictions. Swipe to learn more!',
    color: 'from-primary-500 to-indigo-600',
  },
  {
    icon: '🤖',
    title: 'How AI Works',
    subtitle: 'Machine learning + big data',
    content: 'AI analyzes team statistics, player form, head-to-head history, and dozens of other factors for each prediction.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: '📊',
    title: 'Understanding Odds',
    subtitle: 'What do these numbers mean?',
    content: 'Odds show how much you can win. Odds of 2.0 mean: $100 bet → $200 return (including stake). Higher odds = less likely outcome.',
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: '🎯',
    title: 'How to Place Bets',
    subtitle: '3 simple steps',
    content: '1. Choose a match in the Matches section\n2. Check the AI prediction and recommendation\n3. Place a bet at the bookmaker on the recommended outcome',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: '💬',
    title: 'AI Assistant',
    subtitle: 'Ask anything!',
    content: 'In the AI Chat section, you can ask about any match, team, or player. AI will give a prediction with real-time data.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: '⚡',
    title: 'PRO Tools',
    subtitle: 'For serious bettors',
    content: 'Value Finder finds undervalued bets. Bankroll Manager helps manage your bankroll. Prediction History shows your stats.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: '💎',
    title: 'What is Value Bet?',
    subtitle: 'Bets with an edge',
    content: "Value Bet is when the real probability is higher than the bookmaker's odds imply. AI finds such bets automatically!",
    color: 'from-teal-500 to-green-500',
  },
  {
    icon: '💰',
    title: 'Bankroll Management',
    subtitle: "Don't bet more than 5%",
    content: 'Golden rule: one bet = 1-5% of your bankroll. This protects you from losses and keeps you profitable long-term.',
    color: 'from-rose-500 to-red-500',
  },
  {
    icon: '🔴',
    title: 'Live Betting',
    subtitle: 'Bet during matches',
    content: 'In the Live section, you see matches in real-time. AI analyzes the game flow and can give live predictions based on the current situation.',
    color: 'from-red-500 to-pink-600',
  },
  {
    icon: '🎁',
    title: 'Start with a Bonus!',
    subtitle: `${BOOKMAKER.bonus} on first deposit`,
    content: `Register at ${BOOKMAKER.name} and get a bonus of ${BOOKMAKER.bonus}. Great start for using AI predictions!`,
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
          Skip
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
                  Register Now
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
                  </svg>
                </a>
                <button
                  onClick={() => navigate('/')}
                  className="w-full text-white/80 font-medium py-3"
                >
                  Start using the bot
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
            {isLast ? 'Done!' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
