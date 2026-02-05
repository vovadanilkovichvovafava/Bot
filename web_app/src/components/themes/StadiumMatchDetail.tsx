'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Clock, Loader2, ArrowLeft, MapPin, Brain,
  TrendingUp, History, Zap, ChevronDown, ChevronUp, Trophy, RefreshCw,
  Target, BarChart3, Users, Activity
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { MatchDetail, isMatchLive, isMatchFinished, formatMatchDate, getShortTeamName } from '@/types';

// ===== AI ANALYSIS CENTER DESIGN SYSTEM =====
const COLORS = {
  bgPrimary: '#080A10',
  bgSecondary: '#10141E',
  bgCard: '#10141E',
  bgGlass: 'rgba(12, 15, 24, 0.85)',
  blue: '#4A7AFF',
  blueLight: '#6A94FF',
  green: '#3DDC84',
  red: '#FF3B3B',
  redOrange: '#FF5A5A',
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

/**
 * Format AI analysis text to display bullet points on separate lines
 */
function formatAnalysisText(text: string): string {
  if (!text) return text;

  let formatted = text;
  formatted = formatted.replace(/ • /g, '\n\n- ');
  formatted = formatted.replace(/:\s*•\s*/g, ':\n\n- ');
  formatted = formatted.replace(/•\s*/g, '\n\n- ');
  formatted = formatted.replace(/([.!?%])\s*(📊|🎯|💡|💰|⚠️)/g, '$1\n\n$2');
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted;
}

interface StadiumMatchDetailProps {
  matchId: string;
}

export function StadiumMatchDetail({ matchId }: StadiumMatchDetailProps) {
  const { user, isAuthenticated } = useAuthStore();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('ai');

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);

  useEffect(() => {
    if (!matchId) return;

    const loadMatch = async () => {
      setIsLoading(true);
      try {
        const matchData = await api.getMatchDetail(parseInt(matchId));
        setMatch(matchData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
        setMatch({
          id: parseInt(matchId),
          homeTeam: { name: 'Team A', logo: '' },
          awayTeam: { name: 'Team B', logo: '' },
          league: 'League',
          leagueCode: 'XX',
          matchDate: new Date().toISOString(),
          status: 'SCHEDULED',
          homeForm: [],
          awayForm: [],
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadMatch();
  }, [matchId]);

  const requestAnalysis = useCallback(async () => {
    if (!match || isLoadingAnalysis) return;

    setIsLoadingAnalysis(true);
    setAnalysisError(false);

    try {
      const available = await api.isChatAvailable();
      if (!available) {
        setAnalysisError(true);
        setIsLoadingAnalysis(false);
        return;
      }

      const matchDate = new Date(match.matchDate);
      const formattedDate = `${matchDate.getDate().toString().padStart(2, '0')}.${(matchDate.getMonth() + 1).toString().padStart(2, '0')}.${matchDate.getFullYear()} в ${matchDate.getHours().toString().padStart(2, '0')}:${matchDate.getMinutes().toString().padStart(2, '0')}`;
      const matchdayInfo = match.matchday ? `, тур ${match.matchday}` : '';

      const message = `Проанализируй этот матч:\n⚽ ${match.homeTeam.name} vs ${match.awayTeam.name}\n🏆 ${match.league}${matchdayInfo}\n📅 ${formattedDate}`;

      const preferences = user ? {
        minOdds: user.minOdds || 1.5,
        maxOdds: user.maxOdds || 3.0,
        riskLevel: user.riskLevel || 'medium',
      } : undefined;

      const matchInfo = {
        matchId: match.id.toString(),
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        leagueCode: match.leagueCode,
        matchDate: match.matchDate,
      };

      const result = await api.sendChatMessage(message, [], preferences, matchInfo);
      setAiAnalysis(result.response);
    } catch (e) {
      console.error('[Match Analysis] Error:', e);
      setAnalysisError(true);
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [match, user, isLoadingAnalysis]);

  const live = match ? isMatchLive(match) : false;
  const finished = match ? isMatchFinished(match) : false;

  const getTeamColors = (teamName: string) => {
    return TEAM_COLORS[teamName] || { primary: COLORS.blue, secondary: '#FFFFFF' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bgPrimary }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: COLORS.blue }} />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: COLORS.bgPrimary }}>
        <p className="mb-4" style={{ color: COLORS.red }}>{error || 'Матч не найден'}</p>
        <Link
          href="/matches"
          className="px-6 py-2 rounded-lg font-semibold"
          style={{ background: COLORS.blue, color: COLORS.textPrimary }}
        >
          К матчам
        </Link>
      </div>
    );
  }

  const homeColors = getTeamColors(match.homeTeam.name);
  const awayColors = getTeamColors(match.awayTeam.name);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: COLORS.bgPrimary }}>

      {/* Hero Background - Stadium Photo - Mobile optimized */}
      <div className="absolute inset-0 z-0">
        <img
          src={STADIUM_BG}
          alt="Stadium"
          className="w-full h-[50vh] sm:h-[60vh] object-cover"
          style={{ filter: 'saturate(0.5) brightness(0.8)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(8,10,16,0.5) 0%, rgba(8,10,16,0.85) 50%, #080A10 100%)'
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(8,10,16,0.5) 100%)'
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Back Link - Touch friendly */}
        <Link
          href="/matches"
          className="inline-flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 transition-colors p-1 -ml-1 touch-manipulation active:opacity-70"
          style={{ color: COLORS.textMuted }}
        >
          <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">К матчам</span>
        </Link>

        {/* Hero Section with Flag Banners - Mobile optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-10"
        >
          {/* Match Badge - Mobile compact */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <div
              className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-full backdrop-blur-sm"
              style={{
                background: COLORS.bgGlass,
                border: `1px solid ${COLORS.border}`
              }}
            >
              <span className="font-inter text-xs sm:text-sm" style={{ color: COLORS.textSecondary }}>
                {live ? (
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse" style={{ background: COLORS.red }} />
                    <span style={{ color: COLORS.red }}>LIVE {match.minute && `${match.minute}'`}</span>
                    <span className="mx-1 sm:mx-2">•</span>
                    <span className="truncate max-w-[100px] sm:max-w-none">{match.league}</span>
                  </span>
                ) : finished ? (
                  <span>Завершён • {match.league}</span>
                ) : (
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
                    {formatMatchDate(match.matchDate)} • <span className="truncate max-w-[80px] sm:max-w-none">{match.league}</span>
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Teams with Flag Banners - Mobile responsive gaps */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-12 lg:gap-20">
            {/* Home Team Flag */}
            <FlagBanner
              team={match.homeTeam}
              colors={homeColors}
              side="left"
              label="ХОЗЯЕВА"
            />

            {/* Center - Score or VS - Mobile responsive sizes */}
            <div className="text-center py-2 sm:py-4">
              {live || finished ? (
                <div>
                  <div
                    className="font-montserrat text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold"
                    style={{ color: live ? COLORS.red : COLORS.textPrimary }}
                  >
                    {match.homeScore ?? 0}
                    <span style={{ color: COLORS.textMuted }} className="mx-1 sm:mx-3">—</span>
                    {match.awayScore ?? 0}
                  </div>
                  {live && match.minute && (
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="font-mono text-sm sm:text-lg"
                      style={{ color: COLORS.red }}
                    >
                      {match.minute}'
                    </motion.span>
                  )}
                </div>
              ) : (
                <motion.div
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="font-montserrat text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold"
                  style={{
                    color: COLORS.textPrimary,
                    opacity: 0.9,
                    textShadow: '0 4px 20px rgba(0,0,0,0.3)'
                  }}
                >
                  VS
                </motion.div>
              )}
            </div>

            {/* Away Team Flag */}
            <FlagBanner
              team={match.awayTeam}
              colors={awayColors}
              side="right"
              label="ГОСТИ"
            />
          </div>

          {/* Venue - Mobile smaller */}
          {match.venue && (
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-6" style={{ color: COLORS.textMuted }}>
              <MapPin size={14} className="sm:w-4 sm:h-4" style={{ color: COLORS.blue }} />
              <span className="text-xs sm:text-sm truncate max-w-[200px] sm:max-w-none">{match.venue}</span>
            </div>
          )}
        </motion.div>

        {/* AI VERDICT Block - Mobile optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 sm:mb-8"
        >
          <div
            className="p-4 sm:p-6 rounded-xl sm:rounded-2xl"
            style={{
              background: COLORS.bgGlass,
              backdropFilter: 'blur(16px)',
              border: `1px solid ${COLORS.border}`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-[1px] flex-1" style={{ background: `linear-gradient(90deg, transparent 0%, ${COLORS.border} 100%)` }} />
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5" style={{ color: COLORS.textPrimary }} />
                <span
                  className="font-montserrat uppercase tracking-[0.2em] text-sm font-bold"
                  style={{ color: COLORS.textPrimary }}
                >
                  AI Verdict
                </span>
              </div>
              <div className="h-[1px] flex-1" style={{ background: `linear-gradient(90deg, ${COLORS.border} 0%, transparent 100%)` }} />
            </div>

            {/* No analysis yet */}
            {!aiAnalysis && !isLoadingAnalysis && !analysisError && (
              <div className="text-center py-8">
                <p className="mb-4" style={{ color: COLORS.textMuted }}>
                  Получите AI-анализ для этого матча
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={requestAnalysis}
                  className="px-8 py-4 rounded-lg font-inter font-bold text-sm uppercase tracking-wider flex items-center gap-3 mx-auto"
                  style={{
                    background: `linear-gradient(135deg, ${COLORS.blue} 0%, #3A6AEE 100%)`,
                    color: COLORS.textPrimary,
                  }}
                >
                  <Brain className="w-5 h-5" />
                  Получить анализ AI
                </motion.button>
              </div>
            )}

            {/* Loading */}
            {isLoadingAnalysis && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: COLORS.blue }} />
                <span style={{ color: COLORS.blue }}>Анализирую данные матча...</span>
              </div>
            )}

            {/* Error */}
            {analysisError && !isLoadingAnalysis && (
              <div className="text-center py-8">
                <p className="mb-4" style={{ color: COLORS.red }}>Не удалось получить анализ. Попробуйте снова.</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={requestAnalysis}
                  className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto"
                  style={{
                    background: `${COLORS.red}20`,
                    border: `1px solid ${COLORS.red}50`,
                    color: COLORS.red,
                  }}
                >
                  <RefreshCw size={20} />
                  Повторить
                </motion.button>
              </div>
            )}

            {/* Analysis Result */}
            {aiAnalysis && !isLoadingAnalysis && (
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-xl"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <div className="prose prose-invert prose-sm max-w-none" style={{ color: COLORS.textSecondary }}>
                    <ReactMarkdown>{formatAnalysisText(aiAnalysis)}</ReactMarkdown>
                  </div>
                </motion.div>

                <div className="mt-4 text-center">
                  <button
                    onClick={requestAnalysis}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all"
                    style={{ color: COLORS.blue }}
                  >
                    <RefreshCw size={16} />
                    Обновить анализ
                  </button>
                </div>
              </div>
            )}

            {!isAuthenticated && (
              <div
                className="mt-4 p-4 rounded-xl text-sm"
                style={{
                  background: `${COLORS.purple}15`,
                  border: `1px solid ${COLORS.purple}30`,
                  color: COLORS.purple,
                }}
              >
                <Zap className="inline w-4 h-4 mr-2" />
                <Link href="/login" className="underline hover:no-underline">
                  Войдите
                </Link>{' '}
                для персонализированных предсказаний
              </div>
            )}
          </div>
        </motion.div>

        {/* Win Probability Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div
            className="p-6 rounded-xl"
            style={{
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <h3
              className="font-montserrat uppercase tracking-[0.15em] text-xs font-bold mb-6 text-center"
              style={{ color: COLORS.textMuted }}
            >
              AI Win Probability
            </h3>

            {/* Probability Numbers */}
            <div className="flex items-center justify-center gap-8 mb-4">
              <div className="text-center">
                <div className="font-montserrat text-4xl font-extrabold" style={{ color: COLORS.blue }}>
                  65%
                </div>
                <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{getShortTeamName(match.homeTeam.name)}</p>
              </div>
              <div className="text-center">
                <div className="font-montserrat text-4xl font-extrabold" style={{ color: COLORS.textMuted }}>
                  20%
                </div>
                <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>Ничья</p>
              </div>
              <div className="text-center">
                <div className="font-montserrat text-4xl font-extrabold" style={{ color: COLORS.orange }}>
                  15%
                </div>
                <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{getShortTeamName(match.awayTeam.name)}</p>
              </div>
            </div>

            {/* Stacked Bar */}
            <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '65%' }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full"
                style={{ background: COLORS.blue }}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '20%' }}
                transition={{ duration: 1, delay: 0.6 }}
                className="h-full"
                style={{ background: COLORS.textMuted }}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '15%' }}
                transition={{ duration: 1, delay: 0.7 }}
                className="h-full"
                style={{ background: COLORS.orange }}
              />
            </div>
          </div>
        </motion.div>

        {/* Stats Grid - Mobile single column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Team Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <StatsCard
              title="Сравнение команд"
              icon={<BarChart3 className="w-5 h-5" style={{ color: COLORS.blue }} />}
              expanded={expandedSection === 'compare'}
              onToggle={() => setExpandedSection(expandedSection === 'compare' ? null : 'compare')}
            >
              <div className="space-y-4">
                <StatBar label="Голы/Игра" home={2.1} away={1.8} homeColor={COLORS.blue} awayColor={COLORS.orange} />
                <StatBar label="Владение" home={58} away={52} homeColor={COLORS.blue} awayColor={COLORS.orange} />
                <StatBar label="Удары" home={15} away={12} homeColor={COLORS.blue} awayColor={COLORS.orange} />
                <StatBar label="xG" home={1.8} away={1.2} homeColor={COLORS.blue} awayColor={COLORS.orange} />
              </div>
            </StatsCard>
          </motion.div>

          {/* Head to Head */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <StatsCard
              title="Личные встречи"
              icon={<History className="w-5 h-5" style={{ color: COLORS.blue }} />}
              expanded={expandedSection === 'h2h'}
              onToggle={() => setExpandedSection(expandedSection === 'h2h' ? null : 'h2h')}
            >
              <div className="grid grid-cols-3 gap-3 text-center">
                <div
                  className="p-4 rounded-xl"
                  style={{ background: `${COLORS.blue}15`, border: `1px solid ${COLORS.blue}30` }}
                >
                  <p className="text-2xl font-bold" style={{ color: COLORS.blue }}>4</p>
                  <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{getShortTeamName(match.homeTeam.name)}</p>
                </div>
                <div
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}` }}
                >
                  <p className="text-2xl font-bold" style={{ color: COLORS.textMuted }}>3</p>
                  <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>Ничьи</p>
                </div>
                <div
                  className="p-4 rounded-xl"
                  style={{ background: `${COLORS.orange}15`, border: `1px solid ${COLORS.orange}30` }}
                >
                  <p className="text-2xl font-bold" style={{ color: COLORS.orange }}>3</p>
                  <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{getShortTeamName(match.awayTeam.name)}</p>
                </div>
              </div>
            </StatsCard>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <StatsCard
              title="Форма"
              icon={<Activity className="w-5 h-5" style={{ color: COLORS.blue }} />}
              expanded={expandedSection === 'form'}
              onToggle={() => setExpandedSection(expandedSection === 'form' ? null : 'form')}
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs mb-2" style={{ color: COLORS.textMuted }}>{match.homeTeam.name}</p>
                  <div className="flex gap-1.5">
                    {['W', 'W', 'D', 'W', 'L'].map((result, i) => (
                      <FormBadge key={i} result={result as 'W' | 'D' | 'L'} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs mb-2" style={{ color: COLORS.textMuted }}>{match.awayTeam.name}</p>
                  <div className="flex gap-1.5">
                    {['W', 'L', 'W', 'D', 'W'].map((result, i) => (
                      <FormBadge key={i} result={result as 'W' | 'D' | 'L'} />
                    ))}
                  </div>
                </div>
              </div>
            </StatsCard>
          </motion.div>

          {/* Key Players */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <StatsCard
              title="Ключевые игроки"
              icon={<Users className="w-5 h-5" style={{ color: COLORS.blue }} />}
              expanded={expandedSection === 'players'}
              onToggle={() => setExpandedSection(expandedSection === 'players' ? null : 'players')}
            >
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="p-3 rounded-lg"
                  style={{ background: 'rgba(0,0,0,0.2)' }}
                >
                  <p className="font-semibold text-sm" style={{ color: COLORS.textPrimary }}>Haaland</p>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>15 голов, 3 асс.</p>
                </div>
                <div
                  className="p-3 rounded-lg"
                  style={{ background: 'rgba(0,0,0,0.2)' }}
                >
                  <p className="font-semibold text-sm" style={{ color: COLORS.textPrimary }}>Vinicius Jr</p>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>12 голов, 8 асс.</p>
                </div>
              </div>
            </StatsCard>
          </motion.div>
        </div>

      </div>
    </div>
  );
}

// ===== COMPONENTS =====

function FlagBanner({ team, colors, side, label }: {
  team: { name: string; logo?: string };
  colors: { primary: string; secondary: string };
  side: 'left' | 'right';
  label: string;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 15 }}
      className="relative"
    >
      {/* Pole */}
      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-10">
        <div className="w-1 sm:w-1.5 h-3 sm:h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #888 0%, #CCC 50%, #888 100%)' }} />
      </div>

      {/* Flag - Mobile responsive */}
      <motion.div
        animate={{
          rotateY: side === 'left' ? [0, 2, 0, -1, 0] : [0, -2, 0, 1, 0],
          rotateZ: [-0.3, 0.3, -0.3],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-20 sm:w-24 md:w-32 lg:w-36 min-h-[100px] sm:min-h-[140px] md:min-h-[180px] mt-3 sm:mt-4 rounded-b-lg overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.primary}dd 100%)`,
          boxShadow: `0 10px 30px ${colors.primary}40`,
          transformStyle: 'preserve-3d',
          transformOrigin: 'top center',
        }}
      >
        {/* Shimmer */}
        <motion.div
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 w-[200%] opacity-10"
          style={{ background: 'linear-gradient(90deg, transparent 0%, white 50%, transparent 100%)' }}
        />

        {/* Secondary stripe */}
        <div className="absolute bottom-0 left-0 right-0 h-3 sm:h-4" style={{ background: colors.secondary, opacity: 0.8 }} />

        {/* Content */}
        <div className="flex flex-col items-center justify-center h-full p-2 sm:p-3 relative z-10">
          {team.logo && !imgError ? (
            <div className="w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-white/20 p-1 sm:p-1.5 backdrop-blur-sm">
              <img
                src={team.logo}
                alt={team.name}
                className="w-full h-full object-contain"
                onError={() => setImgError(true)}
                loading="lazy"
              />
            </div>
          ) : (
            <div
              className="w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm"
              style={{ background: colors.secondary, color: colors.primary }}
            >
              {team.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <h3 className="text-white font-bold text-[10px] sm:text-xs md:text-sm text-center mt-1.5 sm:mt-2 uppercase leading-tight">
            {getShortTeamName(team.name)}
          </h3>
        </div>

        {/* Fringe - Hide on very small screens */}
        <div className="absolute -bottom-1 left-0 right-0 hidden sm:flex justify-center gap-0.5">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-2 rounded-b"
              style={{ background: i % 2 === 0 ? colors.primary : colors.secondary, opacity: 0.85 }}
            />
          ))}
        </div>
      </motion.div>

      {/* Label - Mobile smaller */}
      <p className="text-center mt-1.5 sm:mt-2 text-[10px] sm:text-xs uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
        {label}
      </p>
    </motion.div>
  );
}

