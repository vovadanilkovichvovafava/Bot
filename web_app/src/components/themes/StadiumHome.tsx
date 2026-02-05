'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Brain, Calendar, Loader2, Radio, BarChart3,
  TrendingUp, Target, Check, X, MessageSquare, Star, ChevronRight
} from 'lucide-react';
import { useMatchesStore } from '@/store/matchesStore';
import { Match, formatMatchDate, isMatchLive, getShortTeamName } from '@/types';

// ===== AI ANALYSIS CENTER DESIGN SYSTEM =====
const COLORS = {
  // Backgrounds
  bgPrimary: '#080A10',
  bgSecondary: '#10141E',
  bgCard: '#10141E',
  bgGlass: 'rgba(12, 15, 24, 0.85)',
  bgOverlay: 'linear-gradient(180deg, rgba(8,10,16,0.55) 0%, rgba(8,10,16,0.85) 60%, #080A10 100%)',

  // Accents
  blue: '#4A7AFF',
  blueLight: '#6A94FF',
  white: '#FFFFFF',
  whiteBlue: '#E0E8FF',
  green: '#3DDC84',
  red: '#FF3B3B',
  redOrange: '#FF5A5A',
  orange: '#FF7A4A',
  purple: '#9D6AFF',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#BFC7D9',
  textMuted: '#6E7891',
  navActive: '#FFFFFF',
  navInactive: '#A0A8BE',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderBlue: 'rgba(74, 122, 255, 0.5)',
};

// Team colors for flag banners
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

// Stadium background - high quality evening stadium with spotlights
const STADIUM_BG = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80';

// Top 5 Leagues
const TOP_LEAGUES = [
  { name: 'Premier League', nameRu: 'АПЛ', logo: 'https://media.api-sports.io/football/leagues/39.png', code: 'PL' },
  { name: 'La Liga', nameRu: 'Ла Лига', logo: 'https://media.api-sports.io/football/leagues/140.png', code: 'PD' },
  { name: 'Serie A', nameRu: 'Серия А', logo: 'https://media.api-sports.io/football/leagues/135.png', code: 'SA' },
  { name: 'Bundesliga', nameRu: 'Бундеслига', logo: 'https://media.api-sports.io/football/leagues/78.png', code: 'BL1' },
  { name: 'Ligue 1', nameRu: 'Лига 1', logo: 'https://media.api-sports.io/football/leagues/61.png', code: 'FL1' },
];

// AI Performance data
const AI_PERFORMANCE = {
  accuracy: 73,
  predictions: 2847,
  roi: 18.2,
  lastTen: [true, true, true, false, true, true, true, true, false, true],
};

