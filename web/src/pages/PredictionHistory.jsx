import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getPredictions, getStats, verifyPredictions } from '../services/predictionStore';

export default function PredictionHistory() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, correct: 0, wrong: 0, pending: 0, accuracy: 0 });
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [filter, setFilter] = useState('all'); // all | correct | wrong | pending

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Auto-verify pending predictions on load
      setVerifying(true);
      await verifyPredictions();
      setVerifying(false);
    } catch (e) {
      console.error('Verification error:', e);
      setVerifying(false);
    }

    setPredictions(getPredictions());
    setStats(getStats());
    setLoading(false);
  };

  const handleRefresh = async () => {
    setVerifying(true);
    try {
      const count = await verifyPredictions();
      setPredictions(getPredictions());
      setStats(getStats());
      if (count > 0) {
        // Show brief feedback
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  const filtered = filter === 'all'
    ? predictions
    : filter === 'correct'
      ? predictions.filter(p => p.result?.isCorrect)
      : filter === 'wrong'
        ? predictions.filter(p => p.result && !p.result.isCorrect)
        : predictions.filter(p => !p.result);

  // Raw counts for filter tabs (must match actual filtered list lengths)
  const rawCorrectCount = predictions.filter(p => p.result?.isCorrect).length;
  const rawWrongCount = predictions.filter(p => p.result && !p.result.isCorrect).length;
  const rawPendingCount = predictions.filter(p => !p.result).length;

  // Accuracy circle
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (stats.accuracy / 100) * circumference;

  return (
    <div className="h-screen flex flex-col bg-[#F0F2F5]">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Header */}
        <div className="bg-white px-5 pt-4 pb-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
              <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">{t('predictionHistory.title')}</h1>
            <button
              onClick={handleRefresh}
              disabled={verifying}
              className="w-10 h-10 flex items-center justify-center -mr-2"
            >
              <svg className={`w-5 h-5 text-gray-600 ${verifying ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/>
              </svg>
            </button>
          </div>

          {/* Accuracy Overview */}
          {stats.total > 0 && (
            <div className="card border border-gray-100 mb-4">
              <div className="flex items-center gap-5">
                {/* Circle */}
                <div className="relative w-28 h-28 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="7"/>
                    {stats.verified > 0 && (
                      <circle
                        cx="60" cy="60" r={radius} fill="none"
                        stroke={stats.accuracy >= 50 ? '#22C55E' : '#EF4444'}
                        strokeWidth="7"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - progress}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold ${stats.accuracy >= 50 ? 'text-green-500' : stats.verified > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {stats.verified > 0 ? `${stats.accuracy}%` : '--'}
                    </span>
                    <span className="text-[10px] text-gray-400">{t('predictionHistory.accuracy')}</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <StatBox label={t('predictionHistory.total')} value={stats.total} color="text-primary-600" bg="bg-primary-50"/>
                  <StatBox label={t('predictionHistory.correct')} value={stats.correct} color="text-green-600" bg="bg-green-50"/>
                  <StatBox label={t('predictionHistory.wrong')} value={stats.wrong} color="text-red-500" bg="bg-red-50"/>
                  <StatBox label={t('predictionHistory.pending')} value={stats.pending} color="text-amber-500" bg="bg-amber-50"/>
                </div>
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: t('predictionHistory.all'), count: predictions.length },
              { key: 'correct', label: t('predictionHistory.correct'), count: rawCorrectCount },
              { key: 'wrong', label: t('predictionHistory.wrong'), count: rawWrongCount },
              { key: 'pending', label: t('predictionHistory.pending'), count: rawPendingCount },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filter === f.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {f.label}
                {f.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    filter === f.key ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Predictions List */}
        <div className="px-5 mt-4 space-y-3 pb-8">
          {loading ? (
            <>
              {[1,2,3,4].map(i => (
                <div key={i} className="card">
                  <div className="shimmer h-5 w-40 mb-3"/>
                  <div className="shimmer h-4 w-full mb-2"/>
                  <div className="shimmer h-10 w-full rounded-xl"/>
                </div>
              ))}
              {verifying && (
                <p className="text-center text-gray-400 text-sm mt-2">
                  {t('predictionHistory.checkingResults')}
                </p>
              )}
            </>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              {predictions.length === 0 ? (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{t('predictionHistory.noPredictionsYet')}</h3>
                  <p className="text-gray-500 text-sm mb-4">{t('predictionHistory.noPredictionsDesc')}</p>
                  <button onClick={() => navigate('/matches')} className="btn-primary inline-flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                    {t('predictionHistory.browseMatches')}
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{t('predictionHistory.noFilteredPredictions', { filter })}</h3>
                  <p className="text-gray-500 text-sm">{t('predictionHistory.tryChangingFilter')}</p>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400">{t('predictionHistory.predictionCount', { count: filtered.length })}</p>
              {filtered.map(pred => (
                <PredictionCard key={pred.id} pred={pred} navigate={navigate} t={t}/>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PredictionCard({ pred, navigate, t }) {
  const result = pred.result;
  const hasResult = !!result;
  const isCorrect = result?.isCorrect;

  const borderColor = hasResult
    ? (isCorrect ? 'border-green-200' : 'border-red-200')
    : 'border-amber-200';

  const statusBg = hasResult
    ? (isCorrect ? 'bg-green-50' : 'bg-red-50')
    : 'bg-amber-50';

  const statusColor = hasResult
    ? (isCorrect ? 'text-green-600' : 'text-red-600')
    : 'text-amber-600';

  const statusIcon = hasResult
    ? (isCorrect ? (
      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd"/>
      </svg>
    ) : (
      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd"/>
      </svg>
    ))
    : (
      <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd"/>
      </svg>
    );

  const matchDate = new Date(pred.matchDate);
  const dateStr = matchDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const timeStr = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const createdStr = new Date(pred.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`card border ${borderColor} cursor-pointer`}
      onClick={() => navigate(`/match/${pred.matchId}`)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400 font-medium uppercase">{pred.league}</span>
        <span className="text-xs text-gray-500">{dateStr} {timeStr}</span>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {pred.homeTeam.logo && <img src={pred.homeTeam.logo} alt="" className="w-5 h-5 object-contain"/>}
            <span className="text-sm font-semibold text-gray-900 truncate">{pred.homeTeam.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {pred.awayTeam.logo && <img src={pred.awayTeam.logo} alt="" className="w-5 h-5 object-contain"/>}
            <span className="text-sm font-semibold text-gray-900 truncate">{pred.awayTeam.name}</span>
          </div>
        </div>

        {/* Score (if finished) */}
        {hasResult && (
          <div className="text-center shrink-0">
            <p className="text-lg font-bold text-gray-900">{result.homeGoals} - {result.awayGoals}</p>
            <p className="text-[10px] text-gray-400">{result.status}</p>
          </div>
        )}

        {/* Status icon */}
        <div className="shrink-0">{statusIcon}</div>
      </div>

      {/* Prediction Details */}
      <div className={`rounded-xl p-3 ${statusBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase">{t('predictionHistory.prediction')}</p>
            <p className={`font-bold text-sm ${statusColor}`}>{pred.prediction.winnerName}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400">{t('predictionHistory.confidence')}</p>
            <p className="font-bold text-sm text-gray-900">{pred.prediction.confidence}%</p>
          </div>
        </div>

        {/* Probability bars (mini) */}
        <div className="flex gap-2 mt-2">
          <MiniProbBar label={t('predictionHistory.homeShort')} pct={pred.prediction.homePct} highlight={pred.prediction.winnerName === pred.homeTeam.name}/>
          <MiniProbBar label={t('predictionHistory.drawShort')} pct={pred.prediction.drawPct} highlight={pred.prediction.winnerName === 'Draw'}/>
          <MiniProbBar label={t('predictionHistory.awayShort')} pct={pred.prediction.awayPct} highlight={pred.prediction.winnerName === pred.awayTeam.name}/>
        </div>

        {/* Result comparison */}
        {hasResult && (
          <div className={`mt-2 pt-2 border-t ${isCorrect ? 'border-green-200' : 'border-red-200'}`}>
            <p className={`text-xs font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {isCorrect ? t('predictionHistory.correctPrediction') : t('predictionHistory.result', { result: result.actualResult })}
            </p>
          </div>
        )}
      </div>

      {/* Advice */}
      {pred.prediction.advice && (
        <p className="text-xs text-gray-400 mt-2 truncate">{pred.prediction.advice}</p>
      )}
    </div>
  );
}

function MiniProbBar({ label, pct, highlight }) {
  return (
    <div className={`flex-1 rounded-lg py-1 px-2 text-center ${highlight ? 'bg-white shadow-sm' : ''}`}>
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className={`text-xs font-bold ${highlight ? 'text-primary-600' : 'text-gray-600'}`}>{pct}%</p>
    </div>
  );
}

function StatBox({ label, value, color, bg }) {
  return (
    <div className={`${bg} rounded-xl py-2 px-3 text-center`}>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}
