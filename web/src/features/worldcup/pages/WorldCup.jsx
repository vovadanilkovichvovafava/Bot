import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import footballApi from '../../matches/api/footballApi';

// FIFA World Cup 2026 — API-Football league id 1, season 2026
const WC_LEAGUE_ID = 1;
const WC_SEASON = 2026;

// Knockout round order (as named by API-Football), outermost → final
const KNOCKOUT_ROUNDS = [
  { key: 'Round of 32', short: 'R32' },
  { key: 'Round of 16', short: 'R16' },
  { key: 'Quarter-finals', short: 'QF' },
  { key: 'Semi-finals', short: 'SF' },
  { key: 'Final', short: 'Final' },
];

function tStatusShort(s) {
  // Map API status to a short label
  const short = s?.short;
  if (!short) return '';
  if (['1H', '2H', 'ET', 'LIVE', 'P'].includes(short)) return `${s.elapsed || ''}'`;
  if (short === 'HT') return 'HT';
  if (short === 'FT' || short === 'AET' || short === 'PEN') return 'FT';
  return '';
}

function isFinished(s) {
  return ['FT', 'AET', 'PEN'].includes(s?.short);
}
function isLive(s) {
  return ['1H', '2H', 'ET', 'HT', 'LIVE', 'P', 'BT'].includes(s?.short);
}