export function StadiumHome() {
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

  // Subtle particle effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; speed: number; opacity: number; size: number }[] = [];

    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 0.15 + Math.random() * 0.3,
        opacity: Math.random() * 0.4,
        size: 1 + Math.random() * 1,
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
        ctx.fillStyle = `rgba(74, 122, 255, ${particle.opacity})`;
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
    return TEAM_COLORS[teamName] || { primary: COLORS.blue, secondary: '#FFFFFF' };
  };

  const homeColors = featuredMatch ? getTeamColors(featuredMatch.homeTeam.name) : { primary: COLORS.blue, secondary: '#FFFFFF' };
  const awayColors = featuredMatch ? getTeamColors(featuredMatch.awayTeam.name) : { primary: COLORS.orange, secondary: '#FFFFFF' };
  const isLive = featuredMatch ? isMatchLive(featuredMatch) : false;

  // Format date in Russian
  const formatBadgeDate = (date: string) => {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    };
    return d.toLocaleDateString('ru-RU', options);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: COLORS.bgPrimary }}>

      {/* Stadium Background Photo */}
      <div className="absolute inset-0 z-0">
        <img
          src={STADIUM_BG}
          alt="Stadium"
          className="w-full h-[70vh] object-cover"
          style={{ filter: 'saturate(0.6) brightness(0.9)' }}
        />
        {/* Gradient overlay - transparent top, solid bottom */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(8,10,16,0.55) 0%, rgba(8,10,16,0.85) 60%, #080A10 100%)'
          }}
        />
        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(8,10,16,0.5) 100%)'
          }}
        />
      </div>

      {/* Subtle particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-[1] pointer-events-none opacity-60" />

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">

        {/* Hero Section - 80-90vh */}
        <div className="min-h-[85vh] flex flex-col justify-center items-center pt-20 pb-8">

          {/* Loading State */}
          {isLoading && !featuredMatch && (
            <div className="flex flex-col items-center justify-center py-32">
              <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: COLORS.blue }} />
              <p style={{ color: COLORS.textMuted }}>Загрузка матчей...</p>
            </div>
          )}

          {/* Hero Content */}
          {(!isLoading || featuredMatch) && (
            <>
              {/* Main Hero Text */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
                transition={{ duration: 0.8 }}
                className="font-montserrat text-4xl md:text-5xl lg:text-6xl font-extrabold text-center uppercase mb-6"
                style={{
                  color: COLORS.textPrimary,
                  textShadow: '0 2px 30px rgba(0,0,0,0.5)',
                  letterSpacing: '0.02em'
                }}
              >
                Спроси ИИ, кто победит сегодня?
              </motion.h1>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Link href="/ai-chat">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative px-8 py-4 rounded-lg font-inter font-bold text-sm uppercase tracking-wider flex items-center gap-3 transition-all"
                    style={{
                      background: 'rgba(12, 15, 24, 0.6)',
                      backdropFilter: 'blur(12px)',
                      border: `2px solid ${COLORS.borderBlue}`,
                      color: COLORS.textPrimary,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(74, 122, 255, 0.15)';
                      e.currentTarget.style.borderColor = COLORS.blue;
                      e.currentTarget.style.boxShadow = `0 0 20px ${COLORS.borderBlue}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(12, 15, 24, 0.6)';
                      e.currentTarget.style.borderColor = COLORS.borderBlue;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Brain className="w-5 h-5" />
                    Задать вопрос AI
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              </motion.div>

              {/* Featured Match with Flag Banners */}
              {featuredMatch && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isVisible ? 1 : 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="w-full max-w-4xl mt-12"
                >
                  {/* Match Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-center mb-8"
                  >
                    <div
                      className="px-5 py-2 rounded-full backdrop-blur-sm"
                      style={{
                        background: 'rgba(16,20,30,0.8)',
                        border: `1px solid ${COLORS.border}`
                      }}
                    >
                      <span
                        className="font-inter text-sm"
                        style={{ color: COLORS.textSecondary }}
                      >
                        {isLive ? (
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span style={{ color: COLORS.red }}>LIVE</span>
                            <span className="mx-2">•</span>
                            {featuredMatch.league}
                          </span>
                        ) : (
                          <>
                            {featuredMatch.league} • {formatBadgeDate(featuredMatch.matchDate)}
                          </>
                        )}
                      </span>
                    </div>
                  </motion.div>

                  {/* Teams with Flag Banners */}
                  <div className="flex items-center justify-center gap-4 md:gap-8 lg:gap-16">
                    {/* Home Team Flag Banner */}
                    <FlagBanner
                      team={featuredMatch.homeTeam}
                      colors={homeColors}
                      side="left"
                      delay={0.6}
                    />

                    {/* Center - Score or VS */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7, type: 'spring', damping: 15 }}
                      className="text-center"
                    >
                      {isLive ? (
                        <div>
                          <div
                            className="font-montserrat text-6xl md:text-7xl lg:text-8xl font-extrabold"
                            style={{ color: COLORS.textPrimary }}
                          >
                            {featuredMatch.homeScore ?? 0}
                            <span style={{ color: COLORS.textMuted }} className="mx-2">—</span>
                            {featuredMatch.awayScore ?? 0}
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
                          className="font-montserrat text-7xl md:text-8xl lg:text-9xl font-extrabold"
                          style={{
                            color: COLORS.textPrimary,
                            opacity: 0.9,
                            textShadow: '0 4px 20px rgba(0,0,0,0.3)'
                          }}
                        >
                          VS
                        </div>
                      )}
                    </motion.div>

                    {/* Away Team Flag Banner */}
                    <FlagBanner
                      team={featuredMatch.awayTeam}
                      colors={awayColors}
                      side="right"
                      delay={0.65}
                    />
                  </div>

                  {/* AI VERDICT Block */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="max-w-xl mx-auto mt-10"
                  >
                    <div
                      className="relative p-6 rounded-2xl"
                      style={{
                        background: COLORS.bgGlass,
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      {/* AI VERDICT Header */}
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="h-[1px] flex-1" style={{ background: `linear-gradient(90deg, transparent 0%, ${COLORS.border} 100%)` }} />
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4" style={{ color: COLORS.textPrimary }} />
                          <span
                            className="font-montserrat uppercase tracking-[0.2em] text-xs font-bold"
                            style={{ color: COLORS.textPrimary }}
                          >
                            AI Verdict
                          </span>
                        </div>
                        <div className="h-[1px] flex-1" style={{ background: `linear-gradient(90deg, ${COLORS.border} 0%, transparent 100%)` }} />
                      </div>

                      {/* Verdict Stats */}
                      <div className="flex items-center justify-center gap-8 mb-4">
                        <div className="text-center">
                          <div
                            className="font-montserrat text-5xl md:text-6xl font-extrabold"
                            style={{ color: COLORS.textPrimary }}
                          >
                            42%
                          </div>
                          <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>Победа хозяев</p>
                        </div>
                        <div className="text-center">
                          <div
                            className="font-montserrat text-5xl md:text-6xl font-extrabold"
                            style={{ color: COLORS.redOrange }}
                          >
                            3-1
                          </div>
                          <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>Прогноз счёта</p>
                        </div>
                      </div>

                      {/* Verdict Text */}
                      <p
                        className="text-center text-sm mb-5"
                        style={{ color: COLORS.textSecondary }}
                      >
                        Небольшое преимущество хозяев — контроль центра поля и лучшая форма
                      </p>

                      {/* CTA to Match Detail */}
                      <Link href={`/match/${featuredMatch.id}`}>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full py-3 rounded-lg font-inter font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                          style={{
                            background: `linear-gradient(135deg, ${COLORS.blue} 0%, #3A6AEE 100%)`,
                            color: COLORS.textPrimary,
                          }}
                        >
                          Полный анализ
                          <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      </Link>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* TOP-5 LEAGUES Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ delay: 1 }}
          className="mb-12"
        >
          {/* Section Header */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-[1px] flex-1 max-w-[100px]" style={{ background: `linear-gradient(90deg, transparent 0%, ${COLORS.border} 100%)` }} />
            <h2
              className="font-montserrat uppercase tracking-[0.2em] text-sm font-bold"
              style={{ color: COLORS.textPrimary }}
            >
              Топ-5 Лиг
            </h2>
            <div className="h-[1px] flex-1 max-w-[100px]" style={{ background: `linear-gradient(90deg, ${COLORS.border} 0%, transparent 100%)` }} />
          </div>

          {/* Leagues Row */}
          <div
            className="flex w-full rounded-xl overflow-hidden"
            style={{ background: COLORS.bgCard }}
          >
            {TOP_LEAGUES.map((league, index) => (
              <Link key={league.code} href={`/matches?league=${league.code}`} className="flex-1">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 + index * 0.1 }}
                  className="group h-[100px] flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
                  style={{
                    borderRight: index < TOP_LEAGUES.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#161C2A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <img
                    src={league.logo}
                    alt={league.name}
                    className="w-12 h-12 object-contain group-hover:scale-105 transition-transform"
                  />
                  <span
                    className="font-inter font-bold text-xs uppercase"
                    style={{ color: COLORS.textPrimary }}
                  >
                    {league.nameRu}
                  </span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* Upcoming Matches Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ delay: 1.2 }}
          className="mb-12"
        >
          {/* Section Header */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-[1px] flex-1 max-w-[100px]" style={{ background: `linear-gradient(90deg, transparent 0%, ${COLORS.border} 100%)` }} />
            <h2
              className="font-montserrat uppercase tracking-[0.2em] text-sm font-bold"
              style={{ color: COLORS.textPrimary }}
            >
              Ближайшие матчи
            </h2>
            <div className="h-[1px] flex-1 max-w-[100px]" style={{ background: `linear-gradient(90deg, ${COLORS.border} 0%, transparent 100%)` }} />
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
                className="flex items-center gap-2 px-6 py-2.5 rounded-full transition-all"
                style={{
                  background: 'transparent',
                  border: `1px solid ${COLORS.borderBlue}`,
                  color: COLORS.blue,
                }}
              >
                <span className="font-inter text-sm uppercase tracking-wider">Все матчи</span>
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </div>
        </motion.section>

        {/* AI Insights Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ delay: 1.4 }}
          className="mb-12"
        >
          {/* Section Header */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-[1px] flex-1 max-w-[100px]" style={{ background: `linear-gradient(90deg, transparent 0%, ${COLORS.border} 100%)` }} />
            <h2
              className="font-montserrat uppercase tracking-[0.2em] text-sm font-bold"
              style={{ color: COLORS.textPrimary }}
            >
              AI Insights
            </h2>
            <div className="h-[1px] flex-1 max-w-[100px]" style={{ background: `linear-gradient(90deg, ${COLORS.border} 0%, transparent 100%)` }} />
          </div>

          {/* Insights Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Target, title: 'Высокая уверенность', desc: '3 матча с точностью >80%', color: COLORS.green },
              { icon: TrendingUp, title: 'Тренд дня', desc: 'Домашние команды побеждают', color: COLORS.blue },
              { icon: Star, title: 'Value Bet', desc: '2 ставки с высоким EV', color: COLORS.purple },
              { icon: MessageSquare, title: 'Спросите AI', desc: 'Задайте любой вопрос', color: COLORS.orange },
            ].map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 + index * 0.1 }}
                className="p-5 rounded-xl"
                style={{
                  background: COLORS.bgGlass,
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${insight.color}20` }}
                >
                  <insight.icon className="w-5 h-5" style={{ color: insight.color }} />
                </div>
                <h3
                  className="font-montserrat font-bold text-sm mb-1"
                  style={{ color: COLORS.textPrimary }}
                >
                  {insight.title}
                </h3>
                <p
                  className="text-xs"
                  style={{ color: COLORS.textMuted }}
                >
                  {insight.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* AI Accuracy Stats Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ delay: 1.6 }}
          className="mb-16"
        >
          <div
            className="py-5 px-6 rounded-xl flex flex-wrap items-center justify-center gap-8"
            style={{
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div className="text-center">
              <span className="font-inter text-xs uppercase" style={{ color: COLORS.textMuted }}>Точность</span>
              <div className="font-montserrat text-3xl font-extrabold" style={{ color: COLORS.textPrimary }}>
                {AI_PERFORMANCE.accuracy}%
              </div>
            </div>
            <div className="h-10 w-[1px]" style={{ background: COLORS.border }} />
            <div className="text-center">
              <span className="font-inter text-xs uppercase" style={{ color: COLORS.textMuted }}>Предсказаний</span>
              <div className="font-montserrat text-3xl font-extrabold" style={{ color: COLORS.textPrimary }}>
                {AI_PERFORMANCE.predictions.toLocaleString()}
              </div>
            </div>
            <div className="h-10 w-[1px]" style={{ background: COLORS.border }} />
            <div className="text-center">
              <span className="font-inter text-xs uppercase" style={{ color: COLORS.textMuted }}>ROI</span>
              <div className="font-montserrat text-3xl font-extrabold" style={{ color: COLORS.green }}>
                +{AI_PERFORMANCE.roi}%
              </div>
            </div>
            <div className="h-10 w-[1px] hidden md:block" style={{ background: COLORS.border }} />
            <div className="flex items-center gap-2">
              <span className="font-inter text-xs uppercase" style={{ color: COLORS.textMuted }}>Последние 10:</span>
              {AI_PERFORMANCE.lastTen.map((win, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded flex items-center justify-center"
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
        </motion.section>

        {/* Live Matches Section (if any) */}
        {liveMatches.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
            transition={{ delay: 1.8 }}
            className="mb-12"
          >
            {/* Section Header */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-[1px] flex-1 max-w-[100px]" style={{ background: `linear-gradient(90deg, transparent 0%, ${COLORS.red}30 100%)` }} />
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ opacity: [1, 0.5, 1], scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: COLORS.red }}
                />
                <h2
                  className="font-montserrat uppercase tracking-[0.2em] text-sm font-bold"
                  style={{ color: COLORS.red }}
                >
                  В прямом эфире — {liveMatches.length} матчей
                </h2>
              </div>
              <div className="h-[1px] flex-1 max-w-[100px]" style={{ background: `linear-gradient(90deg, ${COLORS.red}30 0%, transparent 100%)` }} />
            </div>

            {/* Live Matches Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {liveMatches.slice(0, 4).map((match, index) => (
                <LiveMatchCard key={match.id} match={match} index={index} />
              ))}
            </div>
          </motion.section>
        )}

      </div>
    </div>
  );
}

// ===== COMPONENTS =====

// Flag Banner Component
function FlagBanner({ team, colors, side, delay }: {
  team: { name: string; logo?: string };
  colors: { primary: string; secondary: string };
  side: 'left' | 'right';
  delay: number;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ y: -50, opacity: 0, rotateZ: side === 'left' ? -3 : 3 }}
      animate={{ y: 0, opacity: 1, rotateZ: 0 }}
      transition={{ delay, type: 'spring', damping: 15 }}
      className="relative"
      style={{ perspective: '500px' }}
    >
      {/* Flag Pole */}
      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-20">
        <div
          className="w-1.5 h-6 rounded-full"
          style={{ background: `linear-gradient(180deg, #8B8B8B 0%, #C0C0C0 50%, #8B8B8B 100%)` }}
        />
        <div
          className="w-3 h-1.5 rounded-full mx-auto -mt-0.5"
          style={{ background: '#A0A0A0' }}
        />
      </div>

      {/* Waving Flag */}
      <motion.div
        animate={{
          rotateY: side === 'left' ? [0, 3, 0, -2, 0] : [0, -3, 0, 2, 0],
          rotateZ: [-0.3, 0.3, -0.3],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-28 md:w-36 lg:w-40 min-h-[160px] md:min-h-[200px] mt-5 rounded-b-lg overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.primary}ee 60%, ${colors.primary}cc 100%)`,
          boxShadow: `0 15px 40px ${colors.primary}40, 0 5px 20px rgba(0,0,0,0.4)`,
          transformStyle: 'preserve-3d',
          transformOrigin: 'top center',
        }}
      >
        {/* Fabric texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
          }}
        />

        {/* Shimmer effect */}
        <motion.div
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 w-[200%] opacity-15"
          style={{
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)`,
          }}
        />

        {/* Secondary stripe */}
        <div
          className="absolute bottom-0 left-0 right-0 h-5"
          style={{ background: colors.secondary, opacity: 0.8 }}
        />

        {/* Team Logo & Name */}
        <div className="flex flex-col items-center justify-center h-full p-3 pt-4 relative z-10">
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
              className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-base font-bold shadow-xl"
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
          {[...Array(14)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, 2, 0] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.05 }}
              className="w-1.5 h-2.5 rounded-b"
              style={{ background: i % 2 === 0 ? colors.primary : colors.secondary, opacity: 0.85 }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Match Card Component
function MatchCard({ match, index }: { match: Match; index: number }) {
  const isLive = isMatchLive(match);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.3 + index * 0.1 }}
    >
      <Link href={`/match/${match.id}`}>
        <div
          className="group relative p-5 rounded-xl transition-all overflow-hidden"
          style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = COLORS.borderBlue;
            e.currentTarget.style.background = '#161C2A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = COLORS.border;
            e.currentTarget.style.background = COLORS.bgCard;
          }}
        >
          {/* Live indicator */}
          {isLive && (
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ background: COLORS.red }}
            />
          )}

          {/* League & Time */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs" style={{ color: COLORS.textMuted }}>
              {match.league}
            </span>
            <span className="text-xs font-mono" style={{ color: COLORS.blue }}>
              {isLive ? (
                <span className="flex items-center gap-1" style={{ color: COLORS.red }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: COLORS.red }} />
                  {match.minute}'
                </span>
              ) : (
                formatMatchDate(match.matchDate)
              )}
            </span>
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {match.homeTeam.logo && (
                <img src={match.homeTeam.logo} alt="" className="w-8 h-8 object-contain" />
              )}
              <span className="text-sm font-semibold truncate" style={{ color: COLORS.textPrimary }}>
                {getShortTeamName(match.homeTeam.name)}
              </span>
            </div>

            {isLive ? (
              <span className="px-3 font-montserrat font-bold text-lg" style={{ color: COLORS.textPrimary }}>
                {match.homeScore ?? 0} - {match.awayScore ?? 0}
              </span>
            ) : (
              <span className="px-3 text-sm" style={{ color: COLORS.textMuted }}>vs</span>
            )}

            <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
              <span className="text-sm font-semibold truncate" style={{ color: COLORS.textPrimary }}>
                {getShortTeamName(match.awayTeam.name)}
              </span>
              {match.awayTeam.logo && (
                <img src={match.awayTeam.logo} alt="" className="w-8 h-8 object-contain" />
              )}
            </div>
          </div>

          {/* Mini AI Verdict */}
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: COLORS.textMuted }}>
                AI: Хозяева фавориты
              </span>
              {/* Mini probability bar */}
              <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ background: COLORS.blue, width: '65%' }}
                />
              </div>
            </div>
          </div>
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
      transition={{ delay: 1.9 + index * 0.1 }}
    >
      <Link href={`/match/${match.id}`}>
        <div
          className="relative p-5 rounded-xl overflow-hidden"
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
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: `${COLORS.red}20` }}
          >
            <motion.div
              animate={{ opacity: [1, 0.5, 1], scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{ background: COLORS.red }}
            />
            <span className="text-xs font-bold" style={{ color: COLORS.red }}>
              {match.minute}'
            </span>
          </div>

          {/* League */}
          <span className="text-xs" style={{ color: COLORS.textMuted }}>{match.league}</span>

          {/* Score */}
          <div className="flex items-center justify-between gap-4 my-4">
            <div className="flex items-center gap-3 flex-1">
              {match.homeTeam.logo && (
                <img src={match.homeTeam.logo} alt="" className="w-12 h-12 object-contain" />
              )}
              <span className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>
                {getShortTeamName(match.homeTeam.name)}
              </span>
            </div>

            <span
              className="font-montserrat text-3xl font-extrabold"
              style={{ color: COLORS.textPrimary }}
            >
              {match.homeScore ?? 0} — {match.awayScore ?? 0}
            </span>

            <div className="flex items-center gap-3 flex-1 justify-end">
              <span className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>
                {getShortTeamName(match.awayTeam.name)}
              </span>
              {match.awayTeam.logo && (
                <img src={match.awayTeam.logo} alt="" className="w-12 h-12 object-contain" />
              )}
            </div>
          </div>

          {/* AI Insight */}
          <p className="text-xs text-center italic" style={{ color: COLORS.textSecondary }}>
            AI: Ожидается ещё 1 гол (73% вероятность)
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
