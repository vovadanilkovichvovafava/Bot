'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Filter, Loader2, Search, RefreshCw, WifiOff, Clock, Brain, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useMatchesStore } from '@/store/matchesStore';
import { Match, isMatchLive, isMatchFinished, formatMatchDate, getShortTeamName } from '@/types';
import { cn } from '@/lib/utils';

const LEAGUES = [
  { code: 'all', name: 'All Leagues', nameRu: 'Все', logo: null },
  { code: 'PL', name: 'Premier League', nameRu: 'АПЛ', logo: 'https://media.api-sports.io/football/leagues/39.png' },
  { code: 'PD', name: 'La Liga', nameRu: 'Ла Лига', logo: 'https://media.api-sports.io/football/leagues/140.png' },
  { code: 'BL1', name: 'Bundesliga', nameRu: 'Бундеслига', logo: 'https://media.api-sports.io/football/leagues/78.png' },
  { code: 'SA', name: 'Serie A', nameRu: 'Серия А', logo: 'https://media.api-sports.io/football/leagues/135.png' },
  { code: 'FL1', name: 'Ligue 1', nameRu: 'Лига 1', logo: 'https://media.api-sports.io/football/leagues/61.png' },
  { code: 'CL', name: 'Champions League', nameRu: 'ЛЧ', logo: 'https://media.api-sports.io/football/leagues/2.png' },
  { code: 'EL', name: 'Europa League', nameRu: 'ЛЕ', logo: 'https://media.api-sports.io/football/leagues/3.png' },
];

type TabType = 'today' | 'tomorrow' | 'currentRound' | 'nextRound';

const TAB_CONFIG = {
  today: { label: 'Today', labelRu: 'Сегодня' },
  tomorrow: { label: 'Tomorrow', labelRu: 'Завтра' },
  currentRound: { label: 'Current Round', labelRu: 'Тур' },
  nextRound: { label: 'Next Round', labelRu: 'След. тур' },
};

