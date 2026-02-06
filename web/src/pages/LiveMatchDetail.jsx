import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import footballApi from '../api/footballApi';

const TABS = ['Overview', 'Stats', 'Events', 'Lineups'];

export default function LiveMatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fixture, setFixture] = useState(null);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [lineups, setLineups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
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

      const data = await api.aiChat(prompt);
      setAiAnalysis(data.response);
    } catch (e) {
      console.error(e);
      setAiAnalysis('Failed to get live analysis. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
            <p className="text-white/60">Loading live match...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!fixture) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-white/60 mb-4">Match not found</p>
          <button onClick={() => navigate(-1)} className="text-primary-400">Go back</button>
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
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Header */}
        <div className="relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-transparent to-blue-600/20"/>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"/>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}/>

          <div className="relative px-5 pt-4 pb-6">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full backdrop-blur">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
                </svg>
              </button>

              <div className="flex items-center gap-2">
                {fixture.league?.logo && (
                  <img src={fixture.league.logo} alt="" className="w-6 h-6 object-contain"/>
                )}
                <span className="text-white/80 text-sm font-medium">{fixture.league?.name}</span>
              </div>

              {/* Live indicator */}
              {!isFinished && (
                <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-full backdrop-blur">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"/>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"/>
                  </span>
                  <span className="text-red-400 text-xs font-bold">LIVE</span>
                </div>
              )}
              {isFinished && (
                <div className="bg-gray-500/20 px-3 py-1.5 rounded-full backdrop-blur">
                  <span className="text-gray-400 text-xs font-bold">FT</span>
                </div>
              )}
            </div>

            {/* Score Card */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="flex items-center justify-between">
                {/* Home Team */}
                <div className="flex-1 text-center">
                  <div className="w-20 h-20 mx-auto mb-3 bg-white/10 rounded-2xl p-3 backdrop-blur">
                    {home?.logo && <img src={home.logo} alt="" className="w-full h-full object-contain"/>}
                  </div>
                  <p className="text-white font-bold text-sm truncate px-2">{home?.name}</p>
                </div>

                {/* Score */}
                <div className="px-6 text-center">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl font-black text-white">{homeGoals}</span>
                    <span className="text-2xl text-white/30">-</span>
                    <span className="text-5xl font-black text-white">{awayGoals}</span>
                  </div>

                  {/* Minute */}
                  <div className="mt-3">
                    {isHalfTime ? (
                      <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full text-sm font-bold">
                        HT
                      </span>
                    ) : isFinished ? (
                      <span className="inline-flex items-center gap-1.5 bg-gray-500/20 text-gray-400 px-4 py-1.5 rounded-full text-sm font-bold">
                        Full Time
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-red-500/20 text-red-400 px-4 py-1.5 rounded-full text-sm font-bold animate-pulse">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"/>
                        {elapsed}'
                      </span>
                    )}
                  </div>
                </div>

                {/* Away Team */}
                <div className="flex-1 text-center">
                  <div className="w-20 h-20 mx-auto mb-3 bg-white/10 rounded-2xl p-3 backdrop-blur">
                    {away?.logo && <img src={away.logo} alt="" className="w-full h-full object-contain"/>}
                  </div>
                  <p className="text-white font-bold text-sm truncate px-2">{away?.name}</p>
                </div>
              </div>

              {/* Quick Stats Row */}
              {stats?.length >= 2 && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <QuickStats stats={stats} />
                </div>
              )}
            </div>

            {/* Last Update */}
            <p className="text-center text-white/30 text-xs mt-3">
              Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refresh every 30s
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-lg border-b border-white/10">
          <div className="flex">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all relative ${
                  activeTab === tab ? 'text-white' : 'text-white/40'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full"/>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4 pb-8">
          {activeTab === 'Overview' && (
            <OverviewTab
              fixture={fixture}
              stats={stats}
              events={events}
              aiAnalysis={aiAnalysis}
              analyzing={analyzing}
              getLiveAnalysis={getLiveAnalysis}
              user={user}
              isFinished={isFinished}
            />
          )}
          {activeTab === 'Stats' && (
            <StatsTab stats={stats} home={home} away={away} />
          )}
          {activeTab === 'Events' && (
            <EventsTab events={events} home={home} away={away} />
          )}
          {activeTab === 'Lineups' && (
            <LineupsTab lineups={lineups} />
          )}
        </div>
      </div>
    </div>
  );
}

