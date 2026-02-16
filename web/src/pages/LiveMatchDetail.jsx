import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import footballApi from '../api/footballApi';
import FootballSpinner from '../components/FootballSpinner';

const TAB_KEYS = ['overview', 'stats', 'events', 'lineups'];

// AI request tracking
const AI_REQUESTS_KEY = 'ai_requests_count';

const getAIRequestCount = () => {
  const count = localStorage.getItem(AI_REQUESTS_KEY);
  return count ? parseInt(count, 10) : 0;
};

const incrementAIRequestCount = () => {
  const newCount = getAIRequestCount() + 1;
  localStorage.setItem(AI_REQUESTS_KEY, newCount.toString());
  return newCount;
};

export default function LiveMatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [fixture, setFixture] = useState(null);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [lineups, setLineups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadMatchData = useCallback(async () => {
    try {
      const [fixtureData, statsData, eventsData, lineupsData] = await Promise.allSettled([
        footballApi.getFixture(id),
        footballApi.getFixtureStatistics(id),
        footballApi.getFixtureEvents(id),
        footballApi.getFixtureLineups(id),
      ]);

      if (fixtureData.status === 'fulfilled' && fixtureData.value) {
        setFixture(fixtureData.value);
      }
      if (statsData.status === 'fulfilled' && statsData.value) {
        setStats(statsData.value);
      }
      if (eventsData.status === 'fulfilled' && eventsData.value) {
        setEvents(eventsData.value);
      }
      if (lineupsData.status === 'fulfilled' && lineupsData.value) {
        setLineups(lineupsData.value);
      }
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Error loading live match:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMatchData();
    // Auto-refresh every 30 seconds for live matches
    const interval = setInterval(loadMatchData, 30000);
    return () => clearInterval(interval);
  }, [loadMatchData]);

  const getLiveAnalysis = async () => {
    if (!fixture) return;
    setAnalyzing(true);
    try {
      const home = fixture.teams?.home?.name;
      const away = fixture.teams?.away?.name;
      const homeGoals = fixture.goals?.home ?? 0;
      const awayGoals = fixture.goals?.away ?? 0;
      const minute = fixture.fixture?.status?.elapsed || 0;

      let prompt = `LIVE Match Analysis: ${home} ${homeGoals} - ${awayGoals} ${away} (${minute}')\n\n`;

      // Add current stats
      if (stats?.length >= 2) {
        const homeStats = stats[0]?.statistics || [];
        const awayStats = stats[1]?.statistics || [];
        prompt += 'Current Stats:\n';
        homeStats.forEach((s, i) => {
          const awayStat = awayStats[i];
          prompt += `${s.type}: ${home} ${s.value || 0} - ${awayStat?.value || 0} ${away}\n`;
        });
      }

      // Add recent events
      if (events.length > 0) {
        prompt += '\nRecent Events:\n';
        events.slice(-5).forEach(e => {
          prompt += `${e.time?.elapsed}' - ${e.type}: ${e.player?.name} (${e.team?.name})\n`;
        });
      }

      // Add user betting preferences
      const minOdds = user?.min_odds || 1.5;
      const maxOdds = user?.max_odds || 3.0;
      const riskLevel = user?.risk_level || 'medium';
      const riskDesc = {
        low: 'Conservative - safer live bets, cash out recommendations. 1-2% stakes.',
        medium: 'Balanced - standard live bets, next goal, over/under. 2-5% stakes.',
        high: 'Aggressive - value live picks, correct score, comeback bets. 5-10% stakes.'
      };

      prompt += `\n\n**USER PREFERENCES:**`;
      prompt += `\n- Odds range: ${minOdds} - ${maxOdds}`;
      prompt += `\n- Risk: ${riskLevel.toUpperCase()} (${riskDesc[riskLevel]})`;

      prompt += '\n\nProvide LIVE analysis: current momentum, which team is dominating, prediction for remaining time. Recommend live bets matching user preferences (odds between ' + minOdds + '-' + maxOdds + ', ' + riskLevel + ' risk). Be specific about the current match state.';
      prompt += `\n\n**IMPORTANT: End your analysis with exactly this format:**`;
      prompt += `\n[BET] Bet Type Here @ Odds Here`;
      prompt += `\nExample: [BET] Next Goal: ${home} @ 3.5`;
      prompt += `\nExample: [BET] Over 1.5 Goals @ 1.85`;

      const data = await api.aiChat(prompt);

      // Increment AI request counter for non-premium users (AFTER successful response)
      const isPremium = user?.is_premium;
      if (!isPremium) {
        incrementAIRequestCount();
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
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <FootballSpinner size="lg" text={t('liveMatch.loading')} />
        </div>
      </div>
    );
  }

  if (!fixture) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
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
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="px-5 pt-4 pb-6">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
                </svg>
              </button>

              <div className="flex items-center gap-2">
                {fixture.league?.logo && (
                  <img src={fixture.league.logo} alt="" className="w-6 h-6 object-contain"/>
                )}
                <span className="text-gray-700 text-sm font-medium">{fixture.league?.name}</span>
              </div>

              {/* Live indicator */}
              {!isFinished && (
                <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"/>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"/>
                  </span>
                  <span className="text-red-600 text-xs font-bold">{t('liveMatch.live')}</span>
                </div>
              )}
              {isFinished && (
                <div className="bg-gray-100 px-3 py-1.5 rounded-full">
                  <span className="text-gray-500 text-xs font-bold">{t('liveMatch.ft')}</span>
                </div>
              )}
            </div>

            {/* Score Card */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                {/* Home Team */}
                <div className="flex-1 text-center">
                  <div className="w-20 h-20 mx-auto mb-3 bg-white rounded-2xl p-3 shadow-sm">
                    {home?.logo && <img src={home.logo} alt="" className="w-full h-full object-contain"/>}
                  </div>
                  <p className="text-gray-900 font-bold text-sm truncate px-2">{home?.name}</p>
                </div>

                {/* Score */}
                <div className="px-6 text-center">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl font-black text-gray-900">{homeGoals}</span>
                    <span className="text-2xl text-gray-300">-</span>
                    <span className="text-5xl font-black text-gray-900">{awayGoals}</span>
                  </div>

                  {/* Minute */}
                  <div className="mt-3">
                    {isHalfTime ? (
                      <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-bold">
                        {t('liveMatch.ht')}
                      </span>
                    ) : isFinished ? (
                      <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-sm font-bold">
                        {t('liveMatch.fullTime')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-600 px-4 py-1.5 rounded-full text-sm font-bold animate-pulse">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"/>
                        {elapsed}'
                      </span>
                    )}
                  </div>
                </div>

                {/* Away Team */}
                <div className="flex-1 text-center">
                  <div className="w-20 h-20 mx-auto mb-3 bg-white rounded-2xl p-3 shadow-sm">
                    {away?.logo && <img src={away.logo} alt="" className="w-full h-full object-contain"/>}
                  </div>
                  <p className="text-gray-900 font-bold text-sm truncate px-2">{away?.name}</p>
                </div>
              </div>

              {/* Quick Stats Row */}
              {stats?.length >= 2 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <QuickStats stats={stats} t={t} />
                </div>
              )}
            </div>

            {/* Last Update */}
            <p className="text-center text-gray-400 text-xs mt-3">
              {t('liveMatch.lastUpdated', { time: lastUpdate.toLocaleTimeString() })}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex">
            {TAB_KEYS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all relative ${
                  activeTab === tab ? 'text-primary-600' : 'text-gray-400'
                }`}
              >
                {t(`liveMatch.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary-600 rounded-full"/>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4 pb-8">
          {activeTab === 'overview' && (
            <OverviewTab
              fixture={fixture}
              stats={stats}
              events={events}
              aiAnalysis={aiAnalysis}
              analyzing={analyzing}
              getLiveAnalysis={getLiveAnalysis}
              user={user}
              isFinished={isFinished}
              t={t}
            />
          )}
          {activeTab === 'stats' && (
            <StatsTab stats={stats} home={home} away={away} t={t} />
          )}
          {activeTab === 'events' && (
            <EventsTab events={events} home={home} away={away} t={t} />
          )}
          {activeTab === 'lineups' && (
            <LineupsTab lineups={lineups} t={t} />
          )}
        </div>
      </div>
    </div>
  );
}

// Quick Stats in Header
function QuickStats({ stats, t }) {
  const homePoss = stats[0]?.statistics?.find(s => s.type === 'Ball Possession')?.value || '50%';
  const awayPoss = stats[1]?.statistics?.find(s => s.type === 'Ball Possession')?.value || '50%';
  const homeShots = stats[0]?.statistics?.find(s => s.type === 'Total Shots')?.value || 0;
  const awayShots = stats[1]?.statistics?.find(s => s.type === 'Total Shots')?.value || 0;
  const homeOnTarget = stats[0]?.statistics?.find(s => s.type === 'Shots on Goal')?.value || 0;
  const awayOnTarget = stats[1]?.statistics?.find(s => s.type === 'Shots on Goal')?.value || 0;

  return (
    <div className="grid grid-cols-3 gap-4 text-center">
      <div>
        <div className="flex items-center justify-center gap-2 text-gray-900 font-bold">
          <span>{homePoss}</span>
          <span className="text-gray-300">-</span>
          <span>{awayPoss}</span>
        </div>
        <p className="text-gray-500 text-xs mt-1">{t('liveMatch.possession')}</p>
      </div>
      <div>
        <div className="flex items-center justify-center gap-2 text-gray-900 font-bold">
          <span>{homeShots}</span>
          <span className="text-gray-300">-</span>
          <span>{awayShots}</span>
        </div>
        <p className="text-gray-500 text-xs mt-1">{t('liveMatch.shots')}</p>
      </div>
      <div>
        <div className="flex items-center justify-center gap-2 text-gray-900 font-bold">
          <span>{homeOnTarget}</span>
          <span className="text-gray-300">-</span>
          <span>{awayOnTarget}</span>
        </div>
        <p className="text-gray-500 text-xs mt-1">{t('liveMatch.onTarget')}</p>
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ fixture, stats, events, aiAnalysis, analyzing, getLiveAnalysis, user, isFinished, t }) {
  const recentEvents = events.slice(-5).reverse();

  // Parse AI recommended bet from analysis
  const parseRecommendedBet = () => {
    if (!aiAnalysis) return null;
    const betMatch = aiAnalysis.match(/\[BET\]\s*(.+?)\s*@\s*([\d.]+)/i);
    if (betMatch) {
      return {
        type: betMatch[1].trim(),
        odds: parseFloat(betMatch[2]),
      };
    }
    return null;
  };

  const recommendedBet = parseRecommendedBet();

  return (
    <>
      {/* AI Live Analysis */}
      <div className="card border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-gray-900 font-bold">{t('liveMatch.aiLiveAnalysis')}</h3>
            <p className="text-gray-500 text-xs">{t('liveMatch.realTimeInsights')}</p>
          </div>
        </div>

        {aiAnalysis ? (
          <>
            <div className="bg-gray-50 rounded-xl p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {aiAnalysis.split('\n').map((line, i) => {
                const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>');
                return <p key={i} className={line === '' ? 'h-2' : ''} dangerouslySetInnerHTML={{ __html: bold }}/>;
              })}
            </div>

            {/* AI Recommended Bet - Green card */}
            {recommendedBet && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <p className="text-xs text-green-700 font-semibold uppercase">{t('liveMatch.aiLiveBetRecommendation')}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-900">{recommendedBet.type}</p>
                    <div className="bg-green-600 text-white font-bold text-lg px-3 py-1 rounded-lg">
                      {recommendedBet.odds.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <button
            onClick={getLiveAnalysis}
            disabled={analyzing}
            className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <FootballSpinner size="xs" light />
                {t('liveMatch.analyzingMatch')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                </svg>
                {isFinished ? t('liveMatch.getPostMatchAnalysis') : t('liveMatch.getLiveAnalysis')}
              </>
            )}
          </button>
        )}

        {!aiAnalysis && (
          <p className="text-gray-400 text-xs text-center mt-3">
            {t('liveMatch.usesOneOfFreeRequests')}
          </p>
        )}
      </div>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <div className="card border border-gray-100">
          <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd"/>
            </svg>
            {t('liveMatch.recentEvents')}
          </h3>
          <div className="space-y-3">
            {recentEvents.map((event, i) => (
              <EventItem key={i} event={event} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Match Momentum */}
      {stats?.length >= 2 && (
        <MomentumCard stats={stats} t={t} />
      )}
    </>
  );
}

// Event Item
function EventItem({ event, t }) {
  const getEventIcon = (type, detail) => {
    if (type === 'Goal') {
      return detail === 'Own Goal'
        ? <span className="text-red-500">⚽</span>
        : <span className="text-green-500">⚽</span>;
    }
    if (type === 'Card') {
      return detail === 'Yellow Card'
        ? <span className="w-3 h-4 bg-yellow-400 rounded-sm"/>
        : <span className="w-3 h-4 bg-red-500 rounded-sm"/>;
    }
    if (type === 'subst') {
      return <span className="text-blue-500">⇄</span>;
    }
    if (type === 'Var') {
      return <span className="text-purple-500 text-xs font-bold">VAR</span>;
    }
    return <span className="text-gray-400">•</span>;
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="w-8 text-gray-500 text-sm font-mono">{event.time?.elapsed}'</span>
      <span className="w-6 flex items-center justify-center">
        {getEventIcon(event.type, event.detail)}
      </span>
      <div className="flex-1">
        <p className="text-gray-900 text-sm font-medium">{event.player?.name}</p>
        <p className="text-gray-500 text-xs">
          {event.team?.name} {event.assist?.name && `• ${t('liveMatch.assist')}: ${event.assist.name}`}
        </p>
      </div>
    </div>
  );
}

// Momentum Card
function MomentumCard({ stats, t }) {
  const homeDanger = parseInt(stats[0]?.statistics?.find(s => s.type === 'Dangerous Attacks')?.value) || 0;
  const awayDanger = parseInt(stats[1]?.statistics?.find(s => s.type === 'Dangerous Attacks')?.value) || 0;
  const total = homeDanger + awayDanger || 1;
  const homePct = Math.round((homeDanger / total) * 100);

  return (
    <div className="card border border-gray-100">
      <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.53 5.47a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72v5.69a.75.75 0 001.5 0v-5.69l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd"/>
        </svg>
        {t('liveMatch.matchMomentum')}
      </h3>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-blue-600 font-semibold">{homePct}%</span>
          <span className="text-gray-500">{t('liveMatch.dangerousAttacks')}</span>
          <span className="text-red-600 font-semibold">{100 - homePct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000"
            style={{ width: `${homePct}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-1000"
            style={{ width: `${100 - homePct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Stats Tab
function StatsTab({ stats, home, away, t }) {
  if (!stats?.length) {
    return (
      <div className="card border border-gray-100 p-8 text-center">
        <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z"/>
        </svg>
        <p className="text-gray-500 font-medium">{t('liveMatch.statsNotAvailable')}</p>
        <p className="text-gray-400 text-sm mt-1">{t('liveMatch.statsWillAppear')}</p>
      </div>
    );
  }

  const homeStats = stats[0]?.statistics || [];
  const awayStats = stats[1]?.statistics || [];

  const statPairs = homeStats.map((s, i) => ({
    label: s.type,
    home: s.value,
    away: awayStats[i]?.value,
  }));

  return (
    <div className="card border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <img src={home?.logo} alt="" className="w-6 h-6 object-contain"/>
          <span className="text-gray-700 text-xs font-medium">{home?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-700 text-xs font-medium">{away?.name}</span>
          <img src={away?.logo} alt="" className="w-6 h-6 object-contain"/>
        </div>
      </div>

      <div className="space-y-5">
        {statPairs.map((s, i) => (
          <StatBar key={i} label={s.label} home={s.home} away={s.away} />
        ))}
      </div>
    </div>
  );
}

function StatBar({ label, home, away }) {
  const hVal = typeof home === 'string' ? parseInt(home) || 0 : (home ?? 0);
  const aVal = typeof away === 'string' ? parseInt(away) || 0 : (away ?? 0);
  const total = hVal + aVal || 1;
  const hPct = Math.round((hVal / total) * 100);
  const aPct = 100 - hPct;

  const displayHome = typeof home === 'string' && home.includes('%') ? home : (home ?? 0);
  const displayAway = typeof away === 'string' && away.includes('%') ? away : (away ?? 0);

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-semibold text-gray-900">{displayHome}</span>
        <span className="text-gray-500 text-xs">{label}</span>
        <span className="font-semibold text-gray-900">{displayAway}</span>
      </div>
      <div className="flex h-2 gap-1">
        <div className="flex-1 bg-gray-100 rounded-full overflow-hidden flex justify-end">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${hPct}%` }}
          />
        </div>
        <div className="flex-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-700"
            style={{ width: `${aPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Events Tab
function EventsTab({ events, home, away, t }) {
  if (!events?.length) {
    return (
      <div className="card border border-gray-100 p-8 text-center">
        <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p className="text-gray-500 font-medium">{t('liveMatch.noEventsYet')}</p>
        <p className="text-gray-400 text-sm mt-1">{t('liveMatch.eventsWillAppear')}</p>
      </div>
    );
  }

  const groupedEvents = events.reduce((acc, event) => {
    const period = event.time?.elapsed <= 45 ? t('liveMatch.firstHalf') : t('liveMatch.secondHalf');
    if (!acc[period]) acc[period] = [];
    acc[period].push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(groupedEvents).map(([period, periodEvents]) => (
        <div key={period} className="card border border-gray-100">
          <h3 className="text-gray-500 text-xs font-semibold uppercase mb-4">{period}</h3>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[39px] top-0 bottom-0 w-0.5 bg-gray-100"/>

            <div className="space-y-4">
              {periodEvents.map((event, i) => (
                <TimelineEvent key={i} event={event} home={home} away={away} t={t} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineEvent({ event, home, away, t }) {
  const isHome = event.team?.id === home?.id;

  const getEventStyle = (type, detail) => {
    if (type === 'Goal') {
      return {
        bg: detail === 'Own Goal' ? 'bg-red-500' : 'bg-green-500',
        icon: '⚽',
        text: detail === 'Own Goal' ? t('liveMatch.ownGoal') : t('liveMatch.goal')
      };
    }
    if (type === 'Card') {
      return {
        bg: detail === 'Yellow Card' ? 'bg-yellow-400' : 'bg-red-500',
        icon: '',
        text: detail === 'Yellow Card' ? t('liveMatch.yellowCard') : t('liveMatch.redCard')
      };
    }
    if (type === 'subst') {
      return { bg: 'bg-blue-500', icon: '⇄', text: t('liveMatch.substitution') };
    }
    if (type === 'Var') {
      return { bg: 'bg-purple-500', icon: '', text: t('liveMatch.varDecision') };
    }
    return { bg: 'bg-gray-300', icon: '•', text: type };
  };

  const style = getEventStyle(event.type, event.detail);

  return (
    <div className="flex items-start gap-3">
      <span className="w-8 text-gray-500 text-sm font-mono pt-1">{event.time?.elapsed}'</span>
      <div className={`w-4 h-4 ${style.bg} rounded-full flex items-center justify-center text-[10px] text-white z-10`}>
        {style.icon}
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2">
          <img src={event.team?.logo} alt="" className="w-4 h-4 object-contain"/>
          <span className="text-gray-900 font-semibold text-sm">{event.player?.name}</span>
        </div>
        <p className="text-gray-500 text-xs mt-0.5">
          {style.text}
          {event.assist?.name && ` • ${t('liveMatch.assist')}: ${event.assist.name}`}
        </p>
      </div>
    </div>
  );
}

// Lineups Tab
function LineupsTab({ lineups, t }) {
  if (!lineups?.length) {
    return (
      <div className="card border border-gray-100 p-8 text-center">
        <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
        </svg>
        <p className="text-gray-500 font-medium">{t('liveMatch.lineupsNotAvailable')}</p>
        <p className="text-gray-400 text-sm mt-1">{t('liveMatch.lineupsAppearBefore')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lineups.map((team, idx) => (
        <div key={idx} className="card border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <img src={team.team?.logo} alt="" className="w-8 h-8 object-contain"/>
            <div>
              <h3 className="text-gray-900 font-bold">{team.team?.name}</h3>
              <p className="text-gray-500 text-xs">{team.formation}</p>
            </div>
          </div>

          {team.coach?.name && (
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{t('liveMatch.coach')}</span>
              <span>{team.coach.name}</span>
            </div>
          )}

          <div className="mb-4">
            <p className="text-gray-400 text-xs uppercase font-semibold mb-3">{t('liveMatch.startingXI')}</p>
            <div className="space-y-2">
              {team.startXI?.map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                    {p.player?.number}
                  </span>
                  <span className="text-gray-900">{p.player?.name}</span>
                  <span className="text-gray-400 text-xs ml-auto">{p.player?.pos}</span>
                </div>
              ))}
            </div>
          </div>

          {team.substitutes?.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs uppercase font-semibold mb-3">{t('liveMatch.substitutes')}</p>
              <div className="space-y-2">
                {team.substitutes.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-7 h-7 bg-gray-50 rounded-full flex items-center justify-center text-xs font-bold text-gray-400">
                      {p.player?.number}
                    </span>
                    <span className="text-gray-500">{p.player?.name}</span>
                    <span className="text-gray-300 text-xs ml-auto">{p.player?.pos}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
