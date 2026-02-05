import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Statistics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  const total = user?.total_predictions || 0;
  const correct = user?.correct_predictions || 0;
  const wrong = total - correct;
  const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : '0.0';

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api.getPredictionHistory(20);
      setPredictions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Calculate circle progress
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = (parseFloat(accuracy) / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-8">
      <div className="bg-white px-5 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <h1 className="text-lg font-bold">Statistics</h1>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* AI Predictions Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
              <span className="font-bold">AI Predictions</span>
            </div>
            {!user?.is_premium && <span className="badge-pro">PRO</span>}
          </div>

          {/* Circular Progress */}
          <div className="flex justify-center mb-4">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="8"/>
                <circle cx="70" cy="70" r={radius} fill="none" stroke={parseFloat(accuracy) > 50 ? '#4CAF50' : '#F44336'} strokeWidth="8"
                  strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${parseFloat(accuracy) > 50 ? 'text-green-500' : 'text-red-500'}`}>{accuracy}%</span>
                <span className="text-xs text-gray-400">Accuracy</span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-primary-600">{total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-500">{correct}</p>
              <p className="text-xs text-gray-500">Correct</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-500">{wrong}</p>
              <p className="text-xs text-gray-500">Wrong</p>
            </div>
          </div>
        </div>

        {/* Saved Predictions */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"/>
            </svg>
            <h3 className="font-bold">Saved Predictions</h3>
          </div>
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"/>
            </svg>
            <p className="font-semibold text-gray-700">No saved predictions</p>
            <p className="text-sm text-gray-400">Save predictions from match details to track your personal picks</p>
          </div>
        </div>

        {/* Saved Bet Slips */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
            </svg>
            <h3 className="font-bold">Saved Bet Slips</h3>
          </div>
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
            </svg>
            <p className="font-semibold text-gray-700">No saved bet slips</p>
            <p className="text-sm text-gray-400">Save bet slips from Betting Tools to track your accumulators</p>
          </div>
        </div>
      </div>
    </div>
  );
}
