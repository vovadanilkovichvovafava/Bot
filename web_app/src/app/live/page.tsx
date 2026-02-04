'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Loader2, RefreshCw, Bot, Clock, Wifi, WifiOff, Activity } from 'lucide-react';
import Link from 'next/link';
import { useMatchesStore } from '@/store/matchesStore';
import { useThemeStore } from '@/store/themeStore';
import { Match, isMatchLive } from '@/types';
import { cn } from '@/lib/utils';

// Team colors for fallback
const TEAM_COLORS: Record<string, string> = {
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
};

export default function LiveMatchesPage() {
  const { selectedTheme } = useThemeStore();
  const {
    liveMatches,
    isLoading,
    isOffline,
    lastUpdated,
    loadLiveMatches,
  } = useMatchesStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load live matches on mount and set up auto-refresh
  useEffect(() => {
    loadLiveMatches();

    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadLiveMatches();
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loadLiveMatches, autoRefresh]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadLiveMatches();
    setIsRefreshing(false);
  }, [loadLiveMatches]);

  // Filter to only show live matches
  const activeLiveMatches = liveMatches.filter(m => isMatchLive(m));

  // Group by league
  const matchesByLeague = activeLiveMatches.reduce((acc, match) => {
    const league = match.league || 'Other';
    if (!acc[league]) {
      acc[league] = [];
    }
    acc[league].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  // Theme styles
  const themeStyles = {
    cinematic: {
      bg: 'cinematic-bg',
      card: 'bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-amber-500/20',
      accent: 'text-amber-400',
      accentBg: 'bg-amber-500',
      liveAccent: 'text-red-500',
      liveBg: 'bg-red-500',
    },
    neon: {
      bg: 'neon-bg',
      card: 'bg-gray-900/80 backdrop-blur-xl border border-emerald-500/20',
      accent: 'text-emerald-400',
      accentBg: 'bg-emerald-500',
      liveAccent: 'text-red-400',
      liveBg: 'bg-red-500',
    },
    stadium: {
      bg: 'stadium-bg',
      card: 'bg-black/60 backdrop-blur-md border border-white/20',
      accent: 'text-indigo-400',
      accentBg: 'bg-indigo-500',
      liveAccent: 'text-red-500',
      liveBg: 'bg-red-500',
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
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Radio className={cn('w-8 h-8', styles.liveAccent)} />
                <motion.span
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={cn('absolute -top-1 -right-1 w-3 h-3 rounded-full', styles.liveBg)}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Live Matches</h1>
                <p className="text-gray-400 text-sm">
                  {activeLiveMatches.length} matches in progress
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                  styles.card,
                  autoRefresh ? styles.accent : 'text-gray-500'
                )}
              >
                {autoRefresh ? <Wifi size={18} /> : <WifiOff size={18} />}
                <span className="text-sm">Auto</span>
              </button>

              {/* Manual Refresh */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                  styles.card,
                  styles.accent,
                  (isRefreshing || isLoading) && 'opacity-50'
                )}
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center gap-4 text-sm">
            {isOffline && (
              <span className="flex items-center gap-1 text-yellow-500">
                <WifiOff size={14} />
                Offline
              </span>
            )}
            {lastUpdated && (
              <span className="flex items-center gap-1 text-gray-500">
                <Clock size={14} />
                Updated: {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
            {autoRefresh && (
              <span className="flex items-center gap-1 text-green-500">
                <Activity size={14} />
                Auto-refreshing
              </span>
            )}
          </div>
        </motion.div>

        {/* Content */}
        {isLoading && activeLiveMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className={cn('w-10 h-10 animate-spin mb-4', styles.accent)} />
            <p className="text-gray-400">Loading live matches...</p>
          </div>
        ) : activeLiveMatches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn('text-center py-16 rounded-2xl', styles.card)}
          >
            <Radio className="w-20 h-20 mx-auto text-gray-600 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">No Live Matches</h2>
            <p className="text-gray-400 mb-6">There are no matches currently in play</p>
            <Link
              href="/matches"
              className={cn('inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold', styles.accentBg, 'text-white')}
            >
              View Upcoming Matches
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-8">
            <AnimatePresence mode="popLayout">
              {Object.entries(matchesByLeague).map(([league, matches], leagueIndex) => (
                <motion.div
                  key={league}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: leagueIndex * 0.05 }}
                >
                  {/* League Header */}
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className={cn('text-lg font-semibold', styles.accent)}>{league}</h2>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs', styles.liveBg, 'text-white')}>
                      {matches.length} LIVE
                    </span>
                  </div>

                  {/* Matches */}
                  <div className="space-y-4">
                    {matches.map((match, index) => (
                      <LiveMatchCard
                        key={match.id}
                        match={match}
                        index={index}
                        styles={styles}
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

// Live Match Card Component
interface LiveMatchCardProps {
  match: Match;
  index: number;
  styles: {
    card: string;
    accent: string;
    accentBg: string;
    liveAccent: string;
    liveBg: string;
  };
}

function LiveMatchCard({ match, index, styles }: LiveMatchCardProps) {
  return (
    <Link href={`/match/${match.id}`}>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ scale: 1.01 }}
        className={cn(
          'rounded-2xl p-4 md:p-6 cursor-pointer transition-all group',
          styles.card,
          'hover:ring-2 hover:ring-red-500/50'
        )}
      >
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex-1">
            <div className="flex items-center gap-3 md:gap-4">
              <TeamBadge team={match.homeTeam} />
              <div>
                <h3 className="font-semibold text-white text-sm md:text-lg">
                  {match.homeTeam.name}
                </h3>
                <span className="text-xs text-gray-500">Home</span>
              </div>
            </div>
          </div>

          {/* Score & Status */}
          <div className="text-center px-3 md:px-8">
            <div className="flex items-center justify-center gap-1 mb-2">
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className={cn('w-2 h-2 rounded-full', styles.liveBg)}
              />
              <span className={cn('text-sm font-bold', styles.liveAccent)}>
                {match.minute ? `${match.minute}'` : 'LIVE'}
              </span>
            </div>
            <div className="flex items-center gap-2 md:gap-4 text-3xl md:text-4xl font-bold">
              <span className={styles.liveAccent}>{match.homeScore ?? 0}</span>
              <span className="text-gray-600">:</span>
              <span className={styles.liveAccent}>{match.awayScore ?? 0}</span>
            </div>
            {match.halfTimeScore && (
              <p className="text-xs text-gray-500 mt-1">HT: {match.halfTimeScore}</p>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1">
            <div className="flex items-center gap-3 md:gap-4 justify-end">
              <div className="text-right">
                <h3 className="font-semibold text-white text-sm md:text-lg">
                  {match.awayTeam.name}
                </h3>
                <span className="text-xs text-gray-500">Away</span>
              </div>
              <TeamBadge team={match.awayTeam} />
            </div>
          </div>
        </div>

        {/* AI Analysis Button */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className={cn(
            'w-full py-3 rounded-xl text-center font-semibold transition-all flex items-center justify-center gap-2',
            'bg-red-500/10 border border-red-500/30',
            styles.liveAccent,
            'group-hover:bg-red-500 group-hover:text-white group-hover:border-transparent'
          )}>
            <Bot size={20} />
            Get Live AI Analysis
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// Team Badge Component
function TeamBadge({ team }: { team: { name: string; logo?: string } }) {
  const [imgError, setImgError] = useState(false);
  const bgColor = TEAM_COLORS[team.name] || '#6366f1';

  if (team.logo && !imgError) {
    return (
      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/10 p-1.5 overflow-hidden flex-shrink-0">
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
      className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0"
      style={{
        background: `linear-gradient(135deg, ${bgColor}, ${bgColor}99)`,
        boxShadow: `0 4px 20px ${bgColor}40`,
      }}
    >
      {team.name.substring(0, 2).toUpperCase()}
    </div>
  );
}
