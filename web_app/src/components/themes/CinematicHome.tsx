'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight, Trophy, Zap, Calendar, ArrowRight, Loader2, Brain, BarChart3,
  Swords, Shield, Target, Activity, TrendingUp, Users, Radio
} from 'lucide-react';
import { useMatchesStore } from '@/store/matchesStore';
import { Match, formatMatchDate, isMatchLive, getShortTeamName } from '@/types';

// Team colors for flags
const TEAM_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
  'Arsenal': { primary: '#EF0107', secondary: '#FFFFFF', accent: '#063672' },
  'Chelsea': { primary: '#034694', secondary: '#FFFFFF', accent: '#D4AF37' },
  'Manchester United': { primary: '#DA291C', secondary: '#FFFFFF', accent: '#FFE500' },
  'Manchester City': { primary: '#6CABDD', secondary: '#FFFFFF', accent: '#1C2C5B' },
  'Liverpool': { primary: '#C8102E', secondary: '#FFFFFF', accent: '#00B2A9' },
  'Tottenham': { primary: '#132257', secondary: '#FFFFFF', accent: '#FFFFFF' },
  'West Ham': { primary: '#7A263A', secondary: '#FFFFFF', accent: '#1BB1E7' },
  'Newcastle': { primary: '#241F20', secondary: '#FFFFFF', accent: '#FFFFFF' },
  'Everton': { primary: '#003399', secondary: '#FFFFFF', accent: '#FFFFFF' },
  'Aston Villa': { primary: '#670E36', secondary: '#95BFE5', accent: '#FFFFFF' },
  'Real Madrid': { primary: '#FEBE10', secondary: '#FFFFFF', accent: '#00529F' },
  'Barcelona': { primary: '#A50044', secondary: '#004D98', accent: '#FFFFFF' },
  'Bayern Munich': { primary: '#DC052D', secondary: '#FFFFFF', accent: '#0066B2' },
  'PSG': { primary: '#004170', secondary: '#DA291C', accent: '#FFFFFF' },
  'Juventus': { primary: '#000000', secondary: '#FFFFFF', accent: '#FFFFFF' },
  'Dortmund': { primary: '#FDE100', secondary: '#000000', accent: '#000000' },
  'Inter': { primary: '#0068A8', secondary: '#000000', accent: '#FFFFFF' },
  'AC Milan': { primary: '#FB090B', secondary: '#000000', accent: '#FFFFFF' },
};

// Stadium backgrounds
const STADIUM_BACKGROUNDS = [
  'https://images.pexels.com/photos/46798/the-ball-stadance-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/61135/pexels-photo-61135.jpeg?auto=compress&cs=tinysrgb&w=1920',
];

