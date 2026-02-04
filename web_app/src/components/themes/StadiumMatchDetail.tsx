'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Clock, Loader2, ArrowLeft, MapPin,
  TrendingUp, History, Zap, ChevronDown, ChevronUp, Trophy, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { MatchDetail, isMatchLive, isMatchFinished, formatMatchDate } from '@/types';
import { cn } from '@/lib/utils';

interface StadiumMatchDetailProps {
  matchId: string;
}

export function StadiumMatchDetail({ matchId }: StadiumMatchDetailProps) {
  const { user, isAuthenticated } = useAuthStore();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('ai');

  // AI Analysis - local state (NOT from global chat store)
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
        setError(e instanceof Error ? e.message : 'Failed to load match');
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

  // Request AI analysis for this specific match
  const requestAnalysis = useCallback(async () => {
    if (!match || isLoadingAnalysis) return;

    setIsLoadingAnalysis(true);
    setAnalysisError(false);

    try {
      // Check AI availability first
      const available = await api.isChatAvailable();
      if (!available) {
        setAnalysisError(true);
        setIsLoadingAnalysis(false);
        return;
      }

      // Format match date
      const matchDate = new Date(match.matchDate);
      const formattedDate = `${matchDate.getDate().toString().padStart(2, '0')}.${(matchDate.getMonth() + 1).toString().padStart(2, '0')}.${matchDate.getFullYear()} at ${matchDate.getHours().toString().padStart(2, '0')}:${matchDate.getMinutes().toString().padStart(2, '0')}`;
      const matchdayInfo = match.matchday ? `, Matchday ${match.matchday}` : '';

      // Build analysis request message
      const message = `Analyze this match:\n⚽ ${match.homeTeam.name} vs ${match.awayTeam.name}\n🏆 ${match.league}${matchdayInfo}\n📅 ${formattedDate}`;

      // Get user preferences
      const preferences = user ? {
        minOdds: user.minOdds || 1.5,
        maxOdds: user.maxOdds || 3.0,
        riskLevel: user.riskLevel || 'medium',
      } : undefined;

      // Match info for ML data collection
      const matchInfo = {
        matchId: match.id.toString(),
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        leagueCode: match.leagueCode,
        matchDate: match.matchDate,
      };

      // Make API request
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

  if (isLoading) {
    return (
      <div className="min-h-screen stadium-bg flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full"
        />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen stadium-bg flex flex-col items-center justify-center">
        <p className="text-red-400 mb-4">{error || 'Match not found'}</p>
        <Link href="/matches" className="px-6 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold">
          Back to Matches
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen stadium-bg relative overflow-hidden">
      {/* Stadium Atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Stadium lights */}
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-indigo-500/5 to-transparent" />

        {/* Spotlight beams */}
        <svg className="absolute top-0 left-0 w-full h-full opacity-10">
          <polygon points="200,0 300,500 100,500" fill="url(#spotlight1)" />
          <polygon points="600,0 700,500 500,500" fill="url(#spotlight1)" />
          <polygon points="1000,0 1100,500 900,500" fill="url(#spotlight1)" />
          <defs>
            <linearGradient id="spotlight1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.3" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Crowd silhouettes at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 flex justify-around">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="w-8 h-12 bg-black/60 rounded-t-full"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.5 + Math.random() * 0.5, repeat: Infinity, delay: Math.random() * 0.5 }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6">
        <Link
          href="/matches"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-indigo-400 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Matches
        </Link>

        {/* Match Header - Stadium Glass Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8"
        >
          {/* Glass effect background */}
          <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-2xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl" />

          <div className="relative rounded-2xl p-8 border border-white/10 overflow-hidden">
            {/* Trophy decoration */}
            <div className="absolute top-4 right-4 opacity-10">
              <Trophy className="w-20 h-20 text-indigo-400" />
            </div>

            {/* League & Status */}
            <div className="text-center mb-8">
              <motion.span
                className="inline-block px-4 py-2 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-lg border border-indigo-500/30"
                whileHover={{ scale: 1.05 }}
              >
                {match.league}
              </motion.span>
              <div className="flex items-center justify-center gap-4 mt-4">
                {live ? (
                  <motion.span
                    className="flex items-center gap-2 px-4 py-1 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/30"
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    LIVE {match.minute && `${match.minute}'`}
                  </motion.span>
                ) : finished ? (
                  <span className="px-4 py-1 rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30">
                    Full Time
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-indigo-300">
                    <Clock size={16} />
                    {formatMatchDate(match.matchDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Teams */}
            <div className="flex items-center justify-between">
              {/* Home Team */}
              <div className="flex-1 text-center">
                <StadiumTeamBadge team={match.homeTeam} isHome />
                <h2 className="text-2xl font-bold text-white mt-4">{match.homeTeam.name}</h2>
                <span className="text-indigo-400/60 text-sm">HOME</span>
              </div>

              {/* Score / VS */}
              <div className="px-8 py-6">
                {live || finished ? (
                  <div className="relative">
                    <motion.div
                      className="flex items-center gap-4 text-6xl font-bold"
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                    >
                      <span className={cn(
                        'drop-shadow-lg',
                        live ? 'text-red-400' : 'text-white'
                      )}>
                        {match.homeScore ?? 0}
                      </span>
                      <span className="text-indigo-500/50 text-4xl">-</span>
                      <span className={cn(
                        'drop-shadow-lg',
                        live ? 'text-red-400' : 'text-white'
                      )}>
                        {match.awayScore ?? 0}
                      </span>
                    </motion.div>
                  </div>
                ) : (
                  <motion.div
                    className="relative"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                      VS
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Away Team */}
              <div className="flex-1 text-center">
                <StadiumTeamBadge team={match.awayTeam} />
                <h2 className="text-2xl font-bold text-white mt-4">{match.awayTeam.name}</h2>
                <span className="text-purple-400/60 text-sm">AWAY</span>
              </div>
            </div>

            {match.venue && (
              <div className="flex items-center justify-center gap-2 mt-8 text-gray-400">
                <MapPin size={16} className="text-indigo-400" />
                <span>{match.venue}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* AI Analysis - Glass Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-6"
        >
          <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-xl" />

          <div className="relative rounded-xl border border-white/10 overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === 'ai' ? null : 'ai')}
              className="w-full p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/20">
                  <Bot className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="font-semibold text-white">AI Match Analysis</span>
              </div>
              {expandedSection === 'ai' ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
            </button>

            <AnimatePresence>
              {expandedSection === 'ai' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5">
                    {/* No analysis yet - show button to request */}
                    {!aiAnalysis && !isLoadingAnalysis && !analysisError && (
                      <div className="text-center py-6">
                        <p className="text-gray-400 mb-4">Get AI-powered analysis for this match</p>
                        <button
                          onClick={requestAnalysis}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-semibold transition-all"
                        >
                          <Bot size={20} />
                          Get AI Analysis
                        </button>
                      </div>
                    )}

                    {/* Loading state */}
                    {isLoadingAnalysis && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
                        <span className="text-indigo-400 animate-pulse">Analyzing match data...</span>
                      </div>
                    )}

                    {/* Error state */}
                    {analysisError && !isLoadingAnalysis && (
                      <div className="text-center py-6">
                        <p className="text-red-400 mb-4">Failed to get analysis. Please try again.</p>
                        <button
                          onClick={requestAnalysis}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold transition-all border border-red-500/30"
                        >
                          <RefreshCw size={20} />
                          Retry
                        </button>
                      </div>
                    )}

                    {/* Analysis result */}
                    {aiAnalysis && !isLoadingAnalysis && (
                      <div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl bg-black/30 border border-indigo-500/20"
                        >
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                          </div>
                        </motion.div>

                        {/* Refresh button */}
                        <div className="mt-4 text-center">
                          <button
                            onClick={requestAnalysis}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-indigo-400 hover:bg-indigo-500/10 transition-all"
                          >
                            <RefreshCw size={16} />
                            Refresh Analysis
                          </button>
                        </div>
                      </div>
                    )}

                    {!isAuthenticated && (
                      <div className="mt-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm">
                        <Zap className="inline w-4 h-4 mr-2" />
                        <Link href="/login" className="underline hover:no-underline">
                          Sign in
                        </Link>{' '}
                        for personalized AI predictions
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid md:grid-cols-2 gap-4">
          <StadiumStatsCard
            title="Head to Head"
            icon={<History className="w-5 h-5 text-indigo-400" />}
            expanded={expandedSection === 'h2h'}
            onToggle={() => setExpandedSection(expandedSection === 'h2h' ? null : 'h2h')}
          >
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                <p className="text-2xl font-bold text-indigo-400">4</p>
                <p className="text-xs text-gray-400">{match.homeTeam.name}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-500/10 border border-gray-500/30">
                <p className="text-2xl font-bold text-gray-300">3</p>
                <p className="text-xs text-gray-400">Draws</p>
              </div>
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <p className="text-2xl font-bold text-purple-400">3</p>
                <p className="text-xs text-gray-400">{match.awayTeam.name}</p>
              </div>
            </div>
          </StadiumStatsCard>

          <StadiumStatsCard
            title="Match Statistics"
            icon={<TrendingUp className="w-5 h-5 text-indigo-400" />}
            expanded={expandedSection === 'stats'}
            onToggle={() => setExpandedSection(expandedSection === 'stats' ? null : 'stats')}
          >
            <div className="space-y-3">
              <StadiumStatBar label="Goals/Game" home={2.1} away={1.8} />
              <StadiumStatBar label="Possession" home={58} away={52} />
              <StadiumStatBar label="Shots" home={15} away={12} />
            </div>
          </StadiumStatsCard>
        </div>
      </div>
    </div>
  );
}

function StadiumTeamBadge({ team, isHome }: { team: { name: string; logo?: string }; isHome?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const color = isHome ? 'indigo' : 'purple';

  if (team.logo && !imgError) {
    return (
      <div className="relative group mx-auto">
        <motion.div
          className={`absolute inset-0 bg-${color}-500/20 rounded-full blur-xl`}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <div className={`relative w-28 h-28 rounded-full bg-black/40 backdrop-blur-sm p-4 border-2 border-${color}-500/30`}>
          <img
            src={team.logo}
            alt={team.name}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative group mx-auto">
      <div className={`absolute inset-0 bg-${color}-500/20 rounded-full blur-xl`} />
      <div className={`relative w-28 h-28 rounded-full bg-gradient-to-br from-${color}-600 to-${color}-800 border-2 border-${color}-400/50 flex items-center justify-center text-3xl font-bold text-white`}>
        {team.name.substring(0, 2).toUpperCase()}
      </div>
    </div>
  );
}

function StadiumStatsCard({ title, icon, expanded, onToggle, children }: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-xl" />
      <div className="relative rounded-xl border border-white/10 overflow-hidden">
        <button onClick={onToggle} className="w-full p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <span className="font-semibold text-white">{title}</span>
          </div>
          {expanded ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function StadiumStatBar({ label, home, away }: { label: string; home: number; away: number }) {
  const total = home + away;
  const homePercent = (home / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-indigo-400">{home}</span>
        <span className="text-gray-400">{label}</span>
        <span className="text-purple-400">{away}</span>
      </div>
      <div className="h-2 bg-black/30 rounded-full overflow-hidden flex">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${homePercent}%` }}
          className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${100 - homePercent}%` }}
          className="h-full bg-gradient-to-r from-purple-400 to-purple-600"
        />
      </div>
    </div>
  );
}
