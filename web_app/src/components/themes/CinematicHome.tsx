'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Play, ChevronRight, Trophy, TrendingUp, Users, Zap,
  Calendar, Star, ArrowRight, Loader2, Brain, BarChart3
} from 'lucide-react';
import { RadarChart } from '@/components/charts/RadarChart';
import { useMatchesStore } from '@/store/matchesStore';
import { Match, formatMatchDate, isMatchLive } from '@/types';

// Team colors for banners
const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  'Arsenal': { primary: '#EF0107', secondary: '#063672' },
  'Chelsea': { primary: '#034694', secondary: '#D4AF37' },
  'Manchester United': { primary: '#DA291C', secondary: '#FFE500' },
  'Manchester City': { primary: '#6CABDD', secondary: '#1C2C5B' },
  'Liverpool': { primary: '#C8102E', secondary: '#00B2A9' },
  'Tottenham': { primary: '#132257', secondary: '#FFFFFF' },
  'West Ham': { primary: '#7A263A', secondary: '#1BB1E7' },
  'Newcastle': { primary: '#241F20', secondary: '#FFFFFF' },
  'Everton': { primary: '#003399', secondary: '#FFFFFF' },
  'Aston Villa': { primary: '#670E36', secondary: '#95BFE5' },
  'Real Madrid': { primary: '#FEBE10', secondary: '#00529F' },
  'Barcelona': { primary: '#A50044', secondary: '#004D98' },
  'Bayern Munich': { primary: '#DC052D', secondary: '#0066B2' },
  'PSG': { primary: '#004170', secondary: '#DA291C' },
  'Juventus': { primary: '#000000', secondary: '#FFFFFF' },
};

