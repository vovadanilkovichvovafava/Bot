import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'bet_slip_data';

const getDefaultData = () => ({
  selections: [],
  stake: '',
  savedSlips: [],
});

export default function BetSlipBuilder() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState(getDefaultData);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSelection, setNewSelection] = useState({ event: '', selection: '', odds: '' });
  const [showSavedSlips, setShowSavedSlips] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData({ ...getDefaultData(), ...parsed });
      } catch (e) {
        console.error('Failed to parse saved bet slip data');
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const addSelection = () => {
    if (!newSelection.event || !newSelection.odds) return;

    const odds = parseFloat(newSelection.odds);
    if (isNaN(odds) || odds <= 1) return;

    const selection = {
      id: Date.now(),
      event: newSelection.event,
      selection: newSelection.selection || 'Win',
      odds: odds,
    };

    setData(prev => ({
      ...prev,
      selections: [...prev.selections, selection],
    }));

    setNewSelection({ event: '', selection: '', odds: '' });
    setShowAddModal(false);
  };

  const removeSelection = (id) => {
    setData(prev => ({
      ...prev,
      selections: prev.selections.filter(s => s.id !== id),
    }));
  };

  const clearSlip = () => {
    setData(prev => ({
      ...prev,
      selections: [],
      stake: '',
    }));
  };

  const saveSlip = () => {
    if (data.selections.length === 0) return;

    const slip = {
      id: Date.now(),
      date: new Date().toISOString(),
      selections: [...data.selections],
      stake: data.stake,
      totalOdds: calculateTotalOdds(),
    };

    setData(prev => ({
      ...prev,
      savedSlips: [slip, ...prev.savedSlips].slice(0, 20), // Keep last 20
    }));

    clearSlip();
  };

  const loadSlip = (slip) => {
    setData(prev => ({
      ...prev,
      selections: [...slip.selections],
      stake: slip.stake,
    }));
    setShowSavedSlips(false);
  };

  const deleteSavedSlip = (id) => {
    setData(prev => ({
      ...prev,
      savedSlips: prev.savedSlips.filter(s => s.id !== id),
    }));
  };

  const calculateTotalOdds = () => {
    if (data.selections.length === 0) return 0;
    return data.selections.reduce((acc, sel) => acc * sel.odds, 1);
  };

  const calculatePotentialWin = () => {
    const stake = parseFloat(data.stake) || 0;
    const totalOdds = calculateTotalOdds();
    return stake * totalOdds;
  };

  const calculateProfit = () => {
    const stake = parseFloat(data.stake) || 0;
    return calculatePotentialWin() - stake;
  };

  const totalOdds = calculateTotalOdds();
  const potentialWin = calculatePotentialWin();
  const profit = calculateProfit();

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
          <h1 className="text-xl font-bold">Bet Slip Builder</h1>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{data.selections.length}</p>
            <p className="text-xs text-blue-600/70">Selections</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{totalOdds.toFixed(2)}</p>
            <p className="text-xs text-purple-600/70">Total Odds</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{data.savedSlips.length}</p>
            <p className="text-xs text-green-600/70">Saved</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-5 py-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowSavedSlips(false)}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              !showSavedSlips ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Current Slip
          </button>
          <button
            onClick={() => setShowSavedSlips(true)}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              showSavedSlips ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Saved Slips ({data.savedSlips.length})
          </button>
        </div>

        {!showSavedSlips ? (
          <>
            {/* Current Selections */}
            <div className="space-y-2">
              {data.selections.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                    </svg>
                  </div>
                  <p className="text-gray-500 mb-2">No selections yet</p>
                  <p className="text-sm text-gray-400">Add selections to build your bet slip</p>
                </div>
              ) : (
                data.selections.map((selection) => (
                  <div key={selection.id} className="bg-white rounded-xl p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{selection.event}</p>
                      <p className="text-sm text-gray-500">{selection.selection}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-lg">
                        {selection.odds.toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeSelection(selection.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Selection Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full bg-white border-2 border-dashed border-gray-300 rounded-xl py-4 flex items-center justify-center gap-2 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
              </svg>
              Add Selection
            </button>

            {/* Stake & Returns */}
            {data.selections.length > 0 && (
              <div className="bg-white rounded-2xl p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('betting.stake')}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={data.stake}
                      onChange={(e) => setData(prev => ({ ...prev, stake: e.target.value }))}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                    />
                  </div>
                </div>

                {/* Quick Amounts */}
                <div className="flex gap-2">
                  {[5, 10, 25, 50, 100].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setData(prev => ({ ...prev, stake: amount.toString() }))}
                      className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>

                {/* Summary */}
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Odds</span>
                    <span className="font-semibold">{totalOdds.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('betting.stake')}</span>
                    <span className="font-semibold">${parseFloat(data.stake || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('betting.potentialWin')}</span>
                    <span className="font-bold text-green-600 text-lg">${potentialWin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Profit</span>
                    <span className="font-semibold text-green-600">+${profit.toFixed(2)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={clearSlip}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={saveSlip}
                    className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"/>
                    </svg>
                    Save Slip
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Saved Slips */
          <div className="space-y-3">
            {data.savedSlips.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"/>
                  </svg>
                </div>
                <p className="text-gray-500 mb-2">No saved slips</p>
                <p className="text-sm text-gray-400">Save bet slips to access them later</p>
              </div>
            ) : (
              data.savedSlips.map((slip) => (
                <div key={slip.id} className="bg-white rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {slip.selections.length} Selection{slip.selections.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(slip.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600">{slip.totalOdds.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">odds</p>
                    </div>
                  </div>

                  <div className="space-y-1 mb-3">
                    {slip.selections.slice(0, 3).map((sel, idx) => (
                      <p key={idx} className="text-sm text-gray-600 truncate">
                        {sel.event} - {sel.selection} @ {sel.odds.toFixed(2)}
                      </p>
                    ))}
                    {slip.selections.length > 3 && (
                      <p className="text-sm text-gray-400">+{slip.selections.length - 3} more</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => loadSlip(slip)}
                      className="flex-1 py-2 bg-blue-100 text-blue-700 font-semibold rounded-lg text-sm hover:bg-blue-200 transition-colors"
                    >
                      Load Slip
                    </button>
                    <button
                      onClick={() => deleteSavedSlip(slip.id)}
                      className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add Selection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowAddModal(false)}>
          <div className="absolute inset-0 bg-black/40"/>
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"/>

            <h3 className="text-xl font-bold mb-6">Add Selection</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event / Match</label>
                <input
                  type="text"
                  value={newSelection.event}
                  onChange={(e) => setNewSelection(prev => ({ ...prev, event: e.target.value }))}
                  placeholder="e.g., Arsenal vs Chelsea"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Selection</label>
                <input
                  type="text"
                  value={newSelection.selection}
                  onChange={(e) => setNewSelection(prev => ({ ...prev, selection: e.target.value }))}
                  placeholder="e.g., Arsenal Win, Over 2.5"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Odds (Decimal)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={newSelection.odds}
                  onChange={(e) => setNewSelection(prev => ({ ...prev, odds: e.target.value }))}
                  placeholder="e.g., 1.95"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={addSelection}
                disabled={!newSelection.event || !newSelection.odds}
                className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Slip
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
