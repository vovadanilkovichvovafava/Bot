import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

const GROUP_ACCENT = [
  'bg-rose-400', 'bg-sky-400', 'bg-emerald-400', 'bg-violet-400',
  'bg-amber-400', 'bg-cyan-400', 'bg-pink-400', 'bg-indigo-400',
  'bg-orange-400', 'bg-teal-400', 'bg-fuchsia-400', 'bg-lime-400',
];

// Solid hex for the card's left accent border (matches GROUP_ACCENT)
const GROUP_BORDER = [
  '#FB7185', '#38BDF8', '#34D399', '#A78BFA',
  '#FBBF24', '#22D3EE', '#F472B6', '#818CF8',
  '#FB923C', '#2DD4BF', '#E879F9', '#A3E635',
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
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
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

  const openMatch = (fixtureId) => {
    if (fixtureId) navigate(`/match/${fixtureId}`);
  };

  const openTeam = (team) => {
    if (!team?.name) return;
    navigate(`/world-cup/team/${team.id || 'na'}`, { state: { team } });
  };

  return (
    <div className="min-h-screen bg-[#070710] text-white pb-24">
      {/* ===== HEADER ===== */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#12122B] to-[#070710]" />

        <div className="flex h-1.5 relative z-10">
          <div className="flex-1 bg-[#5B16E8]" />
          <div className="flex-1 bg-[#E10600]" />
          <div className="flex-1 bg-[#00B140]" />
          <div className="flex-1 bg-[#B4E600]" />
        </div>

        <div className="relative z-10 px-5 pt-6 pb-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 bg-white rounded-[28px] w-[84px] flex flex-col items-center pt-2.5 pb-2">
              <div className="flex flex-col items-center leading-[0.72]">
                <span className="wc-num text-[54px] text-[#0A0A0A]">2</span>
                <span className="wc-num text-[54px] text-[#0A0A0A]">6</span>
              </div>
              <p className="text-[9px] font-black text-[#0A0A0A] tracking-[0.18em] mt-0.5">FIFA</p>
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-xl font-black tracking-wide leading-tight">
                FIFA WORLD CUP 26™
              </h1>
              <div className="flex items-center gap-2 mt-2.5">
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/70 font-medium">
                  🇨🇦 🇲🇽 🇺🇸
                </span>
                <span className="text-xs text-white/40">48 teams · 12 groups</span>
              </div>
            </div>
          </div>

          {!countdown.started ? (
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-[0.15em] text-white/50 font-semibold mb-3 text-center">
                {t('worldCup.kickoffIn', { defaultValue: 'Kickoff in' })}
              </p>
              <div className="grid grid-cols-4 gap-2.5">
                {[
                  { val: countdown.days, label: t('worldCup.days', { defaultValue: 'Days' }), c: '#16A34A' },
                  { val: countdown.hours, label: t('worldCup.hours', { defaultValue: 'Hours' }), c: '#E10600' },
                  { val: countdown.minutes, label: t('worldCup.mins', { defaultValue: 'Mins' }), c: '#16A34A' },
                  { val: countdown.seconds, label: t('worldCup.secs', { defaultValue: 'Secs' }), c: '#FFC72C' },
                ].map((u) => (
                  <div key={u.label} className="text-center">
                    <div className="rounded-xl py-2.5 bg-white/[0.06] border border-white/[0.06]">
                      <span className="wc-num text-2xl" style={{ color: u.c }}>
                        {String(u.val).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="text-[10px] mt-1.5 uppercase tracking-wider font-semibold text-white/35">{u.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 flex items-center justify-center gap-2 bg-emerald-500/10 rounded-xl py-3 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-emerald-400">
                {t('worldCup.tournamentLive', { defaultValue: 'TOURNAMENT IS LIVE' })}
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { val: '48', label: t('worldCup.teams', { defaultValue: 'Teams' }) },
              { val: '104', label: t('worldCup.matches', { defaultValue: 'Matches' }) },
              { val: '16', label: t('worldCup.venues', { defaultValue: 'Venues' }) },
            ].map((s) => (
              <div key={s.label} className="bg-white/[0.04] rounded-xl p-3 text-center border border-white/5">
                <p className="text-lg font-black text-white">{s.val}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Tab switcher ===== */}
      <div className="sticky top-0 z-10 bg-[#070710]/95 backdrop-blur-lg px-5 pt-3 pb-2 border-b border-white/5">
        <div className="flex gap-2">
          {[
            {
              key: 'groups',
              label: t('worldCup.groups', { defaultValue: 'Groups' }),
              icon: (active) => (
                <svg className={`w-4 h-4 ${active ? 'text-[#1565C0]' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
                </svg>
              ),
            },
            {
              key: 'bracket',
              label: t('worldCup.bracket', { defaultValue: 'Bracket' }),
              icon: (active) => (
                <svg className={`w-4 h-4 ${active ? 'text-[#1565C0]' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 2H6v2H3v3a4 4 0 004 4h.27A5 5 0 0011 13.9V17H8a1 1 0 100 2h8a1 1 0 100-2h-3v-3.1A5 5 0 0016.73 11H17a4 4 0 004-4V4h-3V2zM5 7V6h1v3a2 2 0 01-1-2zm14 0a2 2 0 01-1 2V6h1v1z" />
                </svg>
              ),
            },
          ].map((tb) => {
            const active = tab === tb.key;
            return (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  active
                    ? 'bg-white text-[#1565C0] shadow-lg'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                {tb.icon(active)}
                {tb.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Fantasy Predict CTA */}
        <button
          onClick={() => navigate('/world-cup/predict')}
          className="w-full text-left rounded-2xl p-4 mb-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #14532D 0%, #1B5E3B 100%)' }}
        >
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-2xl">🏆</div>
          <div className="flex-1 min-w-0">
            <p className="text-emerald-300 text-[10px] font-black uppercase tracking-wide">{t('predict.fantasy', { defaultValue: 'Fantasy Predict' })}</p>
            <p className="text-white font-bold text-[15px] leading-tight">{t('predict.question', { defaultValue: 'Who will win the World Cup?' })}</p>
            <p className="text-white/60 text-xs mt-0.5">{t('predict.ctaSub', { defaultValue: 'Fill in the bracket & pick your champion' })}</p>
          </div>
          <svg className="w-5 h-5 text-white/60 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </button>

        {loading ? (
          <LoadingState />
        ) : tab === 'groups' ? (
          <GroupsView groups={groups} fixtures={fixtures} onOpenMatch={openMatch} onOpenTeam={openTeam} t={t} />
        ) : (
          <BracketView fixtures={fixtures} onOpenMatch={openMatch} t={t} />
        )}
      </div>
    </div>
  );
}

/* ============================ GROUPS ============================ */

function GroupsView({ groups, fixtures, onOpenMatch, onOpenTeam, t }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {groups.map((group, idx) => (
          <GroupCard key={idx} rows={group} colorIdx={idx} onOpenMatch={onOpenMatch} onOpenTeam={onOpenTeam} t={t} />
        ))}
      </div>
      <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5 text-center">
        <p className="text-[11px] text-white/40">
          🟡 {t('worldCup.qualifyTop2', { defaultValue: 'Top 2 advance' })}
          {' · '}
          ⚪ {t('worldCup.qualifyThird', { defaultValue: '8 best 3rd-placed advance' })}
        </p>
      </div>
    </div>
  );
}

function GroupCard({ rows, colorIdx = 0, onOpenMatch, onOpenTeam, t }) {
  if (!rows?.length) return null;
  const groupName = rows[0]?.group || 'Group';
  const letter = groupName.replace('Group ', '');

  return (
    <div
      className="rounded-2xl overflow-hidden bg-[#0d0d18] border border-white/[0.08]"
      style={{ borderLeft: `4px solid ${GROUP_BORDER[colorIdx]}` }}
    >
      {/* Group header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${GROUP_ACCENT[colorIdx]} flex items-center justify-center`}>
            <span className="text-sm font-black text-white">{letter}</span>
          </div>
          <h3 className="font-bold text-sm tracking-wide text-white">{groupName}</h3>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-white/40 font-semibold uppercase tracking-wider">
          <span className="w-5 text-center">P</span>
          <span className="w-5 text-center">W</span>
          <span className="w-5 text-center">D</span>
          <span className="w-5 text-center">L</span>
          <span className="w-6 text-center">GD</span>
          <span className="w-6 text-center text-[#16A34A]">PTS</span>
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-white/[0.04]">
        {rows.map((row, i) => {
          const qualified = i < 2;
          return (
            <div
              key={row.team?.id || i}
              onClick={() => onOpenTeam?.(row.team)}
              className={`flex items-center px-4 py-3 transition-colors cursor-pointer hover:bg-white/[0.05] active:bg-white/[0.07] ${
                qualified ? 'bg-white/[0.02]' : ''
              }`}
            >
              <span className="text-xs text-white/30 w-5 shrink-0 font-bold">{row.rank ?? i + 1}</span>
              {row.team?.logo && (
                <img
                  src={row.team.logo}
                  alt=""
                  className="w-7 h-5 object-contain mx-2 shrink-0 rounded-sm"
                  loading="lazy"
                />
              )}
              <span className="flex-1 text-sm font-semibold truncate text-white/90">{row.team?.name}</span>
              <div className="flex items-center gap-4 text-xs tabular-nums">
                <span className="w-5 text-center text-white/40">{row.all?.played ?? 0}</span>
                <span className="w-5 text-center text-white/40">{row.all?.win ?? 0}</span>
                <span className="w-5 text-center text-white/40">{row.all?.draw ?? 0}</span>
                <span className="w-5 text-center text-white/40">{row.all?.lose ?? 0}</span>
                <span className="w-6 text-center text-white/50 font-medium">
                  {row.goalsDiff > 0 ? `+${row.goalsDiff}` : (row.goalsDiff ?? 0)}
                </span>
                <span className="w-6 text-center font-black text-[#16A34A]">{row.points ?? 0}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ BRACKET ============================ */

const ROUND_COLORS = {
  'Round of 32': '#5B16E8',
  'Round of 16': '#E10600',
  'Quarter-finals': '#00B140',
  'Semi-finals': '#B4E600',
  'Final': '#FFC72C',
};

function BracketView({ fixtures, onOpenMatch, t }) {
  const [activeRound, setActiveRound] = useState(null);

  const byRound = {};
  for (const r of KNOCKOUT_ROUNDS) byRound[r.key] = [];
  for (const f of fixtures) {
    const round = f.league?.round || '';
    const match = KNOCKOUT_ROUNDS.find(r => round.toLowerCase() === r.key.toLowerCase());
    if (match) byRound[match.key].push(f);
  }

  const hasAny = Object.values(byRound).some(arr => arr.length > 0);
  const availableRounds = KNOCKOUT_ROUNDS.filter(r => byRound[r.key].length > 0);
  const selected = activeRound || availableRounds[0]?.key || null;

  if (!hasAny) {
    return (
      <div className="space-y-4">
        {/* Visual bracket placeholder */}
        <div className="text-center py-3">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30">
            {t('worldCup.knockoutStage', { defaultValue: 'Knockout Stage' })}
          </p>
        </div>
        <div className="grid grid-cols-5 gap-1 mb-6">
          {KNOCKOUT_ROUNDS.map((r) => (
            <div key={r.key} className="text-center">
              <div className="h-1 rounded-full mb-2" style={{ backgroundColor: ROUND_COLORS[r.key] || '#555' }} />
              <p className="text-[10px] font-bold text-white/30">{r.short}</p>
              <p className="text-[9px] text-white/15 mt-0.5">
                {r.key === 'Round of 32' ? '16' : r.key === 'Round of 16' ? '8' : r.key === 'Quarter-finals' ? '4' : r.key === 'Semi-finals' ? '2' : '1'}
              </p>
            </div>
          ))}
        </div>
        <EmptyState
          title={t('worldCup.bracketSoonTitle', { defaultValue: 'Knockout stage coming soon' })}
          text={t('worldCup.bracketSoonText', { defaultValue: 'The bracket fills in after the group stage. 32 teams advance to the knockouts.' })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Round selector pills — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {KNOCKOUT_ROUNDS.map((r) => {
          const count = byRound[r.key].length;
          const isActive = selected === r.key;
          const color = ROUND_COLORS[r.key] || '#555';
          return (
            <button
              key={r.key}
              onClick={() => count > 0 && setActiveRound(r.key)}
              disabled={count === 0}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'text-white'
                  : count > 0
                    ? 'bg-white/5 text-white/50 hover:bg-white/10'
                    : 'bg-white/[0.02] text-white/15 cursor-default'
              }`}
              style={isActive ? { backgroundColor: color } : undefined}
            >
              <span>{r.short}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20' : 'bg-white/[0.08]'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="grid grid-cols-5 gap-1">
        {KNOCKOUT_ROUNDS.map((r) => {
          const count = byRound[r.key].length;
          const allDone = count > 0 && byRound[r.key].every(f => isFinished(f.fixture?.status));
          return (
            <div key={r.key} className="h-1 rounded-full overflow-hidden bg-white/[0.06]">
              {count > 0 && (
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    backgroundColor: ROUND_COLORS[r.key],
                    width: allDone ? '100%' : '50%',
                    opacity: allDone ? 1 : 0.5,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Matches for selected round */}
      {selected && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ROUND_COLORS[selected] }} />
            <h3 className="text-sm font-bold text-white/70">
              {KNOCKOUT_ROUNDS.find(r => r.key === selected)?.key}
            </h3>
            <span className="text-xs text-white/30 ml-auto">{byRound[selected].length} {t('worldCup.matches', { defaultValue: 'matches' })}</span>
          </div>
          {byRound[selected].map((f) => (
            <BracketTie key={f.fixture?.id} fixture={f} onOpenMatch={onOpenMatch} roundColor={ROUND_COLORS[selected]} />
          ))}
        </div>
      )}
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
    <button
      onClick={() => onOpenMatch(fx?.id)}
      className={`w-full rounded-2xl border overflow-hidden transition-all text-left ${
        live
          ? 'bg-[#0d0d18] border-red-500/30 shadow-lg shadow-red-500/10'
          : 'bg-[#0d0d18] border-white/[0.08] hover:border-white/20 active:bg-white/[0.04]'
      }`}
    >
      {/* Round accent bar */}
      <div className="h-0.5" style={{ backgroundColor: roundColor || '#555' }} />
      <div className="p-3 space-y-1">
        <BracketTeamRow team={teams?.home} score={goals?.home} winner={homeWin} dim={done && !homeWin} />
        <div className="h-px bg-white/5 mx-1" />
        <BracketTeamRow team={teams?.away} score={goals?.away} winner={awayWin} dim={done && !awayWin} />
      </div>
      <div className="px-3 py-1.5 bg-white/[0.02] border-t border-white/5 flex items-center justify-center">
        {live ? (
          <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            {tStatusShort(fx?.status)}
          </span>
        ) : done ? (
          <span className="text-[10px] text-white/40 font-medium">{tStatusShort(fx?.status)}</span>
        ) : (
          <span className="text-[10px] text-white/40">{formatKickoff(fx?.date)}</span>
        )}
      </div>
    </button>
  );
}

function BracketTeamRow({ team, score, winner, dim }) {
  return (
    <div className={`flex items-center gap-2.5 py-1.5 ${dim ? 'opacity-35' : ''}`}>
      {team?.logo ? (
        <img src={team.logo} alt="" className="w-6 h-4 object-contain shrink-0 rounded-sm" loading="lazy" />
      ) : (
        <div className="w-6 h-4 rounded-sm bg-white/10 shrink-0" />
      )}
      <span className={`flex-1 text-sm truncate ${winner ? 'font-bold text-white' : 'text-white/70'}`}>
        {team?.name || 'TBD'}
      </span>
      <span className={`text-sm tabular-nums font-black min-w-[20px] text-center ${
        winner ? 'text-[#FFC72C]' : 'text-white/50'
      }`}>
        {score ?? '-'}
      </span>
    </div>
  );
}

/* ============================ STATES ============================ */

function LoadingState() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-[#0d0d18] rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="h-12 bg-white/[0.03] shimmer-wc" />
          {[0, 1, 2, 3].map((j) => (
            <div key={j} className="h-14 border-t border-white/[0.04] shimmer-wc" style={{ animationDelay: `${j * 150}ms` }} />
          ))}
        </div>
      ))}
      <style>{`.shimmer-wc { animation: pulse 1.5s ease-in-out infinite; background: linear-gradient(90deg, transparent, rgba(255,199,44,0.03), transparent); background-size: 200% 100%; }`}</style>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FFC72C]/20 to-[#FFC72C]/5 border border-[#FFC72C]/20 flex items-center justify-center mb-5">
        <svg className="w-10 h-10 text-[#FFC72C]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 2H6v2H3v3a4 4 0 004 4h.27A5 5 0 0011 13.9V17H8a1 1 0 100 2h8a1 1 0 100-2h-3v-3.1A5 5 0 0016.73 11H17a4 4 0 004-4V4h-3V2zM5 7V6h1v3a2 2 0 01-1-2zm14 0a2 2 0 01-1 2V6h1v1z"/>
        </svg>
      </div>
      <h3 className="font-bold text-lg text-white mb-2">{title}</h3>
      <p className="text-sm text-white/40 max-w-xs leading-relaxed">{text}</p>
    </div>
  );
}
