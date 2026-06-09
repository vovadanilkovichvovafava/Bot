import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import footballApi from '../api/footballApi';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import { useAuth } from '../../auth/context/AuthContext';
import { getFavouriteTeams, toggleFavouriteTeam } from '../services/favouritesStore';

const POPULAR_LEAGUE_IDS = [1, 2, 3, 39, 140, 78, 135, 61, 848, 88, 94];

const LIVE_ST = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT'];
const FIN_ST = ['FT', 'AET', 'PEN'];
const UP_ST = ['NS', 'TBD'];

const BETSLIP_KEY = 'bet_slip_data';

function fmtDate(d) { return d.toISOString().split('T')[0]; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

// Deterministic synthetic odds per fixture
function genOdds(seed) {
  const r = (n) => { const x = Math.sin((seed || 1) * 9301 + n * 49297) * 233280; return x - Math.floor(x); };
  return { home: (1.4 + r(1) * 2.4).toFixed(2), draw: (3.0 + r(2) * 2.2).toFixed(2), away: (1.8 + r(3) * 5).toFixed(2) };
}

function getBetslipCount() {
  try { return (JSON.parse(localStorage.getItem(BETSLIP_KEY) || '{}').selections || []).length; } catch { return 0; }
}
function addToBetslip(fixture, pick, odd) {
  try {
    const raw = localStorage.getItem(BETSLIP_KEY);
    const data = raw ? JSON.parse(raw) : { selections: [], stake: '', savedSlips: [] };
    const event = `${fixture.teams.home.name} vs ${fixture.teams.away.name}`;
    data.selections = [...(data.selections || []), { id: Date.now() + Math.random(), event, selection: pick, odds: parseFloat(odd) }];
    localStorage.setItem(BETSLIP_KEY, JSON.stringify(data));
    return data.selections.length;
  } catch { return getBetslipCount(); }
}

export default function Matches() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { advertiser, trackClick } = useAdvertiser();
  const { user } = useAuth();
  const isFunnel2 = user?.funnel === 'funnel-2';
  const isFunnel4 = user?.funnel === 'funnel-4';
  const isPremium = user?.is_premium && !isFunnel2 && !isFunnel4;
  const unlocked = isPremium || isFunnel2 || isFunnel4;

  const [dateOffset, setDateOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favIds, setFavIds] = useState([]);
  const [cartCount, setCartCount] = useState(getBetslipCount());
  const pollRef = useRef(null);

  useEffect(() => { setFavIds(getFavouriteTeams().map((x) => x.id)); }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = dateOffset === 0
          ? await footballApi.getTodayFixtures()
          : await footballApi.getFixturesByDate(fmtDate(addDays(new Date(), dateOffset)));
        if (alive) setFixtures(data || []);
      } catch (e) { console.error(e); }
      finally { if (alive) setLoading(false); }
    };
    load();
    if (pollRef.current) clearInterval(pollRef.current);
    if (dateOffset === 0) pollRef.current = setInterval(load, 60000);
    return () => { alive = false; if (pollRef.current) clearInterval(pollRef.current); };
  }, [dateOffset]);

  const matchStatus = (f) => {
    const s = f.fixture?.status?.short;
    if (LIVE_ST.includes(s)) return 'live';
    if (FIN_ST.includes(s)) return 'finished';
    return 'upcoming';
  };

  const filtered = fixtures.filter((f) => {
    if (!f?.teams?.home || !f?.teams?.away || !f?.league) return false;
    if (statusFilter === 'all') return true;
    return matchStatus(f) === statusFilter;
  });

  // Group by league, popular first
  const byLeague = {};
  filtered.forEach((f) => {
    const id = f.league.id;
    if (!byLeague[id]) byLeague[id] = { league: f.league, fixtures: [] };
    byLeague[id].fixtures.push(f);
  });
  const leagueGroups = Object.values(byLeague).sort((a, b) => {
    const ai = POPULAR_LEAGUE_IDS.indexOf(a.league.id);
    const bi = POPULAR_LEAGUE_IDS.indexOf(b.league.id);
    const ar = ai === -1 ? 999 : ai;
    const br = bi === -1 ? 999 : bi;
    if (ar !== br) return ar - br;
    return (a.league.name || '').localeCompare(b.league.name || '');
  });

  const liveCount = fixtures.filter((f) => matchStatus(f) === 'live').length;

  const onStar = (f) => {
    toggleFavouriteTeam({ id: f.teams.home.id, name: f.teams.home.name, logo: f.teams.home.logo });
    setFavIds(getFavouriteTeams().map((x) => x.id));
  };
  const onAddOdds = (f, pick, odd) => {
    setCartCount(addToBetslip(f, pick, odd));
  };

  // 7-day strip: today + next 6
  const days = [0, 1, 2, 3, 4, 5, 6];
  const filters = [
    { key: 'all', label: t('matches.filterAll', { defaultValue: 'All' }) },
    { key: 'live', label: t('matches.live', { defaultValue: 'Live' }), live: true, count: liveCount },
    { key: 'upcoming', label: t('matches.filterUpcoming', { defaultValue: 'Upcoming' }) },
    { key: 'finished', label: t('matches.filterFinished', { defaultValue: 'Finished' }) },
  ];

  return (
    <div className="bg-[#F0F2F5] min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, #1B2138 0%, #232a45 100%)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-full bg-white/15 ring-2 ring-white/10 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-base">{(user?.username || 'U')[0].toUpperCase()}</span>
          </button>
          <h1 className="flex-1 text-white text-xl font-black tracking-wide">STATSPRO</h1>
          <button onClick={() => navigate(unlocked ? '/settings' : '/pro-access')} className="flex items-center gap-1.5 bg-black/25 rounded-full pl-2 pr-3 py-1.5 shrink-0">
            <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/></svg>
            </span>
            <span className="text-emerald-400 font-bold text-sm">{unlocked ? '∞' : 'PRO'} {unlocked ? t('home.pts', { defaultValue: 'pts' }) : ''}</span>
          </button>
        </div>
      </div>

      {/* Date strip */}
      <div className="bg-white px-3 pt-3 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {days.map((offset) => {
            const d = addDays(new Date(), offset);
            const active = dateOffset === offset;
            const needsPro = !unlocked && offset !== 0;
            const wd = d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase().slice(0, 3);
            return (
              <button
                key={offset}
                onClick={() => { if (needsPro) { navigate('/pro-access?reason=upgrade&feature=matches-dates'); return; } setDateOffset(offset); }}
                className={`shrink-0 w-12 py-2 rounded-xl flex flex-col items-center transition-colors relative ${active ? 'bg-[#1B2138] text-white' : 'text-gray-500'}`}
              >
                <span className={`text-[10px] font-semibold ${active ? 'text-white/60' : 'text-gray-400'}`}>{wd}</span>
                <span className="text-base font-black leading-tight">{d.getDate()}</span>
                {active && <span className="w-1 h-1 bg-emerald-400 rounded-full mt-0.5" />}
                {needsPro && <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full" />}
              </button>
            );
          })}
          <div className="shrink-0 w-10 flex items-center justify-center text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-none pb-1">
          {filters.map((fl) => {
            const active = statusFilter === fl.key;
            return (
              <button
                key={fl.key}
                onClick={() => setStatusFilter(fl.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors ${
                  active ? 'bg-[#1B2138] text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {fl.live && <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-rose-400' : 'bg-rose-500'} ${fl.count ? 'animate-pulse' : ''}`} />}
                {fl.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Partner banner */}
        <div onClick={() => { trackClick(user?.id, 'matches_partner_banner'); navigate('/promo?banner=matches_partner_banner'); }} className="flex items-center gap-3 rounded-2xl p-3.5 cursor-pointer" style={{ background: 'linear-gradient(135deg, #14532D, #1B5E3B)' }}>
          <span className="text-xl">🎁</span>
          <p className="flex-1 min-w-0 text-white text-xs font-semibold">{t('matches.bonusAt', { bonus: advertiser?.bonusBanner?.bonus || '', name: advertiser?.name })}</p>
          <span className="text-emerald-300 text-xs font-bold shrink-0">{t('matches.getIt')} →</span>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : leagueGroups.length === 0 ? (
          <EmptyState title={t('matches.noMatchesToday')} subtitle={t('matches.checkBackLater')} />
        ) : (
          leagueGroups.map((g) => (
            <LeagueGroup
              key={g.league.id}
              league={g.league}
              fixtures={g.fixtures}
              navigate={navigate}
              t={t}
              favIds={favIds}
              onStar={onStar}
              onAddOdds={onAddOdds}
              matchStatus={matchStatus}
            />
          ))
        )}
      </div>

      {/* Floating betslip cart */}
      <button
        onClick={() => navigate('/bet-slip-builder')}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-emerald-600 shadow-lg shadow-emerald-600/40 flex items-center justify-center active:scale-95 transition-transform"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-[#F0F2F5]">{cartCount}</span>
        )}
      </button>
    </div>
  );
}

function LeagueGroup({ league, fixtures, navigate, t, favIds, onStar, onAddOdds, matchStatus }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 mb-3">
        {league.logo && <img src={league.logo} alt="" className="w-5 h-5 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />}
        <h3 className="text-base font-black text-[#1B2138]">{league.name}</h3>
        <svg className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${open ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
      </button>
      {open && (
        <div className="space-y-3">
          {fixtures.map((f) => (
            <MatchCardNew key={f.fixture.id} fixture={f} st={matchStatus(f)} navigate={navigate} t={t} fav={favIds.includes(f.teams.home.id)} onStar={onStar} onAddOdds={onAddOdds} />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamCol({ team }) {
  return (
    <div className="flex flex-col items-center gap-2 w-20">
      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
        {team?.logo ? <img src={team.logo} alt="" className="w-9 h-9 object-contain" onError={(e) => { e.target.style.display = 'none'; }} /> : <span className="text-gray-400 font-bold">{team?.name?.[0]}</span>}
      </div>
      <span className="text-[12px] font-bold text-gray-900 text-center leading-tight truncate w-full">{team?.name}</span>
    </div>
  );
}

function MatchCardNew({ fixture, st, navigate, t, fav, onStar, onAddOdds }) {
  const f = fixture;
  const elapsed = f.fixture?.status?.elapsed;
  const short = f.fixture?.status?.short;
  const gh = f.goals?.home ?? 0;
  const ga = f.goals?.away ?? 0;
  const ht = f.score?.halftime;
  let time = '--:--';
  try { time = new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch {}
  const odds = genOdds(f.fixture.id);
  const goTo = () => navigate(st === 'live' ? `/live/${f.fixture.id}` : `/match/${f.fixture.id}`);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top row */}
      <div className="flex items-center justify-between px-4 pt-3">
        {st === 'live' ? (
          <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-600 text-[11px] font-black px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
            {short === 'HT' ? 'HT' : elapsed ? `${elapsed}'` : 'LIVE'}
          </span>
        ) : st === 'finished' ? (
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{t('matches.filterFinished', { defaultValue: 'Finished' })}</span>
        ) : (
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{time}</span>
        )}
        <button onClick={(e) => { e.stopPropagation(); onStar(f); }} className="p-1 -mr-1">
          <svg className={`w-5 h-5 ${fav ? 'text-amber-400' : 'text-gray-300'}`} fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.5a.56.56 0 011.04 0l2.12 5.11a.56.56 0 00.48.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 00-.18.56l1.28 5.38a.56.56 0 01-.84.61l-4.72-2.88a.56.56 0 00-.59 0l-4.72 2.88a.56.56 0 01-.84-.61l1.28-5.38a.56.56 0 00-.18-.56l-4.2-3.6a.56.56 0 01.32-.99l5.52-.44a.56.56 0 00.48-.35L11.48 3.5z" />
          </svg>
        </button>
      </div>

      {/* Teams + score */}
      <div onClick={goTo} className="flex items-center justify-between px-4 py-2 cursor-pointer">
        <TeamCol team={f.teams.home} />
        <div className="flex flex-col items-center px-2">
          {st === 'upcoming' ? (
            <span className="text-sm font-bold text-gray-300">VS</span>
          ) : (
            <>
              <span className="text-[26px] font-black text-[#1B2138] leading-none">{gh} - {ga}</span>
              <span className="text-[10px] text-gray-400 mt-1">
                {st === 'finished' ? 'FT' : ht && ht.home != null ? `HT: ${ht.home}-${ht.away}` : ''}
              </span>
            </>
          )}
        </div>
        <TeamCol team={f.teams.away} />
      </div>

      {/* Odds (not for finished) */}
      {st !== 'finished' && (
        <div className="flex gap-2 px-4 pb-3 pt-1">
          {[
            { k: '1', v: odds.home },
            { k: 'X', v: odds.draw },
            { k: '2', v: odds.away },
          ].map((o) => (
            <button
              key={o.k}
              onClick={(e) => { e.stopPropagation(); onAddOdds(f, o.k, o.v); }}
              className="flex-1 bg-gray-50 hover:bg-emerald-50 border border-gray-100 rounded-xl py-2 text-center transition-colors active:scale-95"
            >
              <span className="text-[10px] text-gray-400 font-semibold block">{o.k}</span>
              <span className="text-sm font-bold text-primary-600 block">{o.v}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="h-20 w-full rounded-lg bg-gray-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 text-sm">{subtitle}</p>
    </div>
  );
}
