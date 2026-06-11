import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import api from '../../../shared/api';
import footballApi from '../api/footballApi';
import FootballSpinner from '../../../shared/components/FootballSpinner';
import CommunityPick from '../components/CommunityPick';
import MatchChat from '../components/MatchChat';

const FREE_AI_LIMIT = 5;

export default function LiveMatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();

  const isFunnel2 = user?.funnel === 'funnel-2' || user?.funnel === 'funnel-4';
  const isPremium = user?.is_premium && user?.funnel !== 'funnel-2' && user?.funnel !== 'funnel-4';
  const unlocked = isPremium || isFunnel2;

  const [fixture, setFixture] = useState(null);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiRemaining, setAiRemaining] = useState(null);
  const [showStats, setShowStats] = useState(false);

  // tokens / pts
  const remaining = unlocked ? '∞' : (aiRemaining ?? FREE_AI_LIMIT);
  const tokensLeft = unlocked ? 999 : (aiRemaining ?? FREE_AI_LIMIT);
  const canAnalyze = unlocked || tokensLeft > 0;

  useEffect(() => {
    if (unlocked) return;
    api.getChatLimit().then(d => setAiRemaining(d.remaining ?? FREE_AI_LIMIT)).catch(() => setAiRemaining(FREE_AI_LIMIT));
  }, [unlocked]);

  const loadMatchData = useCallback(async () => {
    try {
      const [fixtureData, statsData, eventsData] = await Promise.allSettled([
        footballApi.getFixture(id),
        footballApi.getFixtureStatistics(id),
        footballApi.getFixtureEvents(id),
      ]);
      if (fixtureData.status === 'fulfilled' && fixtureData.value) setFixture(fixtureData.value);
      if (statsData.status === 'fulfilled' && statsData.value) setStats(statsData.value);
      if (eventsData.status === 'fulfilled' && eventsData.value) setEvents(eventsData.value);
    } catch (e) {
      console.error('Error loading live match:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMatchData();
    const interval = setInterval(loadMatchData, 30000);
    return () => clearInterval(interval);
  }, [loadMatchData]);

  const getLiveAnalysis = async () => {
    if (!fixture) return;
    if (!canAnalyze) { navigate('/pro-access?reason=upgrade&feature=live-analysis'); return; }
    setAnalyzing(true);
    try {
      const home = fixture.teams?.home?.name;
      const away = fixture.teams?.away?.name;
      const homeGoals = fixture.goals?.home ?? 0;
      const awayGoals = fixture.goals?.away ?? 0;
      const minute = fixture.fixture?.status?.elapsed || 0;

      let prompt = `LIVE Match Analysis: ${home} ${homeGoals} - ${awayGoals} ${away} (${minute}')\n\n`;
      if (stats?.length >= 2) {
        const homeStats = stats[0]?.statistics || [];
        const awayStats = stats[1]?.statistics || [];
        prompt += 'Current Stats:\n';
        homeStats.forEach((s, i) => { prompt += `${s.type}: ${home} ${s.value || 0} - ${awayStats[i]?.value || 0} ${away}\n`; });
      }
      if (events.length > 0) {
        prompt += '\nRecent Events:\n';
        events.slice(-5).forEach(e => { prompt += `${e.time?.elapsed}' - ${e.type}: ${e.player?.name} (${e.team?.name})\n`; });
      }
      const minOdds = user?.min_odds || 1.5;
      const maxOdds = user?.max_odds || 3.0;
      prompt += `\n\nProvide a SHORT live analysis (1-2 sentences on momentum) then ONLY 2-3 live bets, one per line, EXACTLY:\n[BET] <Bet Type> @ <Odds> | <one short sentence why>\nAll odds between ${minOdds} and ${maxOdds}.`;

      const userMessage = `Analyze this LIVE match ${home} vs ${away} and provide a betting recommendation.`;
      const data = await api.aiChat(userMessage, [], prompt);
      if (!unlocked) {
        api.getChatLimit().then(d => setAiRemaining(d.remaining ?? 0)).catch(() => setAiRemaining((r) => Math.max(0, (r ?? FREE_AI_LIMIT) - 1)));
      }
      setAiAnalysis(data.response);
    } catch (e) {
      console.error(e);
      setAiAnalysis(t('liveMatch.analysisFailed'));
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F0F2F5]">
        <FootballSpinner size="lg" text={t('liveMatch.loading')} />
      </div>
    );
  }
  if (!fixture) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F0F2F5]">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{t('liveMatch.notFound')}</p>
          <button onClick={() => navigate(-1)} className="text-primary-600">{t('liveMatch.goBack')}</button>
        </div>
      </div>
    );
  }

  const home = fixture.teams?.home;
  const away = fixture.teams?.away;
  const homeGoals = fixture.goals?.home ?? 0;
  const awayGoals = fixture.goals?.away ?? 0;
  const elapsed = fixture.fixture?.status?.elapsed || 0;
  const statusShort = fixture.fixture?.status?.short || 'LIVE';
  const isHalfTime = statusShort === 'HT';
  const isFinished = ['FT', 'AET', 'PEN'].includes(statusShort);

  return (
    <div className="bg-[#F0F2F5] min-h-screen pb-8">
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, #1B2138 0%, #232a45 100%)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <h1 className="flex-1 text-white text-lg font-black tracking-wide">STATSPRO</h1>
          <button onClick={() => navigate(unlocked ? '/settings' : '/pro-access')} className="flex items-center gap-1.5 bg-black/25 rounded-full pl-2 pr-3 py-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/></svg>
            </span>
            <span className="text-emerald-400 font-bold text-sm">{remaining} {t('home.pts', { defaultValue: 'pts' })}</span>
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Hero */}
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)' }}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-white/60 text-[11px] font-bold uppercase tracking-wider">{fixture.league?.name}</span>
            {!isFinished ? (
              <span className="inline-flex items-center gap-1 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />{t('liveMatch.live', { defaultValue: 'LIVE' })}
              </span>
            ) : (
              <span className="bg-white/15 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{t('liveMatch.ft', { defaultValue: 'FT' })}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-2 w-24">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                {home?.logo && <img src={home.logo} alt="" className="w-10 h-10 object-contain" />}
              </div>
              <span className="text-[13px] font-bold text-center leading-tight">{home?.name}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black">{homeGoals}</span>
                <span className="text-2xl text-white/40">-</span>
                <span className="text-4xl font-black">{awayGoals}</span>
              </div>
              <span className="mt-2 inline-flex items-center gap-1 bg-emerald-500/90 text-white text-xs font-bold px-3 py-1 rounded-full">
                {isHalfTime ? t('liveMatch.ht', { defaultValue: 'HT' }) : isFinished ? t('liveMatch.fullTime', { defaultValue: 'Full time' }) : `${elapsed}'`}
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 w-24">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                {away?.logo && <img src={away.logo} alt="" className="w-10 h-10 object-contain" />}
              </div>
              <span className="text-[13px] font-bold text-center leading-tight">{away?.name}</span>
            </div>
          </div>
        </div>

        {/* Match-cast — live pitch + AI commentator */}
        <button
          onClick={() => navigate(`/matchcast/${id}`)}
          className="w-full mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl py-3 flex items-center justify-center gap-2 shadow-lg"
        >
          📡 {t('liveMatch.openMatchCast', { defaultValue: 'Open Match-cast (live + AI commentary)' })}
        </button>

        {/* AI Live Analysis (token-gated) */}
        <AiLiveAnalysis
          canAnalyze={canAnalyze}
          unlocked={unlocked}
          analyzing={analyzing}
          aiAnalysis={aiAnalysis}
          onAnalyze={getLiveAnalysis}
          isFinished={isFinished}
          tokensLeft={tokensLeft}
          onPlace={() => { trackClick(user?.id, 'live_ai_place'); navigate('/promo'); }}
          onUnlock={() => navigate('/pro-access?reason=upgrade&feature=live-analysis')}
          t={t}
        />

        {/* Match Timeline */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[17px] font-black text-gray-900">{t('liveMatch.matchTimeline', { defaultValue: 'Match Timeline' })}</h3>
            <button onClick={() => setShowStats(!showStats)} className="text-primary-600 text-sm font-semibold">
              {showStats ? t('liveMatch.hideStats', { defaultValue: 'Hide Stats' }) : t('liveMatch.viewStats', { defaultValue: 'View Stats' })}
            </button>
          </div>
          {showStats ? (
            <StatsPanel stats={stats} home={home} away={away} t={t} />
          ) : (
            <Timeline events={events} home={home} t={t} />
          )}
        </div>

        {/* Fans Area */}
        <div>
          <h3 className="text-[17px] font-black text-gray-900 mb-3">{t('liveMatch.fansArea', { defaultValue: 'Fans Area' })}</h3>
          <div className="space-y-4">
            <CommunityPick matchId={id} homeTeam={home ? { name: home.name, logo: home.logo } : null} awayTeam={away ? { name: away.name, logo: away.logo } : null} />
            <MatchChat matchId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== AI Live Analysis card ===== */
function AiLiveAnalysis({ canAnalyze, unlocked, analyzing, aiAnalysis, onAnalyze, isFinished, tokensLeft, onPlace, onUnlock, t }) {
  const bets = parseBets(aiAnalysis);
  const summary = stripBets(aiAnalysis);

  const Head = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a2 2 0 012 2v1h1a3 3 0 013 3v8a3 3 0 01-3 3H9a3 3 0 01-3-3V8a3 3 0 013-3h1V4a2 2 0 012-2zm-3 9a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z"/></svg>
      </div>
      <div className="min-w-0">
        <h3 className="text-gray-900 font-bold leading-tight">{t('liveMatch.aiLiveAnalysis', { defaultValue: 'AI Live Analysis' })}</h3>
        <p className="text-gray-400 text-xs">{t('liveMatch.realTimeInsights', { defaultValue: 'Real-time tactical insights' })}</p>
      </div>
    </div>
  );

  // Out of tokens → locked
  if (!canAnalyze && !aiAnalysis) {
    return (
      <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #1d4ed8, #4338ca)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a2 2 0 012 2v1h1a3 3 0 013 3v8a3 3 0 01-3 3H9a3 3 0 01-3-3V8a3 3 0 013-3h1V4a2 2 0 012-2z"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-emerald-300 text-[10px] font-black uppercase tracking-wide">{t('liveMatch.aiLiveAnalysis', { defaultValue: 'AI Live Analysis' })}</p>
            <p className="text-white font-bold text-sm leading-tight">{t('liveMatch.outOfTokens', { defaultValue: "You're out of prediction tokens" })}</p>
          </div>
        </div>
        <button onClick={onUnlock} className="w-full mt-3 bg-emerald-500 text-[#0b1733] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
          {t('liveMatch.unlockPro', { defaultValue: 'Unlock with PRO' })}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      {Head}
      {aiAnalysis ? (
        <div className="mt-3">
          {summary && (
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3 mb-3 whitespace-pre-line">{summary}</p>
          )}
          {bets.length > 0 && (
            <div className="space-y-2">
              {bets.map((b, i) => <LiveBetRow key={i} bet={b} idx={i} onPlace={onPlace} t={t} />)}
            </div>
          )}
        </div>
      ) : (
        <>
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="w-full mt-3 py-3 bg-primary-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {analyzing ? (<><FootballSpinner size="xs" light />{t('liveMatch.analyzingMatch', { defaultValue: 'Analyzing…' })}</>) : (
              isFinished ? t('liveMatch.getPostMatchAnalysis', { defaultValue: 'Get post-match analysis' }) : t('liveMatch.getLiveAnalysis', { defaultValue: 'Get live analysis' })
            )}
          </button>
          {!unlocked && (
            <p className="text-gray-400 text-xs text-center mt-2">
              {t('liveMatch.tokensLeft', { count: tokensLeft, defaultValue: `${tokensLeft} prediction tokens left` })}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function LiveBetRow({ bet, idx, onPlace, t }) {
  const [open, setOpen] = useState(false);
  const conf = 70 + ((bet.type || '').length * 7 + Math.round(bet.odds * 13)) % 26;
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${idx === 0 ? 'bg-emerald-500' : 'bg-blue-400'}`} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{bet.type}</p>
            <p className="text-[11px] text-gray-400">{t('aiChat.aiConfidence', { defaultValue: 'AI confidence' })}: {conf}%</p>
          </div>
        </div>
        <span className="text-lg font-black text-emerald-600 ml-3 tabular-nums">{bet.odds.toFixed(2)}</span>
      </div>
      <div className="flex gap-2 px-3 pb-3">
        <button onClick={() => setOpen(!open)} className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-primary-600 bg-primary-50 rounded-lg py-2">
          {t('aiChat.analysis', { defaultValue: 'Analysis' })}
          <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
        </button>
        <button onClick={onPlace} className="flex-1 text-xs font-bold text-white bg-emerald-600 rounded-lg py-2">{t('aiChat.placeBet', { defaultValue: 'Place bet' })}</button>
      </div>
      {open && bet.reason && (
        <div className="px-3 pb-3 -mt-0.5">
          <div className="bg-gray-50 rounded-lg p-3 text-[13px] text-gray-700 leading-relaxed border-l-2 border-primary-500">{bet.reason}</div>
        </div>
      )}
    </div>
  );
}

/* ===== Timeline ===== */
function Timeline({ events, home, t }) {
  if (!events?.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <p className="text-gray-500 font-medium">{t('liveMatch.noEventsYet', { defaultValue: 'No events yet' })}</p>
        <p className="text-gray-400 text-sm mt-1">{t('liveMatch.eventsWillAppear', { defaultValue: 'Events will appear here' })}</p>
      </div>
    );
  }
  const ordered = [...events].reverse();
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
      {ordered.map((event, i) => {
        const isHome = event.team?.id === home?.id;
        const style = eventStyle(event.type, event.detail, t);
        return (
          <div key={i} className={`flex items-center gap-3 ${isHome ? '' : 'flex-row-reverse text-right'}`}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate">{event.player?.name}</p>
              <p className="text-xs text-gray-400 truncate">{style.text}{event.assist?.name ? ` · ${t('liveMatch.assist', { defaultValue: 'Assist' })}: ${event.assist.name}` : ''}</p>
            </div>
            <div className={`w-7 h-7 rounded-full ${style.bg} flex items-center justify-center text-[12px] text-white shrink-0`}>{style.icon}</div>
            <span className="w-9 text-center text-sm font-mono text-gray-500 shrink-0">{event.time?.elapsed}'</span>
          </div>
        );
      })}
    </div>
  );
}

function eventStyle(type, detail, t) {
  if (type === 'Goal') return { bg: detail === 'Own Goal' ? 'bg-rose-500' : 'bg-emerald-500', icon: '⚽', text: detail === 'Own Goal' ? t('liveMatch.ownGoal', { defaultValue: 'Own goal' }) : t('liveMatch.goal', { defaultValue: 'Goal' }) };
  if (type === 'Card') return { bg: detail === 'Yellow Card' ? 'bg-amber-400' : 'bg-rose-500', icon: '', text: detail === 'Yellow Card' ? t('liveMatch.yellowCard', { defaultValue: 'Yellow card' }) : t('liveMatch.redCard', { defaultValue: 'Red card' }) };
  if (type === 'subst') return { bg: 'bg-blue-500', icon: '⇄', text: t('liveMatch.substitution', { defaultValue: 'Substitution' }) };
  if (type === 'Var') return { bg: 'bg-purple-500', icon: 'V', text: t('liveMatch.varDecision', { defaultValue: 'VAR' }) };
  return { bg: 'bg-gray-300', icon: '•', text: type };
}

/* ===== Stats panel ===== */
function StatsPanel({ stats, home, away, t }) {
  if (!stats?.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <p className="text-gray-500 font-medium">{t('liveMatch.statsNotAvailable', { defaultValue: 'Stats not available' })}</p>
      </div>
    );
  }
  const homeStats = stats[0]?.statistics || [];
  const awayStats = stats[1]?.statistics || [];
  const pairs = homeStats.map((s, i) => ({ label: s.type, home: s.value, away: awayStats[i]?.value }));
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><img src={home?.logo} alt="" className="w-5 h-5 object-contain" /><span className="text-gray-700 text-xs font-medium">{home?.name}</span></div>
        <div className="flex items-center gap-2"><span className="text-gray-700 text-xs font-medium">{away?.name}</span><img src={away?.logo} alt="" className="w-5 h-5 object-contain" /></div>
      </div>
      <div className="space-y-4">{pairs.map((s, i) => <StatBar key={i} label={s.label} home={s.home} away={s.away} />)}</div>
    </div>
  );
}

function StatBar({ label, home, away }) {
  const hVal = typeof home === 'string' ? parseInt(home) || 0 : (home ?? 0);
  const aVal = typeof away === 'string' ? parseInt(away) || 0 : (away ?? 0);
  const total = hVal + aVal || 1;
  const hPct = Math.round((hVal / total) * 100);
  const displayHome = typeof home === 'string' && home.includes('%') ? home : (home ?? 0);
  const displayAway = typeof away === 'string' && away.includes('%') ? away : (away ?? 0);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-semibold text-gray-900">{displayHome}</span>
        <span className="text-gray-400 text-xs">{label}</span>
        <span className="font-semibold text-gray-900">{displayAway}</span>
      </div>
      <div className="flex h-2 gap-1">
        <div className="flex-1 bg-gray-100 rounded-full overflow-hidden flex justify-end"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${hPct}%` }} /></div>
        <div className="flex-1 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-rose-500 rounded-full" style={{ width: `${100 - hPct}%` }} /></div>
      </div>
    </div>
  );
}

/* ===== AI text parsing ===== */
function parseBets(content) {
  if (!content) return [];
  const bets = []; const seen = new Set(); let m;
  const re = /\[BET\]\s*([^\n@]+?)\s*@\s*([\d.]+)(?:\s*\|\s*([^\n]+))?/gi;
  while ((m = re.exec(content)) !== null) {
    const key = m[1].trim().toLowerCase();
    if (!seen.has(key)) { seen.add(key); bets.push({ type: m[1].trim(), odds: parseFloat(m[2]), reason: (m[3] || '').trim() }); }
  }
  return bets.slice(0, 4);
}
function stripBets(content) {
  return (content || '').replace(/\[BET\][^\n]*/gi, '').replace(/\n{3,}/g, '\n\n').trim();
}
