import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import footballApi from '../../matches/api/footballApi';

const WC_LEAGUE_ID = 1;
const WC_SEASON = 2026;
const WC_START = new Date('2026-06-11T20:00:00Z');

function mkRow(group, rank, name, code) {
  return {
    rank, group,
    team: { name, logo: `https://flagcdn.com/w80/${code}.png` },
    points: 0, goalsDiff: 0, all: { played: 0, win: 0, draw: 0, lose: 0 },
  };
}

const WC2026_GROUPS = [
  [mkRow('Group A', 1, 'Mexico', 'mx'), mkRow('Group A', 2, 'South Africa', 'za'), mkRow('Group A', 3, 'South Korea', 'kr'), mkRow('Group A', 4, 'Czech Republic', 'cz')],
  [mkRow('Group B', 1, 'Canada', 'ca'), mkRow('Group B', 2, 'Bosnia & Herzegovina', 'ba'), mkRow('Group B', 3, 'Qatar', 'qa'), mkRow('Group B', 4, 'Switzerland', 'ch')],
  [mkRow('Group C', 1, 'Brazil', 'br'), mkRow('Group C', 2, 'Morocco', 'ma'), mkRow('Group C', 3, 'Haiti', 'ht'), mkRow('Group C', 4, 'Scotland', 'gb-sct')],
  [mkRow('Group D', 1, 'United States', 'us'), mkRow('Group D', 2, 'Paraguay', 'py'), mkRow('Group D', 3, 'Australia', 'au'), mkRow('Group D', 4, 'Türkiye', 'tr')],
  [mkRow('Group E', 1, 'Germany', 'de'), mkRow('Group E', 2, 'Curaçao', 'cw'), mkRow('Group E', 3, 'Ivory Coast', 'ci'), mkRow('Group E', 4, 'Ecuador', 'ec')],
  [mkRow('Group F', 1, 'Netherlands', 'nl'), mkRow('Group F', 2, 'Japan', 'jp'), mkRow('Group F', 3, 'Sweden', 'se'), mkRow('Group F', 4, 'Tunisia', 'tn')],
  [mkRow('Group G', 1, 'Belgium', 'be'), mkRow('Group G', 2, 'Egypt', 'eg'), mkRow('Group G', 3, 'Iran', 'ir'), mkRow('Group G', 4, 'New Zealand', 'nz')],
  [mkRow('Group H', 1, 'Spain', 'es'), mkRow('Group H', 2, 'Cape Verde', 'cv'), mkRow('Group H', 3, 'Saudi Arabia', 'sa'), mkRow('Group H', 4, 'Uruguay', 'uy')],
  [mkRow('Group I', 1, 'France', 'fr'), mkRow('Group I', 2, 'Senegal', 'sn'), mkRow('Group I', 3, 'Iraq', 'iq'), mkRow('Group I', 4, 'Norway', 'no')],
  [mkRow('Group J', 1, 'Argentina', 'ar'), mkRow('Group J', 2, 'Algeria', 'dz'), mkRow('Group J', 3, 'Austria', 'at'), mkRow('Group J', 4, 'Jordan', 'jo')],
  [mkRow('Group K', 1, 'Portugal', 'pt'), mkRow('Group K', 2, 'DR Congo', 'cd'), mkRow('Group K', 3, 'Uzbekistan', 'uz'), mkRow('Group K', 4, 'Colombia', 'co')],
  [mkRow('Group L', 1, 'England', 'gb-eng'), mkRow('Group L', 2, 'Croatia', 'hr'), mkRow('Group L', 3, 'Ghana', 'gh'), mkRow('Group L', 4, 'Panama', 'pa')],
];

const KNOCKOUT_ROUNDS = [
  { key: 'Round of 32', short: 'R32' },
  { key: 'Round of 16', short: 'R16' },
  { key: 'Quarter-finals', short: 'QF' },
  { key: 'Semi-finals', short: 'SF' },
  { key: 'Final', short: 'Final' },
];

const ROUND_COLORS = {
  'Round of 32': '#5B16E8', 'Round of 16': '#E10600', 'Quarter-finals': '#00B140',
  'Semi-finals': '#B4E600', 'Final': '#FFC72C',
};

