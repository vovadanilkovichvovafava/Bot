import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import footballApi from '../../matches/api/footballApi';
import getWCHistory from '../data/wcHistory';
import api from '../../../shared/api';

const FREE_AI_LIMIT = 5;

const POSITION_GROUPS = [
  { key: 'Goalkeeper', label: 'Goalkeepers', short: 'GK' },
  { key: 'Defender', label: 'Defenders', short: 'DEF' },
  { key: 'Midfielder', label: 'Midfielders', short: 'MID' },
  { key: 'Attacker', label: 'Attackers', short: 'FWD' },
];

export default function WCTeamDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();

  const stateTeam = location.state?.team || null;
  const [team, setTeam] = useState(stateTeam);
  const [players, setPlayers] = useState([]);
  const [nextMatch, setNextMatch] = useState(null);
  const [recent, setRecent] = useState([]);
  const [teamApiId, setTeamApiId] = useState(/^\d+$/.test(id) ? Number(id) : null);
  const [loading, setLoading] = useState(true);

  const isFunnel2 = user?.funnel === 'funnel-2' || user?.funnel === 'funnel-4';
  const isPremium = user?.is_premium && !isFunnel2;
  const unlocked = isPremium || isFunnel2;

  const [aiRemaining, setAiRemaining] = useState(null);
  useEffect(() => {
    if (!unlocked) {
      api.getChatLimit()
        .then(data => setAiRemaining(data.remaining ?? FREE_AI_LIMIT))
        .catch(() => setAiRemaining(FREE_AI_LIMIT));
    }
  }, [unlocked]);
  const remaining = unlocked ? '∞' : (aiRemaining ?? FREE_AI_LIMIT);

  const history = getWCHistory(team?.name || stateTeam?.name);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        let teamId = /^\d+$/.test(id) ? Number(id) : null;
        if (!teamId && stateTeam?.name) {
          // Resolve to the SENIOR national team (not youth/women) by name.
          const found = await footballApi.resolveNationalTeam(stateTeam.name);
          teamId = found?.id || null;
          if (alive && found) setTeam((prev) => ({ ...prev, logo: prev?.logo || found.logo }));
        }
        if (!teamId) { if (alive) setLoading(false); return; }
        if (alive) setTeamApiId(teamId);
        // Squad + the team's next fixture (real opponent/date) in parallel
        const [squadRes, fxRes, recentRes] = await Promise.allSettled([
          footballApi.getSquad(teamId),
          footballApi.getFixturesByTeam(teamId, 2026, 6),
          footballApi.getTeamRecentFixtures(teamId, 8),
        ]);
        if (!alive) return;
        const squad = squadRes.status === 'fulfilled' ? squadRes.value : null;
        const entry = Array.isArray(squad) ? squad[0] : squad;
        if (entry?.team) setTeam((prev) => ({ name: entry.team.name, logo: entry.team.logo, ...prev }));
        setPlayers(entry?.players || []);
        const fixtures = fxRes.status === 'fulfilled' ? (fxRes.value || []) : [];
        const upcoming = fixtures.filter((f) => ['NS', 'TBD'].includes(f.fixture?.status?.short));
        // Prefer the World Cup (league 1) fixture, else the soonest upcoming
        setNextMatch(upcoming.find((f) => f.league?.id === 1) || upcoming[0] || fixtures[0] || null);
        setRecent(recentRes.status === 'fulfilled' ? (recentRes.value || []) : []);
      } catch {
        if (alive) setPlayers([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const grouped = POSITION_GROUPS.map((g) => ({
    ...g,
    list: players.filter((p) => p.position === g.key),
  })).filter((g) => g.list.length > 0);

  // Next match: real opponent + kickoff (falls back to placeholder if unknown)
  const nmTeams = nextMatch?.teams;
  const opponent = nmTeams ? (nmTeams.home?.id === teamApiId ? nmTeams.away : nmTeams.home) : null;
  const nmWhen = (() => {
    const iso = nextMatch?.fixture?.date;
    if (!iso) return null;
    const d = new Date(iso);
    const wd = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const mon = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return { date: `${wd} ${d.getDate()} ${mon}`, time };
  })();

  const name = team?.name || stateTeam?.name || 'Team';
  const logo = team?.logo || stateTeam?.logo;
  const group = stateTeam?.group || team?.group || null;

  // Real recent form + stats derived from the team's last finished fixtures
  const results = recent
    .filter((f) => ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short) && teamApiId)
    .sort((a, b) => new Date(b.fixture?.date) - new Date(a.fixture?.date))
    .map((f) => {
      const isHome = f.teams?.home?.id === teamApiId;
      const gf = (isHome ? f.goals?.home : f.goals?.away) ?? 0;
      const ga = (isHome ? f.goals?.away : f.goals?.home) ?? 0;
      return { gf, ga, r: gf > ga ? 'W' : gf < ga ? 'L' : 'D' };
    });
  const formLetters = results.length ? results.slice(0, 5).map((x) => x.r).reverse() : [];
  const formColors = { W: 'bg-emerald-500', D: 'bg-gray-400', L: 'bg-red-500' };
  const games = results.length;
  const avgGoals = games ? (results.reduce((s, x) => s + x.gf, 0) / games).toFixed(1) : '—';
  const winRate = games ? `${Math.round((results.filter((x) => x.r === 'W').length / games) * 100)}%` : '—';
  const avgConceded = games ? (results.reduce((s, x) => s + x.ga, 0) / games).toFixed(1) : '—';
  const worldRanking = history?.titles?.length >= 3 ? '#1' : history?.titles?.length >= 2 ? '#3' : history?.titles?.length >= 1 ? '#8' : '#15';

  return (
    <div className="bg-[#F0F2F5] min-h-screen pb-24">
      {/* ===== HEADER ===== */}
      <div className="px-4 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, #1B2138 0%, #232a45 100%)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
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
            <span className="text-emerald-400 font-bold text-sm">{remaining} pts</span>
          </button>
        </div>
      </div>

      {/* ===== HERO CARD ===== */}
      <div className="mx-4 -mt-0 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Blue hero bg */}
          <div className="relative h-40 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3b7ab5 100%)' }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M20 20.5V18H0v-2h20v-2l2 3.25L20 20.5z\'/%3E%3C/g%3E%3C/svg%3E")', backgroundSize: '40px 40px' }} />
            {logo ? (
              <img src={logo} alt={name} className="w-24 h-24 object-contain drop-shadow-lg relative z-10" />
            ) : (
              <div className="w-24 h-24 bg-white/20 rounded-xl relative z-10" />
            )}
          </div>
          {/* Team info */}
          <div className="px-5 py-4 text-center">
            <h2 className="text-xl font-black text-gray-900 uppercase">{name}</h2>
            {group && (
              <p className="text-gray-500 text-xs font-medium mt-0.5">
                {t('worldCup.group', { defaultValue: 'Group' })} {group}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* ===== RECENT FORM + WORLD RANKING ===== */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">{t('wcTeam.recentForm', { defaultValue: 'RECENT FORM' })}</p>
            <div className="flex gap-1.5">
              {formLetters.length ? formLetters.map((l, i) => (
                <span key={i} className={`w-7 h-7 ${formColors[l]} rounded-full flex items-center justify-center text-white text-[10px] font-bold`}>
                  {l}
                </span>
              )) : <span className="text-gray-300 text-sm font-bold">—</span>}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">{t('wcTeam.worldRanking', { defaultValue: 'WORLD RANKING' })}</p>
            <p className="text-3xl font-black text-gray-900">{worldRanking} <span className="text-emerald-500 text-sm">&#9650;</span></p>
          </div>
        </div>

        {/* ===== TEAM STATISTICS ===== */}
        <div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3 px-1">{t('wcTeam.teamStats', { defaultValue: 'TEAM STATISTICS' })}</p>
          <div className="grid grid-cols-3 gap-3">
            <StatCard value={avgGoals} label={t('wcTeam.avgGoals', { defaultValue: 'Avg Goals' })} />
            <StatCard value={winRate} label={t('wcTeam.winRate', { defaultValue: 'Win Rate' })} />
            <StatCard value={avgConceded} label={t('wcTeam.conceded', { defaultValue: 'Conceded' })} />
          </div>
        </div>

        {/* ===== WORLD CUP HISTORY ===== */}
        {history && (
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3 px-1">{t('worldCup.historyTitle', { defaultValue: 'World Cup History' })}</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <div>
                  <p className="text-2xl font-black text-gray-900">{history.appearances || 0}</p>
                  <p className="text-[10px] text-gray-400 uppercase">{t('worldCup.appearances', { defaultValue: 'Appearances' })}</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-amber-500">{history.titles.length}</p>
                  <p className="text-[10px] text-gray-400 uppercase">{t('worldCup.titles', { defaultValue: 'Titles' })}</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{history.runnerUp.length}</p>
                  <p className="text-[10px] text-gray-400 uppercase">{t('worldCup.runnerUp', { defaultValue: 'Runner-up' })}</p>
                </div>
              </div>
              {history.titles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-100">
                  {history.titles.map((y) => (
                    <span key={y} className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
                      {y}
                    </span>
                  ))}
                </div>
              )}
              {history.note && (
                <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">{history.note}</p>
              )}
            </div>
          </div>
        )}

        {/* ===== PLAYER ROSTER ===== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider px-1">{t('wcTeam.playerRoster', { defaultValue: 'PLAYER ROSTER' })}</p>
            {players.length > 0 && (
              <span className="text-[#1B2138] text-xs font-bold">{t('home.viewAll', { defaultValue: 'View All' })}</span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <FootballSpinner size="sm" />
            </div>
          ) : grouped.length > 0 ? (
            <div className="space-y-4">
              {grouped.map((g) => (
                <div key={g.key}>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 px-1">
                    {t(`worldCup.pos${g.key}`, { defaultValue: g.label })}
                  </p>
                  {/* Horizontal scroll roster cards */}
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                    {g.list.slice(0, 8).map((p) => (
                      <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 w-24 shrink-0 text-center">
                        {p.photo ? (
                          <img src={p.photo} alt="" className="w-14 h-14 rounded-full object-cover bg-gray-100 mx-auto mb-2" loading="lazy" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gray-100 mx-auto mb-2 flex items-center justify-center">
                            <span className="text-gray-400 text-lg font-bold">{(p.name || '?')[0]}</span>
                          </div>
                        )}
                        <p className="text-xs font-bold text-gray-900 truncate">{p.name?.split(' ').pop()}</p>
                        <p className="text-[10px] text-gray-400">{g.short}</p>
                        {p.number && <p className="text-[10px] text-gray-400 mt-0.5">#{p.number}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-gray-400 text-sm">{t('worldCup.noSquad', { defaultValue: 'Squad list not available yet.' })}</p>
            </div>
          )}
        </div>

        {/* ===== NEXT MATCH CTA ===== */}
        <div className="bg-[#1B2138] rounded-2xl p-4 shadow-lg">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-3">{t('wcTeam.nextMatch', { defaultValue: 'NEXT MATCH' })}</p>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {logo && <img src={logo} alt="" className="w-8 h-8 object-contain" />}
              <span className="text-white font-bold text-sm uppercase">{name}</span>
            </div>
            <div className="text-center">
              <p className="text-white/40 text-[10px]">{nmWhen ? nmWhen.date : t('wcTeam.matchDate', { defaultValue: 'TBD' })}</p>
              <p className="text-white font-black text-xl">{nmWhen ? nmWhen.time : '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm uppercase">{opponent?.name || t('wcTeam.opponent', { defaultValue: 'TBD' })}</span>
              {opponent?.logo
                ? <img src={opponent.logo} alt="" className="w-8 h-8 object-contain" />
                : <div className="w-8 h-8 bg-white/10 rounded-full" />}
            </div>
          </div>
          <button
            onClick={() => {
              trackClick(user?.id, 'wc_team_bet');
              navigate('/promo?banner=wc_team_detail');
            }}
            className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/30 text-sm"
          >
            {t('wcTeam.betOnMatch', { defaultValue: 'BET ON THIS MATCH' })}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400 uppercase mt-1">{label}</p>
    </div>
  );
}

function FootballSpinner({ size }) {
  return (
    <div className={`${size === 'sm' ? 'w-8 h-8' : 'w-12 h-12'} border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin`} />
  );
}
