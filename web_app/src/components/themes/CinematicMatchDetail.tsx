'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Clock, Loader2, ArrowLeft, MapPin,
  TrendingUp, History, Zap, ChevronDown, ChevronUp, Crosshair, Target, RefreshCw
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

interface CinematicMatchDetailProps {
  matchId: string;
}

export function CinematicMatchDetail({ matchId }: CinematicMatchDetailProps) {
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
      <div className="min-h-screen cinematic-bg flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-400 rounded-full"
        />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen cinematic-bg flex flex-col items-center justify-center">
        <p className="text-red-400 mb-4">{error || 'Match not found'}</p>
        <Link href="/matches" className="px-6 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold">
          Back to Matches
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen cinematic-bg relative overflow-hidden">
      {/* Stadium Background with Spotlights */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/stadium-dark.jpg')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-[#0a0a0f]/80" />

        {/* Spotlight beams */}
        <div className="absolute top-0 left-1/4 w-32 h-[600px] bg-gradient-to-b from-amber-400/10 to-transparent rotate-12 blur-2xl" />
        <div className="absolute top-0 right-1/4 w-32 h-[600px] bg-gradient-to-b from-amber-400/10 to-transparent -rotate-12 blur-2xl" />

        {/* Film grain effect */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6">
        <Link
          href="/matches"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Matches
        </Link>

        {/* Epic Match Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mb-8"
        >
          {/* Golden border glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/50 via-yellow-400/30 to-amber-500/50 rounded-2xl blur-lg opacity-50" />

          <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-2xl p-8 border border-amber-500/30 overflow-hidden">
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-amber-500/50 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-20 h-20 border-r-2 border-t-2 border-amber-500/50 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-20 h-20 border-l-2 border-b-2 border-amber-500/50 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-amber-500/50 rounded-br-2xl" />

            {/* League & Status */}
            <div className="text-center mb-8">
              <motion.div
                className="inline-block"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <span className="text-amber-400 font-bold text-2xl tracking-wider drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                  {match.league}
                </span>
              </motion.div>
              <div className="flex items-center justify-center gap-4 mt-3">
                {live ? (
                  <motion.span
                    className="flex items-center gap-2 text-red-400 font-bold text-lg"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    LIVE {match.minute && `${match.minute}'`}
                  </motion.span>
                ) : finished ? (
                  <span className="text-gray-400 font-medium text-lg">FULL TIME</span>
                ) : (
                  <span className="flex items-center gap-2 text-amber-300/80">
                    <Clock size={18} />
                    {formatMatchDate(match.matchDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Teams - Epic Style */}
            <div className="flex items-center justify-between">
              {/* Home Team */}
              <div className="flex-1 text-center">
                <CinematicTeamBadge team={match.homeTeam} />
                <h2 className="text-2xl font-bold text-white mt-4 tracking-wide">{match.homeTeam.name}</h2>
                <span className="text-amber-400/60 text-sm uppercase tracking-widest">Home</span>
              </div>

              {/* Score / VS */}
              <div className="px-8 py-6">
                {live || finished ? (
                  <div className="text-center">
                    <motion.div
                      className="flex items-center gap-6 text-6xl font-bold"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                    >
                      <span className={cn('drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]', live ? 'text-red-400' : 'text-white')}>
                        {match.homeScore ?? 0}
                      </span>
                      <span className="text-amber-500/50">-</span>
                      <span className={cn('drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]', live ? 'text-red-400' : 'text-white')}>
                        {match.awayScore ?? 0}
                      </span>
                    </motion.div>
                  </div>
                ) : (
                  <motion.div
                    animate={{
                      textShadow: ['0 0 20px rgba(251,191,36,0.3)', '0 0 40px rgba(251,191,36,0.6)', '0 0 20px rgba(251,191,36,0.3)']
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-6xl font-bold text-amber-400"
                  >
                    VS
                  </motion.div>
                )}
              </div>

              {/* Away Team */}
              <div className="flex-1 text-center">
                <CinematicTeamBadge team={match.awayTeam} />
                <h2 className="text-2xl font-bold text-white mt-4 tracking-wide">{match.awayTeam.name}</h2>
                <span className="text-amber-400/60 text-sm uppercase tracking-widest">Away</span>
              </div>
            </div>

            {match.venue && (
              <div className="flex items-center justify-center gap-2 mt-8 text-gray-400">
                <MapPin size={16} className="text-amber-500" />
                <span className="tracking-wide">{match.venue}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* AI Analysis - Cinematic Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative mb-6"
        >
          <div className="absolute -inset-[1px] bg-gradient-to-r from-amber-500/30 to-amber-600/30 rounded-xl blur-sm" />

          <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl border border-amber-500/20 overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === 'ai' ? null : 'ai')}
              className="w-full p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Crosshair className="w-5 h-5 text-amber-400" />
                </div>
                <span className="font-semibold text-white tracking-wide">TACTICAL ANALYSIS</span>
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
                        <p className="text-gray-400 mb-4">Get AI-powered tactical analysis for this match</p>
                        <button
                          onClick={requestAnalysis}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-semibold transition-all"
                        >
                          <Bot size={20} />
                          Get AI Analysis
                        </button>
                      </div>
                    )}

                    {/* Loading state */}
                    {isLoadingAnalysis && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-4" />
                        <span className="text-amber-400 animate-pulse">Analyzing tactical data...</span>
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
                          className="p-4 rounded-xl bg-gray-800/50 border border-amber-500/20"
                        >
                          <div className="prose prose-invert prose-sm prose-amber max-w-none">
                            <ReactMarkdown>{formatAnalysisText(aiAnalysis)}</ReactMarkdown>
                          </div>
                        </motion.div>

                        {/* Refresh button */}
                        <div className="mt-4 text-center">
                          <button
                            onClick={requestAnalysis}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-amber-400 hover:bg-amber-500/10 transition-all"
                          >
                            <RefreshCw size={16} />
                            Refresh Analysis
                          </button>
                        </div>
                      </div>
                    )}

                    {!isAuthenticated && (
                      <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
                        <Target className="inline w-4 h-4 mr-2" />
                        <Link href="/login" className="underline hover:no-underline">
                          Sign in
                        </Link>{' '}
                        for personalized tactical analysis
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <CinematicStatsCard
            title="HEAD TO HEAD"
            icon={<History className="w-5 h-5 text-amber-400" />}
            expanded={expandedSection === 'h2h'}
            onToggle={() => setExpandedSection(expandedSection === 'h2h' ? null : 'h2h')}
          >
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                <p className="text-2xl font-bold text-green-400">4</p>
                <p className="text-xs text-gray-400">{match.homeTeam.name}</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-2xl font-bold text-amber-400">3</p>
                <p className="text-xs text-gray-400">Draws</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <p className="text-2xl font-bold text-blue-400">3</p>
                <p className="text-xs text-gray-400">{match.awayTeam.name}</p>
              </div>
            </div>
          </CinematicStatsCard>

          <CinematicStatsCard
            title="STATISTICS"
            icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
            expanded={expandedSection === 'stats'}
            onToggle={() => setExpandedSection(expandedSection === 'stats' ? null : 'stats')}
          >
            <div className="space-y-3">
              <CinematicStatBar label="Attack" home={78} away={65} />
              <CinematicStatBar label="Defense" home={72} away={68} />
              <CinematicStatBar label="Form" home={85} away={70} />
            </div>
          </CinematicStatsCard>
        </div>
      </div>
    </div>
  );
}

// Cinematic Team Badge
function CinematicTeamBadge({ team }: { team: { name: string; logo?: string } }) {
  const [imgError, setImgError] = useState(false);

  if (team.logo && !imgError) {
    return (
      <div className="relative group mx-auto">
        <motion.div
          className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 p-4 border-2 border-amber-500/30 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
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
    <div className="relative group mx-auto">
      <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl" />
      <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 border-2 border-amber-400/50 flex items-center justify-center text-3xl font-bold text-white shadow-[0_0_30px_rgba(251,191,36,0.3)]">
        {team.name.substring(0, 2).toUpperCase()}
      </div>
    </div>
  );
}

function CinematicStatsCard({ title, icon, expanded, onToggle, children }: {
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
      <div className="absolute -inset-[1px] bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-xl blur-sm opacity-50" />
      <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl border border-amber-500/20 overflow-hidden">
        <button onClick={onToggle} className="w-full p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <span className="font-semibold text-white tracking-wider">{title}</span>
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

function CinematicStatBar({ label, home, away }: { label: string; home: number; away: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-green-400 font-bold">{home}%</span>
        <span className="text-gray-400 uppercase tracking-wider text-xs">{label}</span>
        <span className="text-blue-400 font-bold">{away}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${home}%` }}
          className="h-full bg-gradient-to-r from-green-600 to-green-400"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${away}%` }}
          className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
        />
      </div>
    </div>
  );
}
