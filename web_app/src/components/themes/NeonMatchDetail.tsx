'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Clock, Send, Loader2, ArrowLeft, MapPin,
  TrendingUp, History, Zap, ChevronDown, ChevronUp, Activity, Target, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { MatchDetail, isMatchLive, isMatchFinished, formatMatchDate } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Format AI analysis text to display bullet points on separate lines
 */
function formatAnalysisText(text: string): string {
  if (!text) return text;

  // Replace inline bullet points with newline + bullet
  // Pattern: space + bullet + space (but not at start of line)
  let formatted = text.replace(/(?<!^)(?<!\n)\s*•\s*/g, '\n• ');

  // Ensure sections start on new lines
  formatted = formatted.replace(/([.!?])\s*(📊|🎯|💡|💰|⚠️|🏆|📅)/g, '$1\n\n$2');

  return formatted;
}

interface NeonMatchDetailProps {
  matchId: string;
}

export function NeonMatchDetail({ matchId }: NeonMatchDetailProps) {
  const { user, isAuthenticated } = useAuthStore();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('ai');

  // AI Analysis - local state (NOT from global chat store)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);

  // Load match details
  useEffect(() => {
    if (!matchId) return;

    const loadMatch = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const matchData = await api.getMatchDetail(parseInt(matchId));
        setMatch(matchData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load match');
        // Fallback data
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
      <div className="min-h-screen neon-bg flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-emerald-500/30 rounded-full animate-spin border-t-emerald-400" />
          <div className="absolute inset-0 w-16 h-16 border-2 border-cyan-500/20 rounded-full animate-ping" />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen neon-bg flex flex-col items-center justify-center">
        <p className="text-red-400 mb-4">{error || 'Match not found'}</p>
        <Link href="/matches" className="px-6 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
          Back to Matches
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen neon-bg relative overflow-hidden">
      {/* Neon Grid Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }} />
        {/* Glowing orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6">
        {/* Back Button */}
        <Link
          href="/matches"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-emerald-400 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Matches
        </Link>

        {/* Match Header - Neon Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8"
        >
          {/* Neon border glow */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/50 via-cyan-500/50 to-emerald-500/50 rounded-2xl blur-sm" />

          <div className="relative bg-gray-900/90 backdrop-blur-xl rounded-2xl p-8 border border-emerald-500/20">
            {/* League & Status */}
            <div className="text-center mb-8">
              <motion.span
                className="text-emerald-400 font-bold text-xl tracking-wider"
                animate={{ textShadow: ['0 0 10px #10b981', '0 0 20px #10b981', '0 0 10px #10b981'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {match.league}
              </motion.span>
              <div className="flex items-center justify-center gap-4 mt-3">
                {live ? (
                  <span className="flex items-center gap-2 text-red-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    LIVE {match.minute && `${match.minute}'`}
                  </span>
                ) : finished ? (
                  <span className="text-gray-400 font-medium">Full Time</span>
                ) : (
                  <span className="flex items-center gap-2 text-cyan-400">
                    <Clock size={16} />
                    {formatMatchDate(match.matchDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Teams with Neon Glow */}
            <div className="flex items-center justify-between">
              {/* Home Team */}
              <div className="flex-1 text-center">
                <NeonTeamBadge team={match.homeTeam} />
                <h2 className="text-xl font-bold text-white mt-4">{match.homeTeam.name}</h2>
                <span className="text-emerald-400/60 text-sm">HOME</span>
              </div>

              {/* Score / VS */}
              <div className="px-8 py-6">
                {live || finished ? (
                  <div className="text-center">
                    <div className="flex items-center gap-4 text-5xl font-bold font-mono">
                      <motion.span
                        className={live ? 'text-red-400' : 'text-white'}
                        animate={live ? { opacity: [1, 0.5, 1] } : {}}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        {match.homeScore ?? 0}
                      </motion.span>
                      <span className="text-emerald-500">:</span>
                      <motion.span
                        className={live ? 'text-red-400' : 'text-white'}
                        animate={live ? { opacity: [1, 0.5, 1] } : {}}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        {match.awayScore ?? 0}
                      </motion.span>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    className="relative"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                      VS
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Away Team */}
              <div className="flex-1 text-center">
                <NeonTeamBadge team={match.awayTeam} />
                <h2 className="text-xl font-bold text-white mt-4">{match.awayTeam.name}</h2>
                <span className="text-cyan-400/60 text-sm">AWAY</span>
              </div>
            </div>

            {/* Venue */}
            {match.venue && (
              <div className="flex items-center justify-center gap-2 mt-6 text-gray-400 text-sm">
                <MapPin size={14} className="text-emerald-400" />
                <span>{match.venue}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* AI Analysis Section - Neon Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-6"
        >
          <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 rounded-xl blur-sm" />

          <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-xl border border-emerald-500/20 overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === 'ai' ? null : 'ai')}
              className="w-full p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Bot className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="font-semibold text-white">AI Analysis</span>
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
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-semibold transition-all"
                        >
                          <Bot size={20} />
                          Get AI Analysis
                        </button>
                      </div>
                    )}

                    {/* Loading state */}
                    {isLoadingAnalysis && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
                        <span className="text-emerald-400 animate-pulse">Analyzing match data...</span>
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
                          className="p-4 rounded-xl bg-gray-800/50 border border-emerald-500/20"
                        >
                          <div className="prose prose-invert prose-sm prose-emerald max-w-none">
                            <ReactMarkdown>{formatAnalysisText(aiAnalysis)}</ReactMarkdown>
                          </div>
                        </motion.div>

                        {/* Refresh button */}
                        <div className="mt-4 text-center">
                          <button
                            onClick={requestAnalysis}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-emerald-400 hover:bg-emerald-500/10 transition-all"
                          >
                            <RefreshCw size={16} />
                            Refresh Analysis
                          </button>
                        </div>
                      </div>
                    )}

                    {!isAuthenticated && (
                      <div className="mt-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm">
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

        {/* Stats Sections */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Head to Head */}
          <NeonStatsCard
            title="Head to Head"
            icon={<History className="w-5 h-5 text-emerald-400" />}
            expanded={expandedSection === 'h2h'}
            onToggle={() => setExpandedSection(expandedSection === 'h2h' ? null : 'h2h')}
          >
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-2xl font-bold text-emerald-400 font-mono">4</p>
                <p className="text-xs text-gray-400">{match.homeTeam.name}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-700/30 border border-gray-600/30">
                <p className="text-2xl font-bold text-gray-300 font-mono">3</p>
                <p className="text-xs text-gray-400">Draws</p>
              </div>
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <p className="text-2xl font-bold text-cyan-400 font-mono">3</p>
                <p className="text-xs text-gray-400">{match.awayTeam.name}</p>
              </div>
            </div>
          </NeonStatsCard>

          {/* Match Stats */}
          <NeonStatsCard
            title="Match Statistics"
            icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
            expanded={expandedSection === 'stats'}
            onToggle={() => setExpandedSection(expandedSection === 'stats' ? null : 'stats')}
          >
            <div className="space-y-3">
              <NeonStatBar label="Goals/Game" home={2.1} away={1.8} />
              <NeonStatBar label="Shots/Game" home={15} away={12} />
              <NeonStatBar label="Possession" home={58} away={52} />
            </div>
          </NeonStatsCard>
        </div>
      </div>
    </div>
  );
}

// Neon Team Badge
function NeonTeamBadge({ team }: { team: { name: string; logo?: string } }) {
  const [imgError, setImgError] = useState(false);

  if (team.logo && !imgError) {
    return (
      <div className="relative group mx-auto">
        <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-xl group-hover:bg-emerald-400/40 transition-all" />
        <div className="relative w-24 h-24 rounded-full bg-gray-900/80 p-3 border border-emerald-500/30">
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
      <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-xl" />
      <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl font-bold text-white">
        {team.name.substring(0, 2).toUpperCase()}
      </div>
    </div>
  );
}

// Neon Stats Card
function NeonStatsCard({
  title,
  icon,
  expanded,
  onToggle,
  children
}: {
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
      <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl blur-sm opacity-50" />

      <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-xl border border-emerald-500/20 overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full p-4 flex items-center justify-between"
        >
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
              <div className="px-4 pb-4">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Neon Stat Bar
function NeonStatBar({ label, home, away }: { label: string; home: number; away: number }) {
  const total = home + away;
  const homePercent = (home / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-emerald-400 font-mono">{home}</span>
        <span className="text-gray-400">{label}</span>
        <span className="text-cyan-400 font-mono">{away}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${homePercent}%` }}
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${100 - homePercent}%` }}
          className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500"
        />
      </div>
    </div>
  );
}
