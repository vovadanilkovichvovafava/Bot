'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Filter, Loader2, Search, RefreshCw, WifiOff, Clock } from 'lucide-react';
import Link from 'next/link';
import { useMatchesStore } from '@/store/matchesStore';
import { useThemeStore } from '@/store/themeStore';
import { Match, isMatchLive, isMatchFinished, formatMatchDate } from '@/types';
import { cn } from '@/lib/utils';

// League configurations with logos
const LEAGUES = [
  { code: 'all', name: 'All Leagues', logo: null },
  { code: 'PL', name: 'Premier League', logo: 'https://media.api-sports.io/football/leagues/39.png' },
  { code: 'PD', name: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png' },
  { code: 'BL1', name: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png' },
  { code: 'SA', name: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png' },
  { code: 'FL1', name: 'Ligue 1', logo: 'https://media.api-sports.io/football/leagues/61.png' },
  { code: 'CL', name: 'Champions League', logo: 'https://media.api-sports.io/football/leagues/2.png' },
  { code: 'EL', name: 'Europa League', logo: 'https://media.api-sports.io/football/leagues/3.png' },
];

type TabType = 'today' | 'tomorrow' | 'currentRound' | 'nextRound';

const TAB_CONFIG = {
  today: { label: 'Today', description: 'by date' },
  tomorrow: { label: 'Tomorrow', description: 'by date' },
  currentRound: { label: 'Current Round', description: 'full matchday' },
  nextRound: { label: 'Next Round', description: 'full matchday' },
};

export default function MatchesPage() {
  const { selectedTheme } = useThemeStore();
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

  // Load matches on mount
  useEffect(() => {
    loadCurrentRound();
    loadNextRound();
    loadDateToday();
    loadDateTomorrow();
  }, [loadCurrentRound, loadNextRound, loadDateToday, loadDateTomorrow]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  // Get current matches based on active tab
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

  // Filter matches
  const filteredMatches = currentMatches.filter((match) => {
    const matchesLeague = selectedLeague === 'all' || match.leagueCode === selectedLeague;
    const matchesSearch = searchQuery === '' ||
      match.homeTeam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.awayTeam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.league.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLeague && matchesSearch;
  });

  // Group matches by league
  const matchesByLeague = filteredMatches.reduce((acc, match) => {
    const league = match.league || 'Other';
    if (!acc[league]) {
      acc[league] = [];
    }
    acc[league].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  // Theme-specific styles
  const themeStyles = {
    cinematic: {
      bg: 'cinematic-bg',
      card: 'bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-amber-500/20',
      accent: 'text-amber-400',
      accentBg: 'bg-amber-500',
      tabActive: 'bg-amber-500 text-black',
      tabInactive: 'text-gray-400 hover:text-amber-400',
      inputBg: 'bg-gray-900/50 border-amber-500/20 focus:border-amber-500',
      leagueBadge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
    neon: {
      bg: 'neon-bg',
      card: 'bg-gray-900/80 backdrop-blur-xl border border-emerald-500/20',
      accent: 'text-emerald-400',
      accentBg: 'bg-emerald-500',
      tabActive: 'bg-emerald-500 text-black',
      tabInactive: 'text-gray-400 hover:text-emerald-400',
      inputBg: 'bg-gray-900/50 border-emerald-500/20 focus:border-emerald-500',
      leagueBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    stadium: {
      bg: 'stadium-bg',
      card: 'bg-black/60 backdrop-blur-md border border-white/20',
      accent: 'text-indigo-400',
      accentBg: 'bg-indigo-500',
      tabActive: 'bg-indigo-500 text-white',
      tabInactive: 'text-gray-400 hover:text-indigo-400',
      inputBg: 'bg-black/50 border-indigo-500/20 focus:border-indigo-500',
      leagueBadge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    },
  };

  const styles = selectedTheme ? themeStyles[selectedTheme] : themeStyles.neon;

  return (
    <div className={cn('min-h-screen py-6 px-4', styles.bg)}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className={cn('w-8 h-8', styles.accent)} />
              <h1 className="text-3xl font-bold text-white">Matches</h1>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className={cn(
                'p-2 rounded-lg transition-all',
                styles.card,
                (isRefreshing || isLoading) && 'opacity-50'
              )}
            >
              <RefreshCw className={cn('w-5 h-5', styles.accent, isRefreshing && 'animate-spin')} />
            </button>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-4 text-sm">
            {isOffline && (
              <span className="flex items-center gap-1 text-yellow-500">
                <WifiOff size={14} />
                Offline mode
              </span>
            )}
            {isFromCache && !isOffline && (
              <span className="text-gray-400">Cached data</span>
            )}
            {lastUpdated && (
              <span className="text-gray-500">
                Updated: {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {(['currentRound', 'nextRound', 'today', 'tomorrow'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2.5 rounded-xl font-semibold transition-all',
                activeTab === tab ? styles.tabActive : cn(styles.card, styles.tabInactive)
              )}
            >
              <span>{TAB_CONFIG[tab].label}</span>
              <span className="ml-2 text-xs opacity-70">
                ({getMatchesForTab(tab).length})
              </span>
            </button>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn('rounded-xl p-4 mb-6', styles.card)}
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2', styles.accent)} size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teams or leagues..."
                className={cn(
                  'w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-500 transition-all border',
                  styles.inputBg
                )}
              />
            </div>

            {/* League Filter */}
            <div className="flex items-center gap-2">
              <Filter size={20} className={styles.accent} />
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className={cn(
                  'px-4 py-3 rounded-xl text-white transition-all appearance-none cursor-pointer border min-w-[180px]',
                  styles.inputBg
                )}
              >
                {LEAGUES.map((league) => (
                  <option key={league.code} value={league.code} className="bg-gray-900">
                    {league.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* League Pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {LEAGUES.map((league) => (
              <button
                key={league.code}
                onClick={() => setSelectedLeague(league.code)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all border',
                  selectedLeague === league.code
                    ? styles.tabActive
                    : styles.leagueBadge
                )}
              >
                {league.logo && (
                  <img src={league.logo} alt={league.name} className="w-4 h-4 object-contain" />
                )}
                <span>{league.code === 'all' ? 'All' : league.code}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className={cn('px-6 py-2 rounded-lg', styles.accentBg, 'text-white')}
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className={cn('w-10 h-10 animate-spin mb-4', styles.accent)} />
            <p className="text-gray-400">Loading matches...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Calendar className={cn('w-16 h-16 mx-auto mb-4 opacity-30', styles.accent)} />
            <p className="text-gray-400 text-lg">No matches found</p>
            <p className="text-gray-500 text-sm mt-2">
              {searchQuery ? 'Try a different search term' : 'Check back later for more matches'}
            </p>
          </motion.div>
        ) : (
          /* Matches by League */
          <div className="space-y-8">
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
                  <div className="flex items-center gap-3 mb-4">
                    {LEAGUES.find(l => l.name === league)?.logo && (
                      <img
                        src={LEAGUES.find(l => l.name === league)?.logo || ''}
                        alt={league}
                        className="w-6 h-6 object-contain"
                      />
                    )}
                    <h2 className={cn('text-lg font-semibold', styles.accent)}>{league}</h2>
                    <span className="text-gray-500 text-sm">({matches.length} matches)</span>
                  </div>

                  {/* Matches Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matches.map((match, index) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        index={index}
                        styles={styles}
                        theme={selectedTheme}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// Enhanced Match Card Component
interface MatchCardProps {
  match: Match;
  index: number;
  styles: {
    card: string;
    accent: string;
    accentBg: string;
    leagueBadge: string;
  };
  theme: string | null;
}

function MatchCard({ match, index, styles, theme }: MatchCardProps) {
  const live = isMatchLive(match);
  const finished = isMatchFinished(match);

  return (
    <Link href={`/match/${match.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'rounded-xl p-5 cursor-pointer transition-all group',
          styles.card,
          live && 'ring-2 ring-red-500/50'
        )}
      >
        {/* Time/Status */}
        <div className="flex items-center justify-between mb-4">
          {live ? (
            <span className="flex items-center gap-2 text-red-500 text-sm font-bold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE {match.minute && `${match.minute}'`}
            </span>
          ) : finished ? (
            <span className="text-gray-400 text-sm font-medium">FT</span>
          ) : (
            <span className="flex items-center gap-1 text-gray-400 text-sm">
              <Clock size={14} />
              {formatMatchDate(match.matchDate)}
            </span>
          )}

          {match.matchday && (
            <span className="text-xs text-gray-500">MD {match.matchday}</span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex-1 min-w-0 text-center">
            <TeamLogo team={match.homeTeam} />
            <p className="mt-2 text-sm font-medium text-white truncate px-1">
              {match.homeTeam.name}
            </p>
          </div>

          {/* Score or VS */}
          <div className="px-4 py-2 flex-shrink-0">
            {live || finished ? (
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-2xl font-bold',
                  live ? 'text-red-400' : 'text-white'
                )}>
                  {match.homeScore ?? 0}
                </span>
                <span className="text-gray-500 text-xl">:</span>
                <span className={cn(
                  'text-2xl font-bold',
                  live ? 'text-red-400' : 'text-white'
                )}>
                  {match.awayScore ?? 0}
                </span>
              </div>
            ) : (
              <span className={cn('text-lg font-bold', styles.accent)}>VS</span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 min-w-0 text-center">
            <TeamLogo team={match.awayTeam} />
            <p className="mt-2 text-sm font-medium text-white truncate px-1">
              {match.awayTeam.name}
            </p>
          </div>
        </div>

        {/* AI Prediction Button */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className={cn(
            'w-full py-2.5 rounded-lg text-center text-sm font-semibold transition-all',
            'bg-gradient-to-r from-transparent to-transparent',
            styles.accent,
            'border border-current/30',
            'group-hover:bg-current/10'
          )}>
            🤖 Get AI Prediction
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// Team Logo Component
function TeamLogo({ team }: { team: { name: string; logo?: string } }) {
  const [imgError, setImgError] = useState(false);

  // Fallback colors for known teams
  const teamColors: Record<string, string> = {
    'Arsenal': '#EF0107',
    'Chelsea': '#034694',
    'Manchester United': '#DA291C',
    'Manchester City': '#6CABDD',
    'Liverpool': '#C8102E',
    'Tottenham': '#132257',
    'Real Madrid': '#FEBE10',
    'Barcelona': '#A50044',
    'Bayern Munich': '#DC052D',
    'Dortmund': '#FDE100',
    'PSG': '#004170',
    'Juventus': '#000000',
    'AC Milan': '#FB090B',
    'Inter': '#0068A8',
    'Napoli': '#12A0D7',
    'Atletico Madrid': '#CB3524',
  };

  const bgColor = teamColors[team.name] || '#6366f1';

  if (team.logo && !imgError) {
    return (
      <div className="w-14 h-14 mx-auto rounded-full bg-white/10 p-1.5 overflow-hidden">
        <img
          src={team.logo}
          alt={team.name}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white font-bold shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${bgColor}, ${bgColor}99)`,
        boxShadow: `0 4px 15px ${bgColor}40`,
      }}
    >
      {team.name.substring(0, 3).toUpperCase()}
    </div>
  );
}
