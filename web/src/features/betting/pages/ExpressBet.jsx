import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import { getTrackingLink, addTrackingToUrl } from '../services/trackingService';
import { loadExpressBets, loadFonbetMap, buildExpressFromBets } from '../../../services/valueBetService';
import FootballSpinner from '../../../shared/components/FootballSpinner';
import api from '../../../shared/api';

const PRESET_ICONS = {
  safe: (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
    </svg>
  ),
  value: (
    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
    </svg>
  ),
  risky: (
    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.356 2.082a.75.75 0 00-.712 0C7.754 4.137 5.25 8.312 5.25 12.75c0 2.47.862 4.742 2.302 6.522a.75.75 0 001.142-.976A8.218 8.218 0 017 12.75c0-3.658 2.018-7.17 5-9.347 2.982 2.177 5 5.689 5 9.347a8.218 8.218 0 01-1.694 5.546.75.75 0 001.142.976A9.717 9.717 0 0018.75 12.75c0-4.438-2.504-8.613-6.394-10.668zM12 9a.75.75 0 00-.75.75c0 2.672-1.244 4.95-2.898 6.61a.75.75 0 001.048 1.074C10.88 16.007 12 13.683 12 11.25v-.008c.872 1.386 1.5 3.075 1.5 4.758 0 1.06-.293 2.05-.8 2.898a.75.75 0 001.3.75A6.233 6.233 0 0015 15.75c0-2.663-1.2-5.143-3-6.75z"/>
    </svg>
  ),
};

const PRESET_STYLES = {
  safe:  { gradient: 'from-emerald-500 to-green-600', icon: PRESET_ICONS.safe, iconBg: 'bg-emerald-500' },
  value: { gradient: 'from-blue-500 to-indigo-600',   icon: PRESET_ICONS.value, iconBg: 'bg-blue-500' },
  risky: { gradient: 'from-orange-500 to-red-600',    icon: PRESET_ICONS.risky, iconBg: 'bg-orange-500' },
};

// Weekly access key for funnel-1
const EXPRESS_WEEKLY_KEY = 'express_last_used_week';

function getCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  return `${now.getFullYear()}-W${Math.ceil(diff / 604800000)}`;
}

function canAccessFree(user) {
  if (!user) return false;
  // Premium or funnel-2 — always free
  if (user.is_premium || user.funnel === 'funnel-2') return true;
  // Funnel-1 — once per week
  if (user.funnel === 'funnel-1' || !user.funnel) {
    const lastWeek = localStorage.getItem(EXPRESS_WEEKLY_KEY);
    const currentWeek = getCurrentWeek();
    return lastWeek !== currentWeek;
  }
  // Funnel-3 — always allowed (costs tokens, checked separately)
  if (user.funnel === 'funnel-3') return true;
  return false;
}

function markWeeklyUsed() {
  localStorage.setItem(EXPRESS_WEEKLY_KEY, getCurrentWeek());
}