function StatsCard({ title, icon, expanded, onToggle, children }: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <button onClick={onToggle} className="w-full p-3 sm:p-4 flex items-center justify-between touch-manipulation active:bg-white/5">
        <div className="flex items-center gap-2 sm:gap-3">
          {icon}
          <span className="font-semibold text-xs sm:text-sm" style={{ color: COLORS.textPrimary }}>{title}</span>
        </div>
        {expanded ? (
          <ChevronUp size={18} style={{ color: COLORS.textMuted }} />
        ) : (
          <ChevronDown size={18} style={{ color: COLORS.textMuted }} />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-4 pb-3 sm:pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatBar({ label, home, away, homeColor, awayColor }: {
  label: string;
  home: number;
  away: number;
  homeColor: string;
  awayColor: string;
}) {
  const total = home + away;
  const homePercent = (home / total) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span style={{ color: homeColor }}>{home}</span>
        <span style={{ color: COLORS.textMuted }}>{label}</span>
        <span style={{ color: awayColor }}>{away}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${homePercent}%` }}
          transition={{ duration: 0.8 }}
          className="h-full"
          style={{ background: homeColor }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${100 - homePercent}%` }}
          transition={{ duration: 0.8 }}
          className="h-full"
          style={{ background: awayColor }}
        />
      </div>
    </div>
  );
}

function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  const styles = {
    W: { bg: `${COLORS.green}20`, border: `${COLORS.green}40`, color: COLORS.green },
    D: { bg: 'rgba(255,255,255,0.1)', border: COLORS.border, color: COLORS.textMuted },
    L: { bg: `${COLORS.red}20`, border: `${COLORS.red}40`, color: COLORS.red },
  };

  const style = styles[result];

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
      style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}
    >
      {result}
    </div>
  );
}
