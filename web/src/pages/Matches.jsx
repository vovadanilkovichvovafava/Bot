import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import footballApi from '../api/footballApi';
import MatchCard from '../components/MatchCard';
import { BOOKMAKER } from '../components/SupportChat';

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
  const [liveFixtures, setLiveFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveLoading, setLiveLoading] = useState(true);
  const navigate = useNavigate();
  const liveInterval = useRef(null);

  useEffect(() => {
    if (tab === 'today') loadMatches();
    if (tab === 'live') loadLive();

    // Cleanup interval on tab change
    return () => {
      if (liveInterval.current) clearInterval(liveInterval.current);
    };
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

  const loadLive = async () => {
    setLiveLoading(true);
    try {
      const data = await footballApi.getLiveFixtures();
      setLiveFixtures(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLiveLoading(false);
    }

    // Auto-refresh every 30 seconds
    if (liveInterval.current) clearInterval(liveInterval.current);
    liveInterval.current = setInterval(async () => {
      try {
        const data = await footballApi.getLiveFixtures();
        setLiveFixtures(data);
      } catch (_) {}
    }, 30000);
  };

  // Group live fixtures by league
  const liveByLeague = liveFixtures.reduce((acc, f) => {
    const key = f.league.name;
    if (!acc[key]) acc[key] = { league: f.league, fixtures: [] };
    acc[key].fixtures.push(f);
    return acc;
  }, {});

  const tabs = [
    { key: 'today', label: 'Today' },
    { key: 'live', label: 'Live', count: liveFixtures.length },
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
              className={`flex-1 py-3 text-sm font-medium relative flex items-center justify-center gap-1.5 ${
                tab === t.key ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {t.count}
                </span>
              )}
              {tab === t.key && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary-600 rounded-full"/>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 pb-4">
        {/* Promo Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-lg">🎁</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Бонус {BOOKMAKER.bonus}</p>
              <p className="text-[11px] text-gray-600">Регистрируйся в {BOOKMAKER.name}</p>
            </div>
            <a
              href={BOOKMAKER.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shrink-0"
            >
              Получить
            </a>
          </div>
        </div>

        {tab === 'today' && (
          <>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="card"><div className="shimmer h-16 w-full"/></div>
                ))}
              </div>
            ) : matches.length === 0 ? (
              <EmptyState title="No Matches Today" subtitle="Check back later for upcoming matches"/>
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
            {liveLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="card"><div className="shimmer h-16 w-full"/></div>
                ))}
                <p className="text-center text-gray-400 text-sm">Loading live matches...</p>
              </div>
            ) : liveFixtures.length === 0 ? (
              <EmptyState title="No Live Matches" subtitle="There are no matches currently in play"/>
            ) : (
              <div className="space-y-4">
                {/* Auto-refresh indicator */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
                  Live &bull; updates every 30s
                </div>

                {Object.values(liveByLeague).map(({ league, fixtures }) => (
                  <div key={league.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <img src={league.logo} alt="" className="w-5 h-5 object-contain"/>
                      <span className="text-xs font-semibold text-gray-500 uppercase">{league.name}</span>
                      <img src={league.flag} alt="" className="w-4 h-3 object-contain ml-auto"/>
                    </div>
                    <div className="space-y-2">
                      {fixtures.map(f => (
                        <LiveMatchCard key={f.fixture.id} fixture={f} onClick={() => navigate(`/live/${f.fixture.id}`)}/>
                      ))}
                    </div>
                  </div>
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

function LiveMatchCard({ fixture, onClick }) {
  const f = fixture;
  const elapsed = f.fixture.status.elapsed;
  const statusShort = f.fixture.status.short;

  const minuteDisplay = statusShort === 'HT' ? 'HT' : elapsed ? `${elapsed}'` : statusShort;

  return (
    <div className="card border border-red-100 cursor-pointer hover:shadow-lg hover:border-red-200 transition-all" onClick={onClick}>
      <div className="flex items-center gap-3">
        {/* Home */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <img src={f.teams.home.logo} alt="" className="w-6 h-6 object-contain"/>
            <span className={`text-sm font-medium ${f.teams.home.winner ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
              {f.teams.home.name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <img src={f.teams.away.logo} alt="" className="w-6 h-6 object-contain"/>
            <span className={`text-sm font-medium ${f.teams.away.winner ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
              {f.teams.away.name}
            </span>
          </div>
        </div>

        {/* Score */}
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">{f.goals.home ?? 0}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-bold text-gray-900">{f.goals.away ?? 0}</span>
          </div>
        </div>

        {/* Minute */}
        <div className="w-12 text-center">
          <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center justify-center gap-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>
            {minuteDisplay}
          </div>
        </div>
      </div>

      {/* Events (last 3) */}
      {f.events && f.events.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-50 flex gap-2 overflow-x-auto">
          {f.events.slice(-3).map((ev, i) => (
            <span key={i} className="text-[10px] text-gray-400 whitespace-nowrap flex items-center gap-1">
              <span className="font-semibold">{ev.time.elapsed}'</span>
              {ev.type === 'Goal' && <span>&#9917;</span>}
              {ev.type === 'Card' && ev.detail === 'Yellow Card' && <span className="w-2 h-2.5 bg-yellow-400 rounded-sm inline-block"/>}
              {ev.type === 'Card' && ev.detail === 'Red Card' && <span className="w-2 h-2.5 bg-red-500 rounded-sm inline-block"/>}
              {ev.type === 'subst' && <span>&#8644;</span>}
              {ev.player?.name?.split(' ').pop()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, subtitle }) {
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
