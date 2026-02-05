import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import footballApi from '../api/footballApi';

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

  useEffect(() => {
    loadValueBets();
  }, []);

  const loadValueBets = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const fixtures = await footballApi.getFixturesByDate(today);

      // Filter to upcoming/live matches only
      const upcoming = fixtures.filter(f =>
        ['NS', '1H', '2H', 'HT'].includes(f.fixture.status.short)
      );

      // Get predictions for up to 20 matches (save API calls)
      const batch = upcoming.slice(0, 20);
      const results = await Promise.allSettled(
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

          return {
            fixture: fix,
            prediction,
            bookmaker: bookmaker?.name,
            bets,
            bestBet: best,
          };
        })
      );

      const valid = results
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value)
        .filter(v => v.bestBet.value > 0) // Only positive value
        .sort((a, b) => b.bestBet.value - a.bestBet.value);

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
              {[1,2,3,4].map(i => (
                <div key={i} className="card">
                  <div className="shimmer h-5 w-40 mb-3"/>
                  <div className="shimmer h-4 w-full mb-2"/>
                  <div className="shimmer h-12 w-full rounded-xl"/>
                </div>
              ))}
              <p className="text-center text-gray-400 text-sm mt-4">
                Scanning matches for value bets...
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
              <p className="text-xs text-gray-400">{filtered.length} value bet{filtered.length !== 1 ? 's' : ''} found</p>
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
  const { fixture, bestBet, bets, bookmaker, prediction } = item;
  const time = new Date(fixture.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const league = fixture.league.name;

  const valueColor = bestBet.value >= 10 ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50';
  const valueBg = bestBet.value >= 10 ? 'border-green-200' : 'border-amber-200';

  return (
    <div className={`card border ${valueBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400 font-medium uppercase">{league}</span>
        <span className="text-xs text-gray-500">{time}</span>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-3 mb-3">
        <img src={fixture.teams.home.logo} alt="" className="w-8 h-8 object-contain"/>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{fixture.teams.home.name}</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{fixture.teams.away.name}</p>
        </div>
        <img src={fixture.teams.away.logo} alt="" className="w-8 h-8 object-contain"/>
      </div>

      {/* Value highlight */}
      <div className={`rounded-xl p-3 mb-3 ${bestBet.value >= 10 ? 'bg-green-50' : 'bg-amber-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Best Value Bet</p>
            <p className="font-bold text-gray-900">{bestBet.team}</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${bestBet.value >= 10 ? 'text-green-600' : 'text-amber-600'}`}>
              +{bestBet.value.toFixed(1)}%
            </p>
            <p className="text-[10px] text-gray-400">value edge</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs">
          <span className="text-gray-600">AI: <strong>{bestBet.pred}%</strong></span>
          <span className="text-gray-400">vs</span>
          <span className="text-gray-600">Odds: <strong>{bestBet.odd}</strong> ({impliedProb(bestBet.odd).toFixed(0)}%)</span>
        </div>
      </div>

      {/* All 3 outcomes */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {bets.map((b, i) => (
          <div key={i} className={`rounded-lg py-2 px-2 text-center ${b.value > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
            <p className="text-[10px] text-gray-400">{b.type}</p>
            <p className="text-sm font-bold text-gray-900">{b.odd}</p>
            <p className={`text-[10px] font-semibold ${b.value > 0 ? 'text-green-600' : 'text-gray-400'}`}>
              {b.value > 0 ? `+${b.value.toFixed(1)}%` : `${b.value.toFixed(1)}%`}
            </p>
          </div>
        ))}
      </div>

      {/* Advice */}
      {prediction?.predictions?.advice && (
        <p className="text-xs text-gray-500 mb-2">{prediction.predictions.advice}</p>
      )}

      <p className="text-[10px] text-gray-400">{bookmaker}</p>
    </div>
  );
}