// UK Landmarks with their images
const LANDMARKS = [
  {
    name: 'Tower Bridge',
    image: 'https://images.pexels.com/photos/77511/pexels-photo-77511.jpeg?auto=compress&cs=tinysrgb&w=1600',
    bannerPosition: { left: '20%', top: '15%' },
    bannerSize: 'large',
  },
  {
    name: 'Big Ben',
    image: 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=1600',
    bannerPosition: { left: '65%', top: '10%' },
    bannerSize: 'large',
  },
  {
    name: 'London Skyline',
    image: 'https://images.pexels.com/photos/672532/pexels-photo-672532.jpeg?auto=compress&cs=tinysrgb&w=1600',
    bannerPosition: { left: '40%', top: '20%' },
    bannerSize: 'medium',
  },
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
  const [currentLandmark, setCurrentLandmark] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);

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

    // Rotate landmarks
    const interval = setInterval(() => {
      setCurrentLandmark((prev) => (prev + 1) % LANDMARKS.length);
    }, 8000);

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
    return TEAM_COLORS[teamName] || { primary: '#D4AF37', secondary: '#1a1a2e' };
  };

  // Generate AI prediction
  const getAIPrediction = (match: Match | null) => {
    if (!match) return { homeWin: 40, draw: 30, awayWin: 30 };
    const seed = match.id % 100;
    const homeWin = 35 + (seed % 35);
    const draw = 15 + ((seed * 3) % 25);
    const awayWin = 100 - homeWin - draw;
    return { homeWin, draw, awayWin };
  };

  const prediction = getAIPrediction(featuredMatch);
  const homeColors = featuredMatch ? getTeamColors(featuredMatch.homeTeam.name) : { primary: '#D4AF37', secondary: '#1a1a2e' };
  const awayColors = featuredMatch ? getTeamColors(featuredMatch.awayTeam.name) : { primary: '#6CABDD', secondary: '#1a1a2e' };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Background Landmark Image */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLandmark}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <img
              src={LANDMARKS[currentLandmark].image}
              alt={LANDMARKS[currentLandmark].name}
              className="w-full h-full object-cover"
              onLoad={() => setImgLoaded(true)}
            />
            {/* Dark overlay with gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dramatic light beams */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        <div className="absolute top-0 left-[15%] w-[2px] h-[60%] bg-gradient-to-b from-amber-400/60 via-amber-400/20 to-transparent rotate-12" />
        <div className="absolute top-0 left-[30%] w-[1px] h-[50%] bg-gradient-to-b from-amber-400/40 via-amber-400/10 to-transparent rotate-6" />
        <div className="absolute top-0 right-[20%] w-[2px] h-[55%] bg-gradient-to-b from-amber-400/50 via-amber-400/15 to-transparent -rotate-12" />
        <div className="absolute top-0 right-[35%] w-[1px] h-[45%] bg-gradient-to-b from-amber-400/30 via-amber-400/10 to-transparent -rotate-6" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-400/50 rounded-full"
            initial={{ x: `${Math.random() * 100}%`, y: '110%', opacity: 0 }}
            animate={{
              y: '-10%',
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 10,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* EPL Style Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-2">
            <span className="text-white">FOOTBALL</span>{' '}
            <span className="golden-gradient">AI</span>
          </h1>
          <p className="text-amber-400/80 uppercase tracking-[0.3em] text-sm">
            Where Passion Meets Prediction
          </p>
        </motion.div>

        {/* Loading State */}
        {isLoading && !featuredMatch && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-amber-400 mb-4" />
            <p className="text-gray-400">Loading matches...</p>
          </div>
        )}

        {/* Hero Section - Featured Match with Banner Style */}
        {featuredMatch && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-12"
          >
            {/* Match Type Badge */}
            <div className="flex items-center justify-center mb-6">
              {isMatchLive(featuredMatch) ? (
                <span className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 font-bold uppercase tracking-wider">Live Now</span>
                </span>
              ) : (
                <span className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/50 rounded-full">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 font-bold uppercase tracking-wider">{featuredMatch.league}</span>
                </span>
              )}
            </div>

            {/* EPL 2010 Style Banners */}
            <div className="flex items-stretch justify-center gap-4 md:gap-8 lg:gap-16 mb-8">
              {/* Home Team Banner */}
              <motion.div
                initial={{ y: -100, opacity: 0, rotateZ: -5 }}
                animate={{ y: 0, opacity: 1, rotateZ: 0 }}
                transition={{ delay: 0.4, duration: 0.8, type: 'spring' }}
                className="relative"
              >
                {/* Banner Rod */}
                <div className="absolute -top-3 left-0 right-0 h-3 bg-gradient-to-b from-amber-600 to-amber-800 rounded-t-full shadow-lg" />
                <div className="absolute -top-4 left-4 w-3 h-5 bg-amber-700 rounded-full" />
                <div className="absolute -top-4 right-4 w-3 h-5 bg-amber-700 rounded-full" />

                {/* Banner Fabric */}
                <div
                  className="relative w-36 md:w-48 lg:w-56 min-h-[200px] md:min-h-[280px] rounded-b-lg overflow-hidden shadow-2xl"
                  style={{
                    background: `linear-gradient(180deg, ${homeColors.primary} 0%, ${homeColors.primary}dd 50%, ${homeColors.primary}aa 100%)`,
                    boxShadow: `0 20px 60px ${homeColors.primary}40, 0 10px 30px rgba(0,0,0,0.5)`,
                  }}
                >
                  {/* Fabric texture overlay */}
                  <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz48cmVjdCB3aWR0aD0iMiIgaGVpZ2h0PSIyIiBmaWxsPSIjMDAwIi8+PC9zdmc+')]" />

                  {/* Team Logo */}
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <TeamLogo team={featuredMatch.homeTeam} size="large" />
                    <h3 className="text-white font-bold text-lg md:text-xl text-center mt-4 uppercase tracking-wide drop-shadow-lg">
                      {featuredMatch.homeTeam.name}
                    </h3>
                  </div>

                  {/* Banner bottom fringe */}
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-1">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="w-2 h-4 bg-current opacity-80 rounded-b" style={{ color: homeColors.secondary }} />
                    ))}
                  </div>
                </div>

                {/* Banner shadow */}
                <div className="absolute -bottom-4 left-4 right-4 h-8 bg-black/30 blur-xl rounded-full" />
              </motion.div>

              {/* VS / Score */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                className="flex flex-col items-center justify-center py-8"
              >
                {isMatchLive(featuredMatch) ? (
                  <div className="text-center">
                    <div className="text-5xl md:text-7xl font-black text-red-400 tracking-tight">
                      {featuredMatch.homeScore ?? 0} : {featuredMatch.awayScore ?? 0}
                    </div>
                    {featuredMatch.minute && (
                      <span className="text-red-500 font-bold text-xl">{featuredMatch.minute}'</span>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-5xl md:text-7xl font-black text-gray-600 tracking-tight">VS</div>
                    <p className="text-amber-400/70 text-sm mt-2 uppercase tracking-wider">
                      {formatMatchDate(featuredMatch.matchDate)}
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Away Team Banner */}
              <motion.div
                initial={{ y: -100, opacity: 0, rotateZ: 5 }}
                animate={{ y: 0, opacity: 1, rotateZ: 0 }}
                transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
                className="relative"
              >
                {/* Banner Rod */}
                <div className="absolute -top-3 left-0 right-0 h-3 bg-gradient-to-b from-amber-600 to-amber-800 rounded-t-full shadow-lg" />
                <div className="absolute -top-4 left-4 w-3 h-5 bg-amber-700 rounded-full" />
                <div className="absolute -top-4 right-4 w-3 h-5 bg-amber-700 rounded-full" />

                {/* Banner Fabric */}
                <div
                  className="relative w-36 md:w-48 lg:w-56 min-h-[200px] md:min-h-[280px] rounded-b-lg overflow-hidden shadow-2xl"
                  style={{
                    background: `linear-gradient(180deg, ${awayColors.primary} 0%, ${awayColors.primary}dd 50%, ${awayColors.primary}aa 100%)`,
                    boxShadow: `0 20px 60px ${awayColors.primary}40, 0 10px 30px rgba(0,0,0,0.5)`,
                  }}
                >
                  {/* Fabric texture overlay */}
                  <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz48cmVjdCB3aWR0aD0iMiIgaGVpZ2h0PSIyIiBmaWxsPSIjMDAwIi8+PC9zdmc+')]" />

                  {/* Team Logo */}
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <TeamLogo team={featuredMatch.awayTeam} size="large" />
                    <h3 className="text-white font-bold text-lg md:text-xl text-center mt-4 uppercase tracking-wide drop-shadow-lg">
                      {featuredMatch.awayTeam.name}
                    </h3>
                  </div>

                  {/* Banner bottom fringe */}
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-1">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="w-2 h-4 bg-current opacity-80 rounded-b" style={{ color: awayColors.secondary }} />
                    ))}
                  </div>
                </div>

                {/* Banner shadow */}
                <div className="absolute -bottom-4 left-4 right-4 h-8 bg-black/30 blur-xl rounded-full" />
              </motion.div>
            </div>

            {/* AI Verdict Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-black/60 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-2 justify-center mb-4">
                  <Brain className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400 font-bold uppercase tracking-widest text-sm">AI Prediction</span>
                </div>

                {/* Probability Bar */}
                <div className="mb-4">
                  <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-gray-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.homeWin}%` }}
                      transition={{ duration: 1, delay: 1 }}
                      className="rounded-l-full"
                      style={{ background: homeColors.primary }}
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.draw}%` }}
                      transition={{ duration: 1, delay: 1.2 }}
                      className="bg-gray-500"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.awayWin}%` }}
                      transition={{ duration: 1, delay: 1.4 }}
                      className="rounded-r-full"
                      style={{ background: awayColors.primary }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-white">{featuredMatch.homeTeam.name.split(' ')[0]}: {prediction.homeWin}%</span>
                    <span className="text-gray-400">Draw: {prediction.draw}%</span>
                    <span className="text-white">{featuredMatch.awayTeam.name.split(' ')[0]}: {prediction.awayWin}%</span>
                  </div>
                </div>

                {/* CTA Button */}
                <Link href={`/match/${featuredMatch.id}`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30"
                  >
                    <BarChart3 className="w-5 h-5" />
                    View Full Analysis
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Upcoming Matches */}
        {todayMatches.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold golden-gradient">TODAY'S MATCHES</h2>
              <Link href="/matches" className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-sm">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayMatches.slice(1, 7).map((match, index) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <Link href={`/match/${match.id}`}>
                    <div className="bg-black/40 backdrop-blur-sm border border-amber-500/20 rounded-xl p-4 hover:border-amber-500/50 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <TeamLogo team={match.homeTeam} size="small" />
                          <span className="text-white text-sm font-medium truncate">{match.homeTeam.name}</span>
                        </div>
                        <span className="text-gray-500 text-sm px-3">vs</span>
                        <div className="flex items-center gap-3 flex-1 justify-end">
                          <span className="text-white text-sm font-medium truncate text-right">{match.awayTeam.name}</span>
                          <TeamLogo team={match.awayTeam} size="small" />
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                        <span className="text-gray-500 text-xs">{match.league}</span>
                        <span className="text-amber-400 text-xs">{formatMatchDate(match.matchDate)}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top Leagues */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          <h2 className="text-2xl font-bold golden-gradient mb-6 text-center">TOP LEAGUES</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {TOP_LEAGUES.map((league, index) => (
              <motion.div
                key={league.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + index * 0.1 }}
              >
                <Link href={`/matches?league=${league.code}`}>
                  <div className="bg-black/40 backdrop-blur-sm border border-amber-500/20 rounded-xl p-4 hover:border-amber-500/50 hover:bg-black/60 transition-all cursor-pointer group w-32 text-center">
                    <img
                      src={league.logo}
                      alt={league.name}
                      className="w-12 h-12 mx-auto mb-2 object-contain group-hover:scale-110 transition-transform"
                    />
                    <h3 className="text-xs font-semibold text-white">{league.name}</h3>
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
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
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
                className="bg-black/40 backdrop-blur-sm border border-amber-500/20 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-amber-500/50 transition-all"
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} relative`}>
                  <action.icon className="w-5 h-5 text-white" />
                  {action.badge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {action.badge}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-white">{action.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-500 ml-auto" />
              </motion.div>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// Team Logo Component - Cinematic Gold Glow Style
function TeamLogo({ team, size = 'medium' }: { team: { name: string; logo?: string }; size?: 'small' | 'medium' | 'large' }) {
  const [imgError, setImgError] = useState(false);
  const colors = TEAM_COLORS[team.name] || { primary: '#D4AF37', secondary: '#1a1a2e' };

  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-14 h-14',
    large: 'w-20 h-20 md:w-24 md:h-24',
  };

  const glowSizes = {
    small: 'blur-md',
    medium: 'blur-lg',
    large: 'blur-xl',
  };

  if (team.logo && !imgError) {
    return (
      <div className="relative group flex-shrink-0">
        {/* Golden glow effect */}
        <div
          className={`absolute inset-0 rounded-full opacity-50 group-hover:opacity-70 transition-opacity ${glowSizes[size]}`}
          style={{ background: `radial-gradient(circle, ${colors.primary}80 0%, transparent 70%)` }}
        />
        {/* Dark container */}
        <div className={`relative ${sizeClasses[size]} rounded-full bg-gray-900/90 backdrop-blur-sm p-1.5 overflow-hidden border border-amber-500/30`}
          style={{ boxShadow: `0 4px 20px ${colors.primary}30` }}>
          <img
            src={team.logo}
            alt={team.name}
            className="w-full h-full object-contain drop-shadow-lg"
            onError={() => setImgError(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative group flex-shrink-0">
      <div
        className={`absolute inset-0 rounded-full opacity-50 group-hover:opacity-70 transition-opacity ${glowSizes[size]}`}
        style={{ background: `radial-gradient(circle, ${colors.primary}80 0%, transparent 70%)` }}
      />
      <div
        className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold border border-white/20`}
        style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.primary}99)`,
          boxShadow: `0 4px 20px ${colors.primary}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
        }}
      >
        {team.name.substring(0, 2).toUpperCase()}
      </div>
    </div>
  );
}
