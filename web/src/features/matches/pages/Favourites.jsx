import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import {
  getFavouriteTeams,
  getFavouriteLeagues,
  removeFavouriteTeam,
  removeFavouriteLeague,
  addFavouriteTeam,
  addFavouriteLeague,
  isTeamFavourite,
  toggleFavouriteTeam,
} from '../services/favouritesStore';
import footballApi from '../api/footballApi';
import FootballSpinner from '../../../shared/components/FootballSpinner';
import api from '../../../shared/api';

const FREE_AI_LIMIT = 5;

const QUICK_ADD_LEAGUES = [
  { id: 39, name: 'Premier League', country: 'England', logo: 'https://media.api-sports.io/football/leagues/39.png' },
  { id: 140, name: 'La Liga', country: 'Spain', logo: 'https://media.api-sports.io/football/leagues/140.png' },
  { id: 78, name: 'Bundesliga', country: 'Germany', logo: 'https://media.api-sports.io/football/leagues/78.png' },
  { id: 135, name: 'Serie A', country: 'Italy', logo: 'https://media.api-sports.io/football/leagues/135.png' },
  { id: 61, name: 'Ligue 1', country: 'France', logo: 'https://media.api-sports.io/football/leagues/61.png' },
  { id: 2, name: 'Champions League', country: 'Europe', logo: 'https://media.api-sports.io/football/leagues/2.png' },
];

function genOdds(seed) {
  const r = (n) => {
    const x = Math.sin((seed || 1) * 9301 + n * 49297) * 233280;
    return x - Math.floor(x);
  };
  return {
    home: (1.5 + r(1) * 2).toFixed(2),
    draw: (3.0 + r(2) * 1.2).toFixed(2),
    away: (1.8 + r(3) * 2.2).toFixed(2),
  };
}

