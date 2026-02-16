import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdvertiser } from '../context/AdvertiserContext';
import { useAuth } from '../context/AuthContext';

const getGuideCards = (advertiser, t) => [
  {
    icon: '👋',
    title: t('guide.card1Title'),
    subtitle: t('guide.card1Subtitle'),
    content: t('guide.card1Content'),
    color: 'from-primary-500 to-indigo-600',
  },
  {
    icon: '🤖',
    title: t('guide.card2Title'),
    subtitle: t('guide.card2Subtitle'),
    content: t('guide.card2Content'),
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: '📊',
    title: t('guide.card3Title'),
    subtitle: t('guide.card3Subtitle'),
    content: t('guide.card3Content'),
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: '🎯',
    title: t('guide.card4Title'),
    subtitle: t('guide.card4Subtitle'),
    content: t('guide.card4Content'),
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: '💬',
    title: t('guide.card5Title'),
    subtitle: t('guide.card5Subtitle'),
    content: t('guide.card5Content'),
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: '⚡',
    title: t('guide.card6Title'),
    subtitle: t('guide.card6Subtitle'),
    content: t('guide.card6Content'),
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: '💎',
    title: t('guide.card7Title'),
    subtitle: t('guide.card7Subtitle'),
    content: t('guide.card7Content'),
    color: 'from-teal-500 to-green-500',
  },
  {
    icon: '💰',
    title: t('guide.card8Title'),
    subtitle: t('guide.card8Subtitle'),
    content: t('guide.card8Content'),
    color: 'from-rose-500 to-red-500',
  },
  {
    icon: '🔴',
    title: t('guide.card9Title'),
    subtitle: t('guide.card9Subtitle'),
    content: t('guide.card9Content'),
    color: 'from-red-500 to-pink-600',
  },
  {
    icon: '🎁',
    title: t('guide.card10Title'),
    subtitle: t('guide.card10Subtitle', { bonus: advertiser.bonusAmount }),
    content: t('guide.card10Content', { name: advertiser.name, bonus: advertiser.bonusAmount }),
    color: 'from-amber-400 to-orange-500',
    cta: true,
  },
];

export default function BeginnerGuide() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { advertiser, trackClick } = useAdvertiser();
  const { user } = useAuth();
  const [currentCard, setCurrentCard] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  const GUIDE_CARDS = useMemo(() => getGuideCards(advertiser, t), [advertiser, t]);

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
          {t('guide.skip')}
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
                <button
                  onClick={() => navigate('/promo?banner=guide_register_cta')}
                  className="w-full flex items-center justify-center gap-2 bg-white text-amber-600 font-bold py-4 rounded-2xl text-lg"
                >
                  {t('guide.registerNow')}
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full text-white/80 font-medium py-3"
                >
                  {t('guide.startBot')}
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
            {isLast ? t('guide.done') : t('guide.next')}
          </button>
        </div>
      )}
    </div>
  );
}
