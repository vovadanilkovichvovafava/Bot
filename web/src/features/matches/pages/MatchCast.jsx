import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import footballApi from '../api/footballApi';
import { getTrackingLink } from '../../betting/services/trackingService';
import { useAuth } from '../../auth/context/AuthContext';

const HOME_COLOR = '#3b82f6';
const AWAY_COLOR = '#ef4444';

// Pull a numeric stat by (fuzzy) type name out of api-sports statistics array.
function statVal(arr, typeIncludes) {
  if (!Array.isArray(arr)) return 0;
  const row = arr.find((s) => (s.type || '').toLowerCase().includes(typeIncludes));
  if (!row) return 0;
  const v = row.value;
  if (typeof v === 'string') return parseInt(v, 10) || 0;
  return v || 0;
}

// Lightweight live win-probability heuristic (home/draw/away, sums ~100).
function winProbability(gh, ga, minute, possHome, sotHome, sotAway) {
  const diff = gh - ga;
  const t = Math.min(1, Math.max(0, minute / 90)); // 0 start → 1 end
  // A lead is worth more as time runs out.
  let homeScore = diff * (1.0 + 1.4 * t);
  homeScore += ((possHome - 50) / 50) * 0.6 * (1 - t);
  homeScore += (sotHome - sotAway) * 0.18;
  const expHome = Math.exp(homeScore);
  const expAway = Math.exp(-homeScore);
  // Draw likelihood shrinks with |lead| and as the match ends.
  const drawW = Math.max(0.04, (1 - t * 0.7) * Math.exp(-Math.abs(homeScore)) * 1.3);
  const total = expHome + expAway + drawW * (expHome + expAway);
  let home = expHome / total;
  let away = expAway / total;
  let draw = 1 - home - away;
  if (draw < 0) { draw = 0; const s = home + away; home /= s; away /= s; }
  return {
    home: Math.round(home * 100),
    draw: Math.round(draw * 100),
    away: Math.round(away * 100),
  };
}

const eventsSignature = (events) =>
  `${events.length}:${events[events.length - 1]?.time?.elapsed || ''}:${events[events.length - 1]?.type || ''}`;

function eventIcon(e) {
  const ty = (e.type || '').toLowerCase();
  const de = (e.detail || '').toLowerCase();
  if (ty === 'goal') return '⚽';
  if (ty === 'card' && de.includes('red')) return '🟥';
  if (ty === 'card') return '🟨';
  if (ty === 'subst') return '🔄';
  if (ty === 'var') return '📺';
  return '•';
}

