import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getFavouriteTeams,
  getFavouriteLeagues,
  removeFavouriteTeam,
  removeFavouriteLeague,
  addFavouriteTeam,
  addFavouriteLeague,
} from '../services/favouritesStore';
import footballApi from '../api/footballApi';
import FootballSpinner from '../components/FootballSpinner';

// Popular leagues for quick add
const QUICK_ADD_LEAGUES = [
  { id: 39, name: 'Premier League', country: 'England', logo: 'https://media.api-sports.io/football/leagues/39.png' },
  { id: 140, name: 'La Liga', country: 'Spain', logo: 'https://media.api-sports.io/football/leagues/140.png' },
  { id: 78, name: 'Bundesliga', country: 'Germany', logo: 'https://media.api-sports.io/football/leagues/78.png' },
  { id: 135, name: 'Serie A', country: 'Italy', logo: 'https://media.api-sports.io/football/leagues/135.png' },
  { id: 61, name: 'Ligue 1', country: 'France', logo: 'https://media.api-sports.io/football/leagues/61.png' },
  { id: 2, name: 'Champions League', country: 'Europe', logo: 'https://media.api-sports.io/football/leagues/2.png' },
];

export default function Favourites() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tab, setTab] = useState('teams');
  const [teams, setTeams] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadFavourites();
  }, []);

  const loadFavourites = () => {
    setTeams(getFavouriteTeams());
    setLeagues(getFavouriteLeagues());
  };

  const handleRemoveTeam = (teamId) => {
    removeFavouriteTeam(teamId);
    setTeams(getFavouriteTeams());
  };

  const handleRemoveLeague = (leagueId) => {
    removeFavouriteLeague(leagueId);
    setLeagues(getFavouriteLeagues());
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      if (tab === 'teams') {
        const results = await footballApi.searchTeams(query);
        setSearchResults(results.slice(0, 10));
      } else {
        // For leagues, filter from popular list
        const filtered = QUICK_ADD_LEAGUES.filter(l =>
          l.name.toLowerCase().includes(query.toLowerCase()) ||
          l.country.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
      }
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <div className="bg-white px-5 pt-4 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <h1 className="text-lg font-bold">{t('favourites.title')}</h1>
        </div>
        <div className="flex border-b border-gray-100">
          {['teams', 'leagues'].map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`flex-1 py-3 text-sm font-medium relative ${
                tab === tabKey ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              {t(`favourites.tabs.${tabKey}`)}
              {(tabKey === 'teams' ? teams.length : leagues.length) > 0 && (
                <span className="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
                  {tabKey === 'teams' ? teams.length : leagues.length}
                </span>
              )}
              {tab === tabKey && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary-600 rounded-full"/>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4">
        {/* Teams Tab */}
        {tab === 'teams' && (
          <>
            {teams.length === 0 ? (
              <EmptyState
                type="teams"
                onAdd={() => setShowAddModal(true)}
              />
            ) : (
              <div className="space-y-2">
                {teams.map(team => (
                  <div
                    key={team.id}
                    className="bg-white rounded-xl p-4 flex items-center gap-4 border border-gray-100"
                  >
                    <img
                      src={team.logo}
                      alt={team.name}
                      className="w-12 h-12 object-contain"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{team.name}</p>
                      <p className="text-xs text-gray-500">{t('favourites.addedDate', { date: new Date(team.addedAt).toLocaleDateString() })}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveTeam(team.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 flex items-center justify-center gap-2 hover:border-primary-300 hover:text-primary-600 transition-colors"
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

        {/* Leagues Tab */}
        {tab === 'leagues' && (
          <>
            {leagues.length === 0 ? (
              <EmptyState
                type="leagues"
                onAdd={() => setShowAddModal(true)}
              />
            ) : (
              <div className="space-y-2">
                {leagues.map(league => (
                  <div
                    key={league.id}
                    onClick={() => navigate(`/league/${league.code || league.id}`)}
                    className="bg-white rounded-xl p-4 flex items-center gap-4 border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <img
                      src={league.logo}
                      alt={league.name}
                      className="w-10 h-10 object-contain"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{league.name}</p>
                      <p className="text-xs text-gray-500">{league.country}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLeague(league.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 flex items-center justify-center gap-2 hover:border-primary-300 hover:text-primary-600 transition-colors"
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
          type={tab}
          searchQuery={searchQuery}
          searchResults={searchResults}
          searching={searching}
          onSearch={handleSearch}
          onClose={() => {
            setShowAddModal(false);
            setSearchQuery('');
            setSearchResults([]);
          }}
          onAdded={loadFavourites}
          existingIds={tab === 'teams' ? teams.map(item => item.id) : leagues.map(l => l.id)}
        />
      )}
    </div>
  );
}

function EmptyState({ type, onAdd }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
      </svg>
      <h3 className="text-lg font-bold text-gray-900 mb-1">
        {t(`favourites.noFavourite.${type}`)}
      </h3>
      <p className="text-gray-500 text-sm mb-6">
        {t(`favourites.addForAccess.${type}`)}
      </p>
      <button
        onClick={onAdd}
        className="btn-outline max-w-[200px] flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
        </svg>
        {type === 'teams' ? t('favourites.addTeam') : t('favourites.addLeague')}
      </button>
    </div>
  );
}

function AddModal({ type, searchQuery, searchResults, searching, onSearch, onClose, onAdded, existingIds }) {
  const { t } = useTranslation();
  const handleAdd = (item) => {
    if (type === 'teams') {
      addFavouriteTeam(item);
    } else {
      addFavouriteLeague(item);
    }
    onAdded();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">{type === 'teams' ? t('favourites.addTeam') : t('favourites.addLeague')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {searching && (
            <div className="text-center py-8 text-gray-500">
              <FootballSpinner size="sm" text={t('favourites.searching')} />
            </div>
          )}

          {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
            <div className="text-center py-8 text-gray-500">
              {t(`favourites.notFound.${type}`)}
            </div>
          )}

          {!searching && searchResults.length === 0 && searchQuery.length < 2 && type === 'leagues' && (
            <>
              <p className="text-xs text-gray-500 mb-2">{t('favourites.popularLeagues')}</p>
              {QUICK_ADD_LEAGUES.filter(l => !existingIds.includes(l.id)).map(league => (
                <button
                  key={league.id}
                  onClick={() => handleAdd(league)}
                  className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <img src={league.logo} alt="" className="w-8 h-8 object-contain"/>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{league.name}</p>
                    <p className="text-xs text-gray-500">{league.country}</p>
                  </div>
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isAdded ? 'bg-green-50 cursor-default' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <img src={item.logo} alt="" className="w-10 h-10 object-contain"/>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  {item.country && <p className="text-xs text-gray-500">{item.country}</p>}
                </div>
                {isAdded ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
