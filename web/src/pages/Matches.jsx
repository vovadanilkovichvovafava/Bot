import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import footballApi from '../api/footballApi';
import MatchCard from '../components/MatchCard';
import { BOOKMAKER } from '../components/SupportChat';

// Popular league IDs for API-Football
const POPULAR_LEAGUE_IDS = [
  39,   // Premier League
  140,  // La Liga
  78,   // Bundesliga
  135,  // Serie A
  61,   // Ligue 1
  2,    // Champions League
  3,    // Europa League
  848,  // Conference League
  88,   // Eredivisie
  94,   // Primeira Liga
];

// League info for display
const LEAGUES_INFO = {
  popular: [
    { id: 39, code: 'PL', name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { id: 140, code: 'PD', name: 'La Liga', country: 'Spain', flag: '🇪🇸' },
    { id: 78, code: 'BL1', name: 'Bundesliga', country: 'Germany', flag: '🇩🇪' },
    { id: 135, code: 'SA', name: 'Serie A', country: 'Italy', flag: '🇮🇹' },
    { id: 61, code: 'FL1', name: 'Ligue 1', country: 'France', flag: '🇫🇷' },
  ],
  euro: [
    { id: 2, code: 'CL', name: 'Champions League', country: 'Europe', flag: '🏆' },
    { id: 3, code: 'EL', name: 'Europa League', country: 'Europe', flag: '🏅' },
    { id: 848, code: 'ECL', name: 'Conference League', country: 'Europe', flag: '🎖️' },
  ],
  other: [
    { id: 88, code: 'ERE', name: 'Eredivisie', country: 'Netherlands', flag: '🇳🇱' },
    { id: 94, code: 'PPL', name: 'Primeira Liga', country: 'Portugal', flag: '🇵🇹' },
    { id: 203, code: 'TUR', name: 'Süper Lig', country: 'Turkey', flag: '🇹🇷' },
    { id: 307, code: 'SAU', name: 'Saudi Pro League', country: 'Saudi Arabia', flag: '🇸🇦' },
    { id: 253, code: 'MLS', name: 'MLS', country: 'USA', flag: '🇺🇸' },
  ],
};

export default function Matches() {
  const [tab, setTab] = useState('today');
  const [matches, setMatches] = useState([]);
  const [todayFixtures, setTodayFixtures] = useState([]);
  const [liveFixtures, setLiveFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveLoading, setLiveLoading] = useState(true);
  const [showAllLeagues, setShowAllLeagues] = useState(false);
  const navigate = useNavigate();
  const liveInterval = useRef(null);

  useEffect(() => {
    if (tab === 'today') loadTodayMatches();
    if (tab === 'live') loadLive();

    return () => {
      if (liveInterval.current) clearInterval(liveInterval.current);
    };
  }, [tab]);

  const loadTodayMatches = async () => {
    setLoading(true);
    try {
      // Load from API-Football for consistency
      const data = await footballApi.getTodayFixtures();
      setTodayFixtures(data || []);
      // Also load from backend for AI predictions
      const backendData = await api.getTodayMatches();
      setMatches(backendData || []);
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
      setLiveFixtures(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLiveLoading(false);
    }

    if (liveInterval.current) clearInterval(liveInterval.current);
    liveInterval.current = setInterval(async () => {
      try {
        const data = await footballApi.getLiveFixtures();
        setLiveFixtures(data || []);
      } catch (_) {}
    }, 30000);
  };

  // Check if league is popular
  const isPopularLeague = (leagueId) => POPULAR_LEAGUE_IDS.includes(leagueId);

  // Group fixtures by popular/other
  const groupFixtures = (fixtures) => {
    const popular = [];
    const other = [];

    fixtures.forEach(f => {
      if (isPopularLeague(f.league.id)) {
        popular.push(f);
      } else {
        other.push(f);
      }
    });

    // Group by league within each category
    const groupByLeague = (items) => {
      return items.reduce((acc, f) => {
        const key = f.league.id;
        if (!acc[key]) acc[key] = { league: f.league, fixtures: [] };
        acc[key].fixtures.push(f);
        return acc;
      }, {});
    };

    return {
      popular: groupByLeague(popular),
      other: groupByLeague(other),
      popularCount: popular.length,
      otherCount: other.length,
    };
  };

  const todayGrouped = groupFixtures(todayFixtures);
  const liveGrouped = groupFixtures(liveFixtures);

  const tabs = [
    { key: 'today', label: 'Today', count: todayFixtures.length },
    { key: 'live', label: 'Live', count: liveFixtures.length, isLive: true },
    { key: 'leagues', label: 'Leagues' },
  ];

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-0 sticky top-0 z-10">
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
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                  t.isLive ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
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

      <div className="px-5 pt-4">
        {/* Partner Banner */}
        <a
          href={BOOKMAKER.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-slate-800 rounded-xl p-3 mb-4"
        >
          <span className="text-lg">🎯</span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium">Bonus {BOOKMAKER.bonus} at {BOOKMAKER.name}</p>
          </div>
          <span className="text-slate-400 text-xs">Get It →</span>
        </a>

        {/* TODAY TAB */}
        {tab === 'today' && (
          <>
            {loading ? (
              <LoadingSkeleton />
            ) : todayFixtures.length === 0 ? (
              <EmptyState title="No matches today" subtitle="Check back later"/>
            ) : (
              <>
                {/* Filter toggle */}
                <FilterToggle
                  showAll={showAllLeagues}
                  setShowAll={setShowAllLeagues}
                  popularCount={todayGrouped.popularCount}
                  otherCount={todayGrouped.otherCount}
                />

                {/* Popular leagues */}
                {Object.keys(todayGrouped.popular).length > 0 && (
                  <LeagueSection
                    leagues={todayGrouped.popular}
                    navigate={navigate}
                    isLive={false}
                    isPopular={true}
                  />
                )}

                {/* Other leagues */}
                {showAllLeagues && Object.keys(todayGrouped.other).length > 0 && (
                  <LeagueSection
                    leagues={todayGrouped.other}
                    navigate={navigate}
                    isLive={false}
                    isPopular={false}
                    collapsed
                  />
                )}
              </>
            )}
          </>
        )}

        {/* LIVE TAB */}
        {tab === 'live' && (
          <>
            {liveLoading ? (
              <LoadingSkeleton />
            ) : liveFixtures.length === 0 ? (
              <EmptyState title="No live matches" subtitle="No matches are being played right now"/>
            ) : (
              <>
                {/* Live indicator */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-4">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
                  Updates every 30 sec
                </div>

                {/* Filter toggle */}
                <FilterToggle
                  showAll={showAllLeagues}
                  setShowAll={setShowAllLeagues}
                  popularCount={liveGrouped.popularCount}
                  otherCount={liveGrouped.otherCount}
                />

                {/* Popular leagues */}
                {Object.keys(liveGrouped.popular).length > 0 && (
                  <LeagueSection
                    leagues={liveGrouped.popular}
                    navigate={navigate}
                    isLive={true}
                    isPopular={true}
                  />
                )}

                {/* Other leagues */}
                {showAllLeagues && Object.keys(liveGrouped.other).length > 0 && (
                  <LeagueSection
                    leagues={liveGrouped.other}
                    navigate={navigate}
                    isLive={true}
                    isPopular={false}
                    collapsed
                  />
                )}

                {/* No popular leagues live */}
                {Object.keys(liveGrouped.popular).length === 0 && !showAllLeagues && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm mb-3">No matches in top leagues</p>
                    <button
                      onClick={() => setShowAllLeagues(true)}
                      className="text-primary-600 text-sm font-medium"
                    >
                      Show all {liveGrouped.otherCount} matches →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* LEAGUES TAB */}
        {tab === 'leagues' && (
          <div className="space-y-6">
            {/* Popular */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                ⭐ Top 5 Leagues
              </h3>
              <div className="space-y-2">
                {LEAGUES_INFO.popular.map(league => (
                  <LeagueCard key={league.id} league={league} navigate={navigate}/>
                ))}
              </div>
            </div>

            {/* Euro */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                🏆 European Cups
              </h3>
              <div className="space-y-2">
                {LEAGUES_INFO.euro.map(league => (
                  <LeagueCard key={league.id} league={league} navigate={navigate}/>
                ))}
              </div>
            </div>

            {/* Other popular */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                🌍 Other Popular
              </h3>
              <div className="space-y-2">
                {LEAGUES_INFO.other.map(league => (
                  <LeagueCard key={league.id} league={league} navigate={navigate}/>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterToggle({ showAll, setShowAll, popularCount, otherCount }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={() => setShowAll(false)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          !showAll
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        Top Leagues ({popularCount})
      </button>
      <button
        onClick={() => setShowAll(true)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          showAll
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All Matches ({popularCount + otherCount})
      </button>
    </div>
  );
}

function LeagueSection({ title, leagues, navigate, isLive, collapsed, isPopular }) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const leagueList = Object.values(leagues);

  if (leagueList.length === 0) return null;

  const matchCount = leagueList.reduce((acc, l) => acc + l.fixtures.length, 0);

  return (
    <div className={`mb-6 rounded-2xl overflow-hidden ${isPopular ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'}`}>
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center justify-between w-full px-4 py-3 ${isPopular ? 'bg-gradient-to-r from-amber-100 to-orange-100' : 'bg-gray-100'}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{isPopular ? '⭐' : '🌍'}</span>
          <h3 className={`font-bold ${isPopular ? 'text-amber-800' : 'text-gray-700'}`}>
            {isPopular ? 'Top Leagues' : 'Other Leagues'}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isPopular ? 'bg-amber-200 text-amber-700' : 'bg-gray-200 text-gray-600'}`}>
            {matchCount} matches
          </span>
        </div>
        <svg
          className={`w-5 h-5 transition-transform ${isPopular ? 'text-amber-600' : 'text-gray-500'} ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {leagueList.map(({ league, fixtures }) => (
            <div key={league.id}>
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200/50">
                <img src={league.logo} alt="" className="w-5 h-5 object-contain"/>
                <span className="text-sm font-semibold text-gray-700">{league.name}</span>
                <span className="text-[10px] text-gray-400 ml-auto">{league.country}</span>
              </div>
              <div className="space-y-2">
                {fixtures.map(f => (
                  isLive ? (
                    <LiveMatchCard
                      key={f.fixture.id}
                      fixture={f}
                      onClick={() => navigate(`/live/${f.fixture.id}`)}
                    />
                  ) : (
                    <FixtureCard
                      key={f.fixture.id}
                      fixture={f}
                      onClick={() => navigate(`/match/${f.fixture.id}`)}
                    />
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FixtureCard({ fixture, onClick }) {
  const f = fixture;
  const date = new Date(f.fixture.date);
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const status = f.fixture.status.short;

  return (
    <div
      className="bg-white rounded-xl p-3 border border-gray-100 cursor-pointer hover:shadow-md transition-all"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <img src={f.teams.home.logo} alt="" className="w-5 h-5 object-contain"/>
            <span className="text-sm font-medium text-gray-800 truncate">{f.teams.home.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <img src={f.teams.away.logo} alt="" className="w-5 h-5 object-contain"/>
            <span className="text-sm font-medium text-gray-800 truncate">{f.teams.away.name}</span>
          </div>
        </div>
        <div className="text-center">
          {status === 'NS' ? (
            <span className="text-sm font-semibold text-gray-900">{time}</span>
          ) : status === 'FT' ? (
            <div>
              <span className="text-lg font-bold text-gray-900">{f.goals.home} - {f.goals.away}</span>
              <p className="text-[10px] text-gray-400">Finished</p>
            </div>
          ) : (
            <span className="text-xs text-gray-500">{status}</span>
          )}
        </div>
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
    <div
      className="bg-white rounded-xl p-3 border-2 border-red-100 cursor-pointer hover:shadow-lg hover:border-red-200 transition-all"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <img src={f.teams.home.logo} alt="" className="w-5 h-5 object-contain"/>
            <span className={`text-sm font-medium ${f.teams.home.winner ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
              {f.teams.home.name}
            </span>
            <span className="text-lg font-bold text-gray-900 ml-auto">{f.goals.home ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <img src={f.teams.away.logo} alt="" className="w-5 h-5 object-contain"/>
            <span className={`text-sm font-medium ${f.teams.away.winner ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
              {f.teams.away.name}
            </span>
            <span className="text-lg font-bold text-gray-900 ml-auto">{f.goals.away ?? 0}</span>
          </div>
        </div>
        <div className="w-12 text-center">
          <div className="bg-red-500 text-white text-xs font-bold px-2 py-1.5 rounded-lg flex items-center justify-center gap-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>
            {minuteDisplay}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeagueCard({ league, navigate }) {
  return (
    <div
      onClick={() => navigate(`/league/${league.code}`)}
      className="bg-white rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
    >
      <span className="text-2xl">{league.flag}</span>
      <div className="flex-1">
        <p className="font-semibold text-gray-900">{league.name}</p>
        <p className="text-xs text-gray-500">{league.country}</p>
      </div>
      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
      </svg>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="shimmer h-12 w-full rounded-lg"/>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 text-sm">{subtitle}</p>
    </div>
  );
}
