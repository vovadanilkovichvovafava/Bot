import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// --- Realistic data generators ---
// Seeded random for consistent per-session values
const SEED = Math.floor(Date.now() / (1000 * 60 * 30)); // changes every 30 min
const seeded = (min, max) => min + ((SEED * 9301 + 49297) % 233280) / 233280 * (max - min);

const BASE_ONLINE = Math.floor(seeded(900, 1800));
const BASE_WINS = Math.floor(seeded(120, 380));
const BASE_ACCURACY = Math.floor(seeded(67, 76));
const BASE_JOINED = Math.floor(seeded(80, 260));

// Names by locale for social proof toasts
const NAMES_BY_LOCALE = {
  en: [
    { name: 'James', city: 'London' }, { name: 'Oliver', city: 'Manchester' },
    { name: 'Harry', city: 'Liverpool' }, { name: 'Thomas', city: 'Birmingham' },
    { name: 'George', city: 'Leeds' }, { name: 'Jack', city: 'Bristol' },
    { name: 'Noah', city: 'Glasgow' }, { name: 'William', city: 'Cardiff' },
  ],
  es: [
    { name: 'Carlos', city: 'Madrid' }, { name: 'Miguel', city: 'Barcelona' },
    { name: 'Diego', city: 'Sevilla' }, { name: 'Pablo', city: 'Valencia' },
    { name: 'Javier', city: 'Bilbao' }, { name: 'Alejandro', city: 'Malaga' },
  ],
  fr: [
    { name: 'Lucas', city: 'Paris' }, { name: 'Hugo', city: 'Lyon' },
    { name: 'Louis', city: 'Marseille' }, { name: 'Nathan', city: 'Toulouse' },
    { name: 'Pierre', city: 'Bordeaux' }, { name: 'Antoine', city: 'Nice' },
  ],
  it: [
    { name: 'Marco', city: 'Roma' }, { name: 'Luca', city: 'Milano' },
    { name: 'Davide', city: 'Napoli' }, { name: 'Alessandro', city: 'Torino' },
    { name: 'Lorenzo', city: 'Firenze' }, { name: 'Matteo', city: 'Bologna' },
  ],
  pl: [
    { name: 'Kacper', city: 'Warszawa' }, { name: 'Jakub', city: 'Krakow' },
    { name: 'Mateusz', city: 'Wroclaw' }, { name: 'Szymon', city: 'Gdansk' },
    { name: 'Filip', city: 'Poznan' }, { name: 'Tomasz', city: 'Lodz' },
  ],
};

function getRandomPerson(locale) {
  const names = NAMES_BY_LOCALE[locale] || NAMES_BY_LOCALE.en;
  return names[Math.floor(Math.random() * names.length)];
}

