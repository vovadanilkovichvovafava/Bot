'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronRight, Trophy, Calendar, ArrowRight, Loader2, Brain,
  Target, TrendingUp, Check, X, Radio
} from 'lucide-react';
import { useMatchesStore } from '@/store/matchesStore';
import { Match, formatMatchDate, isMatchLive, getShortTeamName } from '@/types';

// ===== DESIGN SYSTEM =====
const COLORS = {
  // Backgrounds
  bgPrimary: '#0B0D12',
  bgSecondary: '#12151C',
  bgCard: '#161A24',
  bgOverlay: 'rgba(8,10,18,0.88)',

  // Accents
  gold: '#D4A843',
  goldLight: '#F5D16C',
  steel: '#8C95A8',
  steelLight: '#B8C1D4',
  blue: '#4A9FD9',
  blueLight: '#6CB8E8',
  amber: '#D9954A',
  amberLight: '#E8B46C',
  red: '#D94A4A',
  green: '#4AD97A',
  yellow: '#D9B44A',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#C0C7D6',
  textMuted: '#5A6378',
};

// Team colors for flags
const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  'Arsenal': { primary: '#EF0107', secondary: '#FFFFFF' },
  'Chelsea': { primary: '#034694', secondary: '#FFFFFF' },
  'Manchester United': { primary: '#DA291C', secondary: '#FFFFFF' },
  'Manchester City': { primary: '#6CABDD', secondary: '#1C2C5B' },
  'Liverpool': { primary: '#C8102E', secondary: '#00B2A9' },
  'Tottenham': { primary: '#132257', secondary: '#FFFFFF' },
  'Real Madrid': { primary: '#FEBE10', secondary: '#00529F' },
  'Barcelona': { primary: '#A50044', secondary: '#004D98' },
  'Bayern Munich': { primary: '#DC052D', secondary: '#0066B2' },
  'PSG': { primary: '#004170', secondary: '#DA291C' },
  'Juventus': { primary: '#000000', secondary: '#FFFFFF' },
  'Dortmund': { primary: '#FDE100', secondary: '#000000' },
  'Inter': { primary: '#0068A8', secondary: '#000000' },
  'AC Milan': { primary: '#FB090B', secondary: '#000000' },
  'Napoli': { primary: '#12A0D7', secondary: '#FFFFFF' },
  'Atletico Madrid': { primary: '#CB3524', secondary: '#FFFFFF' },
};

// Stadium background
const STADIUM_BG = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80';

