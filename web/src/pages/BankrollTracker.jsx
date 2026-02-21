import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAdvertiser } from '../context/AdvertiserContext';

// Local storage key
const STORAGE_KEY = 'bankroll_data';

// Default data structure
const getDefaultData = () => ({
  startingBankroll: 0,
  currentBankroll: 0,
  currency: 'EUR',
  transactions: [], // { id, type: 'deposit'|'withdraw'|'bet_win'|'bet_loss', amount, date, note }
  createdAt: new Date().toISOString(),
});

// Load data from localStorage
const loadData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : getDefaultData();
  } catch {
    return getDefaultData();
  }
};

// Save data to localStorage
const saveData = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export default function BankrollTracker() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { advertiser } = useAdvertiser();
  const [data, setData] = useState(loadData);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('deposit'); // deposit | withdraw | bet_win | bet_loss
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [setupAmount, setSetupAmount] = useState('');

  // Save on data change
  useEffect(() => {
    saveData(data);
  }, [data]);

  // Check if needs setup
  useEffect(() => {
    if (data.startingBankroll === 0 && data.transactions.length === 0) {
      setShowSetup(true);
    }
  }, []);

  const handleSetup = () => {
    const startAmount = parseFloat(setupAmount) || 0;
    if (startAmount <= 0) return;

    setData({
      ...data,
      startingBankroll: startAmount,
      currentBankroll: startAmount,
      transactions: [{
        id: Date.now(),
        type: 'deposit',
        amount: startAmount,
        date: new Date().toISOString(),
        note: t('bankroll.initialBankroll'),
      }],
    });
    setShowSetup(false);
    setSetupAmount('');
  };

  const handleAddTransaction = () => {
    const txAmount = parseFloat(amount) || 0;
    if (txAmount <= 0) return;

    const newTx = {
      id: Date.now(),
      type: modalType,
      amount: txAmount,
      date: new Date().toISOString(),
      note: note || getDefaultNote(modalType),
    };

    let newBankroll = data.currentBankroll;
    if (modalType === 'deposit' || modalType === 'bet_win') {
      newBankroll += txAmount;
    } else {
      newBankroll -= txAmount;
    }

    setData({
      ...data,
      currentBankroll: Math.max(0, newBankroll),
      transactions: [newTx, ...data.transactions],
    });

    setShowAddModal(false);
    setAmount('');
    setNote('');
  };

  const getDefaultNote = (type) => {
    const notes = {
      deposit: t('bankroll.deposit'),
      withdraw: t('bankroll.withdrawal'),
      bet_win: t('bankroll.betWon'),
      bet_loss: t('bankroll.betLost'),
    };
    return notes[type] || '';
  };

  const deleteTransaction = (id) => {
    const tx = data.transactions.find(t => t.id === id);
    if (!tx) return;

    let newBankroll = data.currentBankroll;
    if (tx.type === 'deposit' || tx.type === 'bet_win') {
      newBankroll -= tx.amount;
    } else {
      newBankroll += tx.amount;
    }

    setData({
      ...data,
      currentBankroll: Math.max(0, newBankroll),
      transactions: data.transactions.filter(t => t.id !== id),
    });
  };

  const resetAll = () => {
    if (confirm(t('bankroll.resetConfirm'))) {
      setData(getDefaultData());
      setShowSetup(true);
    }
  };

  // Calculate stats
  const totalDeposits = data.transactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = data.transactions
    .filter(t => t.type === 'withdraw')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWins = data.transactions
    .filter(t => t.type === 'bet_win')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalLosses = data.transactions
    .filter(t => t.type === 'bet_loss')
    .reduce((sum, t) => sum + t.amount, 0);

  const profitLoss = data.currentBankroll - totalDeposits + totalWithdrawals;
  const roi = totalDeposits > 0 ? ((profitLoss / totalDeposits) * 100).toFixed(1) : 0;

  const betsWon = data.transactions.filter(t => t.type === 'bet_win').length;
  const betsLost = data.transactions.filter(t => t.type === 'bet_loss').length;
  const totalBets = betsWon + betsLost;
  const winRate = totalBets > 0 ? ((betsWon / totalBets) * 100).toFixed(0) : 0;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatAmount = (amt, type) => {
    const isPositive = type === 'deposit' || type === 'bet_win';
    const symbol = advertiser?.currency || '€';
    return `${isPositive ? '+' : '-'}${symbol}${amt.toFixed(2)}`;
  };

  const getTypeColor = (type) => {
    if (type === 'deposit') return 'text-blue-600 bg-blue-50';
    if (type === 'withdraw') return 'text-orange-600 bg-orange-50';
    if (type === 'bet_win') return 'text-green-600 bg-green-50';
    return 'text-red-600 bg-red-50';
  };

  const getTypeIcon = (type) => {
    if (type === 'deposit') return '↓';
    if (type === 'withdraw') return '↑';
    if (type === 'bet_win') return '✓';
    return '✗';
  };

  // Setup modal
  if (showSetup) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
        <div className="bg-white px-5 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <h1 className="text-lg font-bold">{t('bankroll.title')}</h1>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('bankroll.setYourBankroll')}</h2>
              <p className="text-gray-500 text-sm">{t('bankroll.enterStartingBankroll')}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('bankroll.startingAmount')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">{advertiser?.currency || '€'}</span>
                <input
                  type="number"
                  value={setupAmount}
                  onChange={(e) => setSetupAmount(e.target.value)}
                  placeholder="100"
                  className="w-full pl-10 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <button
              onClick={handleSetup}
              disabled={!setupAmount || parseFloat(setupAmount) <= 0}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {t('bankroll.startTracking')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-24">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <h1 className="text-lg font-bold">{t('bankroll.title')}</h1>
        </div>
        <button onClick={resetAll} className="text-gray-400 text-sm">{t('bankroll.reset')}</button>
      </div>

      {/* Current Bankroll Card */}
      <div className="px-5 mt-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-green-100 text-sm mb-1">{t('bankroll.currentBankroll')}</p>
          <p className="text-4xl font-bold mb-4">{advertiser?.currency || '€'}{data.currentBankroll.toFixed(2)}</p>

          <div className="flex gap-3">
            <div className={`flex-1 rounded-xl p-3 ${profitLoss >= 0 ? 'bg-white/20' : 'bg-red-500/30'}`}>
              <p className="text-xs text-green-100">{t('bankroll.pl')}</p>
              <p className="text-lg font-bold">{profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)}</p>
            </div>
            <div className="flex-1 bg-white/20 rounded-xl p-3">
              <p className="text-xs text-green-100">{t('bankroll.roi')}</p>
              <p className="text-lg font-bold">{roi}%</p>
            </div>
            <div className="flex-1 bg-white/20 rounded-xl p-3">
              <p className="text-xs text-green-100">{t('bankroll.winRate')}</p>
              <p className="text-lg font-bold">{winRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-5 mt-4 grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-500">↓</span>
            <span className="text-xs text-gray-500">{t('bankroll.deposits')}</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{advertiser?.currency || '€'}{totalDeposits.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-orange-500">↑</span>
            <span className="text-xs text-gray-500">{t('bankroll.withdrawals')}</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{advertiser?.currency || '€'}{totalWithdrawals.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-500">✓</span>
            <span className="text-xs text-gray-500">{t('bankroll.betsWon')} ({betsWon})</span>
          </div>
          <p className="text-lg font-bold text-green-600">+{advertiser?.currency || '€'}{totalWins.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-500">✗</span>
            <span className="text-xs text-gray-500">{t('bankroll.betsLost')} ({betsLost})</span>
          </div>
          <p className="text-lg font-bold text-red-600">-{advertiser?.currency || '€'}{totalLosses.toFixed(2)}</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="px-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">{t('bankroll.recentTransactions')}</h2>
          <span className="text-xs text-gray-400">{data.transactions.length} total</span>
        </div>

        {data.transactions.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-400">{t('bankroll.noTransactions')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl divide-y divide-gray-100">
            {data.transactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getTypeColor(tx.type)}`}>
                    {getTypeIcon(tx.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.note}</p>
                    <p className="text-xs text-gray-400">{formatDate(tx.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`font-bold ${tx.type === 'deposit' || tx.type === 'bet_win' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatAmount(tx.amount, tx.type)}
                  </p>
                  <button
                    onClick={() => deleteTransaction(tx.id)}
                    className="text-gray-300 hover:text-red-500 p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Transaction FAB */}
      <div className="fixed bottom-24 right-5">
        <button
          onClick={() => setShowAddModal(true)}
          className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center text-white"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
          </svg>
        </button>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"/>
            <h3 className="text-lg font-bold text-center mb-4">{t('bankroll.addTransaction')}</h3>

            {/* Type selector */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { type: 'deposit', label: t('bankroll.deposit'), icon: '↓', color: 'blue' },
                { type: 'withdraw', label: t('bankroll.withdraw'), icon: '↑', color: 'orange' },
                { type: 'bet_win', label: t('bankroll.win'), icon: '✓', color: 'green' },
                { type: 'bet_loss', label: t('bankroll.loss'), icon: '✗', color: 'red' },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => setModalType(item.type)}
                  className={`py-3 rounded-xl text-center transition-all ${
                    modalType === item.type
                      ? `bg-${item.color}-100 border-2 border-${item.color}-500 text-${item.color}-700`
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <p className="text-xs mt-1">{item.label}</p>
                </button>
              ))}
            </div>

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankroll.amount')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{advertiser?.currency || '€'}</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            {/* Note */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankroll.noteOptional')}</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={getDefaultNote(modalType)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
              >
                {t('bankroll.cancel')}
              </button>
              <button
                onClick={handleAddTransaction}
                disabled={!amount || parseFloat(amount) <= 0}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {t('bankroll.add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
