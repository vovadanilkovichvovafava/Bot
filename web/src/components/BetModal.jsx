import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBookmaker } from '../context/BookmakerContext';
import BookmakerConnect, { BOOKMAKER } from './BookmakerConnect';
import FootballSpinner from './FootballSpinner';

export default function BetModal({ isOpen, onClose, bet }) {
  const { t } = useTranslation();
  const { isConnected, balance, placeBet, loading: bkLoading } = useBookmaker();
  const [stake, setStake] = useState('');
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showConnect, setShowConnect] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStake('');
      setSuccess(false);
      setPlacing(false);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !bet) return null;

  const odds = bet.odds || 1.5;
  const potentialWin = stake ? (parseFloat(stake) * odds).toFixed(2) : '0.00';
  const balanceAmount = balance?.amount || balance?.balance || 0;

  const handlePlaceBet = async () => {
    if (!stake || parseFloat(stake) <= 0) return;

    const stakeAmount = parseFloat(stake);
    if (stakeAmount > balanceAmount) {
      setError(t('betModal.insufficientBalance'));
      return;
    }

    setPlacing(true);
    setError('');

    try {
      // Place real bet via bkproxy
      await placeBet({
        oddId: bet.oddId || bet.id,
        amount: stakeAmount,
        currencyCode: 'USD',
      });

      setPlacing(false);
      setSuccess(true);

      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      setPlacing(false);
      setError(err.message || t('betModal.failedToPlace'));
    }
  };

  const quickAmounts = [10, 50, 100, 300];

  // Not connected - show connect prompt
  if (!isConnected) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-xl animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t('betModal.connectAccount')}</h3>
              <p className="text-gray-500 text-sm mb-6">
                {t('betModal.connectDesc')}
              </p>

              {/* Bet preview */}
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{bet.type}</span>
                  <span className="font-bold text-primary-600">{odds.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => setShowConnect(true)}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-200 mb-3"
              >
                {t('betModal.connectAccount')}
              </button>

              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = BOOKMAKER.link;
                  a.target = '_blank';
                  a.rel = 'noopener noreferrer';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="block text-sm text-gray-500 hover:text-gray-700 bg-transparent border-none cursor-pointer"
              >
                {t('betModal.noAccount', { bonus: BOOKMAKER.bonus })} →
              </button>
            </div>
          </div>
        </div>

        <BookmakerConnect
          isOpen={showConnect}
          onClose={() => setShowConnect(false)}
          onSuccess={() => setShowConnect(false)}
        />
      </>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
        <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-xl animate-slideUp">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('betModal.betPlaced')}</h3>
            <p className="text-gray-500 text-sm mb-1">
              ${stake} on {bet.type} @ {odds.toFixed(2)}
            </p>
            <p className="text-green-600 font-semibold">
              {t('betModal.potentialWin')}: ${potentialWin}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl animate-slideUp max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">{t('betModal.placeBet')}</h3>
            <button onClick={onClose} className="text-gray-400 p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Match Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">{bet.league}</span>
              <span className="text-xs text-gray-400">{bet.date}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{bet.homeTeam}</p>
                <p className="font-medium text-gray-900 text-sm">{bet.awayTeam}</p>
              </div>
            </div>
          </div>

          {/* Bet Selection */}
          <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('betModal.yourBet')}</p>
                <p className="font-bold text-gray-900">{bet.type}</p>
              </div>
              <div className="bg-primary-600 text-white font-bold text-lg px-4 py-2 rounded-lg">
                {odds.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          {/* Stake Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('betModal.stakeAmount')}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xl">$</span>
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="0"
                className="w-full pl-10 pr-4 py-4 text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 mt-3">
              {quickAmounts.map(amount => (
                <button
                  key={amount}
                  onClick={() => setStake(amount.toString())}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                    stake === amount.toString()
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>

          {/* Potential Win */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('betModal.potentialWin')}</span>
              <span className="text-xl font-bold text-green-600">${potentialWin}</span>
            </div>
          </div>

          {/* Balance Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{t('betModal.accountBalance')}:</span>
            <span className="font-medium text-gray-700">
              ${balanceAmount.toFixed(2)}
            </span>
          </div>

          {/* Place Bet Button */}
          <button
            onClick={handlePlaceBet}
            disabled={!stake || parseFloat(stake) <= 0 || placing || bkLoading}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-500/25"
          >
            {placing ? (
              <>
                <FootballSpinner size="xs" light />
                {t('betModal.placingBet')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                {t('betModal.placeBet')} {stake ? `$${stake}` : ''}
              </>
            )}
          </button>

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 text-center">
            {t('betModal.disclaimer', { name: BOOKMAKER.name })}
          </p>
        </div>
      </div>
    </div>
  );
}
