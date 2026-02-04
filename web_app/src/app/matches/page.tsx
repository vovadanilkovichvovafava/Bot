'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Filter, Loader2, Search, RefreshCw, WifiOff, Clock, Brain } from 'lucide-react';
import Link from 'next/link';
import { useMatchesStore } from '@/store/matchesStore';
import { useThemeStore } from '@/store/themeStore';
import { Match, isMatchLive, isMatchFinished, formatMatchDate, getShortTeamName } from '@/types';
import { cn } from '@/lib/utils';

// AI Analysis Center colors
const COLORS = {
  bgPrimary: '#080A10',
  bgSecondary: '#10141E',
  bgCard: '#10141E',
  bgGlass: 'rgba(12, 15, 24, 0.85)',
  blue: '#4A7AFF',
  green: '#3DDC84',
  red: '#FF3B3B',
  orange: '#FF7A4A',
  purple: '#9D6AFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#BFC7D9',
  textMuted: '#6E7891',
  border: 'rgba(255, 255, 255, 0.08)',
  borderBlue: 'rgba(74, 122, 255, 0.5)',
};

// Stadium background
const STADIUM_BG = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80';

// League configurations with Russian names
const LEAGUES = [
  { code: 'all', name: 'All Leagues', nameRu: 'Все лиги', logo: null },
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

  const isStadiumTheme = selectedTheme === 'stadium';

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
    if (!acc[league]) {
      acc[league] = [];
    }
    acc[league].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  // For non-stadium themes, use old styles
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
      bg: '',
      card: '',
      accent: '',
      accentBg: '',
      tabActive: '',
      tabInactive: '',
      inputBg: '',
      leagueBadge: '',
    },
  };

  const styles = selectedTheme ? themeStyles[selectedTheme] : themeStyles.neon;

  // Stadium theme - AI Analysis Center
  if (isStadiumTheme) {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ background: COLORS.bgPrimary }}>
        {/* Stadium Background - blurred header */}
        <div className="absolute inset-0 z-0">
          <img
            src={STADIUM_BG}
            alt="Stadium"
            className="w-full h-[25vh] sm:h-[30vh] object-cover"
            style={{ filter: 'saturate(0.4) brightness(0.7) blur(2px)' }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(8,10,16,0.6) 0%, rgba(8,10,16,0.9) 20%, #080A10 30%)'
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: COLORS.blue }} />
                <h1
                  className="font-montserrat text-xl sm:text-3xl font-bold uppercase tracking-wide"
                  style={{ color: COLORS.textPrimary }}
                >
                  Матчи
                </h1>
              </div>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="p-2.5 sm:p-2 rounded-lg transition-all touch-manipulation active:scale-95"
                style={{
                  background: COLORS.bgCard,
                  border: `1px solid ${COLORS.border}`,
                  opacity: (isRefreshing || isLoading) ? 0.5 : 1
                }}
              >
                <RefreshCw
                  className={cn('w-5 h-5', isRefreshing && 'animate-spin')}
                  style={{ color: COLORS.blue }}
                />
              </button>
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap">
              {isOffline && (
                <span className="flex items-center gap-1" style={{ color: '#F59E0B' }}>
                  <WifiOff size={14} />
                  Офлайн режим
                </span>
              )}
              {isFromCache && !isOffline && (
                <span style={{ color: COLORS.textMuted }}>Кэш</span>
              )}
              {lastUpdated && (
                <span className="hidden sm:inline" style={{ color: COLORS.textMuted }}>
                  Обновлено: {new Date(lastUpdated).toLocaleTimeString('ru-RU')}
                </span>
              )}
            </div>
          </motion.div>

          {/* Tabs - Horizontal scroll on mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap hide-scrollbar"
          >
            {(['currentRound', 'nextRound', 'today', 'tomorrow'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="font-montserrat font-bold text-xs sm:text-sm uppercase tracking-wider px-4 sm:px-5 py-2.5 rounded-full transition-all whitespace-nowrap flex-shrink-0 touch-manipulation active:scale-95"
                style={{
                  background: activeTab === tab ? COLORS.blue : 'transparent',
                  border: `1px solid ${activeTab === tab ? COLORS.blue : COLORS.border}`,
                  color: activeTab === tab ? COLORS.textPrimary : COLORS.textSecondary,
                }}
              >
                {TAB_CONFIG[tab].labelRu}
                <span className="ml-1.5 sm:ml-2 opacity-70">({getMatchesForTab(tab).length})</span>
              </button>
            ))}
          </motion.div>

          {/* Filters - Mobile optimized */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl p-3 sm:p-4 mb-4 sm:mb-6"
            style={{
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  size={18}
                  style={{ color: COLORS.blue }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск команд..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl transition-all text-sm sm:text-base"
                  style={{
                    background: COLORS.bgSecondary,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary,
                  }}
                />
              </div>

              {/* League Filter - Hidden on mobile, show pills instead */}
              <div className="hidden sm:flex items-center gap-2">
                <Filter size={20} style={{ color: COLORS.blue }} />
                <select
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                  className="px-4 py-3 rounded-xl transition-all appearance-none cursor-pointer min-w-[180px]"
                  style={{
                    background: COLORS.bgSecondary,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary,
                  }}
                >
                  {LEAGUES.map((league) => (
                    <option key={league.code} value={league.code} style={{ background: COLORS.bgSecondary }}>
                      {league.nameRu}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* League Pills - Horizontal scroll on mobile */}
            <div className="flex gap-2 mt-3 sm:mt-4 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap hide-scrollbar">
              {LEAGUES.map((league) => (
                <button
                  key={league.code}
                  onClick={() => setSelectedLeague(league.code)}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:py-1.5 rounded-full text-xs sm:text-sm transition-all whitespace-nowrap flex-shrink-0 touch-manipulation active:scale-95"
                  style={{
                    background: selectedLeague === league.code ? COLORS.blue : 'transparent',
                    border: `1px solid ${selectedLeague === league.code ? COLORS.blue : COLORS.border}`,
                    color: selectedLeague === league.code ? COLORS.textPrimary : COLORS.textSecondary,
                  }}
                >
                  {league.logo && (
                    <img src={league.logo} alt={league.name} className="w-4 h-4 object-contain" />
                  )}
                  <span>{league.code === 'all' ? 'Все' : league.nameRu}</span>
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
              <p className="mb-4" style={{ color: COLORS.red }}>{error}</p>
              <button
                onClick={handleRefresh}
                className="px-6 py-2 rounded-lg"
                style={{ background: COLORS.blue, color: COLORS.textPrimary }}
              >
                Повторить
              </button>
            </motion.div>
          )}

          {/* Loading State */}
          {isLoading && filteredMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: COLORS.blue }} />
              <p style={{ color: COLORS.textMuted }}>Загрузка матчей...</p>
            </div>
          ) : filteredMatches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: COLORS.blue }} />
              <p className="text-lg" style={{ color: COLORS.textMuted }}>Матчи не найдены</p>
              <p className="text-sm mt-2" style={{ color: COLORS.textMuted }}>
                {searchQuery ? 'Попробуйте другой запрос' : 'Зайдите позже'}
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
                      <h2 className="text-lg font-semibold" style={{ color: COLORS.blue }}>{league}</h2>
                      <span className="text-sm" style={{ color: COLORS.textMuted }}>({matches.length})</span>
                    </div>

                    {/* Matches Grid - Mobile optimized */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {matches.map((match, index) => (
                        <StadiumMatchCard key={match.id} match={match} index={index} />
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

  // Non-stadium themes - original code
  return (
    <div className={cn('min-h-screen py-6 px-4', styles.bg)}>
      <div className="max-w-7xl mx-auto">
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
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className={cn('p-2 rounded-lg transition-all', styles.card, (isRefreshing || isLoading) && 'opacity-50')}
            >
              <RefreshCw className={cn('w-5 h-5', styles.accent, isRefreshing && 'animate-spin')} />
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {isOffline && (
              <span className="flex items-center gap-1 text-yellow-500">
                <WifiOff size={14} />
                Offline mode
              </span>
            )}
            {isFromCache && !isOffline && <span className="text-gray-400">Cached data</span>}
            {lastUpdated && <span className="text-gray-500">Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>}
          </div>
        </motion.div>

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
              className={cn('px-4 py-2.5 rounded-xl font-semibold transition-all', activeTab === tab ? styles.tabActive : cn(styles.card, styles.tabInactive))}
            >
              <span>{TAB_CONFIG[tab].label}</span>
              <span className="ml-2 text-xs opacity-70">({getMatchesForTab(tab).length})</span>
            </button>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn('rounded-xl p-4 mb-6', styles.card)}
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2', styles.accent)} size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teams or leagues..."
                className={cn('w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-500 transition-all border', styles.inputBg)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={20} className={styles.accent} />
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className={cn('px-4 py-3 rounded-xl text-white transition-all appearance-none cursor-pointer border min-w-[180px]', styles.inputBg)}
              >
                {LEAGUES.map((league) => (
                  <option key={league.code} value={league.code} className="bg-gray-900">{league.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {LEAGUES.map((league) => (
              <button
                key={league.code}
                onClick={() => setSelectedLeague(league.code)}
                className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all border', selectedLeague === league.code ? styles.tabActive : styles.leagueBadge)}
              >
                {league.logo && <img src={league.logo} alt={league.name} className="w-4 h-4 object-contain" />}
                <span>{league.code === 'all' ? 'All' : league.code}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={handleRefresh} className={cn('px-6 py-2 rounded-lg', styles.accentBg, 'text-white')}>Retry</button>
          </motion.div>
        )}

        {isLoading && filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className={cn('w-10 h-10 animate-spin mb-4', styles.accent)} />
            <p className="text-gray-400">Loading matches...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Calendar className={cn('w-16 h-16 mx-auto mb-4 opacity-30', styles.accent)} />
            <p className="text-gray-400 text-lg">No matches found</p>
            <p className="text-gray-500 text-sm mt-2">{searchQuery ? 'Try a different search term' : 'Check back later for more matches'}</p>
          </motion.div>
        ) : (
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
                  <div className="flex items-center gap-3 mb-4">
                    {LEAGUES.find(l => l.name === league)?.logo && (
                      <img src={LEAGUES.find(l => l.name === league)?.logo || ''} alt={league} className="w-6 h-6 object-contain" />
                    )}
                    <h2 className={cn('text-lg font-semibold', styles.accent)}>{league}</h2>
                    <span className="text-gray-500 text-sm">({matches.length} matches)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matches.map((match, index) => (
                      <MatchCard key={match.id} match={match} index={index} styles={styles} theme={selectedTheme} />
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

// Stadium Theme Match Card - Mobile optimized
function StadiumMatchCard({ match, index }: { match: Match; index: number }) {
  const live = isMatchLive(match);
  const finished = isMatchFinished(match);

  return (
    <Link href={`/match/${match.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02 }}
        whileTap={{ scale: 0.98 }}
        className="group relative rounded-xl p-3 sm:p-5 cursor-pointer transition-all overflow-hidden touch-manipulation active:bg-[#161C2A]"
        style={{
          background: COLORS.bgCard,
          border: `1px solid ${live ? `${COLORS.red}50` : COLORS.border}`,
        }}
      >
        {/* Live indicator */}
        {live && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ background: COLORS.red }}
          />
        )}

        {/* Time/Status */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          {live ? (
            <span className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold" style={{ color: COLORS.red }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: COLORS.red }} />
              LIVE {match.minute && `${match.minute}'`}
            </span>
          ) : finished ? (
            <span className="text-xs sm:text-sm font-medium" style={{ color: COLORS.textMuted }}>Завершён</span>
          ) : (
            <span className="flex items-center gap-1 text-xs sm:text-sm" style={{ color: COLORS.textMuted }}>
              <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
              {formatMatchDate(match.matchDate)}
            </span>
          )}

          {match.matchday && (
            <span className="text-[10px] sm:text-xs" style={{ color: COLORS.textMuted }}>Тур {match.matchday}</span>
          )}
        </div>

        {/* Teams - Mobile compact layout */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 text-center">
            <StadiumTeamLogo team={match.homeTeam} size="mobile" />
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium truncate px-0.5 sm:px-1" style={{ color: COLORS.textPrimary }}>
              {getShortTeamName(match.homeTeam.name)}
            </p>
          </div>

          <div className="px-2 sm:px-4 py-1 sm:py-2 flex-shrink-0">
            {live || finished ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className="font-montserrat text-lg sm:text-2xl font-bold"
                  style={{ color: live ? COLORS.red : COLORS.textPrimary }}
                >
                  {match.homeScore ?? 0}
                </span>
                <span className="text-base sm:text-xl" style={{ color: COLORS.textMuted }}>:</span>
                <span
                  className="font-montserrat text-lg sm:text-2xl font-bold"
                  style={{ color: live ? COLORS.red : COLORS.textPrimary }}
                >
                  {match.awayScore ?? 0}
                </span>
              </div>
            ) : (
              <span className="font-montserrat text-sm sm:text-lg font-bold" style={{ color: COLORS.blue }}>VS</span>
            )}
          </div>

          <div className="flex-1 min-w-0 text-center">
            <StadiumTeamLogo team={match.awayTeam} size="mobile" />
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium truncate px-0.5 sm:px-1" style={{ color: COLORS.textPrimary }}>
              {getShortTeamName(match.awayTeam.name)}
            </p>
          </div>
        </div>

        {/* AI Prediction - Touch friendly */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <div
            className="w-full py-2.5 sm:py-2.5 rounded-lg text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all"
            style={{
              color: COLORS.blue,
              border: `1px solid ${COLORS.borderBlue}`,
            }}
          >
            <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Получить прогноз AI
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// Stadium Team Logo - Mobile responsive
function StadiumTeamLogo({ team, size = 'default' }: { team: { name: string; logo?: string }; size?: 'mobile' | 'default' }) {
  const [imgError, setImgError] = useState(false);

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

  const bgColor = teamColors[team.name] || COLORS.blue;
  const sizeClass = size === 'mobile' ? 'w-10 h-10 sm:w-14 sm:h-14' : 'w-14 h-14';
  const fontSizeClass = size === 'mobile' ? 'text-xs sm:text-sm' : 'text-sm';

  if (team.logo && !imgError) {
    return (
      <div
        className={cn(sizeClass, 'mx-auto rounded-full p-1 sm:p-1.5 overflow-hidden')}
        style={{ background: 'rgba(255,255,255,0.1)' }}
      >
        <img
          src={team.logo}
          alt={team.name}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(sizeClass, fontSizeClass, 'mx-auto rounded-full flex items-center justify-center text-white font-bold shadow-lg')}
      style={{
        background: `linear-gradient(135deg, ${bgColor}, ${bgColor}99)`,
        boxShadow: `0 4px 15px ${bgColor}40`,
      }}
    >
      {team.name.substring(0, 3).toUpperCase()}
    </div>
  );
}

// Legacy Match Card for non-stadium themes
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
        className={cn('rounded-xl p-5 cursor-pointer transition-all group', styles.card, live && 'ring-2 ring-red-500/50')}
      >
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
          {match.matchday && <span className="text-xs text-gray-500">MD {match.matchday}</span>}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 text-center">
            <TeamLogo team={match.homeTeam} />
            <p className="mt-2 text-sm font-medium text-white truncate px-1">{match.homeTeam.name}</p>
          </div>
          <div className="px-4 py-2 flex-shrink-0">
            {live || finished ? (
              <div className="flex items-center gap-2">
                <span className={cn('text-2xl font-bold', live ? 'text-red-400' : 'text-white')}>{match.homeScore ?? 0}</span>
                <span className="text-gray-500 text-xl">:</span>
                <span className={cn('text-2xl font-bold', live ? 'text-red-400' : 'text-white')}>{match.awayScore ?? 0}</span>
              </div>
            ) : (
              <span className={cn('text-lg font-bold', styles.accent)}>VS</span>
            )}
          </div>
          <div className="flex-1 min-w-0 text-center">
            <TeamLogo team={match.awayTeam} />
            <p className="mt-2 text-sm font-medium text-white truncate px-1">{match.awayTeam.name}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className={cn('w-full py-2.5 rounded-lg text-center text-sm font-semibold transition-all', 'bg-gradient-to-r from-transparent to-transparent', styles.accent, 'border border-current/30', 'group-hover:bg-current/10')}>
            Get AI Prediction
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function TeamLogo({ team }: { team: { name: string; logo?: string } }) {
  const [imgError, setImgError] = useState(false);

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
        <img src={team.logo} alt={team.name} className="w-full h-full object-contain" onError={() => setImgError(true)} />
      </div>
    );
  }

  return (
    <div
      className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white font-bold shadow-lg"
      style={{ background: `linear-gradient(135deg, ${bgColor}, ${bgColor}99)`, boxShadow: `0 4px 15px ${bgColor}40` }}
    >
      {team.name.substring(0, 3).toUpperCase()}
    </div>
  );
}
