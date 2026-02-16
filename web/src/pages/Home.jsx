import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAdvertiser } from '../context/AdvertiserContext';
import footballApi from '../api/footballApi';
import { getStats } from '../services/predictionStore';
import { getMatchColors } from '../utils/teamColors';
import FootballSpinner from '../components/FootballSpinner';


const FREE_AI_LIMIT = 3;
const AI_REQUESTS_KEY = 'ai_requests_count';
const VALUE_BET_USED_KEY = 'value_bet_used';

// Top leagues to show on home
const TOP_LEAGUE_IDS = [39, 140, 135, 78, 61, 2, 3];

export default function Home() {
  const { t } = useTranslation();
  const { user, isDemo } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();
  const navigate = useNavigate();
  const location = useLocation();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAiNudge, setShowAiNudge] = useState(false);
  const [localStats, setLocalStats] = useState({ total: 0, correct: 0, wrong: 0, pending: 0, accuracy: 0 });

  useEffect(() => {
    loadMatches();
    setLocalStats(getStats());
    // Show AI nudge after registration
    if (location.state?.justRegistered) {
      setTimeout(() => setShowAiNudge(true), 1500);
      window.history.replaceState({}, '');
    }
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

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('home.goodMorning');
    if (h < 18) return t('home.goodAfternoon');
    return t('home.goodEvening');
  };

  const isPremium = user?.is_premium;
  const aiRequestCount = parseInt(localStorage.getItem(AI_REQUESTS_KEY) || '0', 10);
  const remaining = isPremium ? 999 : Math.max(0, FREE_AI_LIMIT - aiRequestCount);
  const valueBetUsed = localStorage.getItem(VALUE_BET_USED_KEY) === 'true';

  // Show full-screen splash while loading matches
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-primary-600 to-primary-800">
        <FootballSpinner size="lg" text={t('home.loadingMatches')} light />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white px-5 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-primary-100 text-sm">{getGreeting()}</p>
              <h1 className="text-2xl font-bold">{user?.username || user?.email?.split('@')[0] || 'User'}</h1>
            </div>
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
              <p className="text-primary-100 text-xs">{t('home.aiPredictionsLeft')}</p>
              <p className="text-2xl font-bold">{isPremium ? '∞' : remaining}<span className="text-sm text-primary-200">{isPremium ? '' : ` / ${FREE_AI_LIMIT}`}</span></p>
            </div>
          </div>
          {!user?.is_premium && (
            <button onClick={() => navigate('/pro-access')} className="bg-accent-gold text-white text-xs font-bold px-3 py-1.5 rounded-lg">
              {t('home.getUnlimited')}
            </button>
          )}
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-4">
        {/* AI Promo Card — dynamic with real match or generic */}
        <AIPromoCard matches={matches} navigate={navigate} />

        {/* Featured Match Promo Banner - Moved higher for visibility */}
        <FeaturedMatchBanner
          matches={matches}
          advertiser={advertiser}
          trackClick={trackClick}
          userId={user?.id}
        />

        {/* Value Bet Finder - Main Hook */}
        <div
          onClick={() => navigate(isPremium || !valueBetUsed ? '/value-finder' : '/pro-access')}
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
                {t('home.freeTry')}
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

          <h3 className="text-xl font-bold text-white mb-2">{t('home.valueBetFinder')}</h3>
          <p className="text-white/80 text-sm mb-4">
            {t('home.valueBetDesc')}
          </p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-white font-bold text-lg">87%</p>
              <p className="text-white/60 text-xs">{t('home.accuracy')}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-white font-bold text-lg">+12%</p>
              <p className="text-white/60 text-xs">{t('home.avgEdge')}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-white font-bold text-lg">50+</p>
              <p className="text-white/60 text-xs">{t('home.dailyBets')}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {isPremium ? t('home.unlimitedScans') : valueBetUsed ? t('home.depositToUnlock') : t('home.tryFreeNow')}
            </div>
            <div className="bg-white text-blue-600 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1">
              {isPremium || !valueBetUsed ? t('home.findValueBets') : t('home.unlock')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/your-stats')}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">{t('home.yourStats')}</h3>
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
              <p className="text-xs text-gray-500">{t('home.predictions')}</p>
            </div>
            <div>
              <div className="w-8 h-8 mx-auto mb-1 text-green-500 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p className="text-2xl font-bold text-green-500">{localStats.correct}</p>
              <p className="text-xs text-gray-500">{t('home.wins')}</p>
            </div>
            <div>
              <div className="w-8 h-8 mx-auto mb-1 text-red-500 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
                </svg>
              </div>
              <p className="text-2xl font-bold text-red-500">{localStats.accuracy}%</p>
              <p className="text-xs text-gray-500">{t('home.accuracy')}</p>
            </div>
          </div>
          {localStats.pending > 0 && (
            <p className="text-xs text-amber-600 text-center mt-2">{t('home.pendingVerification', { count: localStats.pending })}</p>
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
            <p className="font-semibold text-gray-900 text-sm">{t('home.beginnersGuide')}</p>
            <p className="text-xs text-gray-500">{t('home.tipsToStart')}</p>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
          </svg>
        </div>

        {/* Pro Tools */}
        <div>
          <h3 className="section-title mb-3">{t('home.proTools')}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div onClick={() => navigate('/matches')} className="card text-center cursor-pointer hover:shadow-md transition-shadow py-5">
              <div className="w-10 h-10 mx-auto mb-2 bg-green-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-700">{t('home.matches')}</p>
            </div>
            <div onClick={() => navigate(user?.is_premium ? '/value-finder' : '/pro-access')} className="card text-center cursor-pointer hover:shadow-md transition-shadow py-5 relative">
              {!user?.is_premium && <span className="badge-pro absolute -top-2 right-1">PRO</span>}
              <div className="w-10 h-10 mx-auto mb-2 bg-purple-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-700">{t('home.valueFinder')}</p>
            </div>
            <div onClick={() => navigate('/pro-tools')} className="card text-center cursor-pointer hover:shadow-md transition-shadow py-5 relative">
              <span className="badge-pro absolute -top-2 right-1">PRO</span>
              <div className="w-10 h-10 mx-auto mb-2 bg-blue-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-700">{t('home.bankroll')}</p>
            </div>
          </div>
        </div>

        {/* Today's Matches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">{t('home.todaysMatches')}</h3>
            <button onClick={() => navigate('/matches')} className="text-primary-600 text-sm font-medium flex items-center gap-1">
              {t('home.seeAll')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
              </svg>
            </button>
          </div>

          {matches.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">{t('home.noMatchesToday')}</p>
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

      {/* AI Onboarding Nudge — shown once after registration */}
      {showAiNudge && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAiNudge(false)}/>
          <div className="relative bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400 rounded-2xl p-6 text-white w-full max-w-sm animate-bounce-in shadow-2xl">
            <button onClick={() => setShowAiNudge(false)} className="absolute top-3 right-3 text-white/60 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            <div className="text-center">
              <div className="w-14 h-14 bg-white/20 rounded-2xl mx-auto mb-3 flex items-center justify-center">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-1">{t('home.aiNudgeTitle')}</h3>
              <p className="text-white/80 text-sm mb-4">{t('home.aiNudgeDesc')}</p>
              <button
                onClick={() => { setShowAiNudge(false); navigate('/ai-chat'); }}
                className="bg-white text-purple-600 font-bold px-6 py-3 rounded-xl text-sm shadow-lg w-full"
              >
                {t('home.aiNudgeCta')}
              </button>
            </div>
          </div>
        </div>
      )}
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

// Featured Match Promo Banner with team logos and diagonal split
function FeaturedMatchBanner({ matches, advertiser, trackClick, userId }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Get the first match from top leagues as featured match
  const featuredMatch = matches?.[0];

  // Use i18n for all advertiser texts (bonus amount comes from advertiser config)
  const bonus = advertiser.bonusAmount || '';
  const texts = {
    freeBet: t('advertiser.freeBet', { bonus }),
    betOnMatch: t('advertiser.betOnMatch'),
    ctaButton: t('advertiser.ctaButton', { bonus }),
    promoTitle: t('advertiser.promoTitle', { bonus }),
    promoCta: t('advertiser.promoCta'),
  };

  const link = 'https://pwa-production-20b5.up.railway.app/promo';

  // If we have a featured match, show it with team colors diagonal split
  if (featuredMatch) {
    const f = featuredMatch;
    const { homeColor, awayColor } = getMatchColors(f.teams.home.id, f.teams.away.id);

    return (
      <div
        onClick={() => navigate('/promo?banner=home_featured_match')}
        className="block relative overflow-hidden rounded-2xl text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
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
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full" style={{animation: 'shine 6s infinite'}}/>

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
      </div>
    );
  }

  // Fallback: Simple banner without match (similar to old design)
  return (
    <div
      onClick={() => navigate('/promo?banner=home_fallback_banner')}
      className="block relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all hover:scale-[1.02] cursor-pointer"
    >
      {/* Animated shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shine_6s_infinite]" style={{animation: 'shine 6s infinite'}}/>

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
    </div>
  );
}

// AI Promo Card — shows real match with pre-filled AI question
function AIPromoCard({ matches, navigate }) {
  const { t } = useTranslation();
  const topMatch = matches?.[0];

  // Build a pre-filled question for AI chat
  const handleClick = () => {
    if (topMatch) {
      const q = `${topMatch.teams.home.name} vs ${topMatch.teams.away.name} — who will win and why?`;
      navigate('/ai-chat', { state: { prefill: q } });
    } else {
      navigate('/ai-chat');
    }
  };

  return (
    <div
      onClick={handleClick}
      className="relative overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400 rounded-2xl p-5 text-white cursor-pointer hover:shadow-xl transition-all"
    >
      {/* Animated sparkle */}
      <div className="absolute top-2 right-3 animate-pulse text-yellow-200">✨</div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
          </div>
          <div className="min-w-0">
            {topMatch ? (
              <>
                <h3 className="font-bold text-base leading-tight truncate">
                  {t('home.aiPromoAsk', { team: topMatch.teams.home.name })}
                </h3>
                <p className="text-white/70 text-xs mt-0.5 truncate">
                  {topMatch.teams.home.name} vs {topMatch.teams.away.name}
                </p>
              </>
            ) : (
              <>
                <h3 className="font-bold text-lg">{t('home.aiPromoNoMatch')}</h3>
                <p className="text-white/80 text-sm">{t('home.askAIDesc')}</p>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0 bg-white/20 backdrop-blur text-white font-bold px-4 py-2 rounded-xl text-sm ml-3">
          {t('home.aiPromoTry')}
        </div>
      </div>
    </div>
  );
}
