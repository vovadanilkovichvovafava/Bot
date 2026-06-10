import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import footballApi from '../api/footballApi';
import api from '../../../shared/api';
import { getStats } from '../../predictions/services/predictionStore';
import FootballSpinner from '../../../shared/components/FootballSpinner';
import ProductTour from '../components/ProductTour';
import DepositReminderModal from '../components/DepositReminderModal';
import useBkReminderModal from '../../betting/hooks/useBkReminderModal';
import { getTrackingLink } from '../../betting/services/trackingService';

const FREE_AI_LIMIT = 5;
const SMART_BET_CACHE_KEY = 'smart_bet_cache';
const SMART_BET_TTL = 45 * 60 * 1000; // 45 minutes
const HOME_MATCHES_CACHE = 'home_matches_cache';
const HOME_MATCHES_TTL = 3 * 60 * 1000; // 3 minutes — stale-while-revalidate
const WC_START = new Date('2026-06-11T20:00:00Z');

// Top leagues to show on home
const TOP_LEAGUE_IDS = [39, 140, 135, 78, 61, 2, 3];

// Deterministic synthetic odds per fixture (same pattern as existing Best Bet card)
function genOdds(seed) {
  const r = (n) => {
    const x = Math.sin((seed || 1) * 9301 + n * 49297) * 233280;
    return x - Math.floor(x);
  };
  return {
    home: (1.5 + r(1) * 2).toFixed(2),
    draw: (3.0 + r(2) * 1.2).toFixed(2),
    away: (1.8 + r(3) * 2.2).toFixed(2),
  };
}

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [oddsMap, setOddsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [aiRemaining, setAiRemaining] = useState(null);
  const [smartBet, setSmartBet] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const { modalVariant, dismissModal } = useBkReminderModal(user?.id);

  useEffect(() => {
    getStats();

    // Launch all API requests in PARALLEL (not sequentially)
    const promises = [loadMatches()];

    if (!user?.is_premium && user?.funnel !== 'funnel-2' && user?.funnel !== 'funnel-4') {
      promises.push(
        api.getChatLimit()
          .then(data => setAiRemaining(data.remaining ?? FREE_AI_LIMIT))
          .catch(() => setAiRemaining(FREE_AI_LIMIT))
      );
    }

    if (user?.is_premium && user?.funnel !== 'funnel-2' && user?.funnel !== 'funnel-4') {
      try {
        const cached = localStorage.getItem(SMART_BET_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.ts < SMART_BET_TTL) setSmartBet(parsed.data);
          else promises.push(fetchSmartBet());
        } else {
          promises.push(fetchSmartBet());
        }
      } catch { promises.push(fetchSmartBet()); }
    }

    Promise.all(promises).catch(() => {});

    try {
      if (localStorage.getItem('show_welcome') === 'true') {
        localStorage.removeItem('show_welcome');
        setShowWelcome(true);
      }
    } catch {}
  }, []);

  const processFixtures = (fixtures) => {
    return (fixtures || [])
      .filter(f => f?.fixture?.status?.short && ['NS', '1H', '2H', 'HT'].includes(f.fixture.status.short))
      .filter(f => f?.teams?.home && f?.teams?.away && f?.league)
      .sort((a, b) => {
        const aTop = TOP_LEAGUE_IDS.includes(a.league?.id) ? 0 : 1;
        const bTop = TOP_LEAGUE_IDS.includes(b.league?.id) ? 0 : 1;
        if (aTop !== bTop) return aTop - bTop;
        return new Date(a.fixture?.date || 0) - new Date(b.fixture?.date || 0);
      })
      .slice(0, 6);
  };

  const loadMatches = async () => {
    try {
      const raw = localStorage.getItem(HOME_MATCHES_CACHE);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.ts < HOME_MATCHES_TTL) {
          setMatches(cached.data);
          setLoading(false);
        }
      }
    } catch {}

    try {
      const fixtures = await footballApi.getTodayFixtures();
      const upcoming = processFixtures(fixtures);
      setMatches(upcoming);
      try {
        localStorage.setItem(HOME_MATCHES_CACHE, JSON.stringify({ data: upcoming, ts: Date.now() }));
      } catch {}
      // Real 1X2 odds for today (cached backend batch); falls back to synthetic.
      footballApi.getOddsMapForDate(new Date().toISOString().split('T')[0])
        .then(setOddsMap).catch(() => {});
    } catch (e) {
      console.error('Failed to load matches', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSmartBet = async () => {
    try {
      const data = await footballApi.getSmartBet();
      if (data?.found) {
        setSmartBet(data);
        localStorage.setItem(SMART_BET_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
      }
    } catch (e) {
      console.error('Failed to load smart bet', e);
    }
  };

  const isFunnel2 = user?.funnel === 'funnel-2';
  const isFunnel4 = user?.funnel === 'funnel-4';
  const isPremium = user?.is_premium && !isFunnel2 && !isFunnel4;
  const unlocked = isPremium || isFunnel2 || isFunnel4;
  const remaining = unlocked ? '∞' : (aiRemaining ?? FREE_AI_LIMIT);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-primary-600 to-primary-800">
        <FootballSpinner size="lg" text={t('home.loadingMatches')} light />
      </div>
    );
  }

  return (
    <div className="bg-[#F0F2F5] min-h-screen">
      {/* ===== HEADER ===== */}
      <div className="px-4 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, #1B2138 0%, #232a45 100%)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-white/15 ring-2 ring-white/10 flex items-center justify-center shrink-0 overflow-hidden"
          >
            <span className="text-white font-bold text-base">{(user?.username || 'U')[0].toUpperCase()}</span>
          </button>
          <h1 className="text-white text-xl font-black tracking-wide flex-1 truncate">STATSPRO</h1>
          <button
            onClick={() => navigate(unlocked ? '/settings' : '/pro-access')}
            className="flex items-center gap-1.5 bg-black/25 rounded-full pl-2 pr-3 py-1.5 shrink-0"
          >
            <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
            <span className="text-emerald-400 font-bold text-sm">{remaining} {t('home.pts', { defaultValue: 'pts' })}</span>
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-5">
        {/* ===== Copa del Mundo countdown ===== */}
        <CopaMundoCard navigate={navigate} t={t} />

        {/* ===== Bono / PRO EXCLUSIVE banner (free users) ===== */}
        {!unlocked && (
          <BonoBanner advertiser={advertiser} t={t} onClick={() => { trackClick(user?.id, 'home_bonus_banner'); navigate('/promo?banner=home_bonus_banner'); }} />
        )}

        {/* Express-First hero — funnel-4 */}
        {isFunnel4 && (
          <div
            onClick={() => navigate('/express')}
            className="relative overflow-hidden rounded-2xl p-5 text-white cursor-pointer shadow-lg"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-lg">{t('home.aiExpress', { defaultValue: 'AI Express Bets' })}</h3>
                <p className="text-white/70 text-xs">{t('home.aiExpressDesc', { defaultValue: '3 ready accumulators from top leagues' })}</p>
              </div>
              <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
            </div>
          </div>
        )}

        {/* ===== Top Partidos de Hoy ===== */}
        <div>
          <div className="flex items-center justify-between mb-3" data-tour="nav-matches">
            <h3 className="text-[17px] font-black text-gray-900">{t('home.topMatchesToday', { defaultValue: "Top Matches Today" })}</h3>
            <button onClick={() => navigate('/matches')} className="text-primary-600 text-sm font-semibold">
              {t('home.seeAll', { defaultValue: 'See All' })}
            </button>
          </div>
          {matches.length === 0 ? (
            <div className="bg-white rounded-2xl text-center py-8 border border-gray-100">
              <p className="text-gray-500 text-sm">{t('home.noMatchesToday')}</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
              {matches.map((f) => (
                <TopMatchCard key={f.fixture.id} fixture={f} navigate={navigate} t={t} realOdds={oddsMap[f.fixture.id]} />
              ))}
            </div>
          )}
        </div>

        {/* ===== Mejor Pick del Día ===== */}
        <div data-tour="best-bet">
          <h3 className="text-[17px] font-black text-gray-900 mb-3">{t('home.bestPick', { defaultValue: 'Best Pick of the Day' })}</h3>
          <MejorPickCard
            matches={matches}
            smartBet={smartBet}
            navigate={navigate}
            t={t}
            realOdds={oddsMap}
            locked={!unlocked}
            advertiser={advertiser}
            trackClick={trackClick}
            userId={user?.id}
            isPremium={isPremium}
          />
        </div>

        {/* ===== Análisis en Directo ===== */}
        <div data-tour="nav-ai-chat">
          <h3 className="text-[17px] font-black text-gray-900 mb-3">{t('home.liveAnalysis', { defaultValue: 'Live Analysis' })}</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Hot streak */}
            <div onClick={() => navigate('/ai-chat')} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-2.5">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941"/></svg>
              </div>
              <p className="text-sm font-bold text-gray-900">{t('home.insightStreakTitle', { defaultValue: 'Hot Streak' })}</p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">{t('home.insightStreakDesc', { defaultValue: 'Home favourites are on a strong run this week.' })}</p>
            </div>
            {/* Injuries */}
            <div onClick={() => navigate('/ai-chat')} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center mb-2.5">
                <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
              </div>
              <p className="text-sm font-bold text-gray-900">{t('home.insightInjuriesTitle', { defaultValue: 'Injuries' })}</p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">{t('home.insightInjuriesDesc', { defaultValue: 'Check key absences before you bet.' })}</p>
            </div>
            {/* PRO TIP — full width green */}
            <div
              onClick={() => navigate(unlocked ? '/ai-chat' : '/pro-access')}
              className="col-span-2 rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg, #14532D 0%, #1B5E3B 100%)' }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-white/15 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">{t('home.proTip', { defaultValue: 'PRO TIP' })}</span>
              </div>
              <p className="text-sm text-white font-medium leading-snug">{t('home.proTipDesc', { defaultValue: 'AI finds value where bookmaker odds are too high. Ask the assistant for today’s edge.' })}</p>
            </div>
          </div>
        </div>

        {/* funnel-2 detailed bonus banner */}
        {isFunnel2 && !isPremium && (
          <HomeBonusBanner advertiser={advertiser} userId={user?.id} trackClick={trackClick} />
        )}

        <div className="h-2" />
      </div>

      {/* Interactive product tour for new registrations */}
      {showWelcome && (
        <ProductTour
          onClose={() => setShowWelcome(false)}
          onGoToPromo={() => { setShowWelcome(false); navigate('/promo'); }}
          onGoToExpress={() => { setShowWelcome(false); navigate('/express'); }}
          hidePro={isFunnel2 || isFunnel4}
          expressFirst={isFunnel4}
        />
      )}

      {/* BK registration reminder modals */}
      {!showWelcome && modalVariant && (
        <DepositReminderModal
          variant={modalVariant}
          onClose={dismissModal}
          onGoToPromo={() => { dismissModal(); navigate('/promo'); }}
        />
      )}
    </div>
  );
}