export default function MatchesPage() {
  const {
    currentRoundMatches,
    nextRoundMatches,
    dateTodayMatches,
    dateTomorrowMatches,
    isLoading,
    isFromCache,
    isOffline,
    error,
    lastUpdated,
    loadCurrentRound,
    loadNextRound,
    loadDateToday,
    loadDateTomorrow,
    refresh,
  } = useMatchesStore();

  const [activeTab, setActiveTab] = useState<TabType>('currentRound');
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadCurrentRound();
    loadNextRound();
    loadDateToday();
    loadDateTomorrow();
  }, [loadCurrentRound, loadNextRound, loadDateToday, loadDateTomorrow]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  const getMatchesForTab = (tab: TabType): Match[] => {
    switch (tab) {
      case 'today': return dateTodayMatches;
      case 'tomorrow': return dateTomorrowMatches;
      case 'currentRound': return currentRoundMatches;
      case 'nextRound': return nextRoundMatches;
      default: return [];
    }
  };

  const currentMatches = getMatchesForTab(activeTab);

  const filteredMatches = currentMatches.filter((match) => {
    const matchesLeague = selectedLeague === 'all' || match.leagueCode === selectedLeague;
    const matchesSearch = searchQuery === '' ||
      match.homeTeam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.awayTeam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.league.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLeague && matchesSearch;
  });

  const matchesByLeague = filteredMatches.reduce((acc, match) => {
    const league = match.league || 'Other';
    if (!acc[league]) acc[league] = [];
    acc[league].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3B5998] via-[#4A66A0] to-[#6B5B95] px-4 pt-12 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-7 h-7 text-white" />
              <h1 className="text-2xl font-bold text-white">Matches</h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="p-2.5 rounded-xl bg-white/10 border border-white/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={cn('w-5 h-5 text-white', isRefreshing && 'animate-spin')} />
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 text-sm">
            {isOffline && (
              <span className="flex items-center gap-1 text-amber-300">
                <WifiOff size={14} />
                Offline
              </span>
            )}
            {isFromCache && !isOffline && <span className="text-white/60">Cached</span>}
            {lastUpdated && (
              <span className="text-white/60">
                Updated: {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-3 pb-8">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {(['currentRound', 'nextRound', 'today', 'tomorrow'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all flex-shrink-0',
                  activeTab === tab
                    ? 'bg-[#3B5998] text-white shadow-lg'
                    : 'bg-white text-gray-600 border border-gray-100'
                )}
              >
                {TAB_CONFIG[tab].labelRu}
                <span className="ml-1.5 opacity-70">({getMatchesForTab(tab).length})</span>
              </button>
            ))}
          </div>

          {/* Search & Filter Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teams..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#3B5998]/30"
              />
            </div>

            {/* League Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {LEAGUES.map((league) => (
                <button
                  key={league.code}
                  onClick={() => setSelectedLeague(league.code)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0',
                    selectedLeague === league.code
                      ? 'bg-[#3B5998] text-white'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {league.logo && (
                    <img src={league.logo} alt={league.name} className="w-4 h-4 object-contain" />
                  )}
                  {league.nameRu}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 rounded-2xl p-4 text-center">
              <p className="text-red-600 mb-3">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading */}
          {isLoading && filteredMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-[#3B5998] mb-4" />
              <p className="text-gray-500">Loading matches...</p>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">No matches found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchQuery ? 'Try a different search' : 'Check back later'}
              </p>
            </div>
          ) : (
            /* Matches by League */
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {Object.entries(matchesByLeague).map(([league, matches], leagueIndex) => (
                  <motion.div
                    key={league}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: leagueIndex * 0.05 }}
                  >
                    {/* League Header */}
                    <div className="flex items-center gap-2 mb-3">
                      {LEAGUES.find(l => l.name === league)?.logo && (
                        <img
                          src={LEAGUES.find(l => l.name === league)?.logo || ''}
                          alt={league}
                          className="w-5 h-5 object-contain"
                        />
                      )}
                      <h2 className="text-sm font-semibold text-gray-900">{league}</h2>
                      <span className="text-xs text-gray-400">({matches.length})</span>
                    </div>

                    {/* Matches */}
                    <div className="space-y-3">
                      {matches.map((match, index) => (
                        <MatchCard key={match.id} match={match} index={index} />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match, index }: { match: Match; index: number }) {
  const live = isMatchLive(match);
  const finished = isMatchFinished(match);
  const [homeImgError, setHomeImgError] = useState(false);
  const [awayImgError, setAwayImgError] = useState(false);

  return (
    <Link href={`/match/${match.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02 }}
        className={cn(
          'bg-white rounded-2xl p-4 shadow-sm border transition-all active:scale-[0.98]',
          live ? 'border-red-200' : 'border-gray-100'
        )}
      >
        {/* Time/Status */}
        <div className="flex items-center justify-between mb-3">
          {live ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE {match.minute && `${match.minute}'`}
            </span>
          ) : finished ? (
            <span className="text-xs font-medium text-gray-400">FT</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={12} />
              {formatMatchDate(match.matchDate)}
            </span>
          )}
          {match.matchday && (
            <span className="text-[10px] text-gray-400">Round {match.matchday}</span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex-1 min-w-0 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
              {match.homeTeam.logo && !homeImgError ? (
                <img
                  src={match.homeTeam.logo}
                  alt={match.homeTeam.name}
                  className="w-7 h-7 object-contain"
                  onError={() => setHomeImgError(true)}
                />
              ) : (
                <span className="text-xs font-bold text-gray-500">
                  {match.homeTeam.name.substring(0, 3).toUpperCase()}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs font-medium text-gray-900 truncate">
              {getShortTeamName(match.homeTeam.name)}
            </p>
          </div>

          {/* Score */}
          <div className="px-3 flex-shrink-0">
            {live || finished ? (
              <div className="flex items-center gap-1.5">
                <span className={cn('text-xl font-bold', live ? 'text-red-500' : 'text-gray-900')}>
                  {match.homeScore ?? 0}
                </span>
                <span className="text-gray-300">:</span>
                <span className={cn('text-xl font-bold', live ? 'text-red-500' : 'text-gray-900')}>
                  {match.awayScore ?? 0}
                </span>
              </div>
            ) : (
              <span className="text-sm font-bold text-[#3B5998]">VS</span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 min-w-0 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
              {match.awayTeam.logo && !awayImgError ? (
                <img
                  src={match.awayTeam.logo}
                  alt={match.awayTeam.name}
                  className="w-7 h-7 object-contain"
                  onError={() => setAwayImgError(true)}
                />
              ) : (
                <span className="text-xs font-bold text-gray-500">
                  {match.awayTeam.name.substring(0, 3).toUpperCase()}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs font-medium text-gray-900 truncate">
              {getShortTeamName(match.awayTeam.name)}
            </p>
          </div>
        </div>

        {/* AI Button */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-center gap-2 text-[#3B5998] text-xs font-medium">
            <Brain className="w-4 h-4" />
            Get AI Prediction
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
