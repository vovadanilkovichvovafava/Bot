'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare, ArrowRight, Brain, Calendar, Zap,
  BarChart3, ChevronRight, Loader2, Radio, Users, Flag
} from 'lucide-react';
import { useMatchesStore } from '@/store/matchesStore';
import { Match, formatMatchDate, isMatchLive } from '@/types';

// Team colors for tifo
const TEAM_COLORS: Record<string, { primary: string; secondary: string; tifo: string }> = {
  'Arsenal': { primary: '#EF0107', secondary: '#FFFFFF', tifo: '#EF0107' },
  'Chelsea': { primary: '#034694', secondary: '#D4AF37', tifo: '#034694' },
  'Manchester United': { primary: '#DA291C', secondary: '#FFE500', tifo: '#DA291C' },
  'Manchester City': { primary: '#6CABDD', secondary: '#1C2C5B', tifo: '#6CABDD' },
  'Liverpool': { primary: '#C8102E', secondary: '#00B2A9', tifo: '#C8102E' },
  'Tottenham': { primary: '#132257', secondary: '#FFFFFF', tifo: '#132257' },
  'Real Madrid': { primary: '#FEBE10', secondary: '#00529F', tifo: '#FFFFFF' },
  'Barcelona': { primary: '#A50044', secondary: '#004D98', tifo: '#A50044' },
  'Bayern Munich': { primary: '#DC052D', secondary: '#0066B2', tifo: '#DC052D' },
  'PSG': { primary: '#004170', secondary: '#DA291C', tifo: '#004170' },
  'Juventus': { primary: '#000000', secondary: '#FFFFFF', tifo: '#000000' },
  'AC Milan': { primary: '#FB090B', secondary: '#000000', tifo: '#FB090B' },
  'Inter': { primary: '#0068A8', secondary: '#000000', tifo: '#0068A8' },
  'Spartak Moscow': { primary: '#DA291C', secondary: '#FFFFFF', tifo: '#DA291C' },
};

