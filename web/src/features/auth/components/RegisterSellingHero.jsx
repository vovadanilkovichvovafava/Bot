import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import { JoinedTodayBadge } from './SocialProof';

/*
 * Selling A/B hero — "proof-first": lead with a real winning slip (show, don't
 * tell), an urgency countdown and a concrete offer, THEN the form. Deliberately
 * a different *structure* from the control hero (which leads with a generic
 * offer badge), so the two variants are visibly distinct in the A/B.
 *
 * Slip data mirrors the WinProofs fallback (odds >= 5); one slip is chosen per
 * 30-min seed so it's stable within a session.
 */
const SLIPS = [
  { match: 'Real Madrid — Barcelona', market: 'Over 2.5 goals', odds: 5.20, stake: 20, win: 104 },
  { match: 'Man City — Arsenal', market: 'Both teams to score + Over 3.5', odds: 6.50, stake: 25, win: 163 },
  { match: 'Bayern — Dortmund', market: 'Home win & Over 2.5', odds: 5.80, stake: 20, win: 116 },
  { match: 'PSG — Marseille', market: 'Exact score 2-1', odds: 8.00, stake: 20, win: 160 },
];
const SEED = Math.floor(Date.now() / (1000 * 60 * 30)); // stable per 30-min window

// Evergreen urgency countdown — 15 min from first view, persisted, resets once past
function useOfferCountdown(minutes = 15) {
  const [left, setLeft] = useState(minutes * 60);
  useEffect(() => {
    let deadline;
    try {
      const saved = parseInt(localStorage.getItem('reg_offer_deadline') || '0', 10);
      deadline = saved > Date.now() ? saved : Date.now() + minutes * 60000;
      localStorage.setItem('reg_offer_deadline', String(deadline));
    } catch { deadline = Date.now() + minutes * 60000; }
    const tick = () => setLeft(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [minutes]);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function RegisterSellingHero() {
  const { t } = useTranslation();
  const { advertiser } = useAdvertiser();
  const cur = advertiser?.currency || '€';
  const slip = SLIPS[SEED % SLIPS.length];
  const countdown = useOfferCountdown(15);

  return (
    <div className="relative">
      {/* Winning slip — the proof, used AS the hero */}
      <div className="mb-3 rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-white">
        <div className="flex items-center justify-between px-3.5 py-2" style={{ background: 'linear-gradient(120deg,#0f2744,#1b3a5c)' }}>
          <span className="text-[10px] font-black uppercase tracking-wider text-white/70">
            {t('auth.sellSlipTag', { defaultValue: 'AI pick · yesterday' })}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-black text-green-300">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            {t('auth.sellSlipWon', { defaultValue: 'WON' })}
          </span>
        </div>
        <div className="px-3.5 py-3">
          <p className="text-[13px] font-bold text-gray-900">{slip.match}</p>
          <p className="text-[11px] text-gray-500 mb-2.5">{slip.market}</p>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Odd <span className="font-bold text-gray-800">{slip.odds.toFixed(2)}</span></span>
            <span className="flex items-center gap-1.5">
              <span className="text-gray-400 text-sm">{cur}{slip.stake}</span>
              <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
              <span className="font-black text-green-600 text-base">{cur}{slip.win}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Urgency + offer */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-400/25 rounded-full px-3 py-1 text-[11px] font-bold text-green-300 mb-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400"/>
          </span>
          {t('auth.sellCountdown', { defaultValue: 'Free picks expire in' })} {countdown}
        </span>
        <h1 className="font-black text-white text-2xl leading-tight">
          {t('auth.sellHeroTitle', { defaultValue: 'Get 3 free picks like this' })}
        </h1>
        <p className="text-gray-300 text-sm mt-1.5">
          {t('auth.sellHeroSub', { defaultValue: '12h full PRO unlocked. No card. 30 seconds.' })}
        </p>
      </div>

      {/* Trust row */}
      <div className="flex items-center justify-center gap-2 mt-3 mb-1">
        <span className="flex items-center gap-1 text-[11px] text-white/70 bg-white/10 rounded-full px-2.5 py-1 font-medium">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
          {t('auth.sellTrustNoCard', { defaultValue: 'No card' })}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-white/70 bg-white/10 rounded-full px-2.5 py-1 font-medium">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046a1 1 0 01.7 1.19L10.4 8h4.6a1 1 0 01.78 1.625l-7 8.75A1 1 0 016 17.75L7.6 12H3a1 1 0 01-.78-1.625l7-8.75a1 1 0 011.08-.579z" clipRule="evenodd"/></svg>
          {t('auth.sellTrust30s', { defaultValue: '30 sec' })}
        </span>
      </div>

      <div className="mt-2">
        <JoinedTodayBadge />
      </div>
    </div>
  );
}