export default function MatchCast() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [fixture, setFixture] = useState(null);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState([]); // [{ id, text }]
  const [ball, setBall] = useState({ x: 50, y: 50 });
  const [goalFlash, setGoalFlash] = useState(null); // { team } | null

  const sigRef = useRef('');
  const feedIdRef = useRef(0);
  const lastLineRef = useRef('');
  const scoreRef = useRef('');

  const lang = (i18n.language || 'en').slice(0, 2);

  const home = fixture?.teams?.home;
  const away = fixture?.teams?.away;
  const gh = fixture?.goals?.home ?? 0;
  const ga = fixture?.goals?.away ?? 0;
  const status = fixture?.fixture?.status || {};
  const minute = status.elapsed || 0;
  const isLive = ['1H', '2H', 'ET', 'LIVE', 'P', 'BT', 'HT'].includes(status.short);
  const isFinished = ['FT', 'AET', 'PEN'].includes(status.short);

  const pushLine = useCallback((text) => {
    if (!text || text === lastLineRef.current) return;
    lastLineRef.current = text;
    feedIdRef.current += 1;
    const id = feedIdRef.current;
    setFeed((prev) => [{ id, text }, ...prev].slice(0, 30));
  }, []);

  const moveBallForEvent = useCallback((lastEvent, possHome) => {
    // Home attacks left→right (their goal x≈4, opponent goal x≈96).
    let x = 50;
    const team = lastEvent?.team?.id;
    if (team && home?.id && away?.id) {
      x = team === home.id ? 84 : team === away.id ? 16 : 50;
    } else if (possHome != null) {
      x = 50 + (possHome - 50) * 0.5;
    }
    const y = 28 + Math.random() * 44;
    setBall({ x, y });
  }, [home?.id, away?.id]);

  const load = useCallback(async (initial) => {
    if (initial) setLoading(true);
    try {
      const [fx, st, ev] = await Promise.allSettled([
        footballApi.getFixture(id),
        footballApi.getFixtureStatistics(id),
        footballApi.getFixtureEvents(id),
      ]);
      const fixtureData = fx.status === 'fulfilled' ? fx.value : null;
      const statsData = st.status === 'fulfilled' ? st.value : null;
      const eventsData = ev.status === 'fulfilled' ? (ev.value || []) : [];
      if (fixtureData) setFixture(fixtureData);
      if (statsData) setStats(statsData);
      setEvents(eventsData);

      // Detect a brand-new goal → flash + ball to net.
      const newSig = eventsSignature(eventsData);
      const newScore = `${fixtureData?.goals?.home ?? ''}-${fixtureData?.goals?.away ?? ''}`;
      const last = eventsData[eventsData.length - 1];
      const possHome = statVal(statsData?.[0]?.statistics, 'possession');
      if (sigRef.current && newSig !== sigRef.current) {
        moveBallForEvent(last, possHome);
        if ((last?.type || '').toLowerCase() === 'goal' || (scoreRef.current && newScore !== scoreRef.current)) {
          setGoalFlash({ team: last?.team?.name || '' });
          setTimeout(() => setGoalFlash(null), 2600);
        }
      } else if (!sigRef.current) {
        moveBallForEvent(last, possHome);
      }
      sigRef.current = newSig;
      scoreRef.current = newScore;

      // Commentary line (backend caches per state → cheap on repeat polls).
      const c = await footballApi.getMatchCommentary(id, lang);
      if (c?.text) pushLine(c.text);
    } catch {
      /* keep last good state */
    } finally {
      if (initial) setLoading(false);
    }
  }, [id, lang, moveBallForEvent, pushLine]);

  useEffect(() => {
    load(true);
    const iv = setInterval(() => load(false), 20000);
    return () => clearInterval(iv);
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1020] text-white">
        <div className="animate-pulse text-center">
          <div className="text-3xl mb-2">📡</div>
          <p className="text-sm text-white/60">{t('matchCast.loading', { defaultValue: 'Tuning into the match…' })}</p>
        </div>
      </div>
    );
  }
  if (!fixture) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1020] text-white">
        <div className="text-center">
          <p className="text-white/60 mb-3">{t('matchCast.notFound', { defaultValue: 'Match not found' })}</p>
          <button onClick={() => navigate(-1)} className="text-blue-400 font-semibold">{t('common.back', { defaultValue: 'Back' })}</button>
        </div>
      </div>
    );
  }

  const homeStats = stats?.[0]?.statistics || [];
  const awayStats = stats?.[1]?.statistics || [];
  const possHome = statVal(homeStats, 'possession') || 50;
  const possAway = 100 - possHome;
  const sotHome = statVal(homeStats, 'shots on goal');
  const sotAway = statVal(awayStats, 'shots on goal');
  const wp = winProbability(gh, ga, minute, possHome, sotHome, sotAway);

  const goalEvents = events.filter((e) => (e.type || '').toLowerCase() === 'goal');

  const onBet = () => {
    const link = user ? getTrackingLink(user.id, 'matchcast_value_bet') : null;
    if (link) window.open(link, '_blank', 'noopener');
    else navigate('/pro-access?reason=upgrade&feature=matchcast');
  };

  return (
    <div className="min-h-screen bg-[#0a1020] text-white pb-28">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-[#0a1020]/90 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-white/10">
        <button onClick={() => navigate(-1)} className="text-white/70 text-sm">‹ {t('common.back', { defaultValue: 'Back' })}</button>
        <div className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-white/80">
          {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          {isLive ? 'LIVE' : isFinished ? t('matchCast.ended', { defaultValue: 'ENDED' }) : 'MATCH-CAST'}
        </div>
        <div className="w-10" />
      </div>

      {/* Scoreboard */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex flex-col items-center gap-1">
            {home?.logo && <img src={home.logo} alt="" className="w-12 h-12 object-contain" />}
            <span className="text-[13px] font-bold text-center leading-tight">{home?.name}</span>
          </div>
          <div className="px-3 text-center">
            <div className="text-4xl font-black tabular-nums">{gh}<span className="text-white/40 mx-1">:</span>{ga}</div>
            <div className="text-[11px] text-white/50 mt-1 font-mono">
              {isFinished ? t('matchCast.fullTime', { defaultValue: 'Full time' }) : status.short === 'HT' ? 'HT' : `${minute}'`}
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            {away?.logo && <img src={away.logo} alt="" className="w-12 h-12 object-contain" />}
            <span className="text-[13px] font-bold text-center leading-tight">{away?.name}</span>
          </div>
        </div>
      </div>

      {/* Pitch */}
      <div className="px-4 mt-4">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          <svg viewBox="0 0 100 64" className="w-full block" style={{ background: 'linear-gradient(160deg,#0f7a3d,#0c5e30)' }}>
            {/* stripes */}
            {[...Array(8)].map((_, i) => (
              <rect key={i} x={i * 12.5} y="0" width="12.5" height="64" fill={i % 2 ? '#ffffff05' : '#ffffff00'} />
            ))}
            {/* outline + halfway + circle + boxes */}
            <g stroke="#ffffff" strokeWidth="0.4" fill="none" opacity="0.55">
              <rect x="3" y="3" width="94" height="58" rx="1" />
              <line x1="50" y1="3" x2="50" y2="61" />
              <circle cx="50" cy="32" r="9" />
              <rect x="3" y="17" width="14" height="30" />
              <rect x="83" y="17" width="14" height="30" />
              <rect x="3" y="25" width="5" height="14" />
              <rect x="92" y="25" width="5" height="14" />
            </g>
            <circle cx="50" cy="32" r="0.8" fill="#fff" opacity="0.6" />
            {/* team end labels */}
            <text x="6" y="33" fontSize="3" fill={HOME_COLOR} opacity="0.85" fontWeight="bold">{(home?.name || '').slice(0, 3).toUpperCase()}</text>
            <text x="88" y="33" fontSize="3" fill={AWAY_COLOR} opacity="0.85" fontWeight="bold">{(away?.name || '').slice(0, 3).toUpperCase()}</text>
            {/* ball */}
            <circle
              cx={ball.x} cy={ball.y} r="1.8"
              fill="#fff" stroke="#0a1020" strokeWidth="0.3"
              style={{ transition: 'cx 1.1s cubic-bezier(.3,1.2,.5,1), cy 1.1s ease' }}
            >
              <animate attributeName="opacity" values="1;0.7;1" dur="1.4s" repeatCount="indefinite" />
            </circle>
          </svg>

          {/* GOAL flash overlay */}
          {goalFlash && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 animate-pulse">
              <div className="text-center">
                <div className="text-5xl font-black text-yellow-300 drop-shadow-lg tracking-tight">GOAL!</div>
                <div className="text-sm text-white/90 mt-1">{goalFlash.team}</div>
              </div>
            </div>
          )}
        </div>

        {/* Possession bar */}
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-white/60 mb-1">
            <span>{possHome}%</span>
            <span className="uppercase tracking-wide">{t('matchCast.possession', { defaultValue: 'Possession' })}</span>
            <span>{possAway}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex bg-white/10">
            <div style={{ width: `${possHome}%`, background: HOME_COLOR }} className="transition-all duration-700" />
            <div style={{ width: `${possAway}%`, background: AWAY_COLOR }} className="transition-all duration-700" />
          </div>
        </div>
      </div>

      {/* Win probability */}
      <div className="px-4 mt-5">
        <div className="text-[11px] uppercase tracking-widest text-white/50 mb-1.5">{t('matchCast.winProb', { defaultValue: 'Live win probability' })}</div>
        <div className="h-9 rounded-xl overflow-hidden flex text-[12px] font-bold">
          <div style={{ width: `${wp.home}%`, background: HOME_COLOR }} className="flex items-center justify-center transition-all duration-700 min-w-[34px]">{wp.home}%</div>
          <div style={{ width: `${wp.draw}%` }} className="flex items-center justify-center bg-white/15 text-white/80 transition-all duration-700 min-w-[28px]">{wp.draw}%</div>
          <div style={{ width: `${wp.away}%`, background: AWAY_COLOR }} className="flex items-center justify-center transition-all duration-700 min-w-[34px]">{wp.away}%</div>
        </div>
        <div className="flex justify-between text-[10px] text-white/40 mt-1">
          <span>{home?.name}</span><span>{t('matchCast.draw', { defaultValue: 'Draw' })}</span><span>{away?.name}</span>
        </div>
      </div>

      {/* Commentary feed */}
      <div className="px-4 mt-5">
        <div className="text-[11px] uppercase tracking-widest text-white/50 mb-2 flex items-center gap-1.5">
          🎙 {t('matchCast.commentary', { defaultValue: 'AI Commentary' })}
        </div>
        <div className="space-y-2">
          {feed.length === 0 && (
            <div className="text-white/40 text-sm">{t('matchCast.warmingUp', { defaultValue: 'The commentator is warming up…' })}</div>
          )}
          {feed.map((line, idx) => (
            <div
              key={line.id}
              className={`rounded-xl px-3 py-2 text-sm leading-snug ${idx === 0 ? 'bg-blue-500/15 border border-blue-400/30 text-white' : 'bg-white/5 text-white/70'}`}
            >
              {line.text}
            </div>
          ))}
        </div>
      </div>

      {/* Event ticker */}
      {goalEvents.length > 0 && (
        <div className="px-4 mt-5">
          <div className="text-[11px] uppercase tracking-widest text-white/50 mb-2">{t('matchCast.keyMoments', { defaultValue: 'Key moments' })}</div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {[...events].reverse().filter((e) => ['goal', 'card', 'subst'].includes((e.type || '').toLowerCase())).map((e, i) => (
              <div key={i} className="shrink-0 bg-white/5 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-xs">
                <span className="font-mono text-white/50">{e.time?.elapsed}'</span>
                <span>{eventIcon(e)}</span>
                <span className="text-white/80 max-w-[110px] truncate">{e.player?.name || e.team?.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA — ties into the funnel */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-[#0a1020]/95 backdrop-blur border-t border-white/10 px-4 py-3 flex gap-2">
        <button onClick={onBet} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl py-3 text-sm">
          ⚡ {t('matchCast.valueBet', { defaultValue: 'Live value bet' })}
        </button>
        <button onClick={onBet} className="flex-1 bg-white/10 text-white font-bold rounded-xl py-3 text-sm border border-white/15">
          📺 {t('matchCast.watchLive', { defaultValue: 'Watch live' })}
        </button>
      </div>
    </div>
  );
}
