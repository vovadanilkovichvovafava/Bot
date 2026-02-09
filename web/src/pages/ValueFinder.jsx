import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import footballApi from '../api/footballApi';

// Top leagues to prioritize (league IDs from API-Football)
const TOP_LEAGUE_IDS = [
  39,   // Premier League (England)
  140,  // La Liga (Spain)
  135,  // Serie A (Italy)
  78,   // Bundesliga (Germany)
  61,   // Ligue 1 (France)
  2,    // UEFA Champions League
  3,    // UEFA Europa League
  848,  // UEFA Conference League
  88,   // Eredivisie (Netherlands)
  94,   // Primeira Liga (Portugal)
  203,  // Super Lig (Turkey)
  144,  // Belgian Pro League
  235,  // Russian Premier League
  40,   // Championship (England)
  41,   // League One (England)
  253,  // MLS (USA)
  262,  // Liga MX (Mexico)
  71,   // Serie A (Brazil)
  128,  // Primera Division (Argentina)
];

function impliedProb(odd) {
  return odd > 0 ? (1 / parseFloat(odd)) * 100 : 0;
}

function valuePct(predicted, odd) {
  const implied = impliedProb(odd);
  return predicted - implied;
}

export default function ValueFinder() {
  const navigate = useNavigate();
  const [valueBets, setValueBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | high | medium
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });

  useEffect(() => {
    loadValueBets();
  }, []);

  const loadValueBets = async () => {
    try {
      setProgress({ current: 0, total: 0, phase: 'Loading matches...' });

      const today = new Date().toISOString().split('T')[0];
      const fixtures = await footballApi.getFixturesByDate(today);

      // Filter to upcoming/live matches only
      const upcoming = fixtures.filter(f =>
        ['NS', '1H', '2H', 'HT'].includes(f.fixture.status.short)
      );

      // Separate top leagues from others
      const topLeagueMatches = upcoming.filter(f => TOP_LEAGUE_IDS.includes(f.league.id));
      const otherMatches = upcoming.filter(f => !TOP_LEAGUE_IDS.includes(f.league.id));

      // Prioritize: all top leagues first, then fill with others
      // Limit: 30 top league + 15 others = 45 max
      const prioritized = [
        ...topLeagueMatches.slice(0, 30),
        ...otherMatches.slice(0, 15),
      ];

      setProgress({ current: 0, total: prioritized.length, phase: 'Analyzing matches...' });

      // Process in smaller batches to show progress
      const allResults = [];
      const BATCH_SIZE = 5;

      for (let i = 0; i < prioritized.length; i += BATCH_SIZE) {
        const batch = prioritized.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.allSettled(
          batch.map(async (fix) => {
            const [pred, odds] = await Promise.allSettled([
              footballApi.getPrediction(fix.fixture.id),
              footballApi.getOdds(fix.fixture.id),
            ]);

            const prediction = pred.status === 'fulfilled' ? pred.value : null;
            const oddsData = odds.status === 'fulfilled' ? odds.value : [];

            if (!prediction?.predictions?.percent) return null;

            // Get 1X2 odds
            const bookmaker = oddsData?.[0]?.bookmakers?.[0];
            const market = bookmaker?.bets?.find(b => b.name === 'Match Winner');
            if (!market) return null;

            const homeOdd = market.values?.find(v => v.value === 'Home')?.odd;
            const drawOdd = market.values?.find(v => v.value === 'Draw')?.odd;
            const awayOdd = market.values?.find(v => v.value === 'Away')?.odd;
            if (!homeOdd) return null;

            const homePred = parseInt(prediction.predictions.percent.home);
            const drawPred = parseInt(prediction.predictions.percent.draw);
            const awayPred = parseInt(prediction.predictions.percent.away);

            const homeValue = valuePct(homePred, homeOdd);
            const drawValue = valuePct(drawPred, drawOdd);
            const awayValue = valuePct(awayPred, awayOdd);

            // Find best value bet for this match
            const bets = [
              { type: 'Home', pred: homePred, odd: homeOdd, value: homeValue, team: fix.teams.home.name },
              { type: 'Draw', pred: drawPred, odd: drawOdd, value: drawValue, team: 'Draw' },
              { type: 'Away', pred: awayPred, odd: awayOdd, value: awayValue, team: fix.teams.away.name },
            ];

            const best = bets.reduce((a, b) => a.value > b.value ? a : b);
            const isTopLeague = TOP_LEAGUE_IDS.includes(fix.league.id);

            return {
              fixture: fix,
              prediction,
              bookmaker: bookmaker?.name,
              bets,
              bestBet: best,
              isTopLeague,
            };
          })
        );

        allResults.push(...batchResults);
        setProgress({ current: Math.min(i + BATCH_SIZE, prioritized.length), total: prioritized.length, phase: 'Analyzing matches...' });
      }

      const valid = allResults
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value)
        .filter(v => v.bestBet.value > 0) // Only positive value
        .sort((a, b) => {
          // Sort by: top league first, then by value
          if (a.isTopLeague && !b.isTopLeague) return -1;
          if (!a.isTopLeague && b.isTopLeague) return 1;
          return b.bestBet.value - a.bestBet.value;
        });

      setValueBets(valid);
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
            <h1 className="text-lg font-bold text-gray-900">Value Bet Finder</h1>
            <div className="w-10"/>
          </div>

          {/* Explanation card */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 text-white mb-4">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
              </svg>
              <span className="font-bold">How it works</span>
            </div>
            <p className="text-sm text-white/90">
              We compare AI prediction probabilities with bookmaker odds. When our predicted probability is higher than the bookmaker implies — that's a value bet.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'high', label: 'High Value (10%+)' },
              { key: 'medium', label: 'Medium (5-10%)' },
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
                    <svg className="w-5 h-5 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{progress.phase}</p>
                    {progress.total > 0 && (
                      <p className="text-sm text-gray-500">{progress.current} / {progress.total} matches</p>
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
                Priority: Top leagues (EPL, La Liga, Serie A...) → Others
              </p>
            </>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-10">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
              </svg>
              <p className="font-medium text-gray-500">No value bets found</p>
              <p className="text-sm text-gray-400 mt-1">
                {filter !== 'all' ? 'Try changing the filter' : 'Check back later for new opportunities'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{filtered.length} value bet{filtered.length !== 1 ? 's' : ''} found</p>
                {filtered.some(v => v.isTopLeague) && (
                  <p className="text-xs text-amber-600 font-medium">
                    {filtered.filter(v => v.isTopLeague).length} from top leagues
                  </p>
                )}
              </div>
              {filtered.map((item, idx) => (
                <ValueBetCard key={idx} item={item} navigate={navigate} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ValueBetCard({ item, navigate }) {
  const { fixture, bestBet, bets, bookmaker, prediction, isTopLeague } = item;
  const time = new Date(fixture.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const league = fixture.league.name;

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
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">Best Value Bet</p>
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
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">value edge</p>
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

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-400">Source: {bookmaker}</p>
          <div className="flex items-center gap-1 text-primary-600">
            <span className="text-xs font-medium">View details</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
