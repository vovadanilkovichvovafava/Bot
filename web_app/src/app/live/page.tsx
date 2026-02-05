'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, RefreshCw, Clock, ChevronRight, WifiOff, Loader2, Activity, Wifi } from 'lucide-react';
import Link from 'next/link';
import { useMatchesStore } from '@/store/matchesStore';
import { Match, isMatchLive, getShortTeamName } from '@/types';
import { cn } from '@/lib/utils';

export default function LivePage() {
  const { liveMatches, loadLiveMatches, isLoading, isOffline, lastUpdated } = useMatchesStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadLiveMatches();
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => loadLiveMatches(), 30000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [loadLiveMatches, autoRefresh]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadLiveMatches();
    setIsRefreshing(false);
  }, [loadLiveMatches]);

  const actuallyLive = liveMatches.filter(isMatchLive);

  const matchesByLeague = actuallyLive.reduce((acc, match) => {
    const league = match.league || 'Other';
    if (!acc[league]) acc[league] = [];
    acc[league].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-500 via-red-600 to-orange-500 px-4 pt-12 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <motion.span
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-white"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Live Now</h1>
                <div className="flex items-center gap-2 text-sm">
                  {isOffline ? (
                    <span className="flex items-center gap-1 text-amber-200">
                      <WifiOff size={14} />
                      Offline
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-white/80">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      {actuallyLive.length} live
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn(
                  'p-2.5 rounded-xl bg-white/10 border border-white/20 transition-all active:scale-95',
                  autoRefresh ? 'text-white' : 'text-white/50'
                )}
              >
                {autoRefresh ? <Activity size={18} /> : <WifiOff size={18} />}
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="p-2.5 rounded-xl bg-white/20 border border-white/30 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={cn('w-5 h-5 text-white', isRefreshing && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 text-xs text-white/60 mt-3">
            {lastUpdated && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
            {autoRefresh && (
              <span className="flex items-center gap-1 text-white/80">
                <Wifi size={12} />
                Auto-refresh
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-3 pb-8">
        <div className="max-w-lg mx-auto space-y-4">
          {isLoading && actuallyLive.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-red-500 mb-4" />
              <p className="text-gray-500">Loading live matches...</p>
            </div>
          ) : actuallyLive.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 text-center shadow-sm"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">No Live Matches</h2>
              <p className="text-gray-500 mb-6">
                There are no matches being played right now. Check back later!
              </p>
              <Link href="/matches">
                <button className="px-6 py-3 rounded-xl bg-[#3B5998] text-white font-medium transition-all active:scale-95">
                  View Upcoming Matches
                </button>
              </Link>
            </motion.div>
          ) : (
            <AnimatePresence>
              {Object.entries(matchesByLeague).map(([league, matches], leagueIndex) => (
                <motion.div
                  key={league}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: leagueIndex * 0.05 }}
                >
                  {/* League Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-semibold text-gray-900">{league}</h2>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                      {matches.length} LIVE
                    </span>
                  </div>

                  <div className="space-y-3">
                    {matches.map((match, index) => (
                      <LiveMatchCard key={match.id} match={match} index={index} />
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

function LiveMatchCard({ match, index }: { match: Match; index: number }) {
  const [homeImgError, setHomeImgError] = useState(false);
  const [awayImgError, setAwayImgError] = useState(false);

  return (
    <Link href={`/match/${match.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className="bg-white rounded-2xl p-4 shadow-sm border border-red-100 transition-all active:scale-[0.98]"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-500 text-xs">{match.league}</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold">
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-red-500"
            />
            {match.minute}'
          </div>
        </div>

        {/* Teams & Score */}
        <div className="flex items-center justify-between">
          {/* Home */}
          <div className="flex-1 min-w-0 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center overflow-hidden mb-2">
              {match.homeTeam.logo && !homeImgError ? (
                <img
                  src={match.homeTeam.logo}
                  alt={match.homeTeam.name}
                  className="w-8 h-8 object-contain"
                  onError={() => setHomeImgError(true)}
                />
              ) : (
                <span className="text-xs font-bold text-gray-500">
                  {match.homeTeam.name.substring(0, 3).toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-gray-900 truncate px-1">
              {getShortTeamName(match.homeTeam.name)}
            </p>
          </div>

          {/* Score */}
          <div className="px-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-red-500">{match.homeScore ?? 0}</span>
              <span className="text-gray-300">:</span>
              <span className="text-2xl font-bold text-red-500">{match.awayScore ?? 0}</span>
            </div>
            {match.halfTimeScore && (
              <p className="text-center text-[10px] text-gray-400 mt-1">
                HT: {match.halfTimeScore}
              </p>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 min-w-0 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center overflow-hidden mb-2">
              {match.awayTeam.logo && !awayImgError ? (
                <img
                  src={match.awayTeam.logo}
                  alt={match.awayTeam.name}
                  className="w-8 h-8 object-contain"
                  onError={() => setAwayImgError(true)}
                />
              ) : (
                <span className="text-xs font-bold text-gray-500">
                  {match.awayTeam.name.substring(0, 3).toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-gray-900 truncate px-1">
              {getShortTeamName(match.awayTeam.name)}
            </p>
          </div>
        </div>

        {/* View Details */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-center gap-1 text-[#3B5998] text-xs font-medium">
            View Details
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
