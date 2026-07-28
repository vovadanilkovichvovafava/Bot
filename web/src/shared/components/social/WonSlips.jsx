/**
 * Won-slips carousel — the "чеки" from the 28.07 call.
 *
 * Each card is a bookmaker-style betting slip for a winning accumulator, and
 * every fixture, score and market on it is REAL: the backend assembles the slips
 * from yesterday's finished matches (see /predictions/won-slips). Only the stake
 * and the branding are ours. Rotates daily — new fixtures every day, stable
 * within the day.
 *
 * Test funnel only; the baseline funnel is left untouched.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdvertiser } from '../../context/AdvertiserContext';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { isTestFunnel } from '../../config/funnels';
import { getTrackingLink } from '../../../features/betting/services/trackingService';
import { track } from '../../services/analytics';
import api from '../../api';

export default function WonSlips() {
  const { t } = useTranslation();
  const { advertiser, trackClick } = useAdvertiser();
  const { user } = useAuth();
  const [slips, setSlips] = useState(null);
  const enabled = isTestFunnel(user);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    api.getWonSlips(4, 4)
      .then((d) => { if (!cancelled) setSlips(d?.slips?.length ? d.slips : []); })
      .catch(() => { if (!cancelled) setSlips([]); });
    return () => { cancelled = true; };
  }, [enabled]);

  if (!enabled || !slips?.length) return null;

  const cur = advertiser?.currency || '€';
  const brand = advertiser?.brandName || 'Partner';
  const money = (n) => `${cur}${Number(n).toLocaleString('en-US')}`;

  const openBookmaker = (slip) => {
    track('won_slip_click', { total_odds: slip.total_odds });
    trackClick?.(user?.id, 'won_slip');
    const href = getTrackingLink(user?.id, 'won_slip', user?.funnel);
    if (href) window.open(href, '_blank', 'noopener');
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2.5">
        <h3 className="text-sm font-extrabold text-gray-900 dark:text-slate-100">
          {t('slips.title', { defaultValue: 'Yesterday\'s winning slips' })}
        </h3>
        <span className="text-[11px] text-gray-400 dark:text-slate-500">
          {t('slips.realMatches', { defaultValue: 'Real matches' })}
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1" style={{ scrollbarWidth: 'none' }}>
        {slips.map((slip, i) => (
          <div
            key={i}
            onClick={() => openBookmaker(slip)}
            className="shrink-0 w-[268px] rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900 cursor-pointer active:scale-[0.99] transition-transform"
          >
            {/* Slip header — brand + won badge */}
            <div className="flex items-center justify-between px-3 py-2" style={{ background: 'linear-gradient(120deg,#0f2744,#1b3a5c)' }}>
              <span className="text-[10px] font-black uppercase tracking-wider text-white/70">
                {brand}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-300">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {t('slips.won', { defaultValue: 'WON' })}
              </span>
            </div>

            {/* Legs — each a real fixture with its real score */}
            <div className="px-3 py-2.5 space-y-2">
              {slip.legs.map((leg, j) => (
                <div key={j} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-gray-900 dark:text-slate-200 truncate">
                      {leg.home} — {leg.away}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                      {leg.market}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold text-gray-800 dark:text-slate-300">{leg.odds.toFixed(2)}</p>
                    <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold">{leg.score}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="px-3 pb-3">
              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 border-t border-gray-100 dark:border-slate-800 pt-2">
                <span>{t('slips.stake', { defaultValue: 'Stake' })} <span className="font-bold text-gray-800 dark:text-slate-300">{money(slip.stake)}</span></span>
                <span>{t('slips.odds', { defaultValue: 'Odds' })} <span className="font-bold text-gray-800 dark:text-slate-300">×{slip.total_odds}</span></span>
              </div>
              <div className="mt-2 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-green-700 dark:text-green-400">
                  {t('slips.payout', { defaultValue: 'Payout' })}
                </span>
                <span className="text-base font-black text-green-600 dark:text-green-400">{money(slip.payout)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
