import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import { loadValueBets, loadFonbetMap } from '../../../services/valueBetService';
import { addTrackingToUrl } from '../../betting/services/trackingService';
import FootballSpinner from '../../../shared/components/FootballSpinner';

const VALUE_BET_USED_KEY = 'value_bet_used';

export default function ValueFinder() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [valueBets, setValueBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | high | medium
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const [fonbetMap, setFonbetMap] = useState({});

  const isPremium = user?.is_premium && user?.funnel !== 'funnel-2';

  // Mark Value Bet Finder as used for free users (on first load)
  useEffect(() => {
    if (!isPremium) {
      localStorage.setItem(VALUE_BET_USED_KEY, 'true');
    }
  }, [isPremium]);

  useEffect(() => {
    doLoad();
  }, []);

  const doLoad = async () => {
    try {
      const results = await loadValueBets({
        onProgress: (p) => setProgress({
          current: p.current,
          total: p.total,
          phase: p.phase === 'Loading matches...' ? t('valueFinder.loadingMatches') : t('valueFinder.analyzingMatches'),
        }),
      });
      setValueBets(results);

      // Load Fonbet odds in background
      loadFonbetMap().then(setFonbetMap);
    } catch (e) {
      console.error('Value finder error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all'
    ? valueBets
    : filter === 'high'
      ? valueBets.filter(v => v.bestBet.value >= 10)
      : valueBets.filter(v => v.bestBet.value >= 5 && v.bestBet.value < 10);

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
            <h1 className="text-lg font-bold text-gray-900">{t('valueFinder.title')}</h1>
            <div className="w-10"/>
          </div>

          {/* Explanation card */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 text-white mb-4">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
              </svg>
              <span className="font-bold">{t('valueFinder.howItWorks')}</span>
            </div>
            <p className="text-sm text-white/90">
              {t('valueFinder.howItWorksDescription')}
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: t('valueFinder.filterAll') },
              { key: 'high', label: t('valueFinder.filterHigh') },
              { key: 'medium', label: t('valueFinder.filterMedium') },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="px-5 mt-4 space-y-3 pb-8">
          {loading ? (
            <>
              {/* Progress indicator */}
              <div className="card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <FootballSpinner size="sm" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{progress.phase}</p>
                    {progress.total > 0 && (
                      <p className="text-sm text-gray-500">{progress.current} / {progress.total} {t('valueFinder.matches')}</p>
                    )}
                  </div>
                </div>
                {progress.total > 0 && (
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Skeleton cards */}
              {[1,2,3].map(i => (
                <div key={i} className="card">
                  <div className="shimmer h-5 w-40 mb-3"/>
                  <div className="shimmer h-4 w-full mb-2"/>
                  <div className="shimmer h-12 w-full rounded-xl"/>
                </div>
              ))}

              <p className="text-center text-gray-400 text-xs mt-4">
                {t('valueFinder.priorityText')}
              </p>
            </>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-10">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
              </svg>
              <p className="font-medium text-gray-500">{t('valueFinder.noValueBets')}</p>
              <p className="text-sm text-gray-400 mt-1">
                {filter !== 'all' ? t('valueFinder.tryChangingFilter') : t('valueFinder.checkBackLater')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{t('valueFinder.valueBetsFound', { count: filtered.length })}</p>
                {filtered.some(v => v.isTopLeague) && (
                  <p className="text-xs text-amber-600 font-medium">
                    {t('valueFinder.fromTopLeagues', { count: filtered.filter(v => v.isTopLeague).length })}
                  </p>
                )}
              </div>
              {filtered.map((item, idx) => (
                <ValueBetCard key={idx} item={item} navigate={navigate} t={t} fonbetMap={fonbetMap} userId={user?.id} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ValueBetCard({ item, navigate, t, fonbetMap, userId }) {
  const { fixture, bestBet, bets, bookmaker, prediction, isTopLeague } = item;
  const time = new Date(fixture.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const league = fixture.league.name;

  // Try to find Fonbet odds for comparison (safe)
  let fbOdds = null;
  let fbDeeplink = null;
  try {
    if (fonbetMap && fixture.teams?.home?.name && fixture.teams?.away?.name) {
      const key = `${fixture.teams.home.name.toLowerCase()}_${fixture.teams.away.name.toLowerCase()}`;
      const fbEvent = fonbetMap[key];
      if (fbEvent?.odds?.['1']) {
        fbOdds = fbEvent.odds;
        fbDeeplink = fbEvent.deeplink;
      }
    }
  } catch (_) {}

  const isHighValue = bestBet.value >= 10;

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/match/${fixture.fixture.id}`)}
    >
      {/* Top gradient bar */}
      <div className={`h-1 ${isHighValue ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}/>

      <div className="p-4">
        {/* Header with league and time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src={fixture.league.logo} alt="" className="w-4 h-4 object-contain"/>
            <span className="text-xs text-gray-500 font-medium">{league}</span>
            {isTopLeague && (
              <span className="text-[9px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white px-1.5 py-0.5 rounded">
                TOP
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{time}</span>
        </div>

        {/* Teams - horizontal layout with VS */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src={fixture.teams.home.logo} alt="" className="w-8 h-8 object-contain shrink-0"/>
            <p className="text-sm font-semibold text-gray-900 truncate">{fixture.teams.home.name}</p>
          </div>
          <span className="text-xs text-gray-400 font-medium px-3">VS</span>
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <p className="text-sm font-semibold text-gray-900 truncate text-right">{fixture.teams.away.name}</p>
            <img src={fixture.teams.away.logo} alt="" className="w-8 h-8 object-contain shrink-0"/>
          </div>
        </div>

        {/* Value highlight - more prominent */}
        <div className={`rounded-xl p-3 mb-3 ${isHighValue ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' : 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">{t('valueFinder.bestValueBet')}</p>
              <p className="font-bold text-gray-900 text-lg">{bestBet.team}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-600">AI: <strong className="text-gray-900">{bestBet.pred}%</strong></span>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-600">Odds: <strong className="text-gray-900">{bestBet.odd}</strong></span>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${isHighValue ? 'text-green-600' : 'text-amber-600'}`}>
                +{bestBet.value.toFixed(1)}%
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{t('valueFinder.valueEdge')}</p>
            </div>
          </div>
        </div>

        {/* All 3 outcomes - improved grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {bets.map((b, i) => {
            const isPositive = b.value > 0;
            const isBest = b.type === bestBet.type;
            return (
              <div
                key={i}
                className={`rounded-xl py-2.5 px-2 text-center transition-all ${
                  isBest
                    ? (isHighValue ? 'bg-green-100 border-2 border-green-400' : 'bg-amber-100 border-2 border-amber-400')
                    : isPositive
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <p className="text-[10px] text-gray-500 font-medium">{b.type}</p>
                <p className="text-base font-bold text-gray-900">{b.odd}</p>
                <p className={`text-xs font-semibold ${
                  isPositive ? (isBest ? (isHighValue ? 'text-green-700' : 'text-amber-700') : 'text-green-600') : 'text-gray-400'
                }`}>
                  {isPositive ? `+${b.value.toFixed(1)}%` : `${b.value.toFixed(1)}%`}
                </p>
              </div>
            );
          })}
        </div>

        {/* Advice */}
        {prediction?.predictions?.advice && (
          <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-2.5 mb-2">
            <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <p className="text-xs text-blue-800">{prediction.predictions.advice}</p>
          </div>
        )}

        {/* Fonbet odds comparison — only if available */}
        {fbOdds && (
          <div
            className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 mb-2 cursor-pointer hover:bg-indigo-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (fbDeeplink) navigate('/promo');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-indigo-500 font-semibold uppercase">Partner Odds</p>
                <p className="text-xs text-indigo-700 font-medium mt-0.5">
                  1: {fbOdds['1']} &middot; X: {fbOdds['X']} &middot; 2: {fbOdds['2']}
                </p>
              </div>
              {fbDeeplink && (
                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-100 px-2 py-1 rounded">
                  Bet &rarr;
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-400">Source: {bookmaker}</p>
          <div className="flex items-center gap-1 text-primary-600">
            <span className="text-xs font-medium">{t('valueFinder.viewDetails')}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
