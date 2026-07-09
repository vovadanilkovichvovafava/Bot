import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import api from '../../../shared/api';
import { getTrackingLink } from '../../betting/services/trackingService';
import { track } from '../../../shared/services/analytics';

/**
 * Loss-aversion nudge: when a non-PRO user (12h trial expired) opens the app,
 * show a REAL winning pick with odds > 2 that they missed → push a deposit.
 * Only real picks (backend returns found=false otherwise); once per day.
 */
export default function MissedWinModal() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [pick, setPick] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || user.is_premium) return;
    const key = `missed_win_${new Date().toDateString()}`;
    try { if (localStorage.getItem(key)) return; } catch { /* ignore */ }
    api.getRecentWin()
      .then((d) => {
        if (d?.found) {
          setPick(d);
          setOpen(true);
          track('missed_win_shown');
          try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
        }
      })
      .catch(() => {});
  }, [user]);

  if (!open || !pick) return null;
  const href = getTrackingLink(user?.id, 'missed_win', user?.funnel) || '/promo';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-6" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setOpen(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/5 text-gray-400 flex items-center justify-center z-10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <div className="px-5 pt-6 pb-5 text-center" style={{ background: 'linear-gradient(160deg,#7c2d12,#b91c1c 60%,#dc2626)' }}>
          <div className="text-3xl mb-1">⚡</div>
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-200">{t('missedWin.tag', { defaultValue: 'O bot acertou' })}</p>
          <p className="text-white/80 text-sm mt-1">{t('missedWin.sub', { defaultValue: 'Mas sem PRO, perdeste este palpite' })}</p>
        </div>

        <div className="p-5">
          <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
            <p className="text-[13px] font-bold text-gray-900">{pick.match}</p>
            <p className="text-[12px] text-gray-500 mb-2">{pick.market}</p>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                {t('missedWin.won', { defaultValue: 'Entrou' })}
              </span>
              {pick.odds != null && <span className="bg-green-600 text-white text-sm font-black rounded-lg px-2.5 py-1">×{pick.odds.toFixed(2)}</span>}
            </div>
          </div>

          <p className="text-center text-gray-500 text-[13px] mt-4 leading-relaxed">
            {t('missedWin.pitch', { defaultValue: 'Com PRO ativo não perdes nenhum palpite. Deposita e o PRO volta — o dinheiro fica teu + bónus.' })}
          </p>

          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('missed_win_cta_click')}
            className="mt-4 w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-[15px]"
            style={{ textDecoration: 'none' }}
          >
            {t('missedWin.cta', { defaultValue: 'Depositar e ativar PRO' })}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
          </a>
          <button onClick={() => setOpen(false)} className="w-full text-gray-400 text-sm py-2.5 mt-1">
            {t('missedWin.later', { defaultValue: 'Agora não' })}
          </button>
        </div>
      </div>
    </div>
  );
}