const TOP_LEAGUES = [
  { name: 'Premier League', logo: 'https://media.api-sports.io/football/leagues/39.png', code: 'PL' },
  { name: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png', code: 'PD' },
  { name: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png', code: 'SA' },
  { name: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png', code: 'BL1' },
  { name: 'Champions League', logo: 'https://media.api-sports.io/football/leagues/2.png', code: 'CL' },
];

export function CinematicHome() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);

  const {
    todayMatches,
    liveMatches,
    isLoading,
    loadTodayMatches,
    loadLiveMatches,
  } = useMatchesStore();

  useEffect(() => {
    setIsVisible(true);
    loadTodayMatches();
    loadLiveMatches();

    // Rotate backgrounds
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % STADIUM_BACKGROUNDS.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [loadTodayMatches, loadLiveMatches]);

  // Get featured match
  const featuredMatch = liveMatches.length > 0
    ? liveMatches[0]
    : todayMatches.length > 0
      ? todayMatches[0]
      : null;

  // Get team colors
  const getTeamColors = (teamName: string) => {
    return TEAM_COLORS[teamName] || { primary: '#D4AF37', secondary: '#FFFFFF', accent: '#1a1a2e' };
  };

  const homeColors = featuredMatch ? getTeamColors(featuredMatch.homeTeam.name) : { primary: '#D4AF37', secondary: '#FFFFFF', accent: '#1a1a2e' };
  const awayColors = featuredMatch ? getTeamColors(featuredMatch.awayTeam.name) : { primary: '#6CABDD', secondary: '#FFFFFF', accent: '#1a1a2e' };
  const live = featuredMatch ? isMatchLive(featuredMatch) : false;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-950">
      {/* Stadium Background with Spotlight Effects */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBg}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0"
          >
            <img
              src={STADIUM_BACKGROUNDS[currentBg]}
              alt="Stadium"
              className="w-full h-full object-cover"
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/50" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black" />
          </motion.div>
        </AnimatePresence>

        {/* Spotlight beams */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-0 left-[10%] w-[200px] h-[500px] bg-gradient-to-b from-amber-400/30 via-amber-400/5 to-transparent rotate-12 blur-sm"
          />
          <motion.div
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 5, repeat: Infinity, delay: 1 }}
            className="absolute top-0 right-[15%] w-[150px] h-[400px] bg-gradient-to-b from-amber-400/25 via-amber-400/5 to-transparent -rotate-12 blur-sm"
          />
          <motion.div
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 6, repeat: Infinity, delay: 2 }}
            className="absolute top-0 left-[45%] w-[100px] h-[350px] bg-gradient-to-b from-white/20 via-white/5 to-transparent blur-sm"
          />
        </div>
      </div>

      {/* Floating golden particles */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-400/60 rounded-full"
            initial={{ x: `${Math.random() * 100}%`, y: '110%', opacity: 0 }}
            animate={{ y: '-10%', opacity: [0, 0.8, 0] }}
            transition={{
              duration: 6 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 8,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">
            <span className="text-white">MATCH</span>{' '}
            <span className="golden-gradient">CENTER</span>
          </h1>
          <p className="text-amber-400/70 uppercase tracking-[0.3em] text-xs">
            AI-Powered Football Analysis
          </p>
        </motion.div>

        {/* Loading State */}
        {isLoading && !featuredMatch && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-amber-400 mb-4" />
            <p className="text-gray-400">Loading matches...</p>
          </div>
        )}

        {/* Main Layout */}
        {featuredMatch && (
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column - Match Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -30 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-1"
            >
              <div className="bg-black/60 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-amber-400" />
                  <h3 className="text-amber-400 font-bold uppercase tracking-wider text-sm">Match Info</h3>
                </div>

                {/* Teams */}
                <div className="flex justify-center gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: homeColors.primary }} />
                    <span className="text-sm text-white">{getShortTeamName(featuredMatch.homeTeam.name)}</span>
                  </div>
                  <span className="text-gray-500">vs</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: awayColors.primary }} />
                    <span className="text-sm text-white">{getShortTeamName(featuredMatch.awayTeam.name)}</span>
                  </div>
                </div>

                {/* League Info */}
                <div className="p-4 rounded-xl bg-white/5 mb-4">
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">League</p>
                  <p className="text-white font-semibold">{featuredMatch.league}</p>
                </div>

                {/* Match Date */}
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Match Time</p>
                  <p className="text-white font-semibold">{formatMatchDate(featuredMatch.matchDate)}</p>
                </div>

                {/* CTA */}
                <Link href={`/match/${featuredMatch.id}`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full mt-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-amber-500/30 transition-all"
                  >
                    <Brain className="w-4 h-4" />
                    Get AI Analysis
                  </motion.button>
                </Link>
              </div>
            </motion.div>

            {/* Center Column - Featured Match with Waving Flags */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1"
            >
              {/* Match Badge */}
              <div className="flex items-center justify-center mb-4">
                {live ? (
                  <span className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 font-bold uppercase tracking-wider text-sm">Live Now</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/50 rounded-full">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 font-bold uppercase tracking-wider text-sm">{featuredMatch.league}</span>
                  </span>
                )}
              </div>

              {/* 3D Waving Flags with Teams */}
              <div className="flex items-center justify-center gap-4 mb-6">
                {/* Home Flag */}
                <WavingFlag team={featuredMatch.homeTeam} colors={homeColors} side="left" />

                {/* VS / Score */}
                <div className="text-center px-4">
                  {live ? (
                    <div>
                      <div className="text-4xl md:text-5xl font-black text-red-400 tracking-tight">
                        {featuredMatch.homeScore ?? 0} : {featuredMatch.awayScore ?? 0}
                      </div>
                      {featuredMatch.minute && (
                        <span className="text-red-500 font-bold">{featuredMatch.minute}'</span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl md:text-5xl font-black text-gray-600 tracking-tight">VS</div>
                      <p className="text-amber-400/70 text-sm mt-1">
                        {formatMatchDate(featuredMatch.matchDate)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Away Flag */}
                <WavingFlag team={featuredMatch.awayTeam} colors={awayColors} side="right" />
              </div>

              {/* AI Analysis Card */}
              <div className="bg-black/60 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 justify-center mb-4">
                  <Brain className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400 font-bold uppercase tracking-widest text-sm">AI Analysis</span>
                </div>

                {/* Info text */}
                <p className="text-gray-400 text-center text-sm mb-4">
                  Get detailed AI predictions, statistics, and betting recommendations for this match
                </p>

                {/* CTA Button */}
                <Link href={`/match/${featuredMatch.id}`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30"
                  >
                    <BarChart3 className="w-5 h-5" />
                    View Full Analysis
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </Link>
              </div>
            </motion.div>

            {/* Right Column - Live & Upcoming */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 30 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-1"
            >
              {/* Live Matches */}
              {liveMatches.length > 0 && (
                <div className="bg-black/60 backdrop-blur-xl border border-red-500/30 rounded-2xl p-5 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Radio className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 font-bold uppercase tracking-wider text-sm">Live Now</span>
                    <span className="ml-auto px-2 py-0.5 bg-red-500/20 rounded-full text-red-400 text-xs">
                      {liveMatches.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {liveMatches.slice(0, 3).map(match => (
                      <Link key={match.id} href={`/match/${match.id}`}>
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-all">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white truncate flex-1">{match.homeTeam.name}</span>
                            <span className="text-red-400 font-bold px-3">
                              {match.homeScore ?? 0} : {match.awayScore ?? 0}
                            </span>
                            <span className="text-white truncate flex-1 text-right">{match.awayTeam.name}</span>
                          </div>
                          <div className="text-center text-xs text-red-500 mt-1">{match.minute}'</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Today */}
              <div className="bg-black/60 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-400" />
                    <span className="text-amber-400 font-bold uppercase tracking-wider text-sm">Today</span>
                  </div>
                  <Link href="/matches" className="text-amber-400/70 hover:text-amber-400 text-xs flex items-center gap-1">
                    All <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-2">
                  {todayMatches.slice(0, 5).map(match => (
                    <Link key={match.id} href={`/match/${match.id}`}>
                      <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-amber-500/30">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white truncate flex-1">{match.homeTeam.name}</span>
                          <span className="text-gray-500 px-2">vs</span>
                          <span className="text-white truncate flex-1 text-right">{match.awayTeam.name}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">{match.league}</span>
                          <span className="text-xs text-amber-400">{formatMatchDate(match.matchDate)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Top Leagues */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold golden-gradient mb-4 text-center">TOP LEAGUES</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {TOP_LEAGUES.map((league, index) => (
              <motion.div
                key={league.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <Link href={`/matches?league=${league.code}`}>
                  <div className="bg-black/40 backdrop-blur-sm border border-amber-500/20 rounded-xl p-3 hover:border-amber-500/50 hover:bg-black/60 transition-all cursor-pointer group w-24 text-center">
                    <img
                      src={league.logo}
                      alt={league.name}
                      className="w-10 h-10 mx-auto mb-2 object-contain group-hover:scale-110 transition-transform"
                    />
                    <h3 className="text-xs font-semibold text-white truncate">{league.name}</h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ delay: 0.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            { icon: Calendar, label: 'All Matches', href: '/matches', color: 'from-amber-500 to-amber-600' },
            { icon: Zap, label: 'Live Now', href: '/live', color: 'from-red-500 to-red-600', badge: liveMatches.length > 0 ? liveMatches.length : null },
            { icon: Brain, label: 'AI Chat', href: '/ai-chat', color: 'from-purple-500 to-purple-600' },
            { icon: BarChart3, label: 'My Stats', href: '/stats', color: 'from-blue-500 to-blue-600' },
          ].map((action, index) => (
            <Link key={index} href={action.href}>
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="bg-black/40 backdrop-blur-sm border border-amber-500/20 rounded-xl p-3 flex items-center gap-2 cursor-pointer hover:border-amber-500/50 transition-all"
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} relative`}>
                  <action.icon className="w-4 h-4 text-white" />
                  {action.badge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {action.badge}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-white text-sm">{action.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-500 ml-auto" />
              </motion.div>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
}


// Waving Flag Component with CSS 3D Animation
function WavingFlag({ team, colors, side }: {
  team: { name: string; logo?: string };
  colors: { primary: string; secondary: string; accent: string };
  side: 'left' | 'right';
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ y: -50, opacity: 0, rotateZ: side === 'left' ? -10 : 10 }}
      animate={{ y: 0, opacity: 1, rotateZ: 0 }}
      transition={{ type: 'spring', damping: 15, delay: side === 'left' ? 0.3 : 0.4 }}
      className="relative"
      style={{ perspective: '500px' }}
    >
      {/* Flag Pole */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-20">
        <div className="w-2 h-6 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full shadow-lg" />
        <div className="w-4 h-2 bg-amber-500 rounded-full mx-auto -mt-1" />
      </div>

      {/* Waving Flag with 3D Effect */}
      <motion.div
        animate={{
          rotateY: side === 'left' ? [0, 8, 0, -5, 0] : [0, -8, 0, 5, 0],
          rotateX: [0, 2, 0, -2, 0],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-28 md:w-36 min-h-[160px] md:min-h-[200px] mt-4 rounded-b-lg overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.primary}dd 50%, ${colors.primary}bb 100%)`,
          boxShadow: `0 15px 40px ${colors.primary}40, 0 5px 20px rgba(0,0,0,0.4)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Fabric wave pattern */}
        <div className="absolute inset-0 opacity-30">
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 w-[200%]"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${colors.secondary}40 50%, transparent 100%)`,
            }}
          />
        </div>

        {/* Secondary color stripe */}
        <div
          className="absolute bottom-0 left-0 right-0 h-8"
          style={{ background: colors.secondary, opacity: 0.8 }}
        />

        {/* Team Logo */}
        <div className="flex flex-col items-center justify-center h-full p-4 pt-2 relative z-10">
          {team.logo && !imgError ? (
            <div className="w-14 h-14 md:w-18 md:h-18 rounded-full bg-white/20 p-2 backdrop-blur-sm shadow-xl">
              <img
                src={team.logo}
                alt={team.name}
                className="w-full h-full object-contain drop-shadow-lg"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div
              className="w-14 h-14 md:w-18 md:h-18 rounded-full flex items-center justify-center text-lg font-bold shadow-xl"
              style={{ background: colors.secondary, color: colors.primary }}
            >
              {team.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <h3 className="text-white font-bold text-sm md:text-base text-center mt-3 uppercase tracking-wide drop-shadow-lg">
            {team.name}
          </h3>
        </div>

        {/* Flag bottom fringe */}
        <div className="absolute -bottom-1 left-0 right-0 flex justify-center gap-0.5">
          {[...Array(14)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, 2, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
              className="w-1.5 h-3 rounded-b"
              style={{ background: i % 2 === 0 ? colors.primary : colors.secondary, opacity: 0.9 }}
            />
          ))}
        </div>
      </motion.div>

      {/* Shadow */}
      <div className="absolute -bottom-3 left-2 right-2 h-6 bg-black/30 blur-lg rounded-full" />
    </motion.div>
  );
}