export default function Favourites() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState('matches');
  const [teams, setTeams] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [matches, setMatches] = useState([]);
  const [oddsMap, setOddsMap] = useState({});
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState('teams');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const isFunnel2 = user?.funnel === 'funnel-2' || user?.funnel === 'funnel-4';
  const isPremium = user?.is_premium && !isFunnel2;
  const unlocked = isPremium || isFunnel2;

  const [aiRemaining, setAiRemaining] = useState(null);
  useEffect(() => {
    if (!unlocked) {
      api.getChatLimit()
        .then(data => setAiRemaining(data.remaining ?? FREE_AI_LIMIT))
        .catch(() => setAiRemaining(FREE_AI_LIMIT));
    }
  }, [unlocked]);
  const remaining = unlocked ? '∞' : (aiRemaining ?? FREE_AI_LIMIT);

  useEffect(() => {
    loadFavourites();
    loadMatches();
  }, []);

  const loadFavourites = () => {
    setTeams(getFavouriteTeams());
    setLeagues(getFavouriteLeagues());
  };

  const loadMatches = async () => {
    setLoadingMatches(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [fixtures, odds] = await Promise.all([
        footballApi.getFixturesByDate(today),
        footballApi.getOddsMapForDate(today),
      ]);
      setOddsMap(odds || {});

      const favTeams = getFavouriteTeams();
      const favTeamIds = new Set(favTeams.map(t => t.id));
      const favLeagueIds = new Set(getFavouriteLeagues().map(l => l.id));

      const relevant = (fixtures || []).filter(f => {
        const hId = f.teams?.home?.id;
        const aId = f.teams?.away?.id;
        const lId = f.league?.id;
        return favTeamIds.has(hId) || favTeamIds.has(aId) || favLeagueIds.has(lId);
      });
      setMatches(relevant);
    } catch {
      setMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleRemoveTeam = (teamId) => {
    removeFavouriteTeam(teamId);
    loadFavourites();
  };

  const handleRemoveLeague = (leagueId) => {
    removeFavouriteLeague(leagueId);
    loadFavourites();
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      if (addType === 'teams') {
        const results = await footballApi.searchTeams(query);
        setSearchResults(results.slice(0, 10));
      } else {
        const filtered = QUICK_ADD_LEAGUES.filter(l =>
          l.name.toLowerCase().includes(query.toLowerCase()) ||
          l.country.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
      }
    } catch { /* ignore */ }
    finally { setSearching(false); }
  };

  const tabs = [
    { key: 'matches', label: t('favourites.tabMatches', { defaultValue: 'MATCHES' }) },
    { key: 'teams', label: t('favourites.tabs.teams', { defaultValue: 'TEAMS' }).toUpperCase() },
    { key: 'leagues', label: t('favourites.tabLeagues', { defaultValue: 'LEAGUES' }) },
  ];

  const liveMatches = matches.filter(f => {
    const s = f.fixture?.status?.short;
    return s === '1H' || s === '2H' || s === 'HT' || s === 'ET' || s === 'LIVE';
  });
  const upcomingMatches = matches.filter(f => {
    const s = f.fixture?.status?.short;
    return s === 'NS' || s === 'TBD';
  });
  const finishedMatches = matches.filter(f => {
    const s = f.fixture?.status?.short;
    return s === 'FT' || s === 'AET' || s === 'PEN';
  });

  return (
    <div className="bg-[#F0F2F5] min-h-screen pb-24">
      {/* ===== HEADER ===== */}
      <div className="px-4 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, #1B2138 0%, #232a45 100%)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-white/15 ring-2 ring-white/10 flex items-center justify-center shrink-0"
          >
            <span className="text-white font-bold text-base">{(user?.username || 'U')[0].toUpperCase()}</span>
          </button>
          <h1 className="text-white text-xl font-black tracking-wide flex-1 truncate">STATSPRO</h1>
          <button
            onClick={() => navigate(unlocked ? '/settings' : '/pro-access')}
            className="flex items-center gap-1.5 bg-black/25 rounded-full pl-2 pr-3 py-1.5 shrink-0"
          >
            <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
            <span className="text-emerald-400 font-bold text-sm">{remaining} pts</span>
          </button>
          <button
            onClick={() => { setAddType('teams'); setShowAddModal(true); }}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"
          >
            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Title + Subtitle */}
      <div className="bg-white px-5 pt-5 pb-0">
        <h2 className="text-2xl font-black text-gray-900 mb-1">{t('favourites.myFavourites', { defaultValue: 'My Favourites' })}</h2>
        <p className="text-gray-500 text-sm mb-4">{t('favourites.subtitle', { defaultValue: 'Track your top matches, teams, and elite leagues.' })}</p>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {tabs.map(tb => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`flex-1 py-3 text-xs font-bold tracking-wider relative transition-colors ${
                tab === tb.key ? 'text-[#1B2138]' : 'text-gray-400'
              }`}
            >
              {tb.label}
              {tab === tb.key && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#1B2138] rounded-full"/>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* ===== MATCHES TAB ===== */}
        {tab === 'matches' && (
          <>
            {loadingMatches ? (
              <div className="flex justify-center py-16">
                <FootballSpinner size="sm" />
              </div>
            ) : matches.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                  </svg>
                </div>
                <p className="font-bold text-gray-900 mb-1">{t('favourites.noMatchesTitle', { defaultValue: 'No favourite matches today' })}</p>
                <p className="text-gray-500 text-sm mb-4">{t('favourites.noMatchesDesc', { defaultValue: 'Add teams or leagues to see their matches here.' })}</p>
                <button
                  onClick={() => { setAddType('teams'); setShowAddModal(true); }}
                  className="bg-[#1B2138] text-white font-bold text-sm px-5 py-2.5 rounded-xl"
                >
                  {t('favourites.addTeam')}
                </button>
              </div>
            ) : (
              <>
                {/* Live & Upcoming */}
                {(liveMatches.length > 0 || upcomingMatches.length > 0) && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{t('favourites.liveUpcoming', { defaultValue: 'LIVE & UPCOMING' })}</p>
                      <button onClick={() => navigate('/matches')} className="text-[#1B2138] text-xs font-bold">{t('home.viewAll', { defaultValue: 'View All' })}</button>
                    </div>
                    <div className="space-y-3">
                      {[...liveMatches, ...upcomingMatches].map(f => (
                        <MatchCard key={f.fixture.id} match={f} oddsMap={oddsMap} navigate={navigate} t={t} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Finished */}
                {finishedMatches.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">{t('favourites.finished', { defaultValue: 'FINISHED' })}</p>
                    <div className="space-y-3">
                      {finishedMatches.map(f => (
                        <MatchCard key={f.fixture.id} match={f} oddsMap={oddsMap} navigate={navigate} t={t} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ===== TEAMS TAB ===== */}
        {tab === 'teams' && (
          <>
            {teams.length === 0 ? (
              <EmptyState type="teams" onAdd={() => { setAddType('teams'); setShowAddModal(true); }} t={t} />
            ) : (
              <div className="space-y-2">
                {teams.map(team => (
                  <div key={team.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm">
                    <img src={team.logo} alt={team.name} className="w-12 h-12 object-contain" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{team.name}</p>
                      <p className="text-xs text-gray-400">{t('favourites.addedDate', { date: new Date(team.addedAt).toLocaleDateString() })}</p>
                    </div>
                    <button onClick={() => handleRemoveTeam(team.id)} className="p-2 text-amber-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => { setAddType('teams'); setShowAddModal(true); }}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                  </svg>
                  {t('favourites.addTeam')}
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== LEAGUES TAB ===== */}
        {tab === 'leagues' && (
          <>
            {leagues.length === 0 ? (
              <EmptyState type="leagues" onAdd={() => { setAddType('leagues'); setShowAddModal(true); }} t={t} />
            ) : (
              <div className="space-y-2">
                {leagues.map(league => (
                  <div
                    key={league.id}
                    onClick={() => navigate(`/league/${league.code || league.id}`)}
                    className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm cursor-pointer"
                  >
                    <img src={league.logo} alt={league.name} className="w-10 h-10 object-contain" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{league.name}</p>
                      <p className="text-xs text-gray-400">{league.country}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveLeague(league.id); }}
                      className="p-2 text-amber-400"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => { setAddType('leagues'); setShowAddModal(true); }}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                  </svg>
                  {t('favourites.addLeague')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddModal
          type={addType}
          searchQuery={searchQuery}
          searchResults={searchResults}
          searching={searching}
          onSearch={handleSearch}
          onClose={() => { setShowAddModal(false); setSearchQuery(''); setSearchResults([]); }}
          onAdded={() => { loadFavourites(); loadMatches(); }}
          existingIds={addType === 'teams' ? teams.map(i => i.id) : leagues.map(l => l.id)}
          t={t}
        />
      )}
    </div>
  );
}

function MatchCard({ match: f, oddsMap, navigate, t }) {
  const status = f.fixture?.status?.short;
  const isLive = status === '1H' || status === '2H' || status === 'HT' || status === 'ET' || status === 'LIVE';
  const isFinished = status === 'FT' || status === 'AET' || status === 'PEN';
  const fixtureId = f.fixture?.id;
  const minute = f.fixture?.status?.elapsed;

  const realOdds = oddsMap[String(fixtureId)];
  const odds = realOdds || genOdds(fixtureId);
  const homeFav = isTeamFavourite(f.teams?.home?.id);
  const awayFav = isTeamFavourite(f.teams?.away?.id);

  const kickoff = f.fixture?.date ? new Date(f.fixture.date) : null;
  const timeStr = kickoff ? `${String(kickoff.getHours()).padStart(2, '0')}:${String(kickoff.getMinutes()).padStart(2, '0')}` : '';

  return (
    <div
      onClick={() => navigate(isLive ? `/live/${fixtureId}` : `/match/${fixtureId}`)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer"
    >
      <div className="p-4">
        {/* Status row */}
        <div className="flex items-center justify-between mb-3">
          {isLive ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 text-xs font-bold">LIVE {minute}'</span>
            </div>
          ) : isFinished ? (
            <span className="text-gray-400 text-xs font-bold">FT</span>
          ) : (
            <span className="text-gray-500 text-xs font-medium">{t('favourites.todayAt', { defaultValue: 'TODAY' })} {timeStr}</span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-[10px]">{f.league?.name}</span>
            {(homeFav || awayFav) && (
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
              </svg>
            )}
          </div>
        </div>

        {/* Teams + Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img src={f.teams?.home?.logo} alt="" className="w-10 h-10 object-contain shrink-0" />
            <p className="font-bold text-gray-900 text-sm truncate">{f.teams?.home?.name}</p>
          </div>
          <div className="px-4 text-center shrink-0">
            {isLive || isFinished ? (
              <p className="text-2xl font-black text-gray-900">{f.goals?.home} - {f.goals?.away}</p>
            ) : (
              <p className="text-gray-400 font-bold text-sm">vs</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
            <p className="font-bold text-gray-900 text-sm truncate text-right">{f.teams?.away?.name}</p>
            <img src={f.teams?.away?.logo} alt="" className="w-10 h-10 object-contain shrink-0" />
          </div>
        </div>
      </div>

      {/* Odds bar */}
      {!isFinished && (
        <div className="grid grid-cols-3 gap-px bg-gray-100 border-t border-gray-100">
          {[
            { label: '1', value: odds.home },
            { label: 'X', value: odds.draw },
            { label: '2', value: odds.away },
          ].map((o, i) => (
            <div key={i} className={`text-center py-2.5 ${i === 1 ? 'bg-[#1B2138]' : 'bg-gray-50'}`}>
              <span className={`text-[10px] font-medium ${i === 1 ? 'text-white/60' : 'text-gray-400'}`}>{o.label}</span>
              <p className={`font-bold text-sm ${i === 1 ? 'text-white' : 'text-gray-900'}`}>{o.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ type, onAdd, t }) {
  return (
    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{t(`favourites.noFavourite.${type}`)}</h3>
      <p className="text-gray-500 text-sm mb-6">{t(`favourites.addForAccess.${type}`)}</p>
      <button onClick={onAdd} className="bg-[#1B2138] text-white font-bold text-sm px-6 py-2.5 rounded-xl">
        {type === 'teams' ? t('favourites.addTeam') : t('favourites.addLeague')}
      </button>
    </div>
  );
}

function AddModal({ type, searchQuery, searchResults, searching, onSearch, onClose, onAdded, existingIds, t }) {
  const handleAdd = (item) => {
    if (type === 'teams') addFavouriteTeam(item);
    else addFavouriteLeague(item);
    onAdded();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{type === 'teams' ? t('favourites.addTeam') : t('favourites.addLeague')}</h3>
          <button onClick={onClose} className="text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t(`favourites.search.${type}`)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {searching && <div className="text-center py-8"><FootballSpinner size="sm" /></div>}
          {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
            <p className="text-center py-8 text-gray-500">{t(`favourites.notFound.${type}`)}</p>
          )}
          {!searching && searchResults.length === 0 && searchQuery.length < 2 && type === 'leagues' && (
            <>
              <p className="text-xs text-gray-500 mb-2">{t('favourites.popularLeagues')}</p>
              {QUICK_ADD_LEAGUES.filter(l => !existingIds.includes(l.id)).map(league => (
                <button key={league.id} onClick={() => handleAdd(league)} className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                  <img src={league.logo} alt="" className="w-8 h-8 object-contain"/>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{league.name}</p>
                    <p className="text-xs text-gray-500">{league.country}</p>
                  </div>
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                  </svg>
                </button>
              ))}
            </>
          )}
          {!searching && searchResults.map(item => {
            const isAdded = existingIds.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => !isAdded && handleAdd(item)}
                disabled={isAdded}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${isAdded ? 'bg-emerald-50' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <img src={item.logo} alt="" className="w-10 h-10 object-contain"/>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  {item.country && <p className="text-xs text-gray-500">{item.country}</p>}
                </div>
                {isAdded ? (
                  <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
