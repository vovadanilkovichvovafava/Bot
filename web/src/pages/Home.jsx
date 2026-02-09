import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import footballApi from '../api/footballApi';
import { getStats } from '../services/predictionStore';
import { BOOKMAKER } from '../components/SupportChat';

// Top leagues to show on home
const TOP_LEAGUE_IDS = [39, 140, 135, 78, 61, 2, 3];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { user, isDemo } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localStats, setLocalStats] = useState({ total: 0, correct: 0, wrong: 0, pending: 0, accuracy: 0 });

  useEffect(() => {
    loadMatches();
    setLocalStats(getStats());
  }, []);

  const loadMatches = async () => {
    try {
      const fixtures = await footballApi.getTodayFixtures();
      // Prioritize top leagues and upcoming matches
      const upcoming = fixtures
        .filter(f => ['NS', '1H', '2H', 'HT'].includes(f.fixture.status.short))
        .sort((a, b) => {
          // Top leagues first
          const aTop = TOP_LEAGUE_IDS.includes(a.league.id) ? 0 : 1;
          const bTop = TOP_LEAGUE_IDS.includes(b.league.id) ? 0 : 1;
          if (aTop !== bTop) return aTop - bTop;
          // Then by time
          return new Date(a.fixture.date) - new Date(b.fixture.date);
        });
      setMatches(upcoming.slice(0, 5));
    } catch (e) {
      console.error('Failed to load matches', e);
    } finally {
      setLoading(false);
    }
  };

  const remaining = user ? (user.daily_limit - user.daily_requests + user.bonus_predictions) : 10;

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white px-5 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-primary-100 text-sm">{getGreeting()}</p>
            <h1 className="text-2xl font-bold">{user?.username || user?.email?.split('@')[0] || 'User'}</h1>
          </div>
          <button onClick={() => navigate('/settings')} className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </button>
        </div>

        {/* Predictions counter */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
            </div>
            <div>
              <p className="text-primary-100 text-xs">AI Predictions Left Today</p>
              <p className="text-2xl font-bold">{remaining}<span className="text-sm text-primary-200">/ {user?.daily_limit || 10}</span></p>
            </div>
          </div>
          {!user?.is_premium && (
            <button onClick={() => navigate('/pro-tools')} className="bg-accent-gold text-white text-xs font-bold px-3 py-1.5 rounded-lg">
              Get Unlimited
            </button>
          )}
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-4">
        {/* AI Assistant Card */}
        <div
          onClick={() => navigate('/ai-chat')}
          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400 rounded-2xl p-5 text-white cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">Ask AI Assistant</h3>
                <p className="text-white/80 text-sm">Get predictions, tips & match analysis</p>
              </div>
            </div>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
            </svg>
          </div>
        </div>

        {/* Partner Banner - Balanced promo */}
        <a
          href={BOOKMAKER.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-3.5 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-xl">🎯</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Bonus {BOOKMAKER.bonus}</p>
              <p className="text-white/60 text-xs">Bet on AI predictions at {BOOKMAKER.name}</p>
            </div>
            <svg className="w-5 h-5 text-white/40 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
            </svg>
          </div>
        </a>

        {/* Stats */}
        <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/your-stats')}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Your Stats</h3>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
            </svg>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="w-8 h-8 mx-auto mb-1 text-primary-500 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900">{localStats.total}</p>
              <p className="text-xs text-gray-500">Predictions</p>
            </div>
            <div>
              <div className="w-8 h-8 mx-auto mb-1 text-green-500 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p className="text-2xl font-bold text-green-500">{localStats.correct}</p>
              <p className="text-xs text-gray-500">Wins</p>
            </div>
            <div>
              <div className="w-8 h-8 mx-auto mb-1 text-red-500 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
                </svg>
              </div>
              <p className="text-2xl font-bold text-red-500">{localStats.accuracy}%</p>
              <p className="text-xs text-gray-500">Accuracy</p>
            </div>
          </div>
          {localStats.pending > 0 && (
            <p className="text-xs text-amber-600 text-center mt-2">{localStats.pending} pending verification</p>
          )}
        </div>

        {/* Beginner Guide */}
        <div
          onClick={() => navigate('/guide')}
          className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 flex items-center gap-4 cursor-pointer border border-gray-100"
        >
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-xl">📚</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">Beginner's Guide</p>
            <p className="text-xs text-gray-500">10 tips to get started</p>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
          </svg>
        </div>

        {/* Pro Tools */}
        <div>
          <h3 className="section-title mb-3">Pro Tools</h3>
          <div className="grid grid-cols-3 gap-3">
            <div onClick={() => navigate('/matches')} className="card text-center cursor-pointer hover:shadow-md transition-shadow py-5">
              <div className="w-10 h-10 mx-auto mb-2 bg-green-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-700">Matches</p>
            </div>
            <div onClick={() => navigate(user?.is_premium ? '/value-finder' : '/pro-tools')} className="card text-center cursor-pointer hover:shadow-md transition-shadow py-5 relative">
              {!user?.is_premium && <span className="badge-pro absolute -top-2 right-1">PRO</span>}
              <div className="w-10 h-10 mx-auto mb-2 bg-purple-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-700">Value Finder</p>
            </div>
            <div onClick={() => navigate('/pro-tools')} className="card text-center cursor-pointer hover:shadow-md transition-shadow py-5 relative">
              <span className="badge-pro absolute -top-2 right-1">PRO</span>
              <div className="w-10 h-10 mx-auto mb-2 bg-blue-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-700">Bankroll</p>
            </div>
          </div>
        </div>

        {/* Today's Matches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">Today's Matches</h3>
            <button onClick={() => navigate('/matches')} className="text-primary-600 text-sm font-medium flex items-center gap-1">
              See All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="card">
                  <div className="shimmer h-4 w-24 mb-3"/>
                  <div className="flex justify-between">
                    <div className="shimmer h-4 w-32"/>
                    <div className="shimmer h-4 w-8"/>
                    <div className="shimmer h-4 w-32"/>
                  </div>
                </div>
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">No matches scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((f) => (
                <HomeMatchCard key={f.fixture.id} fixture={f} navigate={navigate} />
              ))}
            </div>
          )}
        </div>

        <div className="h-4"/>
      </div>
    </div>
  );
}

function HomeMatchCard({ fixture, navigate }) {
  const f = fixture;
  const time = new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isLive = ['1H', '2H', 'HT'].includes(f.fixture.status.short);

  return (
    <div
      onClick={() => navigate(`/match/${f.fixture.id}`)}
      className="card cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img src={f.league.logo} alt="" className="w-4 h-4 object-contain"/>
          <span className="badge-league text-[10px]">{f.league.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isLive && <span className="badge-live">Live</span>}
          <span className="text-sm text-gray-500">{time}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1 text-center">
          <img src={f.teams.home.logo} alt="" className="w-10 h-10 mx-auto mb-1 object-contain"/>
          <p className="font-medium text-xs text-gray-900 leading-tight truncate px-1">{f.teams.home.name}</p>
        </div>

        <div className="px-3 text-center">
          {isLive ? (
            <span className="text-lg font-bold text-gray-900">
              {f.goals?.home ?? 0} - {f.goals?.away ?? 0}
            </span>
          ) : (
            <span className="text-gray-400 font-semibold">VS</span>
          )}
        </div>

        <div className="flex-1 text-center">
          <img src={f.teams.away.logo} alt="" className="w-10 h-10 mx-auto mb-1 object-contain"/>
          <p className="font-medium text-xs text-gray-900 leading-tight truncate px-1">{f.teams.away.name}</p>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); navigate(`/match/${f.fixture.id}`); }}
        className="mt-3 w-full py-2 text-primary-600 text-sm font-medium bg-primary-50 rounded-xl flex items-center justify-center gap-1"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
        </svg>
        AI Analysis
      </button>
    </div>
  );
}
