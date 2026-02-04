'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Target, Award, BarChart3, Calendar,
  CheckCircle, XCircle, Clock, Crown, Sparkles
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AccuracyData {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
}

export default function StatsPage() {
  const { selectedTheme } = useThemeStore();
  const { user, isAuthenticated } = useAuthStore();
  const [accuracyData, setAccuracyData] = useState<AccuracyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Theme styles
  const themeStyles = {
    cinematic: {
      bg: 'cinematic-bg',
      card: 'card-cinematic',
      accent: 'text-amber-400',
      accentBg: 'bg-amber-500',
      gradient: 'from-amber-500 to-amber-700',
      progressBg: 'bg-amber-500/20',
      progressFill: 'bg-amber-500',
    },
    neon: {
      bg: 'neon-bg neon-grid',
      card: 'card-neon',
      accent: 'text-emerald-400',
      accentBg: 'bg-emerald-500',
      gradient: 'from-emerald-400 to-cyan-500',
      progressBg: 'bg-emerald-500/20',
      progressFill: 'bg-emerald-500',
    },
    stadium: {
      bg: 'stadium-bg',
      card: 'card-stadium',
      accent: 'text-indigo-400',
      accentBg: 'bg-indigo-500',
      gradient: 'from-indigo-500 to-purple-600',
      progressBg: 'bg-indigo-500/20',
      progressFill: 'bg-indigo-500',
    },
  };

  const styles = selectedTheme ? themeStyles[selectedTheme] : themeStyles.neon;

  useEffect(() => {
    const loadStats = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        if (!user) {
          // Fallback data when user not loaded yet
          setAccuracyData({
            totalPredictions: 0,
            correctPredictions: 0,
            accuracy: 0,
          });
        } else {
          const data = await api.getAccuracy(30);
          setAccuracyData(data);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
        // Use user data as fallback
        if (user) {
          setAccuracyData({
            totalPredictions: user.totalPredictions,
            correctPredictions: user.correctPredictions,
            accuracy: user.accuracy,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [isAuthenticated, user]);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 60) return 'text-green-400';
    if (accuracy >= 45) return 'text-orange-400';
    return 'text-red-400';
  };

  const getAccuracyBgColor = (accuracy: number) => {
    if (accuracy >= 60) return 'bg-green-500';
    if (accuracy >= 45) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (!isAuthenticated) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center py-8 px-4', styles.bg)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('max-w-md w-full rounded-2xl p-8 text-center', styles.card)}
        >
          <BarChart3 className={cn('w-16 h-16 mx-auto mb-4', styles.accent)} />
          <h1 className="text-2xl font-bold text-white mb-2">View Your Stats</h1>
          <p className="text-gray-400 mb-6">
            Sign in to track your prediction accuracy and performance over time.
          </p>
          <Link href="/login">
            <button className={cn(
              'w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r',
              styles.gradient
            )}>
              Sign In
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen py-8 px-4', styles.bg)}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br', styles.gradient)}>
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Statistics</h1>
              <p className="text-gray-400 text-sm">Your prediction performance</p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className={cn('rounded-2xl p-12 text-center', styles.card)}>
            <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-400 mt-4">Loading statistics...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* AI Predictions Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn('rounded-2xl p-6', styles.card)}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Sparkles className={cn('w-5 h-5', styles.accent)} />
                  <h2 className="text-lg font-semibold text-white">AI Predictions</h2>
                </div>
                {user?.isPremium && (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm">
                    <Crown size={14} />
                    <span>PRO</span>
                  </div>
                )}
              </div>

              {/* Accuracy Circle */}
              <div className="flex justify-center mb-8">
                <div className="relative w-32 h-32">
                  {/* Background circle */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-white/10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(accuracyData?.accuracy ?? 0) * 2.51} 251`}
                      className={getAccuracyBgColor(accuracyData?.accuracy ?? 0)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn('text-3xl font-bold', getAccuracyColor(accuracyData?.accuracy ?? 0))}>
                      {accuracyData?.totalPredictions ? `${accuracyData.accuracy.toFixed(1)}%` : '—'}
                    </span>
                    <span className="text-gray-500 text-sm">Accuracy</span>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className={cn('text-2xl font-bold', styles.accent)}>
                    {accuracyData?.totalPredictions ?? 0}
                  </div>
                  <div className="text-gray-500 text-sm">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {accuracyData?.correctPredictions ?? 0}
                  </div>
                  <div className="text-gray-500 text-sm">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {(accuracyData?.totalPredictions ?? 0) - (accuracyData?.correctPredictions ?? 0)}
                  </div>
                  <div className="text-gray-500 text-sm">Wrong</div>
                </div>
              </div>

              {!accuracyData?.totalPredictions && (
                <p className="text-center text-gray-500 text-sm mt-6">
                  Ask AI about matches to build your stats
                </p>
              )}
            </motion.div>

            {/* Saved Predictions Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cn('rounded-2xl p-6', styles.card)}
            >
              <div className="flex items-center gap-3 mb-6">
                <Target className={cn('w-5 h-5', styles.accent)} />
                <h2 className="text-lg font-semibold text-white">Saved Predictions</h2>
              </div>

              <div className={cn('rounded-xl p-6 text-center', styles.progressBg)}>
                <Target className={cn('w-8 h-8 mx-auto mb-3 opacity-50', styles.accent)} />
                <p className="text-gray-400 font-medium">No saved predictions</p>
                <p className="text-gray-500 text-sm mt-1">
                  Save predictions from match details to track your personal picks
                </p>
              </div>
            </motion.div>

            {/* Performance Tips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={cn('rounded-2xl p-6', styles.card)}
            >
              <div className="flex items-center gap-3 mb-6">
                <Award className={cn('w-5 h-5', styles.accent)} />
                <h2 className="text-lg font-semibold text-white">Performance Tips</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg', styles.progressBg)}>
                    <TrendingUp className={cn('w-4 h-4', styles.accent)} />
                  </div>
                  <div>
                    <p className="text-white font-medium">Follow Value Bets</p>
                    <p className="text-gray-500 text-sm">AI identifies odds that are higher than the true probability</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg', styles.progressBg)}>
                    <Calendar className={cn('w-4 h-4', styles.accent)} />
                  </div>
                  <div>
                    <p className="text-white font-medium">Be Consistent</p>
                    <p className="text-gray-500 text-sm">Regular small stakes outperform occasional large bets</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg', styles.progressBg)}>
                    <Target className={cn('w-4 h-4', styles.accent)} />
                  </div>
                  <div>
                    <p className="text-white font-medium">Stick to Your Strategy</p>
                    <p className="text-gray-500 text-sm">Don't chase losses or bet emotionally</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