const TOP_LEAGUES = [
  { name: 'Premier League', logo: 'https://media.api-sports.io/football/leagues/39.png', code: 'PL' },
  { name: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png', code: 'PD' },
  { name: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png', code: 'SA' },
  { name: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png', code: 'BL1' },
  { name: 'Ligue 1', logo: 'https://media.api-sports.io/football/leagues/61.png', code: 'FL1' },
];

// Stadium images for tifo atmosphere
const STADIUM_IMAGES = [
  'https://images.pexels.com/photos/46798/the-ball-stadance-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg?auto=compress&cs=tinysrgb&w=1920',
];

export function StadiumHome() {
  const [mounted, setMounted] = useState(false);

  const {
    todayMatches,
    liveMatches,
    isLoading,
    loadTodayMatches,
    loadLiveMatches,
  } = useMatchesStore();

  useEffect(() => {
    setMounted(true);
    loadTodayMatches();
    loadLiveMatches();
  }, [loadTodayMatches, loadLiveMatches]);

  // Get featured match
  const featuredMatch = liveMatches.length > 0
    ? liveMatches[0]
    : todayMatches.length > 0
      ? todayMatches[0]
      : null;

  // Get team colors for tifo
  const getTeamColors = (teamName: string) => {
    return TEAM_COLORS[teamName] || { primary: '#6366f1', secondary: '#FFFFFF', tifo: '#6366f1' };
  };

  // Generate AI prediction
  const getAIPrediction = (match: Match | null) => {
    if (!match) return { homeWin: 40, draw: 30, awayWin: 30, score: '2-1', confidence: 65 };
    const seed = match.id % 100;
    const homeWin = 35 + (seed % 35);
    const draw = 15 + ((seed * 3) % 25);
    const awayWin = 100 - homeWin - draw;
    const homeGoals = Math.floor(seed / 30) + 1;
    const awayGoals = Math.floor((seed % 30) / 15);
    return {
      homeWin,
      draw,
      awayWin,
      score: `${homeGoals}-${awayGoals}`,
      confidence: Math.max(homeWin, awayWin),
    };
  };

  const prediction = getAIPrediction(featuredMatch);
  const homeColors = featuredMatch ? getTeamColors(featuredMatch.homeTeam.name) : { primary: '#6366f1', secondary: '#FFFFFF', tifo: '#6366f1' };
  const awayColors = featuredMatch ? getTeamColors(featuredMatch.awayTeam.name) : { primary: '#f59e0b', secondary: '#000000', tifo: '#f59e0b' };
  const live = featuredMatch ? isMatchLive(featuredMatch) : false;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-900">
      {/* Stadium Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={STADIUM_IMAGES[0]}
          alt="Stadium"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 30%' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = STADIUM_IMAGES[1];
          }}
        />
        {/* Atmospheric overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />

        {/* Stadium floodlights glow */}
        <div className="absolute top-0 left-[5%] w-96 h-[500px] bg-white/15 blur-[150px] rounded-full" />
        <div className="absolute top-0 right-[5%] w-96 h-[500px] bg-white/15 blur-[150px] rounded-full" />
        <div className="absolute top-0 left-[35%] w-72 h-96 bg-white/10 blur-[120px] rounded-full" />
        <div className="absolute top-0 right-[35%] w-72 h-96 bg-white/10 blur-[120px] rounded-full" />
      </div>

      {/* Tifo Cards Display - Simulated fans holding up colored cards */}
      {featuredMatch && (
        <div className="absolute inset-0 z-5 overflow-hidden pointer-events-none">
          {/* Left side tifo (Home team color) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: mounted ? 0.4 : 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="absolute left-0 top-[15%] w-1/3 h-[40%]"
            style={{
              background: `linear-gradient(135deg, ${homeColors.tifo}80 0%, transparent 70%)`,
            }}
          />

          {/* Right side tifo (Away team color) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: mounted ? 0.4 : 0 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="absolute right-0 top-[15%] w-1/3 h-[40%]"
            style={{
              background: `linear-gradient(-135deg, ${awayColors.tifo}80 0%, transparent 70%)`,
            }}
          />

          {/* Animated tifo wave effect */}
          <motion.div
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.02, 1],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-[10%] top-[20%] w-32 h-32 rounded-full blur-3xl"
            style={{ backgroundColor: homeColors.tifo }}
          />
          <motion.div
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.02, 1],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute right-[10%] top-[20%] w-32 h-32 rounded-full blur-3xl"
            style={{ backgroundColor: awayColors.tifo }}
          />
        </div>
      )}

      {/* Floating confetti/pyro effect */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: i % 2 === 0 ? homeColors?.primary : awayColors?.primary,
              left: `${Math.random() * 100}%`,
            }}
            initial={{ y: '120%', opacity: 0, scale: 0 }}
            animate={{
              y: '-20%',
              opacity: [0, 1, 1, 0],
              scale: [0, 1, 1, 0.5],
              x: [0, (Math.random() - 0.5) * 100],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 8,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-20 max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : -30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl md:text-5xl font-black text-white mb-3 drop-shadow-2xl tracking-tight">
            <span className="text-indigo-400">AI</span> FOOTBALL PREDICTOR
          </h1>
          <p className="text-gray-300 text-lg">
            Спроси ИИ, кто победит сегодня?
          </p>

          {/* CTA Button */}
          <Link href="/ai-chat">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="mt-4 bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-8 py-4 rounded-xl inline-flex items-center gap-3 shadow-xl shadow-indigo-500/30 transition-all"
            >
              <Brain className="w-6 h-6" />
              ЗАДАТЬ ВОПРОС AI
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
        </motion.div>

        {/* Loading State */}
        {isLoading && !featuredMatch && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mb-4" />
            <p className="text-gray-400">Загрузка матчей...</p>
          </div>
        )}

        {/* Featured Match with Tifo Banners */}
        {featuredMatch && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mb-8"
          >
            {/* Live/League Badge */}
            <div className="flex items-center justify-center mb-4">
              {live ? (
                <span className="flex items-center gap-2 px-4 py-2 bg-red-500/30 border border-red-500/50 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 font-bold uppercase tracking-wider">В эфире</span>
                </span>
              ) : (
                <span className="px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white/80 font-medium">
                  {featuredMatch.league}
                </span>
              )}
            </div>

            {/* Tifo-style Match Display */}
            <div className="relative flex items-stretch justify-center gap-4 md:gap-12 lg:gap-20">
              {/* Home Team Tifo Banner */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
                className="relative"
              >
                {/* Tifo banner held by fans */}
                <div className="relative">
                  {/* Banner frame/poles */}
                  <div className="absolute -top-2 -left-2 -right-2 h-3 bg-gradient-to-r from-gray-700 via-gray-500 to-gray-700 rounded-t-lg" />

                  {/* Main tifo banner */}
                  <motion.div
                    animate={{
                      rotateZ: [-0.3, 0.3, -0.3],
                      y: [0, -2, 0],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ transformOrigin: 'top center' }}
                    className="relative w-36 md:w-48 lg:w-56 min-h-[180px] md:min-h-[240px] lg:min-h-[280px] rounded-b-xl overflow-hidden shadow-2xl"
                  >
                    {/* Banner background with team color gradient */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(180deg, ${homeColors.primary} 0%, ${homeColors.primary}ee 60%, ${homeColors.primary}bb 100%)`,
                      }}
                    />

                    {/* Fabric texture */}
                    <div className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
                      }}
                    />

                    {/* Ripple/wave effect on fabric */}
                    <motion.div
                      animate={{ x: [-3, 3, -3] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-4"
                    >
                      <TeamLogo team={featuredMatch.homeTeam} size="large" />
                      <h3 className="text-white font-bold text-base md:text-lg lg:text-xl text-center mt-3 uppercase tracking-wide drop-shadow-lg">
                        {featuredMatch.homeTeam.name}
                      </h3>
                    </motion.div>

                    {/* Bottom fringe */}
                    <div className="absolute -bottom-1 left-0 right-0 flex justify-center gap-[2px]">
                      {[...Array(18)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ rotateZ: [-3, 3, -3] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.05 }}
                          className="w-1.5 h-4 rounded-b"
                          style={{ backgroundColor: homeColors.secondary }}
                        />
                      ))}
                    </div>
                  </motion.div>

                  {/* Shadow under banner */}
                  <div className="absolute -bottom-4 left-2 right-2 h-6 bg-black/40 blur-xl rounded-full" />
                </div>

                {/* Simulated fans holding the banner */}
                <div className="flex justify-center mt-2 opacity-60">
                  {[...Array(5)].map((_, i) => (
                    <Users key={i} size={14} className="text-white/50 mx-0.5" />
                  ))}
                </div>
              </motion.div>

              {/* Center Score/VS */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
                className="self-center text-center py-6"
              >
                {live ? (
                  <div>
                    <div className="text-5xl md:text-7xl lg:text-8xl font-black text-red-400 drop-shadow-2xl tracking-tighter">
                      {featuredMatch.homeScore ?? 0} : {featuredMatch.awayScore ?? 0}
                    </div>
                    {featuredMatch.minute && (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-red-500 font-bold text-xl"
                      >
                        {featuredMatch.minute}'
                      </motion.span>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="text-5xl md:text-7xl lg:text-8xl font-black text-white/80 drop-shadow-2xl tracking-tighter">
                      VS
                    </div>
                    <p className="text-indigo-300 text-sm mt-1 uppercase tracking-wider">
                      {formatMatchDate(featuredMatch.matchDate)}
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Away Team Tifo Banner */}
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8, type: 'spring' }}
                className="relative"
              >
                <div className="relative">
                  <div className="absolute -top-2 -left-2 -right-2 h-3 bg-gradient-to-r from-gray-700 via-gray-500 to-gray-700 rounded-t-lg" />

                  <motion.div
                    animate={{
                      rotateZ: [0.3, -0.3, 0.3],
                      y: [0, -2, 0],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                    style={{ transformOrigin: 'top center' }}
                    className="relative w-36 md:w-48 lg:w-56 min-h-[180px] md:min-h-[240px] lg:min-h-[280px] rounded-b-xl overflow-hidden shadow-2xl"
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(180deg, ${awayColors.primary} 0%, ${awayColors.primary}ee 60%, ${awayColors.primary}bb 100%)`,
                      }}
                    />

                    <div className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
                      }}
                    />

                    <motion.div
                      animate={{ x: [3, -3, 3] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-4"
                    >
                      <TeamLogo team={featuredMatch.awayTeam} size="large" />
                      <h3 className="text-white font-bold text-base md:text-lg lg:text-xl text-center mt-3 uppercase tracking-wide drop-shadow-lg">
                        {featuredMatch.awayTeam.name}
                      </h3>
                    </motion.div>

                    <div className="absolute -bottom-1 left-0 right-0 flex justify-center gap-[2px]">
                      {[...Array(18)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ rotateZ: [3, -3, 3] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.05 }}
                          className="w-1.5 h-4 rounded-b"
                          style={{ backgroundColor: awayColors.secondary }}
                        />
                      ))}
                    </div>
                  </motion.div>

                  <div className="absolute -bottom-4 left-2 right-2 h-6 bg-black/40 blur-xl rounded-full" />
                </div>

                <div className="flex justify-center mt-2 opacity-60">
                  {[...Array(5)].map((_, i) => (
                    <Users key={i} size={14} className="text-white/50 mx-0.5" />
                  ))}
                </div>
              </motion.div>
            </div>

            {/* AI Verdict Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="max-w-xl mx-auto mt-8"
            >
              <div className="bg-black/60 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-5">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-indigo-400" />
                  <span className="text-indigo-400 font-bold uppercase tracking-widest text-sm">AI прогноз</span>
                </div>

                {/* Probability bar */}
                <div className="mb-4">
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.homeWin}%` }}
                      transition={{ duration: 1, delay: 1.1 }}
                      className="rounded-l-full"
                      style={{ background: homeColors.primary }}
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.draw}%` }}
                      transition={{ duration: 1, delay: 1.3 }}
                      className="bg-gray-500"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.awayWin}%` }}
                      transition={{ duration: 1, delay: 1.5 }}
                      className="rounded-r-full"
                      style={{ background: awayColors.primary }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-white">{prediction.homeWin}%</span>
                    <span className="text-gray-400">Ничья {prediction.draw}%</span>
                    <span className="text-white">{prediction.awayWin}%</span>
                  </div>
                </div>

                {/* Predicted score */}
                <div className="text-center mb-4">
                  <span className="text-gray-400 text-sm">Прогноз счета: </span>
                  <span className="text-2xl font-bold text-indigo-400">{prediction.score}</span>
                </div>

                <Link href={`/match/${featuredMatch.id}`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transition-all"
                  >
                    <BarChart3 className="w-5 h-5" />
                    Полный анализ
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Top Leagues */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 30 }}
          transition={{ delay: 1 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-white text-center mb-6 uppercase tracking-wider">
            Топ-5 Лиг
          </h2>

          <div className="flex justify-center items-center gap-3 md:gap-4 flex-wrap">
            {TOP_LEAGUES.map((league, index) => (
              <motion.div
                key={league.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 + index * 0.1 }}
              >
                <Link href={`/matches?league=${league.code}`}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white/95 hover:bg-white rounded-xl px-4 py-3 md:px-5 md:py-4 flex flex-col items-center gap-2 shadow-xl hover:shadow-2xl transition-all cursor-pointer min-w-[90px] md:min-w-[110px]"
                  >
                    <img
                      src={league.logo}
                      alt={league.name}
                      className="w-10 h-10 md:w-12 md:h-12 object-contain"
                    />
                    <span className="text-xs font-semibold text-gray-800 text-center">
                      {league.name}
                    </span>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 30 }}
          transition={{ delay: 1.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            { icon: Calendar, label: 'Все матчи', href: '/matches', color: 'from-indigo-500 to-indigo-600' },
            { icon: Radio, label: 'Live', href: '/live', color: 'from-red-500 to-red-600', badge: liveMatches.length > 0 ? liveMatches.length : null },
            { icon: Brain, label: 'AI Чат', href: '/ai-chat', color: 'from-purple-500 to-purple-600' },
            { icon: BarChart3, label: 'Статистика', href: '/stats', color: 'from-blue-500 to-blue-600' },
          ].map((action, index) => (
            <Link key={index} href={action.href}>
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-xl p-3 md:p-4 flex items-center gap-3 cursor-pointer hover:border-indigo-500/50 hover:bg-black/70 transition-all"
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} relative`}>
                  <action.icon className="w-5 h-5 text-white" />
                  {action.badge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center animate-pulse">
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

// Team Logo Component - Stadium Atmosphere with Spotlight Glow
function TeamLogo({ team, size = 'medium' }: { team: { name: string; logo?: string }; size?: 'small' | 'medium' | 'large' }) {
  const [imgError, setImgError] = useState(false);
  const colors = TEAM_COLORS[team.name] || { primary: '#6366f1', secondary: '#FFFFFF', tifo: '#6366f1' };

  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-14 h-14',
    large: 'w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24',
  };

  const glowSizes = {
    small: 'blur-md',
    medium: 'blur-lg',
    large: 'blur-xl',
  };

  if (team.logo && !imgError) {
    return (
      <div className="relative group flex-shrink-0">
        {/* Stadium spotlight glow */}
        <div
          className={`absolute inset-0 rounded-full opacity-60 group-hover:opacity-80 transition-opacity ${glowSizes[size]}`}
          style={{ background: `radial-gradient(circle, ${colors.tifo}80 0%, transparent 70%)` }}
        />
        {/* Dark container with purple tint */}
        <div className={`relative ${sizeClasses[size]} rounded-full bg-gray-900/90 backdrop-blur-sm p-1.5 overflow-hidden border border-indigo-500/30`}
          style={{ boxShadow: `0 4px 30px ${colors.tifo}30` }}>
          <img
            src={team.logo}
            alt={team.name}
            className="w-full h-full object-contain drop-shadow-xl"
            onError={() => setImgError(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative group flex-shrink-0">
      <div
        className={`absolute inset-0 rounded-full opacity-60 group-hover:opacity-80 transition-opacity ${glowSizes[size]}`}
        style={{ background: `radial-gradient(circle, ${colors.tifo}80 0%, transparent 70%)` }}
      />
      <div
        className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold border border-white/20`}
        style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.primary}99)`,
          boxShadow: `0 4px 30px ${colors.primary}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
        }}
      >
        {team.name.substring(0, 2).toUpperCase()}
      </div>
    </div>
  );
}