// Quick Stats in Header
function QuickStats({ stats }) {
  const homePoss = stats[0]?.statistics?.find(s => s.type === 'Ball Possession')?.value || '50%';
  const awayPoss = stats[1]?.statistics?.find(s => s.type === 'Ball Possession')?.value || '50%';
  const homeShots = stats[0]?.statistics?.find(s => s.type === 'Total Shots')?.value || 0;
  const awayShots = stats[1]?.statistics?.find(s => s.type === 'Total Shots')?.value || 0;
  const homeOnTarget = stats[0]?.statistics?.find(s => s.type === 'Shots on Goal')?.value || 0;
  const awayOnTarget = stats[1]?.statistics?.find(s => s.type === 'Shots on Goal')?.value || 0;

  return (
    <div className="grid grid-cols-3 gap-4 text-center">
      <div>
        <div className="flex items-center justify-center gap-2 text-white font-bold">
          <span>{homePoss}</span>
          <span className="text-white/30">-</span>
          <span>{awayPoss}</span>
        </div>
        <p className="text-white/40 text-xs mt-1">Possession</p>
      </div>
      <div>
        <div className="flex items-center justify-center gap-2 text-white font-bold">
          <span>{homeShots}</span>
          <span className="text-white/30">-</span>
          <span>{awayShots}</span>
        </div>
        <p className="text-white/40 text-xs mt-1">Shots</p>
      </div>
      <div>
        <div className="flex items-center justify-center gap-2 text-white font-bold">
          <span>{homeOnTarget}</span>
          <span className="text-white/30">-</span>
          <span>{awayOnTarget}</span>
        </div>
        <p className="text-white/40 text-xs mt-1">On Target</p>
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ fixture, stats, events, aiAnalysis, analyzing, getLiveAnalysis, user, isFinished }) {
  const recentEvents = events.slice(-5).reverse();

  return (
    <>
      {/* AI Live Analysis */}
      <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-2xl p-5 border border-white/10 backdrop-blur">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-white font-bold">AI Live Analysis</h3>
            <p className="text-white/50 text-xs">Real-time match insights</p>
          </div>
        </div>

        {aiAnalysis ? (
          <div className="bg-white/5 rounded-xl p-4 text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
            {aiAnalysis.split('\n').map((line, i) => {
              const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
              return <p key={i} className={line === '' ? 'h-2' : ''} dangerouslySetInnerHTML={{ __html: bold }}/>;
            })}
          </div>
        ) : (
          <button
            onClick={getLiveAnalysis}
            disabled={analyzing}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Analyzing match...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                </svg>
                Get {isFinished ? 'Post-Match' : 'Live'} Analysis
              </>
            )}
          </button>
        )}

        {!aiAnalysis && (
          <p className="text-white/30 text-xs text-center mt-3">
            Uses 1 of your {user?.daily_limit || 10} daily AI requests
          </p>
        )}
      </div>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd"/>
            </svg>
            Recent Events
          </h3>
          <div className="space-y-3">
            {recentEvents.map((event, i) => (
              <EventItem key={i} event={event} />
            ))}
          </div>
          <button
            onClick={() => {}}
            className="w-full mt-4 py-2 text-white/50 text-sm hover:text-white/70 transition"
          >
            View all events →
          </button>
        </div>
      )}

      {/* Match Momentum */}
      {stats?.length >= 2 && (
        <MomentumCard stats={stats} />
      )}
    </>
  );
}

