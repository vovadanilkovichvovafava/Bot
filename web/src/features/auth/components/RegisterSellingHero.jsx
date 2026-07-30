import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import { JoinedTodayBadge } from './SocialProof';
import api from '../../../shared/api';

/*
 * Selling A/B hero — "proof-first": lead with a real AI pick (show, don't tell),
 * an urgency countdown and a concrete offer, THEN the form. Deliberately a
 * different *structure* from the control hero (which leads with a generic offer
 * badge), so the two variants are visibly distinct in the A/B.
 *
 * The pick is a genuine UPCOMING fixture pulled from the API and refreshed by
 * itself every day. It used to be a hardcoded slip labelled "yesterday" — which
 * was neither yesterday's nor real, and Vlad spotted it immediately. The
 * visitor's own league comes first: a Brazilian sees the Brasileirão.
 */

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
  const { t, i18n } = useTranslation();
  const { advertiser, countryCode } = useAdvertiser();
  const [pick, setPick] = useState(null);
  const countdown = useOfferCountdown(15);

  useEffect(() => {
    let cancelled = false;
    api.getShowcasePick(countryCode || '')
      .then((d) => { if (!cancelled && d?.home) setPick(d); })
      .catch(() => {});   // no pick → the card simply doesn't render
    return () => { cancelled = true; };
  }, [countryCode]);

  // Kick-off in the visitor's own words: "hoje, 20:00" / "amanhã, 20:00".
  const kickoff = (() => {
    if (!pick?.kickoff) return '';
    const d = new Date(pick.kickoff);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const time = d.toLocaleTimeString(i18n.language || 'en', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `${t('auth.pickToday', { defaultValue: 'today' })}, ${time}`;
    if (isTomorrow) return `${t('auth.pickTomorrow', { defaultValue: 'tomorrow' })}, ${time}`;
    return `${d.toLocaleDateString(i18n.language || 'en', { day: '2-digit', month: 'short' })}, ${time}`;
  })();

  return (
    <div className="relative">
      {/* Live AI pick — a real upcoming fixture, the visitor's league first */}
      {pick && (
      <div className="mb-3 rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-white">
        <div className="flex items-center justify-between px-3.5 py-2" style={{ background: 'linear-gradient(120deg,#0f2744,#1b3a5c)' }}>
          <span className="text-[10px] font-black uppercase tracking-wider text-white/70">
            {t('auth.sellSlipTag', { defaultValue: 'AI pick' })}
            {pick.league ? ` · ${pick.league}` : ''}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-black text-green-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400"/>
            </span>
            {kickoff}
          </span>
        </div>
        <div className="px-3.5 py-3">
          <div className="flex items-center gap-2 mb-1">
            {pick.home_logo && <img src={pick.home_logo} alt="" className="w-5 h-5 object-contain" />}
            <p className="text-[13px] font-bold text-gray-900 truncate">{pick.home} — {pick.away}</p>
            {pick.away_logo && <img src={pick.away_logo} alt="" className="w-5 h-5 object-contain" />}
          </div>
          {pick.market && <p className="text-[11px] text-gray-500 mb-2.5">{pick.market}</p>}
          {/* Market and price come from a bookmaker feed that doesn't always have
              them up yet. Missing → show nothing rather than NaN or a bare "%". */}
          {(pick.odds || pick.confidence) && (
            <div className="flex items-center justify-between">
              {pick.odds ? (
                <span className="text-[11px] text-gray-500">
                  Odd <span className="font-bold text-gray-800">{Number(pick.odds).toFixed(2)}</span>
                </span>
              ) : <span />}
              {pick.confidence ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-500">
                    {t('auth.pickProbability', { defaultValue: 'Probability' })}
                  </span>
                  <span className="font-black text-green-600 text-base">{pick.confidence}%</span>
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
      )}

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
