import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdvertiser } from '../context/AdvertiserContext';
import footballApi from '../api/footballApi';
import { getStats } from '../services/predictionStore';

const FREE_AI_LIMIT = 3;
const AI_REQUESTS_KEY = 'ai_requests_count';
const VALUE_BET_USED_KEY = 'value_bet_used';

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
  const { advertiser, trackClick } = useAdvertiser();
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

  const isPremium = user?.is_premium;
  const aiRequestCount = parseInt(localStorage.getItem(AI_REQUESTS_KEY) || '0', 10);
  const remaining = isPremium ? 999 : Math.max(0, FREE_AI_LIMIT - aiRequestCount);
  const valueBetUsed = localStorage.getItem(VALUE_BET_USED_KEY) === 'true';

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
              <p className="text-primary-100 text-xs">AI Predictions Left</p>
              <p className="text-2xl font-bold">{isPremium ? '∞' : remaining}<span className="text-sm text-primary-200">{isPremium ? '' : ` / ${FREE_AI_LIMIT}`}</span></p>
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

        {/* Featured Match Promo Banner - Moved higher for visibility */}
        <FeaturedMatchBanner
          matches={matches}
          advertiser={advertiser}
          trackClick={trackClick}
          userId={user?.id}
        />

        {/* Value Bet Finder - Main Hook */}
        <div
          onClick={() => navigate(isPremium || !valueBetUsed ? '/value-finder' : '/pro-tools')}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
              </svg>
            </div>
            {!isPremium && !valueBetUsed && (
              <span className="bg-green-400 text-green-900 text-xs font-bold px-2 py-1 rounded-full">
                1 FREE TRY
              </span>
            )}
            {!isPremium && valueBetUsed && (
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                </svg>
                PRO
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold text-white mb-2">Value Bet Finder</h3>
          <p className="text-white/80 text-sm mb-4">
            AI finds bets where actual probability is higher than bookmaker odds. Professional bettors' secret.
          </p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-white font-bold text-lg">87%</p>
              <p className="text-white/60 text-xs">Accuracy</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-white font-bold text-lg">+12%</p>
              <p className="text-white/60 text-xs">Avg. Edge</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-white font-bold text-lg">50+</p>
              <p className="text-white/60 text-xs">Daily Bets</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {isPremium ? 'Unlimited scans' : valueBetUsed ? 'Deposit to unlock' : 'Try it free now!'}
            </div>
            <div className="bg-white text-blue-600 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1">
              {isPremium || !valueBetUsed ? 'Find Value Bets' : 'Unlock'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </div>
          </div>
        </div>

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
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
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
  const time = new Date(f.fixture.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const isLive = ['1H', '2H', 'HT'].includes(f.fixture.status.short);

  return (
    <div
      onClick={() => navigate(`/match/${f.fixture.id}`)}
      className="bg-white cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
    >
      <div className="flex items-center py-3 px-4">
        {/* Teams column */}
        <div className="flex-1 min-w-0">
          {/* Home team */}
          <div className="flex items-center gap-2.5 mb-1.5">
            <img
              src={f.teams.home.logo}
              alt=""
              className="w-5 h-5 object-contain flex-shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="text-sm text-gray-900 truncate">{f.teams.home.name}</span>
          </div>
          {/* Away team */}
          <div className="flex items-center gap-2.5">
            <img
              src={f.teams.away.logo}
              alt=""
              className="w-5 h-5 object-contain flex-shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="text-sm text-gray-900 truncate">{f.teams.away.name}</span>
          </div>
        </div>

        {/* Time/Score column */}
        <div className="flex-shrink-0 text-right ml-3">
          {isLive ? (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm font-bold text-gray-900">{f.goals?.home ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-gray-900">{f.goals?.away ?? 0}</span>
              </div>
              <span className="text-[10px] text-red-500 font-medium mt-0.5">LIVE</span>
            </div>
          ) : (
            <span className="text-sm text-gray-500">{time}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Team colors database - primary and secondary/away colors
const TEAM_COLORS = {
  // Premier League
  42: { primary: '#EF0107', secondary: '#063672', name: 'Arsenal' }, // Red / Navy
  49: { primary: '#034694', secondary: '#DBA111', name: 'Chelsea' }, // Blue / Gold
  40: { primary: '#C8102E', secondary: '#00B2A9', name: 'Liverpool' }, // Red / Teal
  33: { primary: '#DA291C', secondary: '#FBE122', name: 'Manchester United' }, // Red / Yellow
  50: { primary: '#6CABDD', secondary: '#1C2C5B', name: 'Manchester City' }, // Sky Blue / Navy
  47: { primary: '#132257', secondary: '#FFFFFF', name: 'Tottenham' }, // Navy / White
  48: { primary: '#7A263A', secondary: '#95BFE5', name: 'West Ham' }, // Claret / Blue
  55: { primary: '#241F20', secondary: '#F5C400', name: 'Brentford' }, // Black-Red / Gold
  51: { primary: '#0057B8', secondary: '#FFFFFF', name: 'Brighton' }, // Blue / White
  52: { primary: '#0E63AD', secondary: '#EFE230', name: 'Crystal Palace' }, // Blue-Red / Yellow
  36: { primary: '#003399', secondary: '#FFFFFF', name: 'Fulham' }, // White / Navy
  45: { primary: '#003090', secondary: '#FBEE23', name: 'Everton' }, // Blue / Yellow
  66: { primary: '#1B458F', secondary: '#FDB913', name: 'Aston Villa' }, // Claret-Blue / Yellow
  39: { primary: '#6C1D45', secondary: '#99D6EA', name: 'Wolves' }, // Gold / Black
  34: { primary: '#FDB913', secondary: '#231F20', name: 'Newcastle' }, // Black-White / Yellow
  46: { primary: '#003399', secondary: '#FEF200', name: 'Leicester' }, // Blue / Yellow
  35: { primary: '#DA020E', secondary: '#0A4595', name: 'Bournemouth' }, // Red / Blue
  41: { primary: '#ED1A3B', secondary: '#63666A', name: 'Southampton' }, // Red / Gray
  65: { primary: '#99D6EA', secondary: '#F9EC34', name: 'Nott\'m Forest' }, // Red / Yellow
  57: { primary: '#E03A3E', secondary: '#1C2D5A', name: 'Ipswich Town' }, // Blue / White

  // La Liga
  529: { primary: '#A50044', secondary: '#EDBB00', name: 'Barcelona' }, // Blaugrana / Gold
  541: { primary: '#FEBE10', secondary: '#00529F', name: 'Real Madrid' }, // White / Purple
  530: { primary: '#CB3524', secondary: '#FFFFFF', name: 'Atletico Madrid' }, // Red-White / Blue
  532: { primary: '#005BBB', secondary: '#FDB913', name: 'Valencia' }, // White / Orange
  533: { primary: '#FECB09', secondary: '#0067B1', name: 'Villarreal' }, // Yellow / Blue
  536: { primary: '#0067B1', secondary: '#CE1126', name: 'Sevilla' }, // Red-White / Blue
  543: { primary: '#005BBB', secondary: '#CE1126', name: 'Real Betis' }, // Green-White / Gold
  531: { primary: '#CE1126', secondary: '#FFFFFF', name: 'Athletic Bilbao' }, // Red-White / Black
  548: { primary: '#00529F', secondary: '#FFFFFF', name: 'Real Sociedad' }, // Blue-White / Gold
  546: { primary: '#FECB09', secondary: '#0050A0', name: 'Getafe' }, // Blue / Yellow

  // Serie A
  489: { primary: '#000000', secondary: '#0068A8', name: 'AC Milan' }, // Red-Black / White
  505: { primary: '#0068A8', secondary: '#000000', name: 'Inter' }, // Blue-Black / White
  496: { primary: '#000000', secondary: '#FF8C00', name: 'Juventus' }, // Black-White / Gold
  492: { primary: '#7B1FA2', secondary: '#FFFFFF', name: 'Napoli' }, // Blue / White
  487: { primary: '#6B1FA2', secondary: '#FECB09', name: 'Lazio' }, // Sky Blue / White
  497: { primary: '#7B1FA2', secondary: '#FECB09', name: 'Roma' }, // Red-Yellow / Gray
  499: { primary: '#000000', secondary: '#FFFFFF', name: 'Atalanta' }, // Blue-Black / Orange
  502: { primary: '#A020F0', secondary: '#FFFFFF', name: 'Fiorentina' }, // Purple / White
  503: { primary: '#000000', secondary: '#FFCC00', name: 'Torino' }, // Maroon / White
  504: { primary: '#A50024', secondary: '#1C39BB', name: 'Verona' }, // Yellow-Blue / White

  // Bundesliga
  157: { primary: '#DC052D', secondary: '#0066B2', name: 'Bayern Munich' }, // Red / White-Blue
  165: { primary: '#FDE100', secondary: '#000000', name: 'Borussia Dortmund' }, // Yellow / Black
  173: { primary: '#E32221', secondary: '#FFFFFF', name: 'RB Leipzig' }, // Red / White
  169: { primary: '#ED1C24', secondary: '#000000', name: 'Eintracht Frankfurt' }, // Red / Black
  168: { primary: '#005CA9', secondary: '#FFFFFF', name: 'Bayer Leverkusen' }, // Red-Black / White
  167: { primary: '#1E5631', secondary: '#FFFFFF', name: 'Wolfsburg' }, // Green / White
  163: { primary: '#004D9D', secondary: '#FFFFFF', name: 'Schalke' }, // Blue / White
  172: { primary: '#1D428A', secondary: '#FFFFFF', name: 'Hoffenheim' }, // Blue / White
  162: { primary: '#00966E', secondary: '#FFFFFF', name: 'Werder Bremen' }, // Green / White
  161: { primary: '#E2001A', secondary: '#FFFFFF', name: 'Mainz' }, // Red / White
  160: { primary: '#BA0C2F', secondary: '#FFFFFF', name: 'Freiburg' }, // Red / White
  159: { primary: '#1E3264', secondary: '#FFFFFF', name: 'Hertha Berlin' }, // Blue-White / Navy
  170: { primary: '#E30613', secondary: '#FFFFFF', name: 'Stuttgart' }, // Red / White
  164: { primary: '#CE1719', secondary: '#FFFFFF', name: 'Augsburg' }, // Red / White
  176: { primary: '#005F3B', secondary: '#FFFFFF', name: 'Gladbach' }, // Green / White
  166: { primary: '#0066B2', secondary: '#FFFFFF', name: 'Hamburg' }, // Blue / White

  // Ligue 1
  85: { primary: '#004170', secondary: '#DA291C', name: 'PSG' }, // Navy-Red / White
  91: { primary: '#ED1C24', secondary: '#034694', name: 'Monaco' }, // Red-White / Blue
  80: { primary: '#0077C0', secondary: '#F4B223', name: 'Lyon' }, // Blue / White-Gold
  81: { primary: '#2FAEE0', secondary: '#FFFFFF', name: 'Marseille' }, // Sky Blue / White
  79: { primary: '#E4002B', secondary: '#000000', name: 'Lille' }, // Red / White
  93: { primary: '#DA1A35', secondary: '#FFFFFF', name: 'Reims' }, // Red / White
  95: { primary: '#E5322E', secondary: '#FFFFFF', name: 'Rennes' }, // Red-Black / White
  84: { primary: '#009E60', secondary: '#FFFFFF', name: 'Nice' }, // Red-Black / White
  94: { primary: '#FCDD09', secondary: '#009E60', name: 'Nantes' }, // Yellow-Green / White
  82: { primary: '#005BAC', secondary: '#FFFFFF', name: 'Strasbourg' }, // Blue / White

  // Other notable teams
  211: { primary: '#005DAA', secondary: '#FFFFFF', name: 'Benfica' }, // Red / White
  212: { primary: '#006BB6', secondary: '#FFFFFF', name: 'Porto' }, // Blue-White / White
  228: { primary: '#006847', secondary: '#FF0000', name: 'Sporting CP' }, // Green / White
  194: { primary: '#EE2737', secondary: '#FFFFFF', name: 'Ajax' }, // Red-White / Black
  197: { primary: '#F58220', secondary: '#000000', name: 'PSV' }, // Red-White / Yellow
  209: { primary: '#EE2737', secondary: '#FFFFFF', name: 'Feyenoord' }, // Red-White / White
  165: { primary: '#FFE600', secondary: '#000000', name: 'Dortmund' }, // Yellow / Black
  292: { primary: '#003DA5', secondary: '#FFFFFF', name: 'Rangers' }, // Blue / White
  247: { primary: '#007749', secondary: '#FFFFFF', name: 'Celtic' }, // Green-White / Yellow
};

// Default colors for teams without mapping
const DEFAULT_HOME_COLOR = '#3B82F6'; // Blue
const DEFAULT_AWAY_COLOR = '#EF4444'; // Red

// Get team color, with fallback
function getTeamColor(teamId, isAway = false) {
  const team = TEAM_COLORS[teamId];
  if (team) {
    return isAway ? team.secondary : team.primary;
  }
  return isAway ? DEFAULT_AWAY_COLOR : DEFAULT_HOME_COLOR;
}

// Check if two colors are similar (within threshold)
function colorsSimilar(color1, color2) {
  // Simple check - compare hex values
  const normalize = (c) => c?.toLowerCase().replace('#', '') || '';
  const c1 = normalize(color1);
  const c2 = normalize(color2);

  if (c1 === c2) return true;

  // Convert to RGB and check distance
  const hexToRgb = (hex) => {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
  };

  try {
    const rgb1 = hexToRgb(c1);
    const rgb2 = hexToRgb(c2);
    const distance = Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );
    return distance < 80; // Colors are similar if distance < 80
  } catch {
    return false;
  }
}

// Get colors for both teams, ensuring contrast
function getMatchColors(homeTeamId, awayTeamId) {
  let homeColor = getTeamColor(homeTeamId, false);
  let awayColor = getTeamColor(awayTeamId, false);

  // If primary colors are similar, use secondary for away team
  if (colorsSimilar(homeColor, awayColor)) {
    awayColor = getTeamColor(awayTeamId, true);

    // If still similar, use secondary for home team instead
    if (colorsSimilar(homeColor, awayColor)) {
      homeColor = getTeamColor(homeTeamId, true);
    }
  }

  return { homeColor, awayColor };
}

// Featured Match Promo Banner with team logos and diagonal split
function FeaturedMatchBanner({ matches, advertiser, trackClick, userId }) {
  // Get the first match from top leagues as featured match
  const featuredMatch = matches?.[0];

  // Get localized texts from advertiser config
  const texts = advertiser.texts || {
    freeBet: `Free bet up to ${advertiser.bonusAmount || '€1,500'}`,
    betOnMatch: 'Bet on any match',
    ctaButton: `Get ${advertiser.bonusAmount || '€1,500'}`,
    promoTitle: `${advertiser.bonusAmount || '€1,500'} free bet on this match!`,
    promoCta: 'Place bet',
  };

  const link = userId ? trackClick(userId) : advertiser.link;

  // If we have a featured match, show it with team colors diagonal split
  if (featuredMatch) {
    const f = featuredMatch;
    const { homeColor, awayColor } = getMatchColors(f.teams.home.id, f.teams.away.id);

    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative overflow-hidden rounded-2xl text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
        style={{ minHeight: '140px' }}
      >
        {/* Diagonal split background */}
        <div className="absolute inset-0">
          {/* Home team color - left side */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: homeColor,
              clipPath: 'polygon(0 0, 65% 0, 35% 100%, 0 100%)'
            }}
          />
          {/* Away team color - right side */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: awayColor,
              clipPath: 'polygon(65% 0, 100% 0, 100% 100%, 35% 100%)'
            }}
          />
          {/* Diagonal line separator */}
          <div
            className="absolute inset-0 bg-white/30"
            style={{
              clipPath: 'polygon(63% 0, 67% 0, 37% 100%, 33% 100%)'
            }}
          />
        </div>

        {/* Animated shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full" style={{animation: 'shine 3s infinite'}}/>

        {/* Sparkle decoration */}
        <div className="absolute top-2 right-3 text-yellow-200 animate-pulse text-lg">✨</div>

        {/* Content */}
        <div className="relative flex items-center justify-between h-full p-4" style={{ minHeight: '140px' }}>
          {/* Home team - left side */}
          <div className="flex flex-col items-center gap-1 z-10 w-20">
            <div className="w-16 h-16 bg-white/90 rounded-xl p-2 flex items-center justify-center shadow-lg">
              <img
                src={f.teams.home.logo}
                alt={f.teams.home.name}
                className="w-full h-full object-contain"
                onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }}
              />
            </div>
            <span className="text-xs font-bold text-white text-center leading-tight drop-shadow-lg max-w-[80px] truncate">
              {f.teams.home.name}
            </span>
          </div>

          {/* Center - Promo text */}
          <div className="flex-1 flex flex-col items-center justify-center z-10 px-2">
            <span className="text-white/80 font-bold text-xs mb-1 drop-shadow">VS</span>
            <p className="font-black text-base sm:text-lg leading-tight drop-shadow-lg text-center mb-2 max-w-[180px]">
              {texts.promoTitle}
            </p>
            <div className="bg-white text-gray-800 font-bold px-5 py-2 rounded-xl text-sm shadow-lg hover:bg-gray-100 transition-colors">
              {texts.promoCta}
            </div>
          </div>

          {/* Away team - right side */}
          <div className="flex flex-col items-center gap-1 z-10 w-20">
            <div className="w-16 h-16 bg-white/90 rounded-xl p-2 flex items-center justify-center shadow-lg">
              <img
                src={f.teams.away.logo}
                alt={f.teams.away.name}
                className="w-full h-full object-contain"
                onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }}
              />
            </div>
            <span className="text-xs font-bold text-white text-center leading-tight drop-shadow-lg max-w-[80px] truncate">
              {f.teams.away.name}
            </span>
          </div>
        </div>
      </a>
    );
  }

  // Fallback: Simple banner without match (similar to old design)
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="block relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all hover:scale-[1.02]"
    >
      {/* Animated shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shine_3s_infinite]" style={{animation: 'shine 3s infinite'}}/>

      {/* Sparkle decorations */}
      <div className="absolute top-2 right-3 text-yellow-200 animate-pulse">✨</div>
      <div className="absolute bottom-2 left-8 text-yellow-200 animate-pulse" style={{animationDelay: '0.5s'}}>⭐</div>

      <div className="relative flex items-center gap-4">
        <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shrink-0 border-2 border-white/30">
          <span className="text-3xl">🎁</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-lg leading-tight drop-shadow-md">{texts.freeBet}</p>
          <p className="text-white/90 text-sm mt-1 font-medium">{texts.betOnMatch}</p>
        </div>
        <div className="shrink-0 bg-white text-orange-600 font-bold px-4 py-2 rounded-xl text-sm shadow-lg">
          {texts.ctaButton}
        </div>
      </div>
    </a>
  );
}
