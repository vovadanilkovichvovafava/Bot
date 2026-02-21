import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdvertiser } from '../context/AdvertiserContext';

const FORMATS = ['Decimal', 'Fractional', 'American', 'Implied %'];

// Common presets for quick conversion
const PRESETS = [
  { label: 'Evens', decimal: 2.0 },
  { label: '1/2', decimal: 1.5 },
  { label: '2/1', decimal: 3.0 },
  { label: '5/1', decimal: 6.0 },
  { label: '1/4', decimal: 1.25 },
  { label: '10/1', decimal: 11.0 },
];

// Conversion functions
function decimalToFractional(dec) {
  if (dec <= 1) return '0/1';
  const num = dec - 1;
  // Find nice fraction
  const fractions = [
    [1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[1,9],[1,10],
    [2,1],[2,3],[2,5],[2,7],[2,9],
    [3,1],[3,2],[3,4],[3,5],[3,10],
    [4,1],[4,5],[4,6],[4,7],[4,9],
    [5,1],[5,2],[5,4],[5,6],
    [6,1],[6,4],[6,5],
    [7,1],[7,2],[7,4],
    [8,1],[8,11],[8,13],[8,15],
    [9,1],[9,2],[9,4],
    [10,1],[10,3],[10,11],
    [11,1],[11,2],[11,4],[11,8],[11,10],
    [13,2],[13,8],
    [15,2],[15,8],
    [16,1],
    [20,1],[25,1],[33,1],[40,1],[50,1],[100,1],
  ];
  let best = null;
  let bestDiff = Infinity;
  for (const [n, d] of fractions) {
    const diff = Math.abs((n / d) - num);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [n, d];
    }
  }
  if (bestDiff < 0.01) return `${best[0]}/${best[1]}`;
  // Fallback: simplify
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const n = Math.round(num * 100);
  const d = 100;
  const g = gcd(n, d);
  return `${n / g}/${d / g}`;
}

function decimalToAmerican(dec) {
  if (dec >= 2) return `+${Math.round((dec - 1) * 100)}`;
  if (dec > 1) return `${Math.round(-100 / (dec - 1))}`;
  return '+100';
}

function decimalToImplied(dec) {
  if (dec <= 0) return 0;
  return Math.round((1 / dec) * 10000) / 100;
}

function americanToDecimal(am) {
  const num = parseFloat(am);
  if (isNaN(num)) return 2.0;
  if (num > 0) return Math.round((num / 100 + 1) * 1000) / 1000;
  if (num < 0) return Math.round((100 / Math.abs(num) + 1) * 1000) / 1000;
  return 2.0;
}

function fractionalToDecimal(frac) {
  const parts = frac.split('/');
  if (parts.length !== 2) return 2.0;
  const n = parseFloat(parts[0]);
  const d = parseFloat(parts[1]);
  if (isNaN(n) || isNaN(d) || d === 0) return 2.0;
  return Math.round((n / d + 1) * 1000) / 1000;
}

function impliedToDecimal(pct) {
  const p = parseFloat(pct);
  if (isNaN(p) || p <= 0) return 2.0;
  return Math.round((100 / p) * 1000) / 1000;
}

export default function OddsConverter() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { advertiser } = useAdvertiser();
  const [decimalOdds, setDecimalOdds] = useState(2.0);
  const [activeInput, setActiveInput] = useState('Decimal');
  const [inputValues, setInputValues] = useState({
    Decimal: '2.00',
    Fractional: '1/1',
    American: '+100',
    'Implied %': '50.00',
  });
  const [stake, setStake] = useState('100');

  const updateFromDecimal = (dec) => {
    setDecimalOdds(dec);
    setInputValues({
      Decimal: dec.toFixed(2),
      Fractional: decimalToFractional(dec),
      American: decimalToAmerican(dec),
      'Implied %': decimalToImplied(dec).toFixed(2),
    });
  };

  const handleInput = (format, value) => {
    setInputValues(prev => ({ ...prev, [format]: value }));
    setActiveInput(format);

    let dec;
    switch (format) {
      case 'Decimal':
        dec = parseFloat(value);
        if (!isNaN(dec) && dec > 1) updateFromDecimal(dec);
        return;
      case 'Fractional':
        dec = fractionalToDecimal(value);
        if (dec > 1) updateFromDecimal(dec);
        return;
      case 'American':
        dec = americanToDecimal(value);
        if (dec > 1) updateFromDecimal(dec);
        return;
      case 'Implied %':
        dec = impliedToDecimal(value);
        if (dec > 1) updateFromDecimal(dec);
        return;
    }
  };

  const profit = ((parseFloat(stake) || 0) * (decimalOdds - 1));
  const payout = ((parseFloat(stake) || 0) * decimalOdds);

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
            <h1 className="text-lg font-bold">{t('oddsConverter.title')}</h1>
          </div>
        </div>

        <div className="px-5 mt-4 space-y-4 pb-8">
          {/* Conversion Inputs */}
          <div className="card border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-3">{t('oddsConverter.enterOdds')}</p>
            <div className="space-y-3">
              {FORMATS.map(format => (
                <div key={format}>
                  <label className="text-xs text-gray-500 mb-1 block">{t(`oddsConverter.format${format.replace(/[\s%]/g, '')}`)}</label>
                  <input
                    type="text"
                    inputMode={format === 'Fractional' ? 'text' : 'decimal'}
                    value={activeInput === format ? inputValues[format] : inputValues[format]}
                    onChange={(e) => handleInput(format, e.target.value)}
                    onFocus={() => setActiveInput(format)}
                    className={`w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-200 ${
                      activeInput === format ? 'ring-2 ring-primary-300 bg-primary-50' : ''
                    }`}
                    placeholder={
                      format === 'Decimal' ? '2.00' :
                      format === 'Fractional' ? '1/1' :
                      format === 'American' ? '+100' :
                      '50.00'
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="card border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-3">{t('oddsConverter.quickPresets')}</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => {
                    setActiveInput('Decimal');
                    updateFromDecimal(p.decimal);
                  }}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    Math.abs(decimalOdds - p.decimal) < 0.01
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="block text-xs opacity-70">{p.label === 'Evens' ? t('oddsConverter.evens') : p.label}</span>
                  <span className="block font-bold">{p.decimal.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Profit Calculator */}
          <div className="card border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-3">{t('oddsConverter.profitCalculator')}</p>
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">{t('oddsConverter.stakeAmount')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">{advertiser.currency}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className="w-full bg-gray-50 rounded-xl pl-8 pr-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">{t('oddsConverter.profit')}</p>
                <p className="text-lg font-bold text-green-600">{advertiser.currency}{profit.toFixed(2)}</p>
              </div>
              <div className="bg-primary-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">{t('oddsConverter.totalPayout')}</p>
                <p className="text-lg font-bold text-primary-600">{advertiser.currency}{payout.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Odds Explanation */}
          <div className="card border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-3">{t('oddsConverter.howOddsWork')}</p>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-semibold text-gray-900">{t('oddsConverter.formatDecimal')}</span>
                <p>{t('oddsConverter.decimalExplain')}</p>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-semibold text-gray-900">{t('oddsConverter.formatFractional')}</span>
                <p>{t('oddsConverter.fractionalExplain')}</p>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-semibold text-gray-900">{t('oddsConverter.formatAmerican')}</span>
                <p>{t('oddsConverter.americanExplain')}</p>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-semibold text-gray-900">{t('oddsConverter.formatImplied')}</span>
                <p>{t('oddsConverter.impliedExplain')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