/* ===== Copa del Mundo countdown card ===== */
function CopaMundoCard({ navigate, t }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, WC_START - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  const units = [
    { val: days, label: t('home.cdDays', { defaultValue: 'Days' }) },
    { val: hours, label: t('home.cdHours', { defaultValue: 'Hours' }) },
    { val: mins, label: t('home.cdMins', { defaultValue: 'Mins' }) },
  ];

  return (
    <div
      onClick={() => navigate('/world-cup')}
      className="relative overflow-hidden rounded-2xl p-5 cursor-pointer active:scale-[0.98] transition-transform"
      style={{ background: 'linear-gradient(135deg, #20253a 0%, #2a3050 100%)' }}
    >
      {/* FIFA 26 emblem */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white rounded-[20px] w-[64px] flex flex-col items-center pt-2 pb-1.5 shadow-lg">
        <div className="flex flex-col items-center leading-[0.72]">
          <span className="wc-num text-[40px] text-[#0D0D1F]">2</span>
          <span className="wc-num text-[40px] text-[#0D0D1F]">6</span>
        </div>
        <p className="text-[7px] font-black text-[#0D0D1F] tracking-[0.18em] mt-0.5">FIFA</p>
      </div>
      <p className="text-emerald-400 text-[11px] font-black uppercase tracking-[0.15em]">{t('home.roadTo', { defaultValue: 'Road to 2026' })}</p>
      <h3 className="text-white text-xl font-black mt-0.5">{t('home.copaTitle', { defaultValue: 'World Cup' })}</h3>
      <div className="flex items-end gap-4 mt-3">
        {units.map((u, i) => (
          <React.Fragment key={u.label}>
            {i > 0 && <span className="text-white/30 text-2xl font-black pb-4 leading-none">:</span>}
            <div className="text-center">
              <span className="block text-emerald-400 text-2xl font-black leading-none tabular-nums">{String(u.val).padStart(2, '0')}</span>
              <span className="block text-white/40 text-[10px] uppercase tracking-wider mt-1">{u.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ===== Bono / PRO EXCLUSIVE banner ===== */
function BonoBanner({ advertiser, t, onClick }) {
  const bonus = advertiser?.bonusBanner?.bonus || '€100';
  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl cursor-pointer active:scale-[0.98] transition-transform"
      style={{ background: 'linear-gradient(135deg, #102a43 0%, #0d3320 55%, #14532d 100%)' }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" style={{ animation: 'shine 6s infinite' }} />
      <div className="relative p-5">
        <span className="inline-block bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide mb-2">
          {t('home.proExclusive', { defaultValue: 'PRO EXCLUSIVE' })}
        </span>
        <p className="text-white text-3xl font-black">{t('home.bonusTitle', { bonus, defaultValue: `Bonus ${bonus}` })}</p>
        <p className="text-white/60 text-xs mt-1.5 max-w-[230px] leading-snug">
          {t('home.bonusDesc', { defaultValue: 'Unlock your welcome reward with your first deposit today.' })}
        </p>
        <div className="inline-flex items-center gap-1.5 bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl mt-3">
          {t('home.claimNow', { defaultValue: 'Claim now' })}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
        </div>
      </div>
    </div>
  );
}

/* ===== Top match card (horizontal scroll) ===== */
function TopMatchCard({ fixture, navigate, t, realOdds }) {
  const f = fixture;
  if (!f?.fixture || !f?.teams?.home || !f?.teams?.away) return null;
  const isLive = ['1H', '2H', 'HT'].includes(f.fixture?.status?.short);
  let time = '--:--';
  try { time = new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch {}
  const odds = (realOdds && realOdds.home) ? realOdds : genOdds(f.fixture.id);
  const league = f.league?.name || '';
  // Highlight derby/classic when both teams are top European clubs in the same league
  const elClasico = /clasico|clásico|derby|derbi/i.test(f.fixture?.status?.long || '') ? true : false;

  return (
    <div
      onClick={() => navigate(isLive ? `/live/${f.fixture.id}` : `/match/${f.fixture.id}`)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm w-[280px] shrink-0 cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>
          <span className="text-[11px] font-semibold text-gray-700 shrink-0">{isLive ? 'LIVE' : time}</span>
          <span className="text-[11px] text-gray-400 truncate">· {league}</span>
        </div>
        {elClasico && (
          <span className="bg-rose-100 text-rose-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase shrink-0">{t('home.classic', { defaultValue: 'Classic' })}</span>
        )}
      </div>

      {/* Teams */}
      <div className="px-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={f.teams.home.logo || ''} alt="" className="w-6 h-6 object-contain shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
            <span className="text-sm font-semibold text-gray-900 truncate">{f.teams.home.name}</span>
          </div>
          <span className="text-base font-black text-gray-900 tabular-nums">{isLive ? (f.goals?.home ?? 0) : 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={f.teams.away.logo || ''} alt="" className="w-6 h-6 object-contain shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
            <span className="text-sm font-semibold text-gray-900 truncate">{f.teams.away.name}</span>
          </div>
          <span className="text-base font-black text-gray-900 tabular-nums">{isLive ? (f.goals?.away ?? 0) : 0}</span>
        </div>
      </div>

      {/* Odds */}
      <div className="flex gap-2 px-4 py-3 mt-1">
        {[
          { k: '1', v: odds.home },
          { k: 'X', v: odds.draw },
          { k: '2', v: odds.away },
        ].map((o) => (
          <div key={o.k} className="flex-1 bg-gray-50 rounded-lg py-2 text-center">
            <p className="text-[10px] text-gray-400 font-semibold">{o.k}</p>
            <p className="text-sm font-bold text-primary-600">{o.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Mejor Pick del Día (AI pick, blurred selection for free users) ===== */
function MejorPickCard({ matches, smartBet, navigate, t, locked, advertiser, trackClick, userId, isPremium, realOdds }) {
  const sb = smartBet?.found ? smartBet : null;
  const m0 = matches?.[0];
  const home = sb?.home || m0?.teams?.home?.name || 'Benfica';
  const away = sb?.away || m0?.teams?.away?.name || 'Porto';
  const league = sb?.league || m0?.league?.name || 'Primeira Liga';
  const confidence = sb?.confidence || 96;
  const fixtureId = sb?.fixture_id || m0?.fixture?.id;
  const realHome = realOdds?.[fixtureId]?.home;
  const odds = parseFloat(sb?.odds || realHome || genOdds(m0?.fixture?.id || 1).home);
  const selection = sb?.bet?.market || t('home.pickHomeWin', { defaultValue: 'Home Win' });

  const handleCta = () => {
    if (locked) { navigate('/pro-access?reason=upgrade&feature=best-pick'); return; }
    if (trackClick) trackClick(userId, 'best_bet_place');
    if (isPremium && advertiser?.link) {
      const link = getTrackingLink(userId, 'best_bet_place') || advertiser.link;
      window.open(link, '_blank', 'noopener,noreferrer');
    } else if (fixtureId) {
      navigate(`/match/${fixtureId}`);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
      style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)' }}
    >
      {/* top row: AI PICK badge + CUOTA */}
      <div className="flex items-start justify-between">
        <div className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
          <span className="text-[11px] font-black tracking-wide">{t('home.aiPick', { defaultValue: 'AI PICK' })} · {confidence}% {t('home.confidence', { defaultValue: 'CONFIDENCE' })}</span>
        </div>
        <div className="bg-emerald-400 text-emerald-950 rounded-xl px-3 py-1.5 text-center shrink-0">
          <p className="text-[9px] font-bold uppercase leading-none">{t('home.odds', { defaultValue: 'Odds' })}</p>
          <p className="text-lg font-black leading-tight">{odds.toFixed(2)}</p>
        </div>
      </div>

      {/* selection (blurred for free) */}
      <div className="mt-4">
        <p className={`text-2xl font-black ${locked ? 'blur-[6px] select-none' : ''}`}>{selection}</p>
        <p className="text-white/70 text-sm mt-1">{home} vs {away} · {league}</p>
      </div>

      {/* social proof */}
      <div className="flex items-center gap-2 mt-4">
        <div className="flex -space-x-1.5">
          {['LA', '3S', 'MP'].map((s, i) => (
            <span key={i} className="w-5 h-5 rounded-full border border-white/30 text-[8px] flex items-center justify-center font-bold text-white" style={{ background: ['#f87171', '#34d399', '#fbbf24'][i] }}>{s}</span>
          ))}
          <span className="w-5 h-5 rounded-full bg-white/20 border border-white/30 text-[8px] flex items-center justify-center font-bold text-white">+18</span>
        </div>
        <span className="text-white/60 text-xs">{t('home.usersBetting', { count: '18.4k', defaultValue: '18.4k users betting here' })}</span>
      </div>

      {/* CTA */}
      <button
        onClick={handleCta}
        className="w-full mt-4 bg-[#1B2138] text-white font-bold py-3.5 rounded-xl text-[15px] flex items-center justify-center gap-2"
      >
        {locked && (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
        )}
        {locked ? t('home.unlockPick', { defaultValue: 'Unlock with PRO' }) : t('home.addToBetslip', { defaultValue: 'Add to betslip' })}
      </button>
    </div>
  );
}

/* ===== Bonus banner for funnel-2 (social proof + urgency) ===== */
function HomeBonusBanner({ advertiser, userId, trackClick }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const bb = advertiser?.bonusBanner || { deposit: '€50', bonus: '€100', total: '€150' };

  const hour = new Date().getHours();
  const claimedCount = 90 + ((hour * 7 + 13) % 80);
  const spotsMax = 150 + ((hour * 3) % 30);
  const spotsLeft = 15 + ((hour * 5 + 3) % 25);
  const progressPct = ((spotsMax - spotsLeft) / spotsMax) * 100;

  const handleClick = () => {
    if (userId) trackClick(userId, 'home_bonus_banner');
    navigate('/promo?banner=home_bonus_banner');
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #1a1f3a 0%, #2d1b4e 50%, #1a2744 100%)' }}>
      <div className="flex items-center justify-center gap-2 py-2 px-4" style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}>
        <div className="flex -space-x-1.5">
          <span className="w-5 h-5 rounded-full bg-red-400 border border-white/30 text-[8px] flex items-center justify-center font-bold text-white">K</span>
          <span className="w-5 h-5 rounded-full bg-blue-400 border border-white/30 text-[8px] flex items-center justify-center font-bold text-white">M</span>
          <span className="w-5 h-5 rounded-full bg-green-400 border border-white/30 text-[8px] flex items-center justify-center font-bold text-white">A</span>
        </div>
        <p className="text-white text-xs font-medium">
          <span className="font-bold">{claimedCount}</span>{' '}
          {t('advertiser.bannerSocialProof', { count: claimedCount }).replace(/^\d+\s*/, '')}
        </p>
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      </div>

      <div className="p-4 space-y-3">
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <span className="text-white/80 text-xs font-medium">{t('advertiser.bannerSpotsLeft')}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-white font-bold text-lg">{spotsLeft}</span>
              <span className="text-white/50 text-xs">/{spotsMax}</span>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #ef4444, #f97316)' }} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl">🎁</span>
            </div>
            <div>
              <p className="text-white/60 text-xs">{t('advertiser.bannerFreeBet')}</p>
              <p className="text-white font-black text-2xl leading-none">{bb.bonus}</p>
            </div>
          </div>
          <div className="bg-yellow-400/15 rounded-xl px-3 py-2 text-center">
            <p className="text-yellow-400/70 text-[9px] font-bold uppercase">{t('advertiser.bannerTotal')}</p>
            <p className="text-yellow-400 font-black text-xl leading-none">{bb.total}</p>
          </div>
        </div>

        <p className="text-white/60 text-xs leading-relaxed">
          {t('advertiser.bannerDesc', { deposit: bb.deposit, bonus: bb.bonus, total: bb.total })}
        </p>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={handleClick}
          className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"
          style={{ background: 'linear-gradient(90deg, #eab308, #f59e0b)' }}
        >
          <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          <span className="text-gray-900">{t('advertiser.bannerCta', { bonus: bb.bonus })}</span>
        </button>
      </div>
    </div>
  );
}