// --- Smooth animated counter hook ---
// Smoothly transitions from current displayed value to new target
function useAnimatedNumber(target, duration = 1500) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // ease-in-out sine for ultra-smooth feel
      const eased = 0.5 - Math.cos(progress * Math.PI) / 2;
      const current = Math.round(from + (target - from) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

// --- Smooth online counter that ticks naturally ---
function useOnlineCount(base) {
  const [count, setCount] = useState(base);
  const tickRef = useRef(null);

  useEffect(() => {
    let current = base;
    let ticksUntilDrop = 15 + Math.floor(Math.random() * 10); // ~20 ticks before a drop

    const tick = () => {
      ticksUntilDrop--;
      if (ticksUntilDrop <= 0) {
        // Occasional small drop (1-3)
        current -= (1 + Math.floor(Math.random() * 3));
        ticksUntilDrop = 12 + Math.floor(Math.random() * 15);
      } else {
        // Usually go up by 1, sometimes by 2
        current += Math.random() < 0.7 ? 1 : 2;
      }
      // Keep in a reasonable band around base ±50
      if (current > base + 50) current = base + 45;
      if (current < base - 30) current = base - 20;
      setCount(current);

      // Next tick in 15-25 seconds
      tickRef.current = setTimeout(tick, 15000 + Math.random() * 10000);
    };

    // First tick after 20 seconds
    tickRef.current = setTimeout(tick, 20000);
    return () => clearTimeout(tickRef.current);
  }, [base]);

  return count;
}

// --- Live Stats Bar ---
export function LiveStatsBar() {
  const { t } = useTranslation();

  // Online count: ticks every 15-25s, smoothly animated over 1.5s
  const onlineTarget = useOnlineCount(BASE_ONLINE);
  const animOnline = useAnimatedNumber(onlineTarget, 1500);

  // Wins & accuracy: animate once on mount then stay static
  const animWins = useAnimatedNumber(BASE_WINS, 2000);
  const animAccuracy = useAnimatedNumber(BASE_ACCURACY, 2000);

  const formatK = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n;

  return (
    <div className="flex items-center justify-center gap-3 w-full">
      {/* Wins today */}
      <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
        <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
        </svg>
        <span className="text-white font-bold text-xs">{animWins}</span>
        <span className="text-white/60 text-[10px]">{t('auth.statsWinsToday')}</span>
      </div>

      {/* AI Accuracy */}
      <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
        <svg className="w-3.5 h-3.5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
        </svg>
        <span className="text-white font-bold text-xs">{animAccuracy}%</span>
        <span className="text-white/60 text-[10px]">{t('auth.statsAccuracy')}</span>
      </div>

      {/* Online now */}
      <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"/>
        </span>
        <span className="text-white font-bold text-xs">{formatK(animOnline)}</span>
        <span className="text-white/60 text-[10px]">{t('auth.statsOnline')}</span>
      </div>
    </div>
  );
}

// --- Joined Today Badge ---
export function JoinedTodayBadge() {
  const { t } = useTranslation();
  const count = useAnimatedNumber(BASE_JOINED, 2000);

  return (
    <div className="flex items-center justify-center gap-2 bg-green-500/15 border border-green-500/20 rounded-full px-4 py-1.5 mx-auto max-w-fit">
      <div className="flex -space-x-1.5">
        {['bg-blue-500', 'bg-amber-500', 'bg-green-500'].map((c, i) => (
          <div key={i} className={`w-5 h-5 rounded-full ${c} border-2 border-gray-900 flex items-center justify-center`}>
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
            </svg>
          </div>
        ))}
      </div>
      <span className="text-green-400 text-xs font-semibold">
        {t('auth.statsJoinedToday', { count })}
      </span>
    </div>
  );
}

// --- Social Proof Toast (floating notification) ---
export function SocialProofToast() {
  const { t, i18n } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [person, setPerson] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Show first toast after 3-6 seconds
    const initialDelay = 3000 + Math.random() * 3000;
    timeoutRef.current = setTimeout(() => showToast(), initialDelay);
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const showToast = () => {
    const lang = i18n.language?.slice(0, 2) || 'en';
    setPerson(getRandomPerson(lang));
    setVisible(true);

    // Hide after 4 seconds
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      // Schedule next toast in 8-15 seconds
      timeoutRef.current = setTimeout(() => showToast(), 8000 + Math.random() * 7000);
    }, 4000);
  };

  if (!visible || !person) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none animate-slideUp">
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/15 border border-gray-100 px-4 py-3 max-w-sm w-full pointer-events-auto">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
            </svg>
          </div>
          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 font-medium leading-snug">
              <span className="font-bold">{person.name}</span>
              <span className="text-gray-400"> {t('auth.toastFrom')} </span>
              <span className="font-semibold text-gray-700">{person.city}</span>
            </p>
            <p className="text-xs text-green-600 font-medium mt-0.5">
              {t('auth.toastAction')}
            </p>
          </div>
          {/* Time */}
          <span className="text-[10px] text-gray-300 shrink-0 self-start mt-1">{t('auth.toastJustNow')}</span>
        </div>
      </div>
    </div>
  );
}

// --- Recent Wins Ticker ---
export function RecentWinsTicker() {
  const { t, i18n } = useTranslation();
  const [wins, setWins] = useState([]);

  useEffect(() => {
    const lang = i18n.language?.slice(0, 2) || 'en';
    const names = NAMES_BY_LOCALE[lang] || NAMES_BY_LOCALE.en;
    const betTypes = ['1X2', 'Over 2.5', 'BTTS', 'Home Win', 'Under 2.5', 'Draw'];
    const amounts = [45, 120, 78, 210, 56, 340, 95, 160, 88, 275];

    const generated = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      name: names[i % names.length].name,
      city: names[i % names.length].city,
      bet: betTypes[i % betTypes.length],
      amount: amounts[(SEED + i) % amounts.length],
    }));
    setWins(generated);
  }, [i18n.language]);

  if (!wins.length) return null;

  return (
    <div className="w-full overflow-hidden">
      <p className="text-[10px] text-white/40 uppercase font-semibold tracking-wider text-center mb-2">
        {t('auth.recentWins')}
      </p>
      <div className="flex animate-marquee gap-4">
        {[...wins, ...wins].map((w, i) => (
          <div key={i} className="flex items-center gap-2 bg-white/5 rounded-full pl-2 pr-3 py-1 shrink-0">
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </div>
            <span className="text-white/80 text-[11px] font-medium whitespace-nowrap">
              {w.name} <span className="text-green-400 font-bold">+{w.amount}$</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
