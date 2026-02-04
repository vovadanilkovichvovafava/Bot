'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Target, Award, BarChart3, Calendar,
  CheckCircle, XCircle, Clock, Crown, Sparkles, Brain
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Stadium theme colors
const STADIUM_COLORS = {
  bgPrimary: '#080A10',
  bgSecondary: '#10141E',
  blue: '#4A7AFF',
  blueHover: '#5D8AFF',
  green: '#3DDC84',
  red: '#FF3B3B',
  glass: 'rgba(12, 15, 24, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
};

const STADIUM_BG = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80';

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

  const isStadiumTheme = selectedTheme === 'stadium';

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
      bg: '',
      card: '',
      accent: 'text-[#4A7AFF]',
      accentBg: 'bg-[#4A7AFF]',
      gradient: 'from-[#4A7AFF] to-[#3D6AE8]',
      progressBg: 'bg-[#4A7AFF]/20',
      progressFill: 'bg-[#4A7AFF]',
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
    // Stadium theme unauthenticated view
    if (isStadiumTheme) {
      return (
        <div
          className="min-h-screen flex items-center justify-center py-8 px-4 relative"
          style={{ backgroundColor: STADIUM_COLORS.bgPrimary }}
        >
          <div
            className="fixed inset-0 z-0"
            style={{
              backgroundImage: `url(${STADIUM_BG})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom,
                  rgba(8, 10, 16, 0.85) 0%,
                  rgba(8, 10, 16, 0.95) 100%)`
              }}
            />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 max-w-md w-full rounded-2xl p-8 text-center"
            style={{
              background: STADIUM_COLORS.glass,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${STADIUM_COLORS.glassBorder}`,
            }}
          >
            <BarChart3 className="w-16 h-16 mx-auto mb-4" style={{ color: STADIUM_COLORS.blue }} />
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              СТАТИСТИКА
            </h1>
            <p className="text-gray-400 mb-6">
              Войдите для просмотра вашей статистики прогнозов
            </p>
            <Link href="/login">
              <button
                className="w-full py-3 rounded-xl font-semibold text-white uppercase tracking-wide"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  background: `linear-gradient(135deg, ${STADIUM_COLORS.blue}, #3D6AE8)`,
                }}
              >
                Войти
              </button>
            </Link>
          </motion.div>
        </div>
      );
    }

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

  // Stadium theme authenticated view
  if (isStadiumTheme) {
    return (
      <div
        className="min-h-screen py-8 px-4 relative"
        style={{ backgroundColor: STADIUM_COLORS.bgPrimary }}
      >
        {/* Stadium Background */}
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: `url(${STADIUM_BG})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom,
                rgba(8, 10, 16, 0.9) 0%,
                rgba(8, 10, 16, 0.95) 100%)`
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${STADIUM_COLORS.blue}, #3D6AE8)` }}
              >
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold text-white uppercase tracking-wide"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Статистика
                </h1>
                <p className="text-gray-400 text-sm">Ваши результаты прогнозов</p>
              </div>
            </div>
          </motion.div>

          {isLoading ? (
            <div
              className="rounded-2xl p-12 text-center"
              style={{
                background: STADIUM_COLORS.glass,
                backdropFilter: 'blur(16px)',
                border: `1px solid ${STADIUM_COLORS.glassBorder}`,
              }}
            >
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-400 mt-4">Загрузка статистики...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* AI Predictions Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl p-6"
                style={{
                  background: STADIUM_COLORS.glass,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid ${STADIUM_COLORS.glassBorder}`,
                }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5" style={{ color: STADIUM_COLORS.blue }} />
                    <h2 className="text-lg font-semibold text-white">AI-прогнозы</h2>
                  </div>
                  {user?.isPremium && (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm" style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#FBBF24' }}>
                      <Crown size={14} />
                      <span>PRO</span>
                    </div>
                  )}
                </div>

                {/* Accuracy Circle */}
                <div className="flex justify-center mb-8">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={STADIUM_COLORS.blue}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(accuracyData?.accuracy ?? 0) * 2.51} 251`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold" style={{ color: STADIUM_COLORS.blue }}>
                        {accuracyData?.totalPredictions ? `${accuracyData.accuracy.toFixed(1)}%` : '—'}
                      </span>
                      <span className="text-gray-500 text-sm">Точность</span>
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: STADIUM_COLORS.blue }}>
                      {accuracyData?.totalPredictions ?? 0}
                    </div>
                    <div className="text-gray-500 text-sm">Всего</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: STADIUM_COLORS.green }}>
                      {accuracyData?.correctPredictions ?? 0}
                    </div>
                    <div className="text-gray-500 text-sm">Верно</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: STADIUM_COLORS.red }}>
                      {(accuracyData?.totalPredictions ?? 0) - (accuracyData?.correctPredictions ?? 0)}
                    </div>
                    <div className="text-gray-500 text-sm">Ошибок</div>
                  </div>
                </div>

                {!accuracyData?.totalPredictions && (
                  <p className="text-center text-gray-500 text-sm mt-6">
                    Спросите AI о матчах, чтобы создать статистику
                  </p>
                )}
              </motion.div>

              {/* Performance Tips */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl p-6"
                style={{
                  background: STADIUM_COLORS.glass,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid ${STADIUM_COLORS.glassBorder}`,
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Award className="w-5 h-5" style={{ color: STADIUM_COLORS.blue }} />
                  <h2 className="text-lg font-semibold text-white">Советы</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg" style={{ background: `${STADIUM_COLORS.blue}20` }}>
                      <TrendingUp className="w-4 h-4" style={{ color: STADIUM_COLORS.blue }} />
                    </div>
                    <div>
                      <p className="text-white font-medium">Следуйте Value-ставкам</p>
                      <p className="text-gray-500 text-sm">AI определяет коэффициенты выше реальной вероятности</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg" style={{ background: `${STADIUM_COLORS.blue}20` }}>
                      <Calendar className="w-4 h-4" style={{ color: STADIUM_COLORS.blue }} />
                    </div>
                    <div>
                      <p className="text-white font-medium">Будьте последовательны</p>
                      <p className="text-gray-500 text-sm">Регулярные небольшие ставки лучше редких крупных</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg" style={{ background: `${STADIUM_COLORS.blue}20` }}>
                      <Target className="w-4 h-4" style={{ color: STADIUM_COLORS.blue }} />
                    </div>
                    <div>
                      <p className="text-white font-medium">Придерживайтесь стратегии</p>
                      <p className="text-gray-500 text-sm">Не гонитесь за потерями и не ставьте эмоционально</p>
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

  // Default theme rendering
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
