import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import { getPredictions, getStats, verifyPredictions, boostAccuracy } from '../services/predictionStore';
import api from '../../../shared/api';

export default function Statistics() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { advertiser } = useAdvertiser();
  const [recentPreds, setRecentPreds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setLocalStats] = useState(null);
  const [serverStats, setServerStats] = useState(null);

  // Use local prediction store stats (boosted) with fallback to user profile
  const localStats = stats || { total: 0, verified: 0, correct: 0, wrong: 0, pending: 0, accuracy: 0 };
  const total = localStats.total || user?.total_predictions || 0;
  const correct = localStats.correct || user?.correct_predictions || 0;
  const wrong = localStats.wrong || Math.max((total - correct), 0);
  // Always use boosted accuracy from getStats(); fallback uses same sigmoid formula
  const accuracy = localStats.total > 0
    ? localStats.accuracy.toFixed(1)
    : (total > 0 ? boostAccuracy((correct / total) * 100, total).toFixed(1) : '0.0');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await verifyPredictions();
    } catch (_) {}
    setLocalStats(getStats());
    setRecentPreds(getPredictions().slice(0, 5));
    setLoading(false);

    // Load server-side stats (streak, by_bet_type, by_league)
    try {
      const data = await api.getPredictionStats();
      if (data) setServerStats(data);
    } catch {}
  };

  // Calculate circle progress
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = (parseFloat(accuracy) / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-8">
      <div className="bg-white px-5 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <h1 className="text-lg font-bold">{t('statistics.title')}</h1>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* AI Predictions Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
              <span className="font-bold">{t('statistics.aiPredictions')}</span>
            </div>
            {(!user?.is_premium || user?.funnel === 'funnel-2') && <span className="badge-pro">{t('statistics.pro')}</span>}
          </div>

          {/* Circular Progress */}
          <div className="flex justify-center mb-4">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="8"/>
                <circle cx="70" cy="70" r={radius} fill="none" stroke={parseFloat(accuracy) > 50 ? '#4CAF50' : '#F44336'} strokeWidth="8"
                  strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${parseFloat(accuracy) > 50 ? 'text-green-500' : 'text-red-500'}`}>{accuracy}%</span>
                <span className="text-xs text-gray-400">{t('statistics.accuracy')}</span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-primary-600">{total}</p>
              <p className="text-xs text-gray-500">{t('statistics.total')}</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-500">{correct}</p>
              <p className="text-xs text-gray-500">{t('statistics.correct')}</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-500">{wrong}</p>
              <p className="text-xs text-gray-500">{t('statistics.wrong')}</p>
            </div>
          </div>
        </div>

        {/* Streak & Virtual P&L — gamification */}
        {serverStats && (serverStats.current_streak > 0 || serverStats.total > 0) && (
          <div className="space-y-4">
            {/* Winning Streak */}
            {serverStats.current_streak >= 2 && serverStats.streak_type === 'win' && (
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                    {serverStats.current_streak >= 5 ? '🏆' : serverStats.current_streak >= 3 ? '🔥' : '⚡'}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-lg">
                      {serverStats.current_streak} {t('statistics.winStreak', { defaultValue: 'Win Streak!' })}
                    </p>
                    <p className="text-white/80 text-sm">
                      {serverStats.current_streak >= 5
                        ? t('statistics.streakLegendary', { defaultValue: 'Legendary! You\'re on fire!' })
                        : serverStats.current_streak >= 3
                        ? t('statistics.streakHot', { defaultValue: 'Hot streak! Keep it going!' })
                        : t('statistics.streakGood', { defaultValue: 'Great start! Build your streak!' })
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black">{serverStats.current_streak}</p>
                    <p className="text-[10px] text-white/70 uppercase">{t('statistics.inARow', { defaultValue: 'in a row' })}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Virtual P&L — "If you had bet €10 on each prediction" */}
            {serverStats.total >= 3 && (
              (() => {
                const stake = 10;
                const currency = advertiser?.currency || '€';
                const avgOdds = 1.85; // average odds for typical bets
                const profit = Math.round(serverStats.correct * stake * (avgOdds - 1) - serverStats.wrong * stake);
                const roi = serverStats.total > 0 ? ((profit / (serverStats.total * stake)) * 100).toFixed(1) : 0;
                const isPositive = profit > 0;

                return (
                  <div className="card">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>
                      </svg>
                      <span className="font-bold">{t('statistics.virtualPnL', { defaultValue: 'Virtual P&L' })}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">
                        {t('statistics.ifYouBet', { stake: `${currency}${stake}`, defaultValue: `If you bet ${currency}${stake} per pick` })}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className={`text-xl font-black ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {isPositive ? '+' : ''}{currency}{profit}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase">{t('statistics.profit', { defaultValue: 'Profit' })}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className={`text-xl font-black ${parseFloat(roi) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {parseFloat(roi) > 0 ? '+' : ''}{roi}%
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase">ROI</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xl font-black text-gray-700">{currency}{serverStats.total * stake}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{t('statistics.totalStaked', { defaultValue: 'Staked' })}</p>
                      </div>
                    </div>

                    {isPositive && (
                      <p className="text-xs text-green-600 mt-2 text-center font-medium">
                        {t('statistics.profitNote', { profit: `${currency}${profit}`, defaultValue: `You would have earned ${currency}${profit} following our picks!` })}
                      </p>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Recent Predictions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <h3 className="font-bold">{t('statistics.recentPredictions')}</h3>
            </div>
            {recentPreds.length > 0 && (
              <button onClick={() => navigate('/prediction-history')} className="text-primary-600 text-sm font-semibold">
                {t('statistics.viewAll')}
              </button>
            )}
          </div>

          {recentPreds.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p className="font-semibold text-gray-700">{t('statistics.noPredictionsYet')}</p>
              <p className="text-sm text-gray-400">{t('statistics.noPredictionsDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPreds.map(p => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/match/${p.matchId}`)}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="shrink-0">
                    {p.result ? (
                      p.result.isCorrect ? (
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      )
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.homeTeam.name} vs {p.awayTeam.name}
                    </p>
                    <p className="text-xs text-gray-500">{p.prediction.winnerName} ({p.prediction.confidence}%)</p>
                  </div>
                  {p.result && (
                    <span className="text-sm font-bold text-gray-700">{p.result.homeGoals}-{p.result.awayGoals}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending stats */}
        {localStats.pending > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd"/>
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">{t('statistics.pendingAwaiting', { count: localStats.pending })}</p>
              <p className="text-xs text-amber-600">{t('statistics.resultsVerifiedAuto')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
