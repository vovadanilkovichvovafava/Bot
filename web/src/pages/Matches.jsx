import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import MatchCard from '../components/MatchCard';

const LEAGUES = [
  { code: 'PL', name: 'Premier League', country: 'England', flag: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F' },
  { code: 'PD', name: 'La Liga', country: 'Spain', flag: '\uD83C\uDDEA\uD83C\uDDF8' },
  { code: 'BL1', name: 'Bundesliga', country: 'Germany', flag: '\uD83C\uDDE9\uD83C\uDDEA' },
  { code: 'SA', name: 'Serie A', country: 'Italy', flag: '\uD83C\uDDEE\uD83C\uDDF9' },
  { code: 'FL1', name: 'Ligue 1', country: 'France', flag: '\uD83C\uDDEB\uD83C\uDDF7' },
  { code: 'CL', name: 'Champions League', country: 'Europe', flag: '\uD83C\uDFC6' },
  { code: 'EL', name: 'Europa League', country: 'Europe', flag: '\uD83C\uDFC5' },
];

export default function Matches() {
  const [tab, setTab] = useState('today');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (tab === 'today' || tab === 'live') {
      loadMatches();
    }
  }, [tab]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = await api.getTodayMatches();
      setMatches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const liveMatches = matches.filter(m =>
    ['in_play', 'live', 'paused', 'halftime'].includes(m.status?.toLowerCase())
  );

  const tabs = [
    { key: 'today', label: 'Today' },
    { key: 'live', label: 'Live' },
    { key: 'leagues', label: 'Leagues' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-0">
        <h1 className="text-xl font-bold text-center mb-4">Matches</h1>
        <div className="flex border-b border-gray-100">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium relative ${
                tab === t.key ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              {t.label}
              {tab === t.key && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary-600 rounded-full"/>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 pb-4">
        {tab === 'today' && (
          <>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="card"><div className="shimmer h-16 w-full"/></div>
                ))}
              </div>
            ) : matches.length === 0 ? (
              <EmptyState icon="ball" title="No Matches Today" subtitle="Check back later for upcoming matches"/>
            ) : (
              <div className="space-y-3">
                {matches.map(match => (
                  <MatchCard key={match.id} match={match} compact/>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'live' && (
          <>
            {loading ? (
              <div className="space-y-3">
                {[1,2].map(i => (
                  <div key={i} className="card"><div className="shimmer h-16 w-full"/></div>
                ))}
              </div>
            ) : liveMatches.length === 0 ? (
              <EmptyState icon="ball" title="No Live Matches" subtitle="There are no matches currently in play"/>
            ) : (
              <div className="space-y-3">
                {liveMatches.map(match => (
                  <MatchCard key={match.id} match={match} compact/>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'leagues' && (
          <div className="space-y-2">
            {LEAGUES.map(league => (
              <div
                key={league.code}
                onClick={() => navigate(`/league/${league.code}`)}
                className="card flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <span className="text-3xl">{league.flag}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{league.name}</p>
                  <p className="text-sm text-gray-500">{league.code}</p>
                </div>
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
          <line x1="12" y1="2" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="22"/>
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 text-sm">{subtitle}</p>
    </div>
  );
}