// Event Item
function EventItem({ event }) {
  const getEventIcon = (type, detail) => {
    if (type === 'Goal') {
      return detail === 'Own Goal'
        ? <span className="text-red-400">⚽</span>
        : <span className="text-green-400">⚽</span>;
    }
    if (type === 'Card') {
      return detail === 'Yellow Card'
        ? <span className="w-3 h-4 bg-yellow-400 rounded-sm"/>
        : <span className="w-3 h-4 bg-red-500 rounded-sm"/>;
    }
    if (type === 'subst') {
      return <span className="text-blue-400">⇄</span>;
    }
    if (type === 'Var') {
      return <span className="text-purple-400">VAR</span>;
    }
    return <span className="text-white/40">•</span>;
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="w-8 text-white/50 text-sm font-mono">{event.time?.elapsed}'</span>
      <span className="w-6 flex items-center justify-center">
        {getEventIcon(event.type, event.detail)}
      </span>
      <div className="flex-1">
        <p className="text-white text-sm font-medium">{event.player?.name}</p>
        <p className="text-white/40 text-xs">
          {event.team?.name} {event.assist?.name && `• Assist: ${event.assist.name}`}
        </p>
      </div>
    </div>
  );
}

// Momentum Card
function MomentumCard({ stats }) {
  const homeDanger = parseInt(stats[0]?.statistics?.find(s => s.type === 'Dangerous Attacks')?.value) || 0;
  const awayDanger = parseInt(stats[1]?.statistics?.find(s => s.type === 'Dangerous Attacks')?.value) || 0;
  const total = homeDanger + awayDanger || 1;
  const homePct = Math.round((homeDanger / total) * 100);

  return (
    <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur">
      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.53 5.47a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72v5.69a.75.75 0 001.5 0v-5.69l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd"/>
        </svg>
        Match Momentum
      </h3>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-blue-400 font-semibold">{homePct}%</span>
          <span className="text-white/40">Dangerous Attacks</span>
          <span className="text-red-400 font-semibold">{100 - homePct}%</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden flex">
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
function StatsTab({ stats, home, away }) {
  if (!stats?.length) {
    return (
      <div className="bg-white/5 rounded-2xl p-8 text-center border border-white/10">
        <svg className="w-12 h-12 mx-auto text-white/20 mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z"/>
        </svg>
        <p className="text-white/50 font-medium">Statistics not available yet</p>
        <p className="text-white/30 text-sm mt-1">Stats will appear as the match progresses</p>
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
    <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <img src={home?.logo} alt="" className="w-6 h-6 object-contain"/>
          <span className="text-white/70 text-xs font-medium">{home?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-xs font-medium">{away?.name}</span>
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
        <span className="font-semibold text-white">{displayHome}</span>
        <span className="text-white/40 text-xs">{label}</span>
        <span className="font-semibold text-white">{displayAway}</span>
      </div>
      <div className="flex h-2 gap-1">
        <div className="flex-1 bg-white/10 rounded-full overflow-hidden flex justify-end">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${hPct}%` }}
          />
        </div>
        <div className="flex-1 bg-white/10 rounded-full overflow-hidden">
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
function EventsTab({ events, home, away }) {
  if (!events?.length) {
    return (
      <div className="bg-white/5 rounded-2xl p-8 text-center border border-white/10">
        <svg className="w-12 h-12 mx-auto text-white/20 mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p className="text-white/50 font-medium">No events yet</p>
        <p className="text-white/30 text-sm mt-1">Match events will appear here</p>
      </div>
    );
  }

  const groupedEvents = events.reduce((acc, event) => {
    const period = event.time?.elapsed <= 45 ? '1st Half' : '2nd Half';
    if (!acc[period]) acc[period] = [];
    acc[period].push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(groupedEvents).map(([period, periodEvents]) => (
        <div key={period} className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur">
          <h3 className="text-white/50 text-xs font-semibold uppercase mb-4">{period}</h3>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[39px] top-0 bottom-0 w-0.5 bg-white/10"/>

            <div className="space-y-4">
              {periodEvents.map((event, i) => (
                <TimelineEvent key={i} event={event} home={home} away={away} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineEvent({ event, home, away }) {
  const isHome = event.team?.id === home?.id;

  const getEventStyle = (type, detail) => {
    if (type === 'Goal') {
      return {
        bg: detail === 'Own Goal' ? 'bg-red-500' : 'bg-green-500',
        icon: '⚽',
        text: detail === 'Own Goal' ? 'Own Goal' : 'GOAL!'
      };
    }
    if (type === 'Card') {
      return {
        bg: detail === 'Yellow Card' ? 'bg-yellow-400' : 'bg-red-500',
        icon: '',
        text: detail
      };
    }
    if (type === 'subst') {
      return { bg: 'bg-blue-500', icon: '⇄', text: 'Substitution' };
    }
    if (type === 'Var') {
      return { bg: 'bg-purple-500', icon: '', text: 'VAR Decision' };
    }
    return { bg: 'bg-white/20', icon: '•', text: type };
  };

  const style = getEventStyle(event.type, event.detail);

  return (
    <div className="flex items-start gap-3">
      <span className="w-8 text-white/50 text-sm font-mono pt-1">{event.time?.elapsed}'</span>
      <div className={`w-4 h-4 ${style.bg} rounded-full flex items-center justify-center text-[10px] z-10`}>
        {style.icon}
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2">
          <img src={event.team?.logo} alt="" className="w-4 h-4 object-contain"/>
          <span className="text-white font-semibold text-sm">{event.player?.name}</span>
        </div>
        <p className="text-white/40 text-xs mt-0.5">
          {style.text}
          {event.assist?.name && ` • Assist: ${event.assist.name}`}
        </p>
      </div>
    </div>
  );
}

// Lineups Tab
function LineupsTab({ lineups }) {
  if (!lineups?.length) {
    return (
      <div className="bg-white/5 rounded-2xl p-8 text-center border border-white/10">
        <svg className="w-12 h-12 mx-auto text-white/20 mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
        </svg>
        <p className="text-white/50 font-medium">Lineups not available yet</p>
        <p className="text-white/30 text-sm mt-1">Usually appear ~1 hour before kick-off</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lineups.map((team, idx) => (
        <div key={idx} className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur">
          <div className="flex items-center gap-3 mb-4">
            <img src={team.team?.logo} alt="" className="w-8 h-8 object-contain"/>
            <div>
              <h3 className="text-white font-bold">{team.team?.name}</h3>
              <p className="text-white/40 text-xs">{team.formation}</p>
            </div>
          </div>

          {team.coach?.name && (
            <div className="flex items-center gap-2 mb-4 text-sm text-white/50">
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded">Coach</span>
              <span>{team.coach.name}</span>
            </div>
          )}

          <div className="mb-4">
            <p className="text-white/30 text-xs uppercase font-semibold mb-3">Starting XI</p>
            <div className="space-y-2">
              {team.startXI?.map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold text-white/70">
                    {p.player?.number}
                  </span>
                  <span className="text-white">{p.player?.name}</span>
                  <span className="text-white/30 text-xs ml-auto">{p.player?.pos}</span>
                </div>
              ))}
            </div>
          </div>

          {team.substitutes?.length > 0 && (
            <div>
              <p className="text-white/30 text-xs uppercase font-semibold mb-3">Substitutes</p>
              <div className="space-y-2">
                {team.substitutes.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-7 h-7 bg-white/5 rounded-full flex items-center justify-center text-xs font-bold text-white/40">
                      {p.player?.number}
                    </span>
                    <span className="text-white/60">{p.player?.name}</span>
                    <span className="text-white/20 text-xs ml-auto">{p.player?.pos}</span>
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