export default function ExpressBet() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { trackClick } = useAdvertiser();
  const navigate = useNavigate();

  const isPro = user?.is_premium || user?.funnel === 'funnel-2';
  const isFonbetUser = user?.is_premium; // registered on Fonbet = has deeplink access
  const isFunnel3 = user?.funnel === 'funnel-3';
  const isFunnel1 = user?.funnel === 'funnel-1' || (!user?.funnel && !isPro && !isFunnel3);

  const [expresses, setExpresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const [expandedKey, setExpandedKey] = useState(null);
  const [fonbetMap, setFonbetMap] = useState({});
  const [isTopLeagues, setIsTopLeagues] = useState(true);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [tokenSpent, setTokenSpent] = useState(false);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    if (!user) {
      setAccessBlocked(true);
      setLoading(false);
      return;
    }

    // PRO / funnel-2: always free
    if (isPro) {
      return loadExpresses();
    }

    // Funnel-1: once per week free
    if (isFunnel1) {
      if (!canAccessFree(user)) {
        setAccessBlocked(true);
        setLoading(false);
        return;
      }
      markWeeklyUsed();
      return loadExpresses();
    }

    // Funnel-3: costs 3 tokens
    if (isFunnel3) {
      try {
        // Spend 3 tokens via backend
        const result = await api.request('/express/spend-tokens', { method: 'POST' });
        if (result?.error) {
          setAccessBlocked(true);
          setLoading(false);
          return;
        }
        setTokenSpent(true);
        if (refreshUser) refreshUser(); // refresh token count in UI
      } catch (e) {
        // If 402 = not enough tokens
        if (e.message?.includes('402') || e.message?.includes('tokens')) {
          setAccessBlocked(true);
          setLoading(false);
          return;
        }
      }
      return loadExpresses();
    }

    // Default: allow
    loadExpresses();
  };

  const loadExpresses = async () => {
    setLoading(true);
    setError(null);
    try {
      const { bets: expressBets, isTopLeagues: topFlag } = await loadExpressBets({
        onProgress: setProgress,
      });

      setIsTopLeagues(topFlag);

      const built = buildExpressFromBets(expressBets);
      setExpresses(built);

      if (built.length > 0) {
        setExpandedKey(built[0].key);
      }

      loadFonbetMap().then(setFonbetMap);
    } catch (e) {
      console.error('Express load error:', e);
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  // Bet link logic:
  // - PRO (is_premium / registered on Fonbet) → Fonbet deeplink to first match
  // - Everyone else → referral offer link
  const getBetLink = (express) => {
    if (!express?.legs?.[0]) return null;

    if (isFonbetUser) {
      // Try Fonbet deeplink for first leg
      const firstLeg = express.legs[0];
      try {
        const key = `${firstLeg.home_team.toLowerCase()}_${firstLeg.away_team.toLowerCase()}`;
        const fbEvent = fonbetMap[key];
        if (fbEvent?.deeplink) {
          return addTrackingToUrl(fbEvent.deeplink, user?.id, 'express_bet_fonbet');
        }
      } catch {}
    }

    // Fallback: referral offer link for all non-Fonbet users
    return getTrackingLink(user?.id, 'express_bet');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-5 pt-12 pb-6 text-white">
        <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-white/70 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          {t('common.back', { defaultValue: 'Back' })}
        </button>
        <h1 className="text-2xl font-black mb-1">{t('express.title', { defaultValue: 'AI Express' })}</h1>
        <p className="text-white/70 text-sm">
          {t('express.valueSubtitle', { defaultValue: 'Accumulators built from AI value bets — same engine as Value Finder' })}
        </p>
        {/* Token cost badge for funnel-3 */}
        {isFunnel3 && tokenSpent && (
          <div className="mt-2 bg-white/20 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
            <span className="text-xs font-bold">-3 {t('express.tokens', { defaultValue: 'tokens used' })}</span>
          </div>
        )}
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* Access blocked */}
        {accessBlocked && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-8 text-center">
              <svg className="w-12 h-12 mx-auto text-purple-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
              </svg>
              {isFunnel1 && (
                <>
                  <p className="font-bold text-gray-900 mb-1">
                    {t('express.weeklyLimitTitle', { defaultValue: 'Weekly limit reached' })}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    {t('express.weeklyLimitDesc', { defaultValue: 'Free express is available once per week. Come back next week or get PRO for unlimited access!' })}
                  </p>
                </>
              )}
              {isFunnel3 && (
                <>
                  <p className="font-bold text-gray-900 mb-1">
                    {t('express.noTokensTitle', { defaultValue: 'Not enough tokens' })}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    {t('express.noTokensDesc', { defaultValue: 'Express costs 3 tokens. Wait for your daily reset or get PRO for unlimited access!' })}
                  </p>
                </>
              )}
              {!user && (
                <>
                  <p className="font-bold text-gray-900 mb-1">
                    {t('express.loginRequired', { defaultValue: 'Login required' })}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    {t('express.loginRequiredDesc', { defaultValue: 'Sign in to access AI Express.' })}
                  </p>
                </>
              )}
              <button
                onClick={() => navigate('/promo?banner=express_unlock_pro')}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-purple-500/30"
              >
                {t('express.getProNow', { defaultValue: 'Get PRO Access' })}
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && !accessBlocked && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <FootballSpinner size="sm" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{progress.phase || t('express.loading', { defaultValue: 'Loading...' })}</p>
                  {progress.total > 0 && (
                    <p className="text-sm text-gray-500">{progress.current} / {progress.total} {t('valueFinder.matches', { defaultValue: 'matches' })}</p>
                  )}
                </div>
              </div>
              {progress.total > 0 && (
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div className="px-4 pb-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-50 rounded-xl p-4">
                  <div className="shimmer h-5 w-32 mb-2 rounded"/>
                  <div className="shimmer h-4 w-48 rounded"/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !accessBlocked && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 px-4 py-6 text-center">
            <p className="text-sm text-gray-500">{t('express.noMatches', { defaultValue: 'No matches available today. Check back later!' })}</p>
            <button onClick={loadExpresses} className="mt-2 text-xs font-bold text-indigo-600">
              {t('express.retry', { defaultValue: 'Retry' })}
            </button>
          </div>
        )}

        {/* Express cards */}
        {!loading && !error && !accessBlocked && (
          <>
            {expresses.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-8 text-center">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
                </svg>
                <p className="font-medium text-gray-500">{t('express.noValueBets', { defaultValue: 'Not enough matches for express today' })}</p>
                <p className="text-sm text-gray-400 mt-1">{t('express.checkLater', { defaultValue: 'Check back when more matches are available' })}</p>
                <button onClick={loadExpresses} className="mt-3 text-sm font-bold text-indigo-600">
                  {t('express.retry', { defaultValue: 'Retry' })}
                </button>
              </div>
            ) : (
              <>
                {/* Warning: non-top-leagues fallback */}
                {!isTopLeagues && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                      </svg>
                      <div>
                        <p className="text-xs font-bold text-amber-800">
                          {t('express.noTopLeaguesToday', { defaultValue: 'No top-league matches today' })}
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          {t('express.fallbackWarning', { defaultValue: 'Express built from other leagues — AI confidence may be lower. Top-league expresses are more reliable.' })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Funnel-1 weekly info */}
                {isFunnel1 && !isPro && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                    <p className="text-xs text-blue-700">
                      {t('express.weeklyFreeNote', { defaultValue: 'Free express this week. Next one available in 7 days, or get PRO for unlimited.' })}
                    </p>
                  </div>
                )}

                {/* How it works badge */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    <p className="text-xs text-indigo-700">
                      {t('express.howItWorks', { defaultValue: 'AI analyzes odds from top leagues, picks the best bets and combines them into accumulators.' })}
                    </p>
                  </div>
                </div>

                {expresses.map(express => (
                  <ExpressPresetCard
                    key={express.key}
                    express={express}
                    isExpanded={expandedKey === express.key}
                    onToggle={() => setExpandedKey(expandedKey === express.key ? null : express.key)}
                    getBetLink={getBetLink}
                    trackClick={trackClick}
                    userId={user?.id}
                    navigate={navigate}
                    t={t}
                    isPro={isPro}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* PRO upsell — shown below for non-PRO */}
        {!loading && !error && !isPro && !accessBlocked && expresses.length > 0 && (
          <ProUpsell t={t} navigate={navigate} />
        )}
      </div>
    </div>
  );
}


function ExpressPresetCard({ express, isExpanded, onToggle, getBetLink, trackClick, userId, navigate, t, isPro }) {
  const style = PRESET_STYLES[express.key] || PRESET_STYLES.value;
  const betLink = getBetLink(express);

  // PRO-gate: risky (7 legs) is PRO only
  const isLocked = express.key === 'risky' && !isPro;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header — clickable */}
      <button
        onClick={isLocked ? () => navigate('/promo?banner=express_unlock_pro') : onToggle}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
      >
        <div className={`w-11 h-11 rounded-xl ${style.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          {isLocked ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
            </svg>
          ) : style.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900">{express.label}</p>
            {isLocked && <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">PRO</span>}
          </div>
          <p className="text-xs text-gray-500">{express.description}</p>
        </div>
        <div className="text-right flex-shrink-0 mr-1">
          <p className="text-xl font-black text-gray-900">&times;{express.total_odds}</p>
          <p className="text-[10px] text-gray-400">{express.leg_count} {t('express.legs', { defaultValue: 'legs' })}</p>
        </div>
        {!isLocked && (
          <svg className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
          </svg>
        )}
      </button>

      {/* Expanded legs */}
      {isExpanded && !isLocked && (
        <div className="border-t border-gray-100">
          {/* Stats bar */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t('express.confidence', { defaultValue: 'AI Confidence' })}</p>
              <p className="text-sm font-bold text-blue-600">{express.avg_confidence}%</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t('express.totalOdds', { defaultValue: 'Total Odds' })}</p>
              <p className="text-lg font-black text-gray-900">&times;{express.total_odds}</p>
            </div>
          </div>

          {/* Legs list */}
          <div className="divide-y divide-gray-50">
            {express.legs.map((leg, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {leg.home_logo && <img src={leg.home_logo} alt="" className="w-4 h-4 object-contain"/>}
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {leg.home_team} &mdash; {leg.away_team}
                      </p>
                      {leg.away_logo && <img src={leg.away_logo} alt="" className="w-4 h-4 object-contain"/>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {leg.league_logo && <img src={leg.league_logo} alt="" className="w-3 h-3 object-contain"/>}
                      <span className="text-[10px] text-gray-400">{leg.league}</span>
                      <span className="text-[10px] text-gray-300">&middot;</span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(leg.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {leg.isTopLeague && (
                        <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1 py-0.5 rounded">TOP</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-lg mb-0.5">
                      {leg.bet_type}
                    </span>
                    <p className="text-sm font-black text-gray-900 mt-0.5">{leg.odds}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bet Now button */}
          <div className="px-4 py-3 bg-gray-50">
            <a
              href={betLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick?.(userId, 'express_bet')}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>
              </svg>
              {t('express.betNow', { defaultValue: 'Bet Now' })}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}


function ProUpsell({ t, navigate }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 px-5 py-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
          </svg>
          <h3 className="font-bold text-lg">{t('express.proUpsellTitle', { defaultValue: 'Want more?' })}</h3>
        </div>
        <p className="text-white/80 text-sm">
          {t('express.proUpsellBig', { defaultValue: 'Unlock Big Express (7 legs) and unlimited access with PRO.' })}
        </p>
      </div>
      <div className="px-4 py-3">
        <button
          onClick={() => navigate('/promo?banner=express_unlock_pro')}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
          </svg>
          {t('express.getProNow', { defaultValue: 'Get PRO Access' })}
        </button>
      </div>
    </div>
  );
}
