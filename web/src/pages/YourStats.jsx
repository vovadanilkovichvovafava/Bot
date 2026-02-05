import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPredictions, getStats, verifyPredictions } from '../services/predictionStore';

export default function YourStats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try { await verifyPredictions(); } catch (_) {}
    setPredictions(getPredictions());
    setStats(getStats());
    setLoading(false);
  };

  const s = stats || { total: 0, verified: 0, correct: 0, wrong: 0, pending: 0, accuracy: 0 };

  // Streak calculation
  const verified = predictions.filter(p => p.result).sort((a, b) => new Date(b.verifiedAt) - new Date(a.verifiedAt));
  let currentStreak = 0;
  let streakType = null;
  for (const p of verified) {
    if (streakType === null) streakType = p.result.isCorrect;
    if (p.result.isCorrect === streakType) currentStreak++;
    else break;
  }

  let bestStreak = 0;
  let tempStreak = 0;
  for (const p of verified) {
    if (p.result.isCorrect) {
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  // By league breakdown
  const byLeague = {};
  for (const p of predictions) {
    const league = p.league || 'Unknown';
    if (!byLeague[league]) byLeague[league] = { total: 0, correct: 0, wrong: 0, pending: 0 };
    byLeague[league].total++;
    if (p.result) {
      if (p.result.isCorrect) byLeague[league].correct++;
      else byLeague[league].wrong++;
    } else {
      byLeague[league].pending++;
    }
  }

  const leagueEntries = Object.entries(byLeague)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);

  // Confidence distribution
  const confBuckets = { 'High (70%+)': { total: 0, correct: 0 }, 'Medium (50-70%)': { total: 0, correct: 0 }, 'Low (<50%)': { total: 0, correct: 0 } };
  for (const p of predictions.filter(p => p.result)) {
    const conf = p.prediction.confidence;
    const bucket = conf >= 70 ? 'High (70%+)' : conf >= 50 ? 'Medium (50-70%)' : 'Low (<50%)';
    confBuckets[bucket].total++;
    if (p.result.isCorrect) confBuckets[bucket].correct++;
  }

  // Recent form (last 10 verified)
  const recentForm = verified.slice(0, 10);

  // Accuracy circle
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (s.accuracy / 100) * circumference;

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-[#F0F2F5]">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="bg-white px-5 pt-4 pb-4">
            <div className="shimmer h-6 w-40 mb-4"/>
          </div>
          <div className="px-5 mt-4 space-y-4">
            <div className="card"><div className="shimmer h-40 w-full"/></div>
            <div className="card"><div className="shimmer h-32 w-full"/></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F0F2F5]">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Header */}
        <div className="bg-white px-5 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
              <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
              </svg>
            </button>
            <h1 className="text-lg font-bold">Your Stats</h1>
          </div>
        </div>

        <div className="px-5 mt-4 space-y-4 pb-8">
          {s.total === 0 ? (
            <div className="card text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No Stats Yet</h3>
              <p className="text-gray-500 text-sm mb-4">Get AI analysis on matches to start building your statistics</p>
              <button onClick={() => navigate('/matches')} className="btn-primary inline-flex items-center gap-2">
                Browse Matches
              </button>
            </div>
          ) : (
            <>
              {/* Main Accuracy + Numbers */}
              <div className="card border border-gray-100">
                <div className="flex items-center gap-5">
                  <div className="relative w-28 h-28 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="7"/>
                      {s.verified > 0 && (
                        <circle cx="60" cy="60" r={radius} fill="none"
                          stroke={s.accuracy >= 50 ? '#22C55E' : '#EF4444'}
                          strokeWidth="7"
                          strokeDasharray={circumference}
                          strokeDashoffset={circumference - progress}
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-2xl font-bold ${s.accuracy >= 50 ? 'text-green-500' : s.verified > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {s.verified > 0 ? `${s.accuracy}%` : '--'}
                      </span>
                      <span className="text-[10px] text-gray-400">Accuracy</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Total</span>
                      <span className="text-sm font-bold text-gray-900">{s.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Correct</span>
                      <span className="text-sm font-bold text-green-500">{s.correct}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Wrong</span>
                      <span className="text-sm font-bold text-red-500">{s.wrong}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Pending</span>
                      <span className="text-sm font-bold text-amber-500">{s.pending}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Streaks & Form */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card border border-gray-100 text-center">
                  <p className="text-xs text-gray-400 uppercase mb-1">Current Streak</p>
                  <p className={`text-2xl font-bold ${streakType ? 'text-green-500' : 'text-red-500'}`}>
                    {currentStreak > 0 ? `${currentStreak}${streakType ? 'W' : 'L'}` : '-'}
                  </p>
                </div>
                <div className="card border border-gray-100 text-center">
                  <p className="text-xs text-gray-400 uppercase mb-1">Best Win Streak</p>
                  <p className="text-2xl font-bold text-green-500">{bestStreak > 0 ? `${bestStreak}W` : '-'}</p>
                </div>
              </div>

              {/* Recent Form */}
              {recentForm.length > 0 && (
                <div className="card border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-3">Recent Form (last {recentForm.length})</p>
                  <div className="flex gap-1.5 justify-center flex-wrap">
                    {recentForm.map((p, i) => (
                      <div
                        key={i}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                          p.result.isCorrect ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      >
                        {p.result.isCorrect ? 'W' : 'L'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence Breakdown */}
              {s.verified > 0 && (
                <div className="card border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-3">Accuracy by Confidence</p>
                  <div className="space-y-3">
                    {Object.entries(confBuckets).map(([label, data]) => {
                      const acc = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{label}</span>
                            <span className="font-semibold">
                              {data.total > 0 ? `${acc}% (${data.correct}/${data.total})` : 'N/A'}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            {data.total > 0 && (
                              <div
                                className={`h-full rounded-full ${acc >= 50 ? 'bg-green-500' : 'bg-red-400'}`}
                                style={{ width: `${acc}%` }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* By League */}
              {leagueEntries.length > 0 && (
                <div className="card border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-3">By League</p>
                  <div className="space-y-2">
                    {leagueEntries.map(([league, data]) => {
                      const verified = data.correct + data.wrong;
                      const acc = verified > 0 ? Math.round((data.correct / verified) * 100) : null;
                      return (
                        <div key={league} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                          <span className="text-sm text-gray-700 truncate flex-1 mr-3">{league}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-gray-400">{data.total} pred.</span>
                            {acc !== null ? (
                              <span className={`text-sm font-bold min-w-[40px] text-right ${acc >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                                {acc}%
                              </span>
                            ) : (
                              <span className="text-sm text-amber-500 font-medium min-w-[40px] text-right">...</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Account Info */}
              <div className="card border border-gray-100">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-3">Account</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Plan</span>
                    <span className={`font-semibold ${user?.is_premium ? 'text-amber-500' : 'text-gray-900'}`}>
                      {user?.is_premium ? 'Premium' : 'Free'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Daily AI Requests</span>
                    <span className="font-semibold text-gray-900">{user?.daily_requests || 0} / {user?.daily_limit || 10}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Risk Level</span>
                    <span className="font-semibold text-gray-900 capitalize">{user?.risk_level || 'medium'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Member Since</span>
                    <span className="font-semibold text-gray-900">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* View Prediction History */}
              <button
                onClick={() => navigate('/prediction-history')}
                className="card border border-primary-200 bg-primary-50 flex items-center gap-3 w-full text-left"
              >
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-primary-700">View Prediction History</p>
                  <p className="text-xs text-primary-500">See all past predictions with results</p>
                </div>
                <svg className="w-5 h-5 text-primary-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
