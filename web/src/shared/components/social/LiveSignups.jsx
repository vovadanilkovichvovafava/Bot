import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdvertiser } from '../../context/AdvertiserContext';

/**
 * "X people signed up today" live-ish counter. Grows through the day so it
 * feels real; ticks up occasionally. Marketing social proof.
 *
 * Text and number formatting follow the visitor's locale — the copy used to be
 * hardcoded European Portuguese ("registaram-se", pt-PT digit grouping), which
 * reads wrong in Brazil. The flag is Vlad's trust trigger from the 28.07 call.
 */
function baseCount() {
  const now = new Date();
  const minutesToday = now.getHours() * 60 + now.getMinutes();
  // ~1.1k baseline + steady growth across the day
  return 1140 + Math.floor(minutesToday * 0.9);
}

/** ISO country code → flag emoji. */
function flagOf(code) {
  if (!code || code.length !== 2 || !/^[A-Za-z]{2}$/.test(code)) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export default function LiveSignups({ className = '' }) {
  const { t, i18n } = useTranslation();
  const { countryCode } = useAdvertiser();
  const [count, setCount] = useState(baseCount);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => c + (Math.random() < 0.6 ? 1 : 0));
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const flag = flagOf(countryCode);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="flex -space-x-1.5">
        {['#f87171', '#34d399', '#fbbf24', '#60a5fa'].map((c, i) => (
          <span key={i} className="w-4 h-4 rounded-full border border-white" style={{ background: c }} />
        ))}
      </span>
      <span className="flex items-center gap-1.5 text-xs text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        {flag && <span className="text-sm leading-none">{flag}</span>}
        <span className="font-bold text-gray-700 tabular-nums">
          {count.toLocaleString(i18n.language || 'en')}
        </span>{' '}
        {t('social.signedUpToday', { defaultValue: 'people signed up today' })}
      </span>
    </div>
  );
}
