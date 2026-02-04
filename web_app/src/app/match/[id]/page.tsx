'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Brain, Clock, Trophy, Users, TrendingUp,
  Target, Zap, Loader2, AlertCircle
} from 'lucide-react';
import { useMatchesStore } from '@/store/matchesStore';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { Match, isMatchLive, isMatchFinished, formatMatchDate, getShortTeamName } from '@/types';
import { cn } from '@/lib/utils';

interface PageParams {
  params: { id: string };
}

export default function MatchDetailPage({ params }: PageParams) {
  const router = useRouter();
  const matchId = params.id;
  const { user } = useAuthStore();
  const { currentRoundMatches, nextRoundMatches, dateTodayMatches, dateTomorrowMatches, loadCurrentRound } = useMatchesStore();
  const { sendMessage, isLoading: aiLoading, messages } = useChatStore();

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [homeImgError, setHomeImgError] = useState(false);
  const [awayImgError, setAwayImgError] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);

  // Find match
  useEffect(() => {
    const allMatches = [...currentRoundMatches, ...nextRoundMatches, ...dateTodayMatches, ...dateTomorrowMatches];
    const found = allMatches.find(m => m.id === Number(matchId));
    if (found) {
      setMatch(found);
      setLoading(false);
    } else {
      loadCurrentRound().then(() => setLoading(false));
    }
  }, [matchId, currentRoundMatches, nextRoundMatches, dateTodayMatches, dateTomorrowMatches, loadCurrentRound]);

  // Re-find match after loading
  useEffect(() => {
    if (!loading && !match) {
      const allMatches = [...currentRoundMatches, ...nextRoundMatches, ...dateTodayMatches, ...dateTomorrowMatches];
      const found = allMatches.find(m => m.id === Number(matchId));
      if (found) setMatch(found);
    }
  }, [loading, match, matchId, currentRoundMatches, nextRoundMatches, dateTodayMatches, dateTomorrowMatches]);

  const handleGetPrediction = async () => {
    if (!match) return;
    const prompt = `Analyze the match ${match.homeTeam.name} vs ${match.awayTeam.name} and provide a detailed prediction.`;
    await sendMessage(prompt, {
      minOdds: user?.minOdds ?? 1.5,
      maxOdds: user?.maxOdds ?? 3.0,
      riskLevel: user?.riskLevel ?? 'medium',
    });
    // Get last AI message
    const lastAiMessage = messages.filter(m => !m.isUser).pop();
    if (lastAiMessage) {
      setPrediction(lastAiMessage.text);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#3B5998]" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg mb-4">Match not found</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-[#3B5998] text-white rounded-xl font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const live = isMatchLive(match);
  const finished = isMatchFinished(match);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3B5998] via-[#4A66A0] to-[#6B5B95] px-4 pt-12 pb-24">
        <div className="max-w-lg mx-auto">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/80 mb-6"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          {/* League & Status */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/70 text-sm">{match.league}</span>
            {live ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-sm">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                LIVE {match.minute && `${match.minute}'`}
              </span>
            ) : finished ? (
              <span className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-sm">
                Full Time
              </span>
            ) : (
              <span className="flex items-center gap-1 text-white/70 text-sm">
                <Clock size={14} />
                {formatMatchDate(match.matchDate)}
              </span>
            )}
          </div>

          {/* Teams & Score */}
          <div className="flex items-center justify-between">
            {/* Home */}
            <div className="flex-1 text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden mb-3">
                {match.homeTeam.logo && !homeImgError ? (
                  <img
                    src={match.homeTeam.logo}
                    alt={match.homeTeam.name}
                    className="w-14 h-14 object-contain"
                    onError={() => setHomeImgError(true)}
                  />
                ) : (
                  <span className="text-2xl font-bold text-white/50">
                    {match.homeTeam.name.substring(0, 3).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-white font-semibold">{getShortTeamName(match.homeTeam.name)}</p>
            </div>

            {/* Score */}
            <div className="px-6">
              {live || finished ? (
                <div className="flex items-center gap-3">
                  <span className={cn('text-4xl font-bold', live ? 'text-red-400' : 'text-white')}>
                    {match.homeScore ?? 0}
                  </span>
                  <span className="text-white/30 text-2xl">:</span>
                  <span className={cn('text-4xl font-bold', live ? 'text-red-400' : 'text-white')}>
                    {match.awayScore ?? 0}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-white/50">VS</span>
              )}
            </div>

            {/* Away */}
            <div className="flex-1 text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden mb-3">
                {match.awayTeam.logo && !awayImgError ? (
                  <img
                    src={match.awayTeam.logo}
                    alt={match.awayTeam.name}
                    className="w-14 h-14 object-contain"
                    onError={() => setAwayImgError(true)}
                  />
                ) : (
                  <span className="text-2xl font-bold text-white/50">
                    {match.awayTeam.name.substring(0, 3).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-white font-semibold">{getShortTeamName(match.awayTeam.name)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-16 pb-8">
        <div className="max-w-lg mx-auto space-y-4">
          {/* AI Prediction Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B5998] to-[#6B5B95] flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">AI Prediction</h2>
                <p className="text-gray-500 text-sm">Powered by advanced ML models</p>
              </div>
            </div>

            {prediction ? (
              <div className="p-4 rounded-xl bg-gray-50 text-gray-700 text-sm whitespace-pre-wrap">
                {prediction}
              </div>
            ) : (
              <button
                onClick={handleGetPrediction}
                disabled={aiLoading}
                className="w-full py-4 rounded-xl font-medium text-white bg-gradient-to-r from-[#3B5998] to-[#6B5B95] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {aiLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Zap className="w-5 h-5" />
                    Get AI Prediction
                  </span>
                )}
              </button>
            )}
          </motion.div>

          {/* Match Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <h3 className="font-bold text-gray-900 mb-4">Match Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Competition</span>
                <span className="text-gray-900 font-medium">{match.league}</span>
              </div>
              {match.matchday && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Matchday</span>
                  <span className="text-gray-900 font-medium">Round {match.matchday}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Date</span>
                <span className="text-gray-900 font-medium">{formatMatchDate(match.matchDate)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500 text-sm">Status</span>
                <span className={cn(
                  'font-medium',
                  live ? 'text-red-500' : finished ? 'text-gray-500' : 'text-[#3B5998]'
                )}>
                  {live ? `Live (${match.minute}')` : finished ? 'Finished' : 'Upcoming'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3"
          >
            <Link href="/ai-chat">
              <div className="bg-white rounded-2xl p-4 shadow-sm h-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#3B5998]/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-[#3B5998]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Ask AI</p>
                    <p className="text-xs text-gray-500">Get insights</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/matches">
              <div className="bg-white rounded-2xl p-4 shadow-sm h-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">More Matches</p>
                    <p className="text-xs text-gray-500">View schedule</p>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
