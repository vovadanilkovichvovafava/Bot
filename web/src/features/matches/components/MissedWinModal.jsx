import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import { formatAmount } from '../../../shared/config/advertisers';
import api from '../../../shared/api';
import { getTrackingLink } from '../../betting/services/trackingService';
import { track } from '../../../shared/services/analytics';

// Notional stake used to turn a winning express's odds into a "you could have
// earned X" number, in the user's local currency.
const NOTIONAL_STAKE = 100;

/**
 * Loss-aversion nudge: when a non-PRO user opens the app, show a REAL winning
 * express (accumulator built from real recently-won picks, total odds >= 5)
 * that they missed → push a deposit. Falls back to a single winning pick when
 * there aren't enough legs for an express. Real data only; once per day.
 */
export default function MissedWinModal() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { advertiser } = useAdvertiser();
  const [data, setData] = useState(null); // { type: 'express'|'single', ... }
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || user.is_premium) return;
    const key = `missed_win_${new Date().toDateString()}`;
    try { if (localStorage.getItem(key)) return; } catch { /* ignore */ }

    let cancelled = false;
    (async () => {
      try {
        // Prefer a winning express; fall back to a single winning pick.
        const exp = await api.getMissedExpress().catch(() => null);
        let payload = exp?.found ? { type: 'express', ...exp } : null;
        if (!payload) {
          const single = await api.getRecentWin().catch(() => null);
          if (single?.found) payload = { type: 'single', ...single };
        }
        if (!payload || cancelled) return;
        setData(payload);
        setOpen(true);
        track('missed_win_shown', { kind: payload.type });
        try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!open || !data) return null;

  const href = getTrackingLink(user?.id, 'missed_win', user?.funnel) || '/promo';
  const currency = advertiser?.currency || '€';
  const totalOdds = data.type === 'express' ? data.totalOdds : data.odds;
  const payout = totalOdds ? Math.round(NOTIONAL_STAKE * totalOdds) : null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-6" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setOpen(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 text-gray-400 flex items-center justify-center z-10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <div className="px-5 pt-6 pb-5 text-center" style={{ background: 'linear-gradient(160deg,#7c2d12,#b91c1c 60%,#dc2626)' }}>
          <div className="text-3xl mb-1">⚡</div>
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-200">{t('missedWin.tag', { defaultValue: 'The bot nailed it' })}</p>
          <p className="text-white/80 text-sm mt-1">
            {data.type === 'express'
              ? t('missedWin.subExpress', { count: data.legCount, defaultValue: `A {{count}}-leg express — and without PRO you missed it` })
              : t('missedWin.sub', { defaultValue: 'But without PRO you missed this pick' })}
          </p>
        </div>

        <div className="p-5">
          {data.type === 'express' ? (
            <div className="rounded-2xl border border-green-100 dark:border-green-500/20 bg-green-50 dark:bg-green-500/10 p-4">
              <div className="space-y-2.5">
                {data.legs.map((leg, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{leg.match}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{leg.market}</p>
                    </div>
                    <span className="shrink-0 text-green-600 dark:text-green-400 font-bold text-[13px]">×{leg.odds.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-green-200/60 dark:border-green-500/20 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('missedWin.total', { defaultValue: 'Total odds' })}
                </span>
                <span className="bg-green-600 text-white text-sm font-black rounded-lg px-2.5 py-1">×{Number(totalOdds).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-green-100 dark:border-green-500/20 bg-green-50 dark:bg-green-500/10 p-4">
              <p className="text-[13px] font-bold text-gray-900 dark:text-white">{data.match}</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-2">{data.market}</p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-bold text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  {t('missedWin.won', { defaultValue: 'Won' })}
                </span>
                {data.odds != null && <span className="bg-green-600 text-white text-sm font-black rounded-lg px-2.5 py-1">×{data.odds.toFixed(2)}</span>}
              </div>
            </div>
          )}

          {payout != null && (
            <div className="mt-3 text-center">
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                {t('missedWin.couldEarn', { defaultValue: 'You could have earned' })}
              </p>
              <p className="text-2xl font-black text-green-600 dark:text-green-400">
                {formatAmount(payout, currency, { showPlus: true, decimals: 0 })}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {t('missedWin.fromStake', { amount: formatAmount(NOTIONAL_STAKE, currency, { decimals: 0 }), defaultValue: `from a {{amount}} bet` })}
              </p>
            </div>
          )}

          <p className="text-center text-gray-500 dark:text-gray-400 text-[13px] mt-4 leading-relaxed">
            {t('missedWin.pitch', { defaultValue: 'With PRO active you never miss a pick. Deposit and PRO is back — the money stays yours + a bonus.' })}
          </p>

          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('missed_win_cta_click', { kind: data.type })}
            className="mt-4 w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-[15px]"
            style={{ textDecoration: 'none' }}
          >
            {t('missedWin.cta', { defaultValue: 'Deposit & activate PRO' })}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
          </a>
          <button onClick={() => setOpen(false)} className="w-full text-gray-400 dark:text-gray-500 text-sm py-2.5 mt-1">
            {t('missedWin.later', { defaultValue: 'Not now' })}
          </button>
        </div>
      </div>
    </div>
  );
}