// Star players to watch (avatars use country flag + initials, no external photos)
const STAR_PLAYERS = [
  { name: 'Leo Messi', country: 'Argentina', code: 'ar', g: ['#75AADB', '#0B3D91'] },
  { name: 'C. Ronaldo', country: 'Portugal', code: 'pt', g: ['#DA291C', '#046A38'] },
  { name: 'K. Mbappé', country: 'France', code: 'fr', g: ['#1d4ed8', '#0b1f6b'] },
  { name: 'Lamine Yamal', country: 'Spain', code: 'es', g: ['#C60B1E', '#FFC400'] },
  { name: 'E. Haaland', country: 'Norway', code: 'no', g: ['#BA0C2F', '#00205B'] },
  { name: 'Vinícius Jr', country: 'Brazil', code: 'br', g: ['#009C3B', '#FFDF00'] },
];

const FOCUS_TEAMS = [
  { label: 'Spain', alias: 'La Roja', seed: 'Group H · Seed 1', code: 'es', name: 'Spain', from: '#7f1d1d', to: '#b91c1c' },
  { label: 'Portugal', alias: 'Seleção', seed: 'Group K · Seed 1', code: 'pt', name: 'Portugal', from: '#1e3a8a', to: '#2563eb' },
];

function tStatusShort(s) {
  const short = s?.short;
  if (!short) return '';
  if (['1H', '2H', 'ET', 'LIVE', 'P'].includes(short)) return `${s.elapsed || ''}'`;
  if (short === 'HT') return 'HT';
  if (short === 'FT' || short === 'AET' || short === 'PEN') return 'FT';
  return '';
}
function isFinished(s) { return ['FT', 'AET', 'PEN'].includes(s?.short); }
function isLive(s) { return ['1H', '2H', 'ET', 'HT', 'LIVE', 'P', 'BT'].includes(s?.short); }
function formatKickoff(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    started: diff <= 0,
  };
}

