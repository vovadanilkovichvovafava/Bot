import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import { getTrackingLink } from '../services/trackingService';
import api from '../../../shared/api';

const LEAGUE_FLAGS = {
  SA: '🇮🇹', PL: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', BL1: '🇩🇪', PD: '🇪🇸', FL1: '🇫🇷',
  CL: '🏆', EL: '🏆', EKS: '🇵🇱', SB: '🇮🇹', ELC: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
};

export default function ExpressBet() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();
  const navigate = useNavigate();

  const isPro = user?.is_premium || user?.funnel === 'funnel-2';
  const isFonbetUser = user?.is_premium; // actual registered user on Fonbet

  // Daily express
  const [dailyExpress, setDailyExpress] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState(null);

  // Custom express (PRO)
  const [showCustom, setShowCustom] = useState(false);
  const [leagues, setLeagues] = useState([]);
  const [selectedLeagues, setSelectedLeagues] = useState([]);
  const [legCount, setLegCount] = useState(5);
  const [targetOdds, setTargetOdds] = useState(1.8);
  const [customExpress, setCustomExpress] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);

  // History
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load daily express
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getDailyExpress();
        setDailyExpress(data);
      } catch (e) {
        setDailyError(e.message);
      } finally {
        setDailyLoading(false);
      }
    })();
  }, []);

  // Load leagues for custom
  useEffect(() => {
    if (isPro) {
      api.getExpressLeagues().then(data => {
        setLeagues(data.leagues || []);
      }).catch(() => {});
    }
  }, [isPro]);

  const toggleLeague = useCallback((code) => {
    setSelectedLeagues(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  }, []);

  const generateCustom = async () => {
    setCustomLoading(true);
    try {
      const data = await api.createCustomExpress({
        leagues: selectedLeagues,
        legCount,
        targetAvgOdds: targetOdds,
      });
      setCustomExpress(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setCustomLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await api.getExpressHistory(20);
      setHistory(data);
      setShowHistory(true);
    } catch {}
  };

  const getBetLink = (leg) => {
    if (leg.fonbet_deeplink && isFonbetUser) {
      return leg.fonbet_deeplink;
    }
    return getTrackingLink(user?.id, 'express_bet');
  };

  const getExpressBetLink = (express) => {
    // Link to first leg's match on Fonbet (or offer)
    const firstLeg = express?.legs?.[0];
    if (!firstLeg) return null;
    return getBetLink(firstLeg);
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
          {t('express.subtitle', { defaultValue: 'Multi-bet accumulators powered by AI predictions & real odds' })}
        </p>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* Daily Express Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{t('express.dailyTitle', { defaultValue: "Today's Express" })}</p>
                <p className="text-xs text-gray-500">{t('express.dailyDesc', { defaultValue: 'Auto-generated at 15:00 GMT' })}</p>
              </div>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">FREE</span>
          </div>

          {dailyLoading ? (
            <div className="px-4 py-8 text-center">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"/>
              <p className="text-xs text-gray-400">{t('express.loading', { defaultValue: 'Loading express...' })}</p>
            </div>
          ) : dailyError ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500">{t('express.noMatches', { defaultValue: 'No matches available today. Check back later!' })}</p>
              <button
                onClick={() => { setDailyLoading(true); setDailyError(null); api.getDailyExpress().then(setDailyExpress).catch(e => setDailyError(e.message)).finally(() => setDailyLoading(false)); }}
                className="mt-2 text-xs font-bold text-indigo-600"
              >
                {t('express.retry', { defaultValue: 'Retry' })}
              </button>
            </div>
          ) : dailyExpress ? (
            <ExpressCard express={dailyExpress} getBetLink={getBetLink} getExpressBetLink={getExpressBetLink} t={t} trackClick={trackClick} userId={user?.id} />
          ) : null}
        </div>

        {/* PRO Custom Express */}
        {isPro && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">{t('express.customTitle', { defaultValue: 'Custom Express' })}</p>
                  <p className="text-xs text-gray-500">{t('express.customDesc', { defaultValue: 'Choose leagues, legs & target odds' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user?.funnel !== 'funnel-2' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">PRO</span>}
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showCustom ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
                </svg>
              </div>
            </button>

            {showCustom && (
              <div className="px-4 py-4 space-y-4">
                {/* League selector */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                    {t('express.selectLeagues', { defaultValue: 'Leagues' })}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {leagues.map(l => (
                      <button
                        key={l.code}
                        onClick={() => toggleLeague(l.code)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          selectedLeagues.includes(l.code)
                            ? 'bg-purple-500 text-white border-purple-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {LEAGUE_FLAGS[l.code] || '⚽'} {l.name}
                      </button>
                    ))}
                  </div>
                  {selectedLeagues.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">{t('express.allLeagues', { defaultValue: 'All leagues selected by default' })}</p>
                  )}
                </div>

                {/* Leg count */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                    {t('express.legCount', { defaultValue: 'Number of matches' })}
                  </label>
                  <div className="flex gap-2">
                    {[3, 4, 5, 6, 7, 8].map(n => (
                      <button
                        key={n}
                        onClick={() => setLegCount(n)}
                        className={`w-10 h-10 rounded-xl text-sm font-bold border transition-all ${
                          legCount === n
                            ? 'bg-purple-500 text-white border-purple-500'
                            : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target average odds */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                    {t('express.targetOdds', { defaultValue: 'Average odds per leg' })}
                  </label>
                  <div className="flex gap-2">
                    {[1.3, 1.5, 1.8, 2.0, 2.5, 3.0].map(o => (
                      <button
                        key={o}
                        onClick={() => setTargetOdds(o)}
                        className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all ${
                          targetOdds === o
                            ? 'bg-purple-500 text-white border-purple-500'
                            : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        {o.toFixed(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate button */}
                <button
                  onClick={generateCustom}
                  disabled={customLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {customLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                      </svg>
                      {t('express.generate', { defaultValue: 'Generate Express' })}
                    </>
                  )}
                </button>

                {/* Custom result */}
                {customExpress && (
                  <ExpressCard express={customExpress} getBetLink={getBetLink} getExpressBetLink={getExpressBetLink} t={t} trackClick={trackClick} userId={user?.id} isCustom />
                )}
              </div>
            )}
          </div>
        )}

        {/* Not PRO — upsell */}
        {!isPro && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{t('express.proUpsellTitle', { defaultValue: 'Custom Express — PRO' })}</p>
                <p className="text-xs text-gray-600 mt-1">{t('express.proUpsellDesc', { defaultValue: 'Pick your leagues, set the number of matches and target odds. AI builds the perfect accumulator for you.' })}</p>
                <button
                  onClick={() => navigate('/promo')}
                  className="mt-2 text-xs font-bold text-purple-600"
                >
                  {t('express.unlockPro', { defaultValue: 'Unlock PRO →' })}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History button */}
        {isPro && (
          <button
            onClick={loadHistory}
            className="w-full text-center text-sm text-gray-500 font-medium py-2"
          >
            {showHistory ? t('express.hideHistory', { defaultValue: 'Hide history' }) : t('express.showHistory', { defaultValue: 'Show history' })}
          </button>
        )}

        {/* History list */}
        {showHistory && history.length > 0 && (
          <div className="space-y-3">
            {history.map(exp => (
              <div key={exp.id} className="bg-white rounded-xl p-3 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">
                    {new Date(exp.created_at).toLocaleDateString()}
                  </span>
                  <StatusBadge status={exp.status} t={t} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">{exp.leg_count} {t('express.legs', { defaultValue: 'legs' })}</span>
                  <span className="text-sm font-black text-indigo-600">×{exp.total_odds}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExpressCard({ express, getBetLink, getExpressBetLink, t, trackClick, userId, isCustom }) {
  const betLink = getExpressBetLink(express);

  return (
    <div className="divide-y divide-gray-50">
      {/* Legs */}
      {express.legs.map((leg, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {leg.home_team} — {leg.away_team}
            </p>
            <p className="text-xs text-gray-400">
              {leg.match_date ? new Date(leg.match_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-lg">
              {leg.bet_type}
            </span>
            <p className="text-sm font-black text-gray-900 mt-0.5">{leg.odds}</p>
          </div>
        </div>
      ))}

      {/* Total + Bet button */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('express.totalOdds', { defaultValue: 'Total Odds' })}</p>
            <p className="text-xl font-black text-gray-900">×{express.total_odds}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium">{t('express.confidence', { defaultValue: 'AI Confidence' })}</p>
            <p className="text-lg font-black text-emerald-600">{Math.round((express.avg_confidence || 0) * 100)}%</p>
          </div>
        </div>

        {betLink && (
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
            {t('express.placeBet', { defaultValue: 'Place Bet' })}
          </a>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, t }) {
  const styles = {
    pending: 'bg-gray-100 text-gray-600',
    won: 'bg-emerald-100 text-emerald-700',
    lost: 'bg-red-100 text-red-600',
    partial: 'bg-amber-100 text-amber-700',
  };
  const labels = {
    pending: t('express.statusPending', { defaultValue: 'Pending' }),
    won: t('express.statusWon', { defaultValue: 'Won' }),
    lost: t('express.statusLost', { defaultValue: 'Lost' }),
    partial: t('express.statusPartial', { defaultValue: 'Partial' }),
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}
