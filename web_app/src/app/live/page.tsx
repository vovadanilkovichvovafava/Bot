'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Loader2, RefreshCw, Brain, Clock, Wifi, WifiOff, Activity } from 'lucide-react';
import Link from 'next/link';
import { useMatchesStore } from '@/store/matchesStore';
import { useThemeStore } from '@/store/themeStore';
import { Match, isMatchLive, getShortTeamName } from '@/types';
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

  const isStadiumTheme = selectedTheme === 'stadium';

  useEffect(() => {
    loadLiveMatches();
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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadLiveMatches();
    setIsRefreshing(false);
  }, [loadLiveMatches]);

  const activeLiveMatches = liveMatches.filter(m => isMatchLive(m));

  const matchesByLeague = activeLiveMatches.reduce((acc, match) => {
    const league = match.league || 'Other';
    if (!acc[league]) {
      acc[league] = [];
    }
    acc[league].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  // Legacy styles for non-stadium themes
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
      bg: '',
      card: '',
      accent: '',
      accentBg: '',
      liveAccent: '',
      liveBg: '',
    },
  };

  const styles = selectedTheme ? themeStyles[selectedTheme] : themeStyles.neon;

  // Stadium theme - AI Analysis Center
  if (isStadiumTheme) {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ background: COLORS.bgPrimary }}>
        {/* Stadium Background */}
        <div className="absolute inset-0 z-0">
          <img
            src={STADIUM_BG}
            alt="Stadium"
            className="w-full h-[35vh] object-cover"
            style={{ filter: 'saturate(0.4) brightness(0.7) blur(2px)' }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(8,10,16,0.5) 0%, rgba(8,10,16,0.9) 25%, #080A10 35%)'
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Radio className="w-8 h-8" style={{ color: COLORS.red }} />
                  <motion.span
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                    style={{ background: COLORS.red }}
                  />
                </div>
                <div>
                  <h1
                    className="font-montserrat text-3xl font-bold uppercase tracking-wide"
                    style={{ color: COLORS.textPrimary }}
                  >
                    В прямом эфире
                  </h1>
                  <p className="text-sm" style={{ color: COLORS.textMuted }}>
                    {activeLiveMatches.length} матчей сейчас
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Auto-refresh Toggle */}
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                  style={{
                    background: COLORS.bgCard,
                    border: `1px solid ${COLORS.border}`,
                    color: autoRefresh ? COLORS.green : COLORS.textMuted,
                  }}
                >
                  {autoRefresh ? <Wifi size={18} /> : <WifiOff size={18} />}
                  <span className="text-sm">Авто</span>
                </button>

                {/* Manual Refresh */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing || isLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                  style={{
                    background: COLORS.bgCard,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.blue,
                    opacity: (isRefreshing || isLoading) ? 0.5 : 1,
                  }}
                >
                  <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">Обновить</span>
                </button>
              </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-4 text-sm">
              {isOffline && (
                <span className="flex items-center gap-1" style={{ color: '#F59E0B' }}>
                  <WifiOff size={14} />
                  Офлайн
                </span>
              )}
              {lastUpdated && (
                <span className="flex items-center gap-1" style={{ color: COLORS.textMuted }}>
                  <Clock size={14} />
                  Обновлено: {new Date(lastUpdated).toLocaleTimeString('ru-RU')}
                </span>
              )}
              {autoRefresh && (
                <span className="flex items-center gap-1" style={{ color: COLORS.green }}>
                  <Activity size={14} />
                  Авто-обновление
                </span>
              )}
            </div>
          </motion.div>

          {/* Content */}
          {isLoading && activeLiveMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: COLORS.blue }} />
              <p style={{ color: COLORS.textMuted }}>Загрузка live матчей...</p>
            </div>
          ) : activeLiveMatches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 rounded-2xl"
              style={{
                background: COLORS.bgGlass,
                backdropFilter: 'blur(16px)',
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <Radio className="w-20 h-20 mx-auto mb-6" style={{ color: COLORS.textMuted }} />
              <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.textPrimary }}>
                Нет live матчей
              </h2>
              <p className="mb-6" style={{ color: COLORS.textMuted }}>
                Сейчас нет матчей в прямом эфире
              </p>
              <Link
                href="/matches"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold"
                style={{ background: COLORS.blue, color: COLORS.textPrimary }}
              >
                Смотреть расписание
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
                      <h2 className="text-lg font-semibold" style={{ color: COLORS.blue }}>{league}</h2>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: COLORS.red, color: COLORS.textPrimary }}
                      >
                        {matches.length} LIVE
                      </span>
                    </div>

                    {/* Matches */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {matches.map((match, index) => (
                        <StadiumLiveMatchCard key={match.id} match={match} index={index} />
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
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
                <p className="text-gray-400 text-sm">{activeLiveMatches.length} matches in progress</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-lg transition-all', styles.card, autoRefresh ? styles.accent : 'text-gray-500')}
              >
                {autoRefresh ? <Wifi size={18} /> : <WifiOff size={18} />}
                <span className="text-sm">Auto</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-lg transition-all', styles.card, styles.accent, (isRefreshing || isLoading) && 'opacity-50')}
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {isOffline && <span className="flex items-center gap-1 text-yellow-500"><WifiOff size={14} />Offline</span>}
            {lastUpdated && <span className="flex items-center gap-1 text-gray-500"><Clock size={14} />Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>}
            {autoRefresh && <span className="flex items-center gap-1 text-green-500"><Activity size={14} />Auto-refreshing</span>}
          </div>
        </motion.div>

        {isLoading && activeLiveMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className={cn('w-10 h-10 animate-spin mb-4', styles.accent)} />
            <p className="text-gray-400">Loading live matches...</p>
          </div>
        ) : activeLiveMatches.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn('text-center py-16 rounded-2xl', styles.card)}>
            <Radio className="w-20 h-20 mx-auto text-gray-600 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">No Live Matches</h2>
            <p className="text-gray-400 mb-6">There are no matches currently in play</p>
            <Link href="/matches" className={cn('inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold', styles.accentBg, 'text-white')}>View Upcoming Matches</Link>
          </motion.div>
        ) : (
          <div className="space-y-8">
            <AnimatePresence mode="popLayout">
              {Object.entries(matchesByLeague).map(([league, matches], leagueIndex) => (
                <motion.div key={league} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ delay: leagueIndex * 0.05 }}>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className={cn('text-lg font-semibold', styles.accent)}>{league}</h2>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs', styles.liveBg, 'text-white')}>{matches.length} LIVE</span>
                  </div>
                  <div className="space-y-4">
                    {matches.map((match, index) => (
                      <LiveMatchCard key={match.id} match={match} index={index} styles={styles} />
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

// Stadium Live Match Card
function StadiumLiveMatchCard({ match, index }: { match: Match; index: number }) {
  return (
    <Link href={`/match/${match.id}`}>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ scale: 1.01 }}
        className="group relative rounded-2xl p-5 cursor-pointer transition-all overflow-hidden"
        style={{
          background: COLORS.bgGlass,
          backdropFilter: 'blur(12px)',
          borderLeft: `4px solid ${COLORS.red}`,
        }}
      >
        {/* Pulsing glow */}
        <motion.div
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0"
          style={{ background: `linear-gradient(90deg, ${COLORS.red}10 0%, transparent 100%)` }}
        />

        {/* Live Badge */}
        <div
          className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: `${COLORS.red}20` }}
        >
          <motion.div
            animate={{ opacity: [1, 0.5, 1], scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 rounded-full"
            style={{ background: COLORS.red }}
          />
          <span className="text-xs font-bold" style={{ color: COLORS.red }}>
            {match.minute ? `${match.minute}'` : 'LIVE'}
          </span>
        </div>

        {/* League */}
        <span className="text-xs" style={{ color: COLORS.textMuted }}>{match.league}</span>

        {/* Score */}
        <div className="flex items-center justify-between gap-4 my-4">
          <div className="flex items-center gap-3 flex-1">
            <StadiumTeamBadge team={match.homeTeam} />
            <span className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>
              {getShortTeamName(match.homeTeam.name)}
            </span>
          </div>

          <span
            className="font-montserrat text-3xl font-extrabold"
            style={{ color: COLORS.red }}
          >
            {match.homeScore ?? 0} — {match.awayScore ?? 0}
          </span>

          <div className="flex items-center gap-3 flex-1 justify-end">
            <span className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>
              {getShortTeamName(match.awayTeam.name)}
            </span>
            <StadiumTeamBadge team={match.awayTeam} />
          </div>
        </div>

        {/* AI Insight */}
        <p className="text-xs text-center italic mb-4" style={{ color: COLORS.textSecondary }}>
          AI: Ожидается ещё 1 гол (73% вероятность)
        </p>

        {/* AI Analysis Button */}
        <div
          className="w-full py-3 rounded-xl text-center font-semibold transition-all flex items-center justify-center gap-2"
          style={{
            background: `${COLORS.red}15`,
            border: `1px solid ${COLORS.red}40`,
            color: COLORS.red,
          }}
        >
          <Brain size={20} />
          Live AI анализ
        </div>
      </motion.div>
    </Link>
  );
}

// Stadium Team Badge
function StadiumTeamBadge({ team }: { team: { name: string; logo?: string } }) {
  const [imgError, setImgError] = useState(false);
  const bgColor = TEAM_COLORS[team.name] || COLORS.blue;

  if (team.logo && !imgError) {
    return (
      <div
        className="w-12 h-12 rounded-full p-1.5 overflow-hidden flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.1)' }}
      >
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
      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0"
      style={{
        background: `linear-gradient(135deg, ${bgColor}, ${bgColor}99)`,
        boxShadow: `0 4px 20px ${bgColor}40`,
      }}
    >
      {team.name.substring(0, 2).toUpperCase()}
    </div>
  );
}

// Legacy Live Match Card
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
        className={cn('rounded-2xl p-4 md:p-6 cursor-pointer transition-all group', styles.card, 'hover:ring-2 hover:ring-red-500/50')}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 md:gap-4">
              <TeamBadge team={match.homeTeam} />
              <div>
                <h3 className="font-semibold text-white text-sm md:text-lg">{match.homeTeam.name}</h3>
                <span className="text-xs text-gray-500">Home</span>
              </div>
            </div>
          </div>
          <div className="text-center px-3 md:px-8">
            <div className="flex items-center justify-center gap-1 mb-2">
              <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className={cn('w-2 h-2 rounded-full', styles.liveBg)} />
              <span className={cn('text-sm font-bold', styles.liveAccent)}>{match.minute ? `${match.minute}'` : 'LIVE'}</span>
            </div>
            <div className="flex items-center gap-2 md:gap-4 text-3xl md:text-4xl font-bold">
              <span className={styles.liveAccent}>{match.homeScore ?? 0}</span>
              <span className="text-gray-600">:</span>
              <span className={styles.liveAccent}>{match.awayScore ?? 0}</span>
            </div>
            {match.halfTimeScore && <p className="text-xs text-gray-500 mt-1">HT: {match.halfTimeScore}</p>}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 md:gap-4 justify-end">
              <div className="text-right">
                <h3 className="font-semibold text-white text-sm md:text-lg">{match.awayTeam.name}</h3>
                <span className="text-xs text-gray-500">Away</span>
              </div>
              <TeamBadge team={match.awayTeam} />
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className={cn('w-full py-3 rounded-xl text-center font-semibold transition-all flex items-center justify-center gap-2', 'bg-red-500/10 border border-red-500/30', styles.liveAccent, 'group-hover:bg-red-500 group-hover:text-white group-hover:border-transparent')}>
            <Brain size={20} />
            Get Live AI Analysis
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function TeamBadge({ team }: { team: { name: string; logo?: string } }) {
  const [imgError, setImgError] = useState(false);
  const bgColor = TEAM_COLORS[team.name] || '#6366f1';

  if (team.logo && !imgError) {
    return (
      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/10 p-1.5 overflow-hidden flex-shrink-0">
        <img src={team.logo} alt={team.name} className="w-full h-full object-contain" onError={() => setImgError(true)} />
      </div>
    );
  }

  return (
    <div
      className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0"
      style={{ background: `linear-gradient(135deg, ${bgColor}, ${bgColor}99)`, boxShadow: `0 4px 20px ${bgColor}40` }}
    >
      {team.name.substring(0, 2).toUpperCase()}
    </div>
  );
}