export default function WorldCup() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const countdown = useCountdown(WC_START);

  const [tab, setTab] = useState('groups');
  const [groups, setGroups] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [g, f] = await Promise.allSettled([
          footballApi.getAllStandings(WC_LEAGUE_ID, WC_SEASON),
          footballApi.getTournamentFixtures(WC_LEAGUE_ID, WC_SEASON),
        ]);
        if (!alive) return;
        const apiGroups = g.status === 'fulfilled' ? (g.value || []) : [];
        setGroups(apiGroups.length > 0 ? apiGroups : WC2026_GROUPS);
        setFixtures(f.status === 'fulfilled' ? (f.value || []) : []);
      } catch {
        if (alive) { setGroups(WC2026_GROUPS); setFixtures([]); }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const openMatch = (id) => { if (id) navigate(`/match/${id}`); };
  const openTeam = (team) => { if (team?.name) navigate(`/world-cup/team/${team.id || 'na'}`, { state: { team } }); };
  const isPremium = user?.is_premium;

  return (
    <div className="bg-[#F0F2F5] min-h-screen pb-6">
      {/* ===== HEADER ===== */}
      <div className="px-4 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, #1B2138 0%, #232a45 100%)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-full bg-white/15 ring-2 ring-white/10 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-base">{(user?.username || 'U')[0].toUpperCase()}</span>
          </button>
          <h1 className="flex-1 text-white text-xl font-black tracking-wide">
            STATSPRO<sup className="text-emerald-400 text-[10px] font-bold ml-0.5 align-super">2026</sup>
          </h1>
          <button onClick={() => navigate(isPremium ? '/settings' : '/pro-access')} className="flex items-center gap-1.5 bg-black/25 rounded-full pl-2 pr-3 py-1.5 shrink-0">
            <span className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/></svg>
            </span>
            <span className="text-white font-bold text-sm">{isPremium ? '∞' : t('worldCup.goPro', { defaultValue: 'PRO' })} {isPremium ? t('home.pts', { defaultValue: 'pts' }) : ''}</span>
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* ===== HERO ===== */}
        <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(120deg, #1a2036 0%, #2a2535 50%, #5e2230 100%)' }}>
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="bg-white rounded-2xl w-16 flex flex-col items-center pt-1.5 pb-1">
                <div className="flex flex-col items-center leading-[0.72]">
                  <span className="wc-num text-[32px] text-[#0D0D1F]">2</span>
                  <span className="wc-num text-[32px] text-[#0D0D1F]">6</span>
                </div>
                <p className="text-[6px] font-black text-[#0D0D1F] tracking-[0.18em]">FIFA</p>
              </div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded">LIVE</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                {t('worldCup.defendingChampions', { defaultValue: 'Defending Champions' })}: Argentina
              </p>
              <h2 className="text-white text-xl font-black leading-tight mt-1">{t('worldCup.makeItThree', { defaultValue: 'Can they make it Three?' })}</h2>
            </div>
          </div>

          {/* Countdown */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { val: countdown.days, label: t('worldCup.days', { defaultValue: 'Days' }) },
              { val: countdown.hours, label: t('worldCup.hrs', { defaultValue: 'Hrs' }) },
              { val: countdown.minutes, label: t('worldCup.min', { defaultValue: 'Min' }) },
              { val: countdown.seconds, label: t('worldCup.sec', { defaultValue: 'Sec' }) },
            ].map((u) => (
              <div key={u.label} className="bg-white/[0.08] border border-white/10 rounded-xl py-2.5 text-center">
                <span className="wc-num text-2xl text-white block">{String(u.val).padStart(2, '0')}</span>
                <span className="text-[9px] text-white/40 uppercase tracking-wider">{u.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Star Watch ===== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[17px] font-black text-gray-900">{t('worldCup.starWatch', { defaultValue: 'Star Watch' })}</h3>
            <button onClick={() => navigate('/matches')} className="text-primary-600 text-sm font-semibold">{t('worldCup.viewAll', { defaultValue: 'View All' })}</button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
            {STAR_PLAYERS.map((p) => (
              <div key={p.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm w-[120px] shrink-0 p-3 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full p-0.5 mb-2" style={{ background: `linear-gradient(135deg, ${p.g[0]}, ${p.g[1]})` }}>
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    <span className="font-black text-gray-700 text-lg">{p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                  </div>
                </div>
                <p className="text-[13px] font-bold text-gray-900 leading-tight">{p.name}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5 flex items-center gap-1 justify-center">
                  {p.country}
                  <img src={`https://flagcdn.com/w20/${p.code}.png`} alt="" className="w-3.5 h-2.5 object-cover rounded-[1px]" />
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Tabs ===== */}
        <div className="bg-gray-100 rounded-2xl p-1 flex gap-1">
          {[
            { key: 'groups', label: t('worldCup.groups', { defaultValue: 'Groups' }) },
            { key: 'bracket', label: t('worldCup.bracket', { defaultValue: 'Bracket' }) },
          ].map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === tb.key ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* ===== Fantasy Predict CTA ===== */}
        <button
          onClick={() => navigate('/world-cup/predict')}
          className="w-full text-left rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #14532D 0%, #1B5E3B 100%)' }}
        >
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-2xl">🏆</div>
          <div className="flex-1 min-w-0">
            <p className="text-emerald-300 text-[10px] font-black uppercase tracking-wide">{t('predict.fantasy', { defaultValue: 'Fantasy Predict' })}</p>
            <p className="text-white font-bold text-[15px] leading-tight">{t('predict.question', { defaultValue: 'Who will win the World Cup?' })}</p>
            <p className="text-white/60 text-xs mt-0.5">{t('predict.ctaSub', { defaultValue: 'Predict the group stage standings' })}</p>
          </div>
          <svg className="w-5 h-5 text-white/60 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </button>

        {/* ===== Tab content ===== */}
        {loading ? (
          <LoadingState />
        ) : tab === 'groups' ? (
          <GroupsView groups={groups} onOpenTeam={openTeam} t={t} />
        ) : (
          <BracketView fixtures={fixtures} onOpenMatch={openMatch} t={t} />
        )}

        {/* ===== Country focus ===== */}
        <div className="grid grid-cols-2 gap-3">
          {FOCUS_TEAMS.map((f) => (
            <button
              key={f.label}
              onClick={() => openTeam({ name: f.name, logo: `https://flagcdn.com/w80/${f.code}.png` })}
              className="text-left rounded-2xl p-4 text-white active:scale-[0.98] transition-transform"
              style={{ background: `linear-gradient(135deg, ${f.from}, ${f.to})` }}
            >
              <p className="text-white/60 text-[9px] font-black uppercase tracking-wider">{f.label} {t('worldCup.focus', { defaultValue: 'Focus' })}</p>
              <p className="text-lg font-black mt-1">{f.alias}</p>
              <p className="text-white/50 text-[11px] mt-0.5">{f.seed}</p>
            </button>
          ))}
        </div>

        {/* ===== Hinchada Live ===== */}
        <HinchadaLive t={t} username={user?.username} />
      </div>
    </div>
  );
}

/* ============================ GROUPS (light) ============================ */

function GroupsView({ groups, onOpenTeam, t }) {
  return (
    <div className="space-y-4">
      {groups.map((group, idx) => (
        <GroupCard key={idx} rows={group} onOpenTeam={onOpenTeam} t={t} />
      ))}
      <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
        <p className="text-[11px] text-gray-400">
          🟢 {t('worldCup.qualifyTop2', { defaultValue: 'Top 2 advance' })}{' · '}⚪ {t('worldCup.qualifyThird', { defaultValue: '8 best 3rd-placed advance' })}
        </p>
      </div>
    </div>
  );
}

function GroupCard({ rows, onOpenTeam, t }) {
  if (!rows?.length) return null;
  const groupName = rows[0]?.group || 'Group';
  const letter = groupName.replace('Group ', '');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
        <h3 className="font-black text-primary-700 text-base">{t('worldCup.group', { defaultValue: 'Group' })} {letter}</h3>
        <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          <span className="w-9">{t('worldCup.colPos', { defaultValue: 'Pos' })}</span>
          <span className="flex-1" />
          <span className="w-5 text-center">P</span>
          <span className="w-7 text-center">GD</span>
          <span className="w-7 text-center text-emerald-600">PTS</span>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {rows.map((row, i) => {
          const qualified = i < 2;
          return (
            <button
              key={row.team?.id || i}
              onClick={() => onOpenTeam?.(row.team)}
              className={`w-full flex items-center px-4 py-3 text-left transition-colors hover:bg-gray-50 ${qualified ? 'bg-emerald-50/40' : ''}`}
            >
              <span className={`w-9 text-sm font-black ${qualified ? 'text-emerald-600' : 'text-gray-300'}`}>{row.rank ?? i + 1}</span>
              {row.team?.logo && <img src={row.team.logo} alt="" className="w-6 h-4 object-cover rounded-sm mr-2.5 shrink-0" loading="lazy" />}
              <span className="flex-1 text-sm font-semibold text-gray-900 truncate">{row.team?.name}</span>
              <span className="w-5 text-center text-xs text-gray-400 tabular-nums">{row.all?.played ?? 0}</span>
              <span className="w-7 text-center text-xs text-gray-400 tabular-nums">{row.goalsDiff > 0 ? `+${row.goalsDiff}` : (row.goalsDiff ?? 0)}</span>
              <span className="w-7 text-center text-sm font-black text-emerald-600 tabular-nums">{row.points ?? 0}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ BRACKET (light) ============================ */

function BracketView({ fixtures, onOpenMatch, t }) {
  const [activeRound, setActiveRound] = useState(null);
  const byRound = {};
  for (const r of KNOCKOUT_ROUNDS) byRound[r.key] = [];
  for (const f of fixtures) {
    const round = f.league?.round || '';
    const match = KNOCKOUT_ROUNDS.find((r) => round.toLowerCase() === r.key.toLowerCase());
    if (match) byRound[match.key].push(f);
  }
  const hasAny = Object.values(byRound).some((arr) => arr.length > 0);
  const availableRounds = KNOCKOUT_ROUNDS.filter((r) => byRound[r.key].length > 0);
  const selected = activeRound || availableRounds[0]?.key || null;

  if (!hasAny) {
    return (
      <div>
        <div className="grid grid-cols-5 gap-1 mb-5">
          {KNOCKOUT_ROUNDS.map((r) => (
            <div key={r.key} className="text-center">
              <div className="h-1 rounded-full mb-2" style={{ backgroundColor: ROUND_COLORS[r.key] }} />
              <p className="text-[10px] font-bold text-gray-400">{r.short}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center text-center py-12 px-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4 text-3xl">🏆</div>
          <h3 className="font-bold text-gray-900">{t('worldCup.bracketSoonTitle', { defaultValue: 'Knockout stage coming soon' })}</h3>
          <p className="text-sm text-gray-400 max-w-xs mt-1.5 leading-relaxed">{t('worldCup.bracketSoonText', { defaultValue: 'The bracket fills in after the group stage. 32 teams advance to the knockouts.' })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {KNOCKOUT_ROUNDS.map((r) => {
          const count = byRound[r.key].length;
          const isActive = selected === r.key;
          return (
            <button
              key={r.key}
              onClick={() => count > 0 && setActiveRound(r.key)}
              disabled={count === 0}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${isActive ? 'text-white' : count > 0 ? 'bg-white text-gray-500 border border-gray-100' : 'bg-gray-100 text-gray-300'}`}
              style={isActive ? { backgroundColor: ROUND_COLORS[r.key] } : undefined}
            >
              {r.short}
            </button>
          );
        })}
      </div>
      {selected && byRound[selected].map((f) => (
        <BracketTie key={f.fixture?.id} fixture={f} onOpenMatch={onOpenMatch} roundColor={ROUND_COLORS[selected]} />
      ))}
    </div>
  );
}

function BracketTie({ fixture, onOpenMatch, roundColor }) {
  const { teams, goals, fixture: fx } = fixture;
  const live = isLive(fx?.status);
  const done = isFinished(fx?.status);
  const homeWin = done && goals?.home > goals?.away;
  const awayWin = done && goals?.away > goals?.home;
  return (
    <button onClick={() => onOpenMatch(fx?.id)} className="w-full rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden text-left">
      <div className="h-0.5" style={{ backgroundColor: roundColor }} />
      <div className="p-3 space-y-1">
        <BracketTeamRow team={teams?.home} score={goals?.home} winner={homeWin} dim={done && !homeWin} />
        <div className="h-px bg-gray-100 mx-1" />
        <BracketTeamRow team={teams?.away} score={goals?.away} winner={awayWin} dim={done && !awayWin} />
      </div>
      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-center">
        {live ? (
          <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />{tStatusShort(fx?.status)}</span>
        ) : (
          <span className="text-[10px] text-gray-400 font-medium">{done ? tStatusShort(fx?.status) : formatKickoff(fx?.date)}</span>
        )}
      </div>
    </button>
  );
}

function BracketTeamRow({ team, score, winner, dim }) {
  return (
    <div className={`flex items-center gap-2.5 py-1.5 ${dim ? 'opacity-40' : ''}`}>
      {team?.logo ? <img src={team.logo} alt="" className="w-6 h-4 object-cover rounded-sm shrink-0" loading="lazy" /> : <div className="w-6 h-4 rounded-sm bg-gray-100 shrink-0" />}
      <span className={`flex-1 text-sm truncate ${winner ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{team?.name || 'TBD'}</span>
      <span className={`text-sm tabular-nums font-black min-w-[20px] text-center ${winner ? 'text-emerald-600' : 'text-gray-400'}`}>{score ?? '-'}</span>
    </div>
  );
}

/* ============================ HINCHADA LIVE ============================ */

function HinchadaLive({ t, username }) {
  const seed = [
    { user: 'Diego78', code: 'ar', g: ['#75AADB', '#0B3D91'], text: t('worldCup.chatSeed1', { defaultValue: 'Come on Argentina! La Scaloneta is ready.' }) },
    { user: 'Marta_RM', code: 'es', g: ['#C60B1E', '#FFC400'], text: t('worldCup.chatSeed2', { defaultValue: 'Lamine Yamal will be the star of the World Cup.' }) },
  ];
  const [messages, setMessages] = useState(seed);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const send = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    setMessages((m) => [...m, { user: username || 'You', code: null, g: ['#34d399', '#059669'], text: v, me: true }]);
    setText('');
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(135deg, #14532D, #1B5E3B)' }}>
        <div className="flex items-center gap-2 text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>
          <span className="font-bold text-sm">{t('worldCup.fanZone', { defaultValue: 'Fan Zone Live' })}</span>
        </div>
        <span className="flex items-center gap-1.5 bg-white/15 text-white text-[10px] font-bold px-2 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />12K {t('worldCup.online', { defaultValue: 'ONLINE' })}
        </span>
      </div>

      {/* Messages */}
      <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`flex items-start gap-2.5 ${m.me ? 'flex-row-reverse' : ''}`}>
            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black text-white" style={{ background: `linear-gradient(135deg, ${m.g[0]}, ${m.g[1]})` }}>
              {m.user[0].toUpperCase()}
            </div>
            <div className={`min-w-0 ${m.me ? 'text-right' : ''}`}>
              <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1 mb-0.5" style={m.me ? { justifyContent: 'flex-end' } : undefined}>
                {m.user}
                {m.code && <img src={`https://flagcdn.com/w20/${m.code}.png`} alt="" className="w-3.5 h-2.5 object-cover rounded-[1px]" />}
              </p>
              <p className={`inline-block text-sm px-3 py-2 rounded-2xl ${m.me ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-800'}`}>{m.text}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-gray-100">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('worldCup.chatPlaceholder', { defaultValue: 'Write something…' })}
          className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button type="submit" className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 active:scale-95 transition-transform">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>
        </button>
      </form>
    </div>
  );
}

/* ============================ STATES ============================ */

function LoadingState() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="h-12 bg-gray-100 animate-pulse" />
          {[0, 1, 2, 3].map((j) => <div key={j} className="h-12 border-t border-gray-50 bg-gray-50/50 animate-pulse" style={{ animationDelay: `${j * 120}ms` }} />)}
        </div>
      ))}
    </div>
  );
}
