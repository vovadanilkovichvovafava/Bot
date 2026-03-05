import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import { addTrackingToUrl } from '../services/trackingService';
import { loadValueBets, loadFonbetMap, buildExpressFromValueBets } from '../../../services/valueBetService';
import FootballSpinner from '../../../shared/components/FootballSpinner';

const PRESET_STYLES = {
  safe:  { gradient: 'from-emerald-500 to-green-600', icon: '\u{1F6E1}\uFE0F', iconBg: 'bg-emerald-500' },
  value: { gradient: 'from-blue-500 to-indigo-600',   icon: '\u{2B50}',           iconBg: 'bg-blue-500' },
  risky: { gradient: 'from-orange-500 to-red-600',    icon: '\u{1F525}',           iconBg: 'bg-orange-500' },
};

export default function ExpressBet() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { trackClick } = useAdvertiser();
  const navigate = useNavigate();

  const isPro = user?.is_premium || user?.funnel === 'funnel-2';

  const [expresses, setExpresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const [expandedKey, setExpandedKey] = useState(null);
  const [fonbetMap, setFonbetMap] = useState({});

  useEffect(() => {
    loadExpresses();
  }, []);

  const loadExpresses = async () => {
    setLoading(true);
    setError(null);
    try {
      // Reuse the exact same value bet logic as Value Finder
      const valueBets = await loadValueBets({
        onProgress: setProgress,
      });

      // Build express presets from value bets
      const built = buildExpressFromValueBets(valueBets);
      setExpresses(built);

      // Auto-expand first one
      if (built.length > 0) {
        setExpandedKey(built[0].key);
      }

      // Load Fonbet deeplinks in background
      loadFonbetMap().then(setFonbetMap);
    } catch (e) {
      console.error('Express load error:', e);
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  // Find Fonbet deeplink for a leg
  const getFonbetLink = (leg) => {
    if (!fonbetMap) return null;
    try {
      const key = `${leg.home_team.toLowerCase()}_${leg.away_team.toLowerCase()}`;
      return fonbetMap[key]?.deeplink || null;
    } catch { return null; }
  };

  const getExpressLink = (express) => {
    // Link to first leg's Fonbet deeplink, or tracking link
    const firstLeg = express?.legs?.[0];
    if (!firstLeg) return null;
    const fbLink = getFonbetLink(firstLeg);
    if (fbLink) return addTrackingToUrl(fbLink, user?.id, 'express_bet');
    return null;
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
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* Loading state with progress */}
        {loading && (
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
            {/* Skeleton cards */}
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
        {error && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 px-4 py-6 text-center">
            <p className="text-sm text-gray-500">{t('express.noMatches', { defaultValue: 'No matches available today. Check back later!' })}</p>
            <button onClick={loadExpresses} className="mt-2 text-xs font-bold text-indigo-600">
              {t('express.retry', { defaultValue: 'Retry' })}
            </button>
          </div>
        )}

        {/* Express cards */}
        {!loading && !error && (
          <>
            {expresses.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-8 text-center">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
                </svg>
                <p className="font-medium text-gray-500">{t('express.noValueBets', { defaultValue: 'Not enough value bets for express today' })}</p>
                <p className="text-sm text-gray-400 mt-1">{t('express.checkLater', { defaultValue: 'Check back when more matches are available' })}</p>
                <button onClick={loadExpresses} className="mt-3 text-sm font-bold text-indigo-600">
                  {t('express.retry', { defaultValue: 'Retry' })}
                </button>
              </div>
            ) : (
              <>
                {/* How it works badge */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    <p className="text-xs text-indigo-700">
                      {t('express.howItWorks', { defaultValue: 'AI finds matches where bookmaker odds undervalue a team, then combines the best into accumulators.' })}
                    </p>
                  </div>
                </div>

                {expresses.map(express => (
                  <ExpressPresetCard
                    key={express.key}
                    express={express}
                    isExpanded={expandedKey === express.key}
                    onToggle={() => setExpandedKey(expandedKey === express.key ? null : express.key)}
                    getExpressLink={getExpressLink}
                    getFonbetLink={getFonbetLink}
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

        {/* PRO upsell — shown below free expresses for non-PRO */}
        {!loading && !error && !isPro && expresses.length > 0 && (
          <ProUpsell t={t} navigate={navigate} />
        )}
      </div>
    </div>
  );
}


function ExpressPresetCard({ express, isExpanded, onToggle, getExpressLink, getFonbetLink, trackClick, userId, navigate, t, isPro }) {
  const style = PRESET_STYLES[express.key] || PRESET_STYLES.value;
  const betLink = getExpressLink(express);

  // PRO-gate: risky (7 legs) is PRO only
  const isLocked = express.key === 'risky' && !isPro;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header — clickable */}
      <button
        onClick={isLocked ? () => navigate('/promo?banner=express_unlock_pro') : onToggle}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
      >
        <div className={`w-11 h-11 rounded-xl ${style.iconBg} flex items-center justify-center text-xl flex-shrink-0 shadow-sm`}>
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
          {/* Value stats bar */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-green-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t('express.avgValue', { defaultValue: 'Avg Value' })}</p>
                <p className="text-sm font-bold text-emerald-600">+{express.avg_value}%</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t('express.confidence', { defaultValue: 'AI Confidence' })}</p>
                <p className="text-sm font-bold text-blue-600">{express.avg_confidence}%</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t('express.totalOdds', { defaultValue: 'Total Odds' })}</p>
              <p className="text-lg font-black text-gray-900">&times;{express.total_odds}</p>
            </div>
          </div>

          {/* Legs list */}
          <div className="divide-y divide-gray-50">
            {express.legs.map((leg, i) => {
              const fbLink = getFonbetLink(leg);
              return (
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
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-sm font-black text-gray-900">{leg.odds}</span>
                        <span className="text-[10px] font-bold text-emerald-600">+{leg.value.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bet button */}
          <div className="px-4 py-3 bg-gray-50">
            {betLink ? (
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
                {t('express.placeBet', { defaultValue: 'Place Bet on Fonbet' })}
              </a>
            ) : (
              <button
                onClick={() => {
                  // Navigate to first leg's match detail
                  const fid = express.legs[0]?.fixture_id;
                  if (fid) navigate(`/match/${fid}`);
                }}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
                </svg>
                {t('express.viewMatches', { defaultValue: 'View Matches' })}
              </button>
            )}
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
          {t('express.proUpsellBig', { defaultValue: 'Unlock Big Express (7 legs) for maximum payout with PRO access.' })}
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
