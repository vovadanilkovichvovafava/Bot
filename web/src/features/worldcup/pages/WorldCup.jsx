import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import footballApi from '../../matches/api/footballApi';
import MatchChat from '../../matches/components/MatchChat';

const WC_LEAGUE_ID = 1;
const WC_SEASON = 2026;
const WC_START = new Date('2026-06-11T20:00:00Z');

function mkRow(group, rank, name, code, id) {
  return {
    rank, group,
    // `id` is the api-sports SENIOR national-team id — used to load the real squad
    // directly (resolving by name returns youth teams / nothing for some countries).
    team: { id, name, logo: `https://flagcdn.com/w80/${code}.png` },
    points: 0, goalsDiff: 0, all: { played: 0, win: 0, draw: 0, lose: 0 },
  };
}

const WC2026_GROUPS = [
  [mkRow('Group A', 1, 'Mexico', 'mx', 16), mkRow('Group A', 2, 'South Africa', 'za', 1531), mkRow('Group A', 3, 'South Korea', 'kr', 17), mkRow('Group A', 4, 'Czech Republic', 'cz', 770)],
  [mkRow('Group B', 1, 'Canada', 'ca', 5529), mkRow('Group B', 2, 'Bosnia & Herzegovina', 'ba', 1113), mkRow('Group B', 3, 'Qatar', 'qa', 1569), mkRow('Group B', 4, 'Switzerland', 'ch', 15)],
  [mkRow('Group C', 1, 'Brazil', 'br', 6), mkRow('Group C', 2, 'Morocco', 'ma', 31), mkRow('Group C', 3, 'Haiti', 'ht', 2386), mkRow('Group C', 4, 'Scotland', 'gb-sct', 1108)],
  [mkRow('Group D', 1, 'United States', 'us', 2384), mkRow('Group D', 2, 'Paraguay', 'py', 2380), mkRow('Group D', 3, 'Australia', 'au', 20), mkRow('Group D', 4, 'Türkiye', 'tr', 777)],
  [mkRow('Group E', 1, 'Germany', 'de', 25), mkRow('Group E', 2, 'Curaçao', 'cw', 5530), mkRow('Group E', 3, 'Ivory Coast', 'ci', 1501), mkRow('Group E', 4, 'Ecuador', 'ec', 2382)],
  [mkRow('Group F', 1, 'Netherlands', 'nl', 1118), mkRow('Group F', 2, 'Japan', 'jp', 12), mkRow('Group F', 3, 'Sweden', 'se', 5), mkRow('Group F', 4, 'Tunisia', 'tn', 28)],
  [mkRow('Group G', 1, 'Belgium', 'be', 1), mkRow('Group G', 2, 'Egypt', 'eg', 32), mkRow('Group G', 3, 'Iran', 'ir', 22), mkRow('Group G', 4, 'New Zealand', 'nz', 4673)],
  [mkRow('Group H', 1, 'Spain', 'es', 9), mkRow('Group H', 2, 'Cape Verde', 'cv', 1533), mkRow('Group H', 3, 'Saudi Arabia', 'sa', 23), mkRow('Group H', 4, 'Uruguay', 'uy', 7)],
  [mkRow('Group I', 1, 'France', 'fr', 2), mkRow('Group I', 2, 'Senegal', 'sn', 13), mkRow('Group I', 3, 'Iraq', 'iq', 1567), mkRow('Group I', 4, 'Norway', 'no', 1090)],
  [mkRow('Group J', 1, 'Argentina', 'ar', 26), mkRow('Group J', 2, 'Algeria', 'dz', 1532), mkRow('Group J', 3, 'Austria', 'at', 775), mkRow('Group J', 4, 'Jordan', 'jo', 1548)],
  [mkRow('Group K', 1, 'Portugal', 'pt', 27), mkRow('Group K', 2, 'DR Congo', 'cd', 1508), mkRow('Group K', 3, 'Uzbekistan', 'uz', 1568), mkRow('Group K', 4, 'Colombia', 'co', 8)],
  [mkRow('Group L', 1, 'England', 'gb-eng', 10), mkRow('Group L', 2, 'Croatia', 'hr', 3), mkRow('Group L', 3, 'Ghana', 'gh', 1504), mkRow('Group L', 4, 'Panama', 'pa', 11)],
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

// Curated stars — used as a fallback before tournament stats exist. `id` is the
// api-sports national-team id (to load the real squad), `match` is the surname we
// look for in that squad to grab the player's real photo.
const STAR_PLAYERS = [
  { name: 'Leo Messi', country: 'Argentina', code: 'ar', id: 26, match: 'messi', g: ['#75AADB', '#0B3D91'] },
  { name: 'C. Ronaldo', country: 'Portugal', code: 'pt', id: 27, match: 'ronaldo', g: ['#DA291C', '#046A38'] },
  { name: 'K. Mbappé', country: 'France', code: 'fr', id: 2, match: 'mbappe', g: ['#1d4ed8', '#0b1f6b'] },
  { name: 'Lamine Yamal', country: 'Spain', code: 'es', id: 9, match: 'yamal', g: ['#C60B1E', '#FFC400'] },
  { name: 'E. Haaland', country: 'Norway', code: 'no', id: 1090, match: 'haaland', g: ['#BA0C2F', '#00205B'] },
  { name: 'Vinícius Jr', country: 'Brazil', code: 'br', id: 6, match: 'vinic', g: ['#009C3B', '#FFDF00'] },
];

// Map a country (nationality string from api-sports) → flag code for the small flag.
const NATIONALITY_FLAG = {
  Argentina: 'ar', Portugal: 'pt', France: 'fr', Spain: 'es', Norway: 'no', Brazil: 'br',
  England: 'gb-eng', Germany: 'de', Netherlands: 'nl', Belgium: 'be', Croatia: 'hr',
  Italy: 'it', Uruguay: 'uy', Colombia: 'co', Mexico: 'mx', 'USA': 'us', Morocco: 'ma',
  Senegal: 'sn', Japan: 'jp', 'South Korea': 'kr', Switzerland: 'ch', Denmark: 'dk',
  Poland: 'pl', Serbia: 'rs', Austria: 'at', Sweden: 'se', Ecuador: 'ec', Canada: 'ca',
};

const stripAccents = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

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
  const [liveMatches, setLiveMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(null); // null = loading; array after resolve

  // Star Watch — real player faces + stats.
  // Primary: live top players ranked by goals+assists (real photos from api-sports).
  // Fallback (before the tournament has stats): curated stars enriched with real
  // squad photos, so we still show faces instead of initials.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const top = await footballApi.getTopPlayers(WC_LEAGUE_ID, WC_SEASON, 12);
        if (alive && Array.isArray(top) && top.length > 0) {
          setStars(top.filter((p) => p && p.name).map((p) => ({
            name: p.name,
            photo: p.photo,
            country: p.nationality,
            code: NATIONALITY_FLAG[p.nationality] || '',
            goals: p.goals || 0,
            assists: p.assists || 0,
            ga: p.ga ?? ((p.goals || 0) + (p.assists || 0)),
            g: ['#1e3a8a', '#2563eb'],
          })));
          return;
        }
      } catch { /* fall through to squad photos */ }
      // Fallback: pull each curated star's real photo from their national squad.
      const enriched = await Promise.all(STAR_PLAYERS.map(async (s) => {
        try {
          const squad = await footballApi.getSquad(s.id);
          const entry = Array.isArray(squad) ? squad[0] : squad;
          const players = entry?.players || [];
          const hit = players.find((pl) => stripAccents(pl.name).includes(s.match));
          return { ...s, photo: hit?.photo || null };
        } catch {
          return { ...s, photo: null };
        }
      }));
      if (alive) setStars(enriched);
    })();
    return () => { alive = false; };
  }, []);

  // Live polling: standings + tournament fixtures + currently-live WC matches.
  // During the tournament this keeps tables/scores fresh without a reload.
  useEffect(() => {
    let alive = true;
    const load = async (initial) => {
      if (initial) setLoading(true);
      try {
        const [g, f, live] = await Promise.allSettled([
          footballApi.getAllStandings(WC_LEAGUE_ID, WC_SEASON),
          footballApi.getTournamentFixtures(WC_LEAGUE_ID, WC_SEASON),
          footballApi.getLiveFixtures(),
        ]);
        if (!alive) return;
        const apiGroups = g.status === 'fulfilled' ? (g.value || []) : [];
        if (apiGroups.length > 0) setGroups(apiGroups);
        else if (initial) setGroups(WC2026_GROUPS); // placeholder only until the API populates
        if (f.status === 'fulfilled') setFixtures(f.value || []);
        const allLive = live.status === 'fulfilled' ? (live.value || []) : [];
        setLiveMatches(allLive.filter((m) => m.league?.id === WC_LEAGUE_ID));
      } catch {
        if (alive && initial) { setGroups(WC2026_GROUPS); setFixtures([]); }
      } finally {
        if (alive && initial) setLoading(false);
      }
    };
    load(true);
    const iv = setInterval(() => load(false), 30000); // refresh every 30s
    return () => { alive = false; clearInterval(iv); };
  }, []);

  // In-play matches open the live screen (30s polling); otherwise the pre-match page.
  const openMatch = (id, live) => { if (id) navigate(live ? `/live/${id}` : `/match/${id}`); };
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
          <button onClick={() => navigate('/rewards')} className="flex items-center gap-1.5 bg-black/25 rounded-full pl-2 pr-3 py-1.5 shrink-0">
            <span className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01L12 1z"/></svg>
            </span>
            <span className="text-white font-bold text-sm">{t('worldCup.rewards', { defaultValue: 'Rewards' })}</span>
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
              {liveMatches.length > 0 && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE
                </span>
              )}
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

        {/* ===== Live now ===== */}
        {liveMatches.length > 0 && <LiveNowStrip matches={liveMatches} onOpen={openMatch} t={t} />}

        {/* ===== Star Watch ===== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[17px] font-black text-gray-900">{t('worldCup.starWatch', { defaultValue: 'Star Watch' })}</h3>
            <button onClick={() => navigate('/matches')} className="text-primary-600 text-sm font-semibold">{t('worldCup.viewAll', { defaultValue: 'View All' })}</button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
            {(stars || STAR_PLAYERS).map((p) => {
              const hasStats = (p.goals || 0) + (p.assists || 0) > 0;
              const initials = (p.name || '').split(' ').map((w) => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
              return (
                <div key={p.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm w-[120px] shrink-0 p-3 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full p-0.5 mb-2" style={{ background: `linear-gradient(135deg, ${p.g?.[0] || '#1e3a8a'}, ${p.g?.[1] || '#2563eb'})` }}>
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                      {p.photo ? (
                        <img
                          src={p.photo}
                          alt={p.name}
                          loading="lazy"
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <span
                        className="font-black text-gray-700 text-lg w-full h-full rounded-full items-center justify-center"
                        style={{ display: p.photo ? 'none' : 'flex' }}
                      >{initials}</span>
                    </div>
                  </div>
                  <p className="text-[13px] font-bold text-gray-900 leading-tight">{p.name}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5 flex items-center gap-1 justify-center">
                    {p.country}
                    {p.code && <img src={`https://flagcdn.com/w20/${p.code}.png`} alt="" className="w-3.5 h-2.5 object-cover rounded-[1px]" />}
                  </p>
                  {hasStats && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold">
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700" title="Goals">⚽ {p.goals}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700" title="Assists">🅰 {p.assists}</span>
                    </div>
                  )}
                </div>
              );
            })}
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

        {/* ===== Fan Zone (real backend chat) ===== */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-[17px] font-black text-gray-900">{t('worldCup.fanZone', { defaultValue: 'Fan Zone Live' })}</h3>
          </div>
          <MatchChat matchId="wc2026-fanzone" />
        </div>
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
    <button onClick={() => onOpenMatch(fx?.id, live)} className="w-full rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden text-left">
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

/* ============================ LIVE NOW ============================ */

function LiveNowStrip({ matches, onOpen, t }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        <h3 className="text-[17px] font-black text-gray-900">{t('worldCup.liveNow', { defaultValue: 'Live now' })}</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
        {matches.map((m) => {
          const fx = m.fixture || {};
          const g = m.goals || {};
          return (
            <button
              key={fx.id}
              onClick={() => onOpen(fx.id, true)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm w-[220px] shrink-0 p-3 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {tStatusShort(fx.status) || 'LIVE'}
                </span>
                <span className="text-[9px] text-gray-400 truncate max-w-[100px]">{m.league?.round || ''}</span>
              </div>
              <LiveTeamRow team={m.teams?.home} score={g.home} />
              <div className="h-px bg-gray-100 my-1" />
              <LiveTeamRow team={m.teams?.away} score={g.away} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LiveTeamRow({ team, score }) {
  return (
    <div className="flex items-center gap-2">
      {team?.logo ? <img src={team.logo} alt="" className="w-5 h-5 object-contain shrink-0" loading="lazy" /> : <div className="w-5 h-5 rounded bg-gray-100 shrink-0" />}
      <span className="flex-1 text-sm font-semibold text-gray-900 truncate">{team?.name || 'TBD'}</span>
      <span className="text-sm font-black text-gray-900 tabular-nums">{score ?? 0}</span>
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
