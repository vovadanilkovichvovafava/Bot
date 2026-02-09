import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function BetModal({ isOpen, onClose, bet }) {
  const { bookmakerAccount, bookmakerBalance } = useAuth();
  const navigate = useNavigate();
  const [stake, setStake] = useState('');
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStake('');
      setSuccess(false);
      setPlacing(false);
    }
  }, [isOpen]);

  if (!isOpen || !bet) return null;

  const odds = bet.odds || 1.5;
  const potentialWin = stake ? (parseFloat(stake) * odds).toFixed(2) : '0.00';

  const handlePlaceBet = async () => {
    if (!stake || parseFloat(stake) <= 0) return;

    setPlacing(true);

    // TODO: Call backend API to place bet via bookmaker
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));

    setPlacing(false);
    setSuccess(true);

    // Auto close after success
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const quickAmounts = [100, 500, 1000, 5000];

  if (!bookmakerAccount) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
        <div
          className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-xl animate-slideUp"
          onClick={e => e.stopPropagation()}
        >
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Подключите аккаунт</h3>
            <p className="text-gray-500 text-sm mb-6">
              Для размещения ставок необходимо подключить аккаунт букмекера в настройках
            </p>
            <button
              onClick={() => { onClose(); navigate('/settings'); }}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl"
            >
              Перейти в настройки
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ставка размещена!</h3>
            <p className="text-gray-500 text-sm">
              {stake} RUB на {bet.type} @ {odds.toFixed(2)}
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
            <h3 className="text-lg font-bold text-gray-900">Поставить</h3>
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
                <p className="text-sm text-gray-600">Ваша ставка</p>
                <p className="font-bold text-gray-900">{bet.type}</p>
              </div>
              <div className="bg-primary-600 text-white font-bold text-lg px-4 py-2 rounded-lg">
                {odds.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Stake Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Сумма ставки</label>
            <div className="relative">
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-4 pr-16 text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">RUB</span>
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
                  {amount}
                </button>
              ))}
            </div>
          </div>

          {/* Potential Win */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Возможный выигрыш</span>
              <span className="text-xl font-bold text-green-600">{potentialWin} RUB</span>
            </div>
          </div>

          {/* Balance Info */}
          {bookmakerBalance && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Баланс аккаунта:</span>
              <span className="font-medium text-gray-700">{bookmakerBalance.amount} {bookmakerBalance.currency}</span>
            </div>
          )}

          {/* Place Bet Button */}
          <button
            onClick={handlePlaceBet}
            disabled={!stake || parseFloat(stake) <= 0 || placing}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-500/25"
          >
            {placing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Размещение...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                Поставить {stake ? `${stake} RUB` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
