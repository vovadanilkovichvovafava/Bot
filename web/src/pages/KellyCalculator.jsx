import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function KellyCalculator() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [odds, setOdds] = useState('');
  const [probability, setProbability] = useState('');
  const [bankroll, setBankroll] = useState('');
  const [fraction, setFraction] = useState(1); // Kelly fraction (1 = full, 0.5 = half, 0.25 = quarter)
  const [result, setResult] = useState(null);

  const calculateKelly = () => {
    const decimalOdds = parseFloat(odds);
    const winProb = parseFloat(probability) / 100;
    const bank = parseFloat(bankroll);

    if (isNaN(decimalOdds) || isNaN(winProb) || decimalOdds <= 1 || winProb <= 0 || winProb >= 1) {
      setResult({ error: true });
      return;
    }

    // Kelly Formula: (bp - q) / b
    // b = decimal odds - 1 (net odds received on the bet)
    // p = probability of winning
    // q = probability of losing (1 - p)

    const b = decimalOdds - 1;
    const p = winProb;
    const q = 1 - p;

    const kellyPercentage = ((b * p - q) / b) * 100;
    const adjustedKelly = kellyPercentage * fraction;

    // Edge calculation
    const impliedProb = 1 / decimalOdds;
    const edge = ((winProb - impliedProb) / impliedProb) * 100;

    // Stake calculation
    const stake = bank ? (adjustedKelly / 100) * bank : 0;

    setResult({
      kelly: kellyPercentage,
      adjustedKelly: adjustedKelly,
      stake: stake,
      edge: edge,
      ev: (winProb * (decimalOdds - 1) - q) * (stake || 100),
      isPositive: kellyPercentage > 0,
    });
  };

  const resetForm = () => {
    setOdds('');
    setProbability('');
    setBankroll('');
    setResult(null);
  };

  const fractionOptions = [
    { value: 1, label: 'Full Kelly', desc: '100%' },
    { value: 0.5, label: 'Half Kelly', desc: '50%' },
    { value: 0.25, label: 'Quarter Kelly', desc: '25%' },
    { value: 0.1, label: 'Tenth Kelly', desc: '10%' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold">Kelly Calculator</h1>
            <p className="text-sm text-gray-500">Optimal bet sizing</p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold mb-1">Kelly Criterion</p>
              <p className="text-sm text-white/80">
                Mathematically optimal bet sizing to maximize long-term growth while minimizing risk of ruin.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calculator Form */}
      <div className="px-5 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 space-y-4">
          {/* Odds Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decimal Odds
            </label>
            <input
              type="number"
              step="0.01"
              min="1.01"
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
              placeholder="e.g., 2.50"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            />
            <p className="text-xs text-gray-400 mt-1">The odds offered by the bookmaker</p>
          </div>

          {/* Win Probability Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Estimated Win Probability (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="1"
                max="99"
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                placeholder="e.g., 45"
                className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Your estimation of the true winning probability</p>
          </div>

          {/* Bankroll Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bankroll (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                step="1"
                min="1"
                value={bankroll}
                onChange={(e) => setBankroll(e.target.value)}
                placeholder="e.g., 1000"
                className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Your total betting bankroll for stake calculation</p>
          </div>

          {/* Kelly Fraction Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kelly Fraction
            </label>
            <div className="grid grid-cols-2 gap-2">
              {fractionOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFraction(opt.value)}
                  className={`py-3 px-4 rounded-xl border-2 transition-colors ${
                    fraction === opt.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs opacity-70">{opt.desc}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Half or quarter Kelly is often recommended to reduce variance
            </p>
          </div>

          {/* Calculate Button */}
          <button
            onClick={calculateKelly}
            disabled={!odds || !probability}
            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Calculate Kelly
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className={`rounded-2xl p-4 ${result.error ? 'bg-red-50' : result.isPositive ? 'bg-green-50' : 'bg-yellow-50'}`}>
            {result.error ? (
              <div className="text-center py-4">
                <svg className="w-12 h-12 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
                </svg>
                <p className="font-semibold text-red-700">Invalid Input</p>
                <p className="text-sm text-red-600">Please check your values</p>
              </div>
            ) : !result.isPositive ? (
              <div className="text-center py-4">
                <svg className="w-12 h-12 text-yellow-500 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
                <p className="font-semibold text-yellow-700">No Value Bet</p>
                <p className="text-sm text-yellow-600">Kelly suggests not betting (negative edge)</p>
                <p className="mt-2 text-xs text-yellow-600">
                  Edge: {result.edge.toFixed(2)}%
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-green-600 font-medium mb-1">Recommended Stake</p>
                  <p className="text-4xl font-bold text-green-700">
                    {result.adjustedKelly.toFixed(2)}%
                  </p>
                  {bankroll && (
                    <p className="text-lg font-semibold text-green-600 mt-1">
                      ${result.stake.toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{result.kelly.toFixed(2)}%</p>
                    <p className="text-xs text-gray-500">Full Kelly</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">+{result.edge.toFixed(2)}%</p>
                    <p className="text-xs text-gray-500">Edge</p>
                  </div>
                </div>

                {bankroll && (
                  <div className="bg-white rounded-xl p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Expected Value</span>
                      <span className="font-bold text-green-600">+${result.ev.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="text-center pt-2">
                  <button
                    onClick={resetForm}
                    className="text-blue-600 font-semibold text-sm"
                  >
                    Calculate Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Educational Section */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <h3 className="font-bold text-gray-900">Understanding Kelly Criterion</h3>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <span className="font-bold text-blue-600">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Find Your Edge</p>
                <p className="text-sm text-gray-500">Compare your probability estimate to implied odds</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <span className="font-bold text-blue-600">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Calculate Optimal Stake</p>
                <p className="text-sm text-gray-500">Kelly tells you exactly how much to bet</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <span className="font-bold text-blue-600">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Use Fractional Kelly</p>
                <p className="text-sm text-gray-500">Half or quarter Kelly reduces variance significantly</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex gap-2">
              <svg className="w-5 h-5 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <p className="text-sm text-amber-800">
                <strong>Pro Tip:</strong> Only use Kelly when you have a genuine edge.
                Overestimating your probability leads to overbetting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