function formatKickoff(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function WorldCup() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [tab, setTab] = useState('groups'); // 'groups' | 'bracket'
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
        setGroups(g.status === 'fulfilled' ? (g.value || []) : []);
        setFixtures(f.status === 'fulfilled' ? (f.value || []) : []);
      } catch {
        if (alive) { setGroups([]); setFixtures([]); }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const openMatch = (fixtureId) => {
    if (fixtureId) navigate(`/match/${fixtureId}`);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-24">
      {/* ===== WC26 Branded Header ===== */}
      <div className="relative overflow-hidden">
        {/* Host-country color stripe: Canada red · Mexico green · USA blue */}
        <div className="h-1 w-full flex">
          <div className="flex-1 bg-[#E4002B]" />
          <div className="flex-1 bg-[#006847]" />
          <div className="flex-1 bg-[#0A3161]" />
        </div>
        <div className="bg-gradient-to-br from-[#11111A] via-[#0A0A0F] to-[#11111A] px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <TrophyMark />
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none">
                FIFA WORLD CUP
                <span className="text-[#FFC72C]"> 26</span>
                <span className="align-super text-[10px] text-white/40">™</span>
              </h1>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/50 mt-1">
                Canada · Mexico · USA
              </p>
            </div>
          </div>
          <p className="text-sm text-white/40 mt-3">
            {t('worldCup.subtitle', { defaultValue: '48 teams · 12 groups · groups & knockout bracket' })}
          </p>
        </div>
      </div>

      {/* ===== Tab switcher ===== */}
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur px-5 pt-3 pb-2 border-b border-white/5">
        <div className="flex gap-2">
          {[
            { key: 'groups', label: t('worldCup.groups', { defaultValue: 'Groups' }) },
            { key: 'bracket', label: t('worldCup.bracket', { defaultValue: 'Bracket' }) },
          ].map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === tb.key
                  ? 'bg-[#FFC72C] text-black'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4">
        {loading ? (
          <LoadingState />
        ) : tab === 'groups' ? (
          <GroupsView groups={groups} fixtures={fixtures} onOpenMatch={openMatch} t={t} />
        ) : (
          <BracketView fixtures={fixtures} onOpenMatch={openMatch} t={t} />
        )}
      </div>
    </div>
  );
}

/* ============================ GROUPS ============================ */

function GroupsView({ groups, fixtures, onOpenMatch, t }) {
  if (!groups.length) {
    return (
      <EmptyState
        title={t('worldCup.groupsSoonTitle', { defaultValue: 'Groups not available yet' })}
        text={t('worldCup.groupsSoonText', { defaultValue: 'Group tables appear once the tournament data goes live. Check back closer to kickoff.' })}
      />
    );
  }

  // Group upcoming/recent group-stage fixtures by group letter for a quick "fixtures" peek
  const groupFixtures = {};
  for (const f of fixtures) {
    const round = f.league?.round || '';
    if (round.toLowerCase().includes('group')) {
      // API encodes group inside round sometimes; otherwise infer from teams' group via standings
      // We'll attach by matching team ids below
    }
  }

  return (
    <div className="space-y-4">
      {groups.map((group, idx) => (
        <GroupCard key={idx} rows={group} onOpenMatch={onOpenMatch} t={t} />
      ))}
      <p className="text-[11px] text-white/30 text-center pt-2">
        {t('worldCup.qualifyNote', { defaultValue: 'Top 2 of each group + 8 best third-placed teams advance' })}
      </p>
    </div>
  );
}

function GroupCard({ rows, onOpenMatch, t }) {
  if (!rows?.length) return null;
  const groupName = rows[0]?.group || 'Group';

  return (
    <div className="bg-[#13131D] rounded-2xl overflow-hidden border border-white/5">
      <div className="px-4 py-3 bg-white/[0.03] flex items-center justify-between">
        <h3 className="font-bold text-sm tracking-wide">{groupName}</h3>
        <div className="flex items-center gap-3 text-[10px] text-white/40">
          <span>P</span><span>GD</span><span className="text-[#FFC72C] font-semibold">Pts</span>
        </div>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((row, i) => {
          const qualified = i < 2;
          const playoff = i === 2;
          return (
            <button
              key={row.team?.id || i}
              onClick={() => onOpenMatch(null)}
              className="w-full flex items-center px-4 py-2.5 hover:bg-white/[0.03] transition-colors text-left"
            >
              <div className={`w-1 h-6 rounded-full mr-3 shrink-0 ${
                qualified ? 'bg-[#FFC72C]' : playoff ? 'bg-white/30' : 'bg-transparent'
              }`} />
              <span className="text-xs text-white/40 w-4 shrink-0">{row.rank ?? i + 1}</span>
              {row.team?.logo && (
                <img src={row.team.logo} alt="" className="w-5 h-5 rounded-full object-cover mx-2 shrink-0 bg-white/10" />
              )}
              <span className="flex-1 text-sm font-medium truncate">{row.team?.name}</span>
              <div className="flex items-center gap-3 text-xs tabular-nums">
                <span className="w-4 text-center text-white/50">{row.all?.played ?? 0}</span>
                <span className="w-6 text-center text-white/50">
                  {row.goalsDiff > 0 ? `+${row.goalsDiff}` : (row.goalsDiff ?? 0)}
                </span>
                <span className="w-6 text-center font-bold text-[#FFC72C]">{row.points ?? 0}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ BRACKET ============================ */

function BracketView({ fixtures, onOpenMatch, t }) {
  // Filter only knockout fixtures, bucket by round
  const byRound = {};
  for (const r of KNOCKOUT_ROUNDS) byRound[r.key] = [];

  for (const f of fixtures) {
    const round = f.league?.round || '';
    const match = KNOCKOUT_ROUNDS.find(r => round.toLowerCase() === r.key.toLowerCase());
    if (match) byRound[match.key].push(f);
  }

  const hasAny = Object.values(byRound).some(arr => arr.length > 0);

  if (!hasAny) {
    return (
      <EmptyState
        title={t('worldCup.bracketSoonTitle', { defaultValue: 'Bracket not set yet' })}
        text={t('worldCup.bracketSoonText', { defaultValue: 'The knockout bracket fills in automatically once the group stage finishes (Round of 32 onward).' })}
      />
    );
  }

  return (
    <div className="overflow-x-auto -mx-5 px-5 pb-4">
      <div className="flex gap-4 min-w-max">
        {KNOCKOUT_ROUNDS.map((r) => {
          const ties = byRound[r.key];
          if (!ties.length) return null;
          return (
            <div key={r.key} className="w-[180px] shrink-0">
              <div className="text-center mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#FFC72C]">
                  {r.short}
                </span>
              </div>
              <div className="space-y-3">
                {ties.map((f) => (
                  <BracketTie key={f.fixture?.id} fixture={f} onOpenMatch={onOpenMatch} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketTie({ fixture, onOpenMatch }) {
  const { teams, goals, fixture: fx } = fixture;
  const live = isLive(fx?.status);
  const done = isFinished(fx?.status);
  const homeWin = done && goals?.home > goals?.away;
  const awayWin = done && goals?.away > goals?.home;

  return (
    <button
      onClick={() => onOpenMatch(fx?.id)}
      className="w-full bg-[#13131D] rounded-xl border border-white/5 overflow-hidden hover:border-[#FFC72C]/30 transition-colors text-left"
    >
      <TeamRow team={teams?.home} score={goals?.home} winner={homeWin} dim={done && !homeWin} />
      <div className="h-px bg-white/5" />
      <TeamRow team={teams?.away} score={goals?.away} winner={awayWin} dim={done && !awayWin} />
      <div className="px-2.5 py-1 bg-white/[0.02] text-center">
        {live ? (
          <span className="text-[10px] font-bold text-red-400">● {tStatusShort(fx?.status)}</span>
        ) : done ? (
          <span className="text-[10px] text-white/40">{tStatusShort(fx?.status)}</span>
        ) : (
          <span className="text-[10px] text-white/40">{formatKickoff(fx?.date)}</span>
        )}
      </div>
    </button>
  );
}

function TeamRow({ team, score, winner, dim }) {
  return (
    <div className={`flex items-center px-2.5 py-2 gap-2 ${dim ? 'opacity-50' : ''}`}>
      {team?.logo ? (
        <img src={team.logo} alt="" className="w-4 h-4 rounded-full object-cover shrink-0 bg-white/10" />
      ) : (
        <div className="w-4 h-4 rounded-full bg-white/10 shrink-0" />
      )}
      <span className={`flex-1 text-xs truncate ${winner ? 'font-bold text-white' : 'text-white/70'}`}>
        {team?.name || 'TBD'}
      </span>
      <span className={`text-xs tabular-nums ${winner ? 'font-bold text-[#FFC72C]' : 'text-white/50'}`}>
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
        <div key={i} className="bg-[#13131D] rounded-2xl border border-white/5 overflow-hidden">
          <div className="h-10 bg-white/[0.03] animate-pulse" />
          {[0, 1, 2, 3].map((j) => (
            <div key={j} className="h-11 border-t border-white/5 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <TrophyMark small />
      </div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/40 max-w-xs">{text}</p>
    </div>
  );
}

/* ============================ ICONS ============================ */

function TrophyMark({ small }) {
  const size = small ? 'w-7 h-7' : 'w-10 h-10';
  return (
    <div className={`${size} rounded-xl bg-gradient-to-br from-[#FFC72C] to-[#E0A800] flex items-center justify-center shrink-0`}>
      <svg className={small ? 'w-4 h-4' : 'w-6 h-6'} fill="#0A0A0F" viewBox="0 0 24 24">
        <path d="M18 2H6v2H3v3a4 4 0 004 4h.27A5 5 0 0011 13.9V17H8a1 1 0 100 2h8a1 1 0 100-2h-3v-3.1A5 5 0 0016.73 11H17a4 4 0 004-4V4h-3V2zM5 7V6h1v3a2 2 0 01-1-2zm14 0a2 2 0 01-1 2V6h1v1z"/>
      </svg>
    </div>
  );
}