const TOP_LEAGUES = [
  { name: 'Premier League', logo: 'https://media.api-sports.io/football/leagues/39.png', code: 'PL' },
  { name: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png', code: 'PD' },
  { name: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png', code: 'SA' },
  { name: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png', code: 'BL1' },
  { name: 'Champions League', logo: 'https://media.api-sports.io/football/leagues/2.png', code: 'CL' },
];

// AI Performance mock data
const AI_PERFORMANCE = {
  accuracy: 73,
  lastTen: [true, true, true, false, true, true, true, true, false, true],
};

export function CinematicHome() {
  const [isVisible, setIsVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
  }, [loadTodayMatches, loadLiveMatches]);

  // Floating particles effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; speed: number; opacity: number; size: number }[] = [];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 0.2 + Math.random() * 0.5,
        opacity: Math.random() * 0.6,
        size: 1 + Math.random() * 1.5,
      });
    }

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.y -= particle.speed;
        if (particle.y < 0) {
          particle.y = canvas.height;
          particle.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 168, 67, ${particle.opacity})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Get featured match
  const featuredMatch = liveMatches.length > 0
    ? liveMatches[0]
    : todayMatches.length > 0
      ? todayMatches[0]
      : null;

  const getTeamColors = (teamName: string) => {
    return TEAM_COLORS[teamName] || { primary: COLORS.gold, secondary: '#FFFFFF' };
  };

  const homeColors = featuredMatch ? getTeamColors(featuredMatch.homeTeam.name) : { primary: COLORS.blue, secondary: '#FFFFFF' };
  const awayColors = featuredMatch ? getTeamColors(featuredMatch.awayTeam.name) : { primary: COLORS.amber, secondary: '#FFFFFF' };
  const isLive = featuredMatch ? isMatchLive(featuredMatch) : false;

  // Format date for badge
  const formatBadgeDate = (date: string) => {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    };
    return d.toLocaleDateString('en-US', options);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: `linear-gradient(180deg, ${COLORS.bgPrimary} 0%, ${COLORS.bgSecondary} 100%)` }}>

      {/* Stadium Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={STADIUM_BG}
          alt="Stadium"
          className="w-full h-full object-cover"
          style={{ filter: 'saturate(0.4)' }}
        />
        {/* Dark gradient overlays */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(11,13,18,0.75) 0%, rgba(11,13,18,0.95) 70%, ${COLORS.bgPrimary} 100%)`
          }}
        />
        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(11,13,18,0.6) 100%)'
          }}
        />
      </div>

      {/* Spotlight beams */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
        <motion.div
          animate={{ opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-0 left-[10%] w-[300px] h-[600px] rotate-12"
          style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)`, filter: 'blur(40px)' }}
        />
        <motion.div
          animate={{ opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          className="absolute top-0 right-[15%] w-[250px] h-[500px] -rotate-12"
          style={{ background: `linear-gradient(180deg, ${COLORS.gold}20 0%, transparent 100%)`, filter: 'blur(40px)' }}
        />
      </div>

      {/* Floating particles canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-[2] pointer-events-none" />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 z-[3] pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Loading State */}
        {isLoading && !featuredMatch && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: COLORS.gold }} />
            <p style={{ color: COLORS.textMuted }}>Loading matches...</p>
          </div>
        )}

        {/* Hero Section */}
        {featuredMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12"
          >
            {/* UPCOMING Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center mb-6"
            >
              <div
                className="px-6 py-2 rounded-full border backdrop-blur-sm"
                style={{
                  background: 'rgba(22,26,36,0.8)',
                  borderColor: `${COLORS.gold}50`
                }}
              >
                <span
                  className="font-oswald uppercase tracking-[0.2em] text-sm"
                  style={{ color: COLORS.gold }}
                >
                  {isLive ? '● LIVE' : 'UPCOMING'} • {formatBadgeDate(featuredMatch.matchDate)}
                </span>
              </div>
            </motion.div>

            {/* League Info */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-3 mb-8"
            >
              <span className="text-2xl">⚽</span>
              <span
                className="font-oswald uppercase tracking-[0.15em] text-lg"
                style={{ color: COLORS.textSecondary }}
              >
                {featuredMatch.league}
              </span>
            </motion.div>

            {/* Main Match Display */}
            <div className="flex items-center justify-center gap-4 md:gap-8 lg:gap-16 mb-8">
              {/* Home Team Flag */}
              <TeamFlagBanner
                team={featuredMatch.homeTeam}
                colors={homeColors}
                side="left"
                delay={0.4}
              />

              {/* VS / Score Section */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', damping: 15 }}
                className="text-center"
              >
                {/* Team Names */}
                <h1
                  className="font-oswald uppercase tracking-[0.1em] text-xl md:text-2xl lg:text-3xl mb-4"
                  style={{
                    color: COLORS.textPrimary,
                    textShadow: '0 0 30px rgba(255,255,255,0.15)'
                  }}
                >
                  {getShortTeamName(featuredMatch.homeTeam.name)}
                  <span style={{ color: COLORS.steel }} className="mx-3">vs</span>
                  {getShortTeamName(featuredMatch.awayTeam.name)}
                </h1>

                {/* VS or Score */}
                {isLive ? (
                  <div>
                    <div
                      className="font-oswald text-6xl md:text-8xl font-black"
                      style={{ color: COLORS.red }}
                    >
                      {featuredMatch.homeScore ?? 0} — {featuredMatch.awayScore ?? 0}
                    </div>
                    {featuredMatch.minute && (
                      <span
                        className="font-mono text-lg"
                        style={{ color: COLORS.red }}
                      >
                        {featuredMatch.minute}'
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    className="font-oswald text-7xl md:text-9xl font-black"
                    style={{
                      background: `linear-gradient(180deg, ${COLORS.steel} 0%, ${COLORS.steelLight} 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: '0 4px 20px rgba(140,149,168,0.3)'
                    }}
                  >
                    VS
                  </div>
                )}
              </motion.div>

              {/* Away Team Flag */}
              <TeamFlagBanner
                team={featuredMatch.awayTeam}
                colors={awayColors}
                side="right"
                delay={0.45}
              />
            </div>

            {/* AI VERDICT Block */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="max-w-2xl mx-auto"
            >
              <div
                className="relative p-6 rounded-2xl backdrop-blur-xl border"
                style={{
                  background: COLORS.bgOverlay,
                  borderColor: 'rgba(255,255,255,0.05)',
                  boxShadow: `0 0 60px rgba(212,168,67,0.08)`
                }}
              >
                {/* AI VERDICT Header */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="h-[1px] flex-1" style={{ background: `linear-gradient(90deg, transparent 0%, ${COLORS.gold}50 100%)` }} />
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5" style={{ color: COLORS.gold }} />
                    <span
                      className="font-rajdhani uppercase tracking-[0.3em] text-sm font-semibold"
                      style={{ color: COLORS.gold }}
                    >
                      AI Verdict
                    </span>
                  </div>
                  <div className="h-[1px] flex-1" style={{ background: `linear-gradient(90deg, ${COLORS.gold}50 0%, transparent 100%)` }} />
                </div>

                {/* Verdict Text */}
                <p
                  className="text-center text-lg leading-relaxed mb-6"
                  style={{ color: COLORS.textPrimary }}
                >
                  Home side slightly favoured due to midfield control and recent form advantage
                </p>

                {/* Quick Stats */}
                <div className="flex items-center justify-center gap-6 mb-6">
                  <StatBadge label="ATTACK" status="EVEN" />
                  <StatBadge label="MOMENTUM" status="EVEN" />
                  <StatBadge label="FORM" status="GOOD" />
                </div>

                {/* CTA Button */}
                <Link href={`/match/${featuredMatch.id}`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 rounded-xl font-oswald uppercase tracking-[0.15em] text-sm font-semibold flex items-center justify-center gap-3 transition-all"
                    style={{
                      background: 'transparent',
                      border: `2px solid ${COLORS.gold}`,
                      color: COLORS.gold
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = COLORS.gold;
                      e.currentTarget.style.color = COLORS.bgPrimary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = COLORS.gold;
                    }}
                  >
                    Full Analysis
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* AI Performance Ticker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ delay: 0.7 }}
          className="mb-10"
        >
          <div
            className="py-3 px-6 rounded-lg flex items-center justify-center gap-6"
            style={{ background: `${COLORS.bgCard}80`, border: `1px solid rgba(255,255,255,0.05)` }}
          >
            <span style={{ color: COLORS.textMuted }} className="font-mono text-sm">
              AI Accuracy: <span style={{ color: COLORS.gold }} className="font-bold">{AI_PERFORMANCE.accuracy}%</span>
            </span>
            <div className="h-4 w-[1px]" style={{ background: COLORS.textMuted }} />
            <div className="flex items-center gap-1">
              <span style={{ color: COLORS.textMuted }} className="font-mono text-sm mr-2">Last 10:</span>
              {AI_PERFORMANCE.lastTen.map((win, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-sm flex items-center justify-center"
                  style={{ background: win ? `${COLORS.green}30` : `${COLORS.red}30` }}
                >
                  {win ? (
                    <Check className="w-3 h-3" style={{ color: COLORS.green }} />
                  ) : (
                    <X className="w-3 h-3" style={{ color: COLORS.red }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Upcoming Matches Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ delay: 0.8 }}
          className="mb-10"
        >
          {/* Section Header */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-[1px] flex-1 max-w-[100px]" style={{ background: `linear-gradient(90deg, transparent 0%, ${COLORS.gold}30 100%)` }} />
            <h2
              className="font-rajdhani uppercase tracking-[0.4em] text-sm"
              style={{ color: COLORS.gold }}
            >
              Upcoming Matches
            </h2>
            <div className="h-[1px] flex-1 max-w-[100px]" style={{ background: `linear-gradient(90deg, ${COLORS.gold}30 0%, transparent 100%)` }} />
          </div>

          {/* Matches Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayMatches.slice(0, 6).map((match, index) => (
              <MatchCard key={match.id} match={match} index={index} />
            ))}
          </div>

          {/* View All Link */}
          <div className="flex justify-center mt-6">
            <Link href="/matches">
              <motion.button
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-2 px-6 py-2 rounded-full transition-all"
                style={{
                  border: `1px solid ${COLORS.gold}50`,
                  color: COLORS.gold
                }}
              >
                <span className="font-rajdhani uppercase tracking-wider text-sm">View All Matches</span>
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Top Leagues Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ delay: 0.9 }}
          className="mb-10"
        >
          {/* Section Header */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-[1px] flex-1 max-w-[100px]" style={{ background: `linear-gradient(90deg, transparent 0%, ${COLORS.gold}30 100%)` }} />
            <h2
              className="font-rajdhani uppercase tracking-[0.4em] text-sm"
              style={{ color: COLORS.gold }}
            >
              Top Leagues
            </h2>
            <div className="h-[1px] flex-1 max-w-[100px]" style={{ background: `linear-gradient(90deg, ${COLORS.gold}30 0%, transparent 100%)` }} />
          </div>

          {/* Leagues Row */}
          <div className="flex flex-wrap justify-center gap-4">
            {TOP_LEAGUES.map((league, index) => (
              <motion.div
                key={league.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
              >
                <Link href={`/matches?league=${league.code}`}>
                  <div
                    className="group w-28 p-4 rounded-xl text-center transition-all cursor-pointer"
                    style={{
                      background: COLORS.bgCard,
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${COLORS.gold}50`;
                      e.currentTarget.style.boxShadow = `0 0 20px ${COLORS.gold}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <img
                      src={league.logo}
                      alt={league.name}
                      className="w-12 h-12 mx-auto mb-2 object-contain group-hover:scale-110 transition-transform"
                    />
                    <h3
                      className="text-xs font-semibold truncate"
                      style={{ color: COLORS.textPrimary }}
                    >
                      {league.name}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Live Matches Section (if any) */}
        {liveMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
            transition={{ delay: 1.1 }}
            className="mb-10"
          >
            {/* Section Header */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-[1px] flex-1 max-w-[100px]" style={{ background: `linear-gradient(90deg, transparent 0%, ${COLORS.red}30 100%)` }} />
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-2 rounded-full"
                  style={{ background: COLORS.red }}
                />
                <h2
                  className="font-rajdhani uppercase tracking-[0.4em] text-sm"
                  style={{ color: COLORS.red }}
                >
                  Live Now
                </h2>
              </div>
              <div className="h-[1px] flex-1 max-w-[100px]" style={{ background: `linear-gradient(90deg, ${COLORS.red}30 0%, transparent 100%)` }} />
            </div>

            {/* Live Matches */}
            <div className="grid md:grid-cols-2 gap-4">
              {liveMatches.slice(0, 4).map((match, index) => (
                <LiveMatchCard key={match.id} match={match} index={index} />
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}

// ===== COMPONENTS =====

// Team Flag Banner Component
function TeamFlagBanner({ team, colors, side, delay }: {
  team: { name: string; logo?: string };
  colors: { primary: string; secondary: string };
  side: 'left' | 'right';
  delay: number;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ y: -50, opacity: 0, rotateZ: side === 'left' ? -5 : 5 }}
      animate={{ y: 0, opacity: 1, rotateZ: 0 }}
      transition={{ delay, type: 'spring', damping: 15 }}
      className="relative"
      style={{ perspective: '500px' }}
    >
      {/* Flag Pole */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-20">
        <div
          className="w-2 h-8 rounded-full shadow-lg"
          style={{ background: `linear-gradient(180deg, ${COLORS.gold} 0%, ${COLORS.goldLight} 100%)` }}
        />
        <div
          className="w-4 h-2 rounded-full mx-auto -mt-1"
          style={{ background: COLORS.gold }}
        />
      </div>

      {/* Waving Flag */}
      <motion.div
        animate={{
          rotateY: side === 'left' ? [0, 5, 0, -3, 0] : [0, -5, 0, 3, 0],
          rotateX: [0, 1, 0, -1, 0],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-24 md:w-32 lg:w-36 min-h-[140px] md:min-h-[180px] mt-6 rounded-b-lg overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.primary}dd 50%, ${colors.primary}bb 100%)`,
          boxShadow: `0 15px 40px ${colors.primary}40, 0 5px 20px rgba(0,0,0,0.4)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Fabric wave shimmer */}
        <motion.div
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 w-[200%] opacity-20"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${colors.secondary}60 50%, transparent 100%)`,
          }}
        />

        {/* Secondary stripe */}
        <div
          className="absolute bottom-0 left-0 right-0 h-6"
          style={{ background: colors.secondary, opacity: 0.8 }}
        />

        {/* Team Logo & Name */}
        <div className="flex flex-col items-center justify-center h-full p-3 pt-2 relative z-10">
          {team.logo && !imgError ? (
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 p-2 backdrop-blur-sm shadow-xl">
              <img
                src={team.logo}
                alt={team.name}
                className="w-full h-full object-contain drop-shadow-lg"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div
              className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-base font-bold shadow-xl"
              style={{ background: colors.secondary, color: colors.primary }}
            >
              {team.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <h3
            className="text-white font-bold text-xs md:text-sm text-center mt-2 uppercase tracking-wide drop-shadow-lg"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
          >
            {getShortTeamName(team.name)}
          </h3>
        </div>

        {/* Bottom fringe */}
        <div className="absolute -bottom-1 left-0 right-0 flex justify-center gap-0.5">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, 2, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.05 }}
              className="w-1.5 h-2.5 rounded-b"
              style={{ background: i % 2 === 0 ? colors.primary : colors.secondary, opacity: 0.85 }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Stat Badge Component
function StatBadge({ label, status }: { label: string; status: 'EVEN' | 'GOOD' | 'OUT' | 'DOUBT' }) {
  const getStyles = () => {
    switch (status) {
      case 'GOOD':
        return { bg: `${COLORS.green}15`, border: `${COLORS.green}30`, text: COLORS.green };
      case 'OUT':
        return { bg: `${COLORS.red}15`, border: `${COLORS.red}30`, text: COLORS.red };
      case 'DOUBT':
        return { bg: `${COLORS.yellow}15`, border: `${COLORS.yellow}30`, text: COLORS.yellow };
      default:
        return { bg: '#2A2E38', border: 'transparent', text: COLORS.steel };
    }
  };

  const styles = getStyles();

  return (
    <div className="text-center">
      <p className="text-xs mb-1" style={{ color: COLORS.textMuted }}>{label}</p>
      <span
        className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
        style={{ background: styles.bg, border: `1px solid ${styles.border}`, color: styles.text }}
      >
        {status}
      </span>
    </div>
  );
}

// Match Card Component
function MatchCard({ match, index }: { match: Match; index: number }) {
  const isLive = isMatchLive(match);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 + index * 0.1 }}
    >
      <Link href={`/match/${match.id}`}>
        <div
          className="group relative p-4 rounded-xl transition-all overflow-hidden"
          style={{
            background: COLORS.bgCard,
            border: '1px solid rgba(255,255,255,0.05)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = `${COLORS.gold}40`;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {/* Gold bottom border on hover */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: `linear-gradient(90deg, transparent 0%, ${COLORS.gold} 50%, transparent 100%)` }}
          />

          {/* League & Time */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs" style={{ color: COLORS.textMuted }}>{match.league}</span>
            <span className="text-xs font-mono" style={{ color: COLORS.gold }}>
              {formatMatchDate(match.matchDate)}
            </span>
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {match.homeTeam.logo && (
                <img src={match.homeTeam.logo} alt="" className="w-6 h-6 object-contain" />
              )}
              <span className="text-sm truncate" style={{ color: COLORS.textPrimary }}>
                {getShortTeamName(match.homeTeam.name)}
              </span>
            </div>

            <span className="px-3 text-sm" style={{ color: COLORS.steel }}>vs</span>

            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="text-sm truncate" style={{ color: COLORS.textPrimary }}>
                {getShortTeamName(match.awayTeam.name)}
              </span>
              {match.awayTeam.logo && (
                <img src={match.awayTeam.logo} alt="" className="w-6 h-6 object-contain" />
              )}
            </div>
          </div>

          {/* Mini AI Verdict */}
          <p className="text-xs mt-3 text-center" style={{ color: COLORS.textMuted }}>
            AI: Home favoured
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

// Live Match Card Component
function LiveMatchCard({ match, index }: { match: Match; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1 + index * 0.1 }}
    >
      <Link href={`/match/${match.id}`}>
        <div
          className="relative p-4 rounded-xl overflow-hidden"
          style={{
            background: COLORS.bgCard,
            borderLeft: `3px solid ${COLORS.red}`
          }}
        >
          {/* Pulsing glow */}
          <motion.div
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0"
            style={{ background: `linear-gradient(90deg, ${COLORS.red}10 0%, transparent 100%)` }}
          />

          {/* Live Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{ background: `${COLORS.red}20` }}
          >
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: COLORS.red }}
            />
            <span className="text-xs font-bold" style={{ color: COLORS.red }}>
              {match.minute}'
            </span>
          </div>

          {/* League */}
          <span className="text-xs" style={{ color: COLORS.textMuted }}>{match.league}</span>

          {/* Score */}
          <div className="flex items-center justify-center gap-4 my-3">
            <div className="flex items-center gap-2">
              {match.homeTeam.logo && (
                <img src={match.homeTeam.logo} alt="" className="w-8 h-8 object-contain" />
              )}
              <span className="text-sm" style={{ color: COLORS.textPrimary }}>
                {getShortTeamName(match.homeTeam.name)}
              </span>
            </div>

            <span
              className="font-oswald text-2xl font-bold"
              style={{ color: COLORS.red }}
            >
              {match.homeScore ?? 0} — {match.awayScore ?? 0}
            </span>

            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: COLORS.textPrimary }}>
                {getShortTeamName(match.awayTeam.name)}
              </span>
              {match.awayTeam.logo && (
                <img src={match.awayTeam.logo} alt="" className="w-8 h-8 object-contain" />
              )}
            </div>
          </div>

          {/* AI Insight */}
          <p className="text-xs text-center italic" style={{ color: COLORS.steel }}>
            AI: Expect 1 more goal (73% probability)
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
