import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../shared/api';
import { BR } from './BrazilAccents';

/**
 * The pick shown above the Brazilian signup form.
 *
 * Everything here comes from the API — league, teams, kick-off, market, price.
 * Nothing is hardcoded and nothing is invented: the backend only fills in the
 * market and the odds when a bookmaker has actually published them, so when
 * that data is missing this card quietly drops those rows instead of showing a
 * confident-looking number that isn't backed by anything.
 */
export default function BrazilPickCard() {
  const { t, i18n } = useTranslation();
  const [pick, setPick] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getShowcasePick('BR')
      .then((d) => { if (!cancelled && d?.home) setPick(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!pick) return null;

  // "30 jul., 19:00". Month names and 24h clock come from the locale; the only
  // hand edit is dropping Portuguese's "de" ("30 de jul."), which the brief's
  // format doesn't carry.
  const kickoff = (() => {
    if (!pick.kickoff) return '';
    const d = new Date(pick.kickoff);
    const locale = i18n.language || 'pt-BR';
    const day = d
      .toLocaleDateString(locale, { day: '2-digit', month: 'short' })
      .replace(/\s+de\s+/i, ' ');
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day}, ${time}`;
  })();

  const league = [pick.league_country_code, pick.league].filter(Boolean).join(' • ');

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-white">
      {/* League + kick-off */}
      <div
        className="flex items-center justify-between gap-2 px-3.5 py-2"
        style={{ background: `linear-gradient(120deg, ${BR.blue}, #0d3a6b)` }}
      >
        <span className="text-[10px] font-black uppercase tracking-wider text-white/75 truncate">
          {league}
        </span>
        <span className="flex-shrink-0 text-[11px] font-bold" style={{ color: BR.yellow }}>
          {kickoff}
        </span>
      </div>

      <div className="px-3.5 py-3">
        <div className="flex items-center gap-2 mb-1">
          {pick.home_logo && <img src={pick.home_logo} alt="" className="w-5 h-5 object-contain" />}
          <p className="text-[13px] font-bold text-gray-900 truncate">{pick.home} — {pick.away}</p>
          {pick.away_logo && <img src={pick.away_logo} alt="" className="w-5 h-5 object-contain" />}
        </div>

        {/* Market name in the visitor's language; the API's English label is
            only the fallback for a market we don't have a translation for. */}
        {pick.market && (
          <p className="text-[11px] text-gray-500 mb-2.5">
            {pick.market_key
              ? t(`markets.${pick.market_key}`, { defaultValue: pick.market })
              : pick.market}
          </p>
        )}

        {(pick.odds || pick.confidence) && (
          <div className="flex items-center justify-between">
            {pick.odds ? (
              <span className="text-[11px] text-gray-500">
                {t('auth.pickOdd', { defaultValue: 'Odd' })}{' '}
                <span className="font-bold text-gray-800">{Number(pick.odds).toFixed(2)}</span>
              </span>
            ) : <span />}
            {pick.confidence ? (
              <span className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-500">
                  {t('auth.pickProbability', { defaultValue: 'Probability' })}
                </span>
                <span className="font-black text-base" style={{ color: BR.green }}>
                  {pick.confidence}%
                </span>
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
