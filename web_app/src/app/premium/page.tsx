'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, Sparkles, Zap, Bell, BarChart3, Check, X,
  Bitcoin, Wallet, Copy, CheckCircle, ArrowLeft, Brain
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';

// Stadium theme colors
const STADIUM_COLORS = {
  bgPrimary: '#080A10',
  bgSecondary: '#10141E',
  blue: '#4A7AFF',
  blueHover: '#5D8AFF',
  green: '#3DDC84',
  glass: 'rgba(12, 15, 24, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
};

const STADIUM_BG = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80';

interface PlanOption {
  days: number;
  price: number;
  period: string;
  periodRu: string;
  title: string;
  titleRu: string;
  features: string[];
  featuresRu: string[];
  isPopular?: boolean;
}

const plans: PlanOption[] = [
  {
    days: 7,
    price: 15,
    period: 'week',
    periodRu: 'неделя',
    title: '7 Days',
    titleRu: '7 Дней',
    features: ['Unlimited predictions', 'Full AI analysis'],
    featuresRu: ['Безлимитные прогнозы', 'Полный AI-анализ'],
  },
  {
    days: 30,
    price: 40,
    period: 'month',
    periodRu: 'месяц',
    title: '30 Days',
    titleRu: '30 Дней',
    features: ['Unlimited predictions', 'Full AI analysis', 'Priority support'],
    featuresRu: ['Безлимитные прогнозы', 'Полный AI-анализ', 'Приоритетная поддержка'],
    isPopular: true,
  },
  {
    days: 365,
    price: 100,
    period: 'year',
    periodRu: 'год',
    title: '365 Days',
    titleRu: '365 Дней',
    features: ['Unlimited predictions', 'Full AI analysis', 'Priority support', 'Best value!'],
    featuresRu: ['Безлимитные прогнозы', 'Полный AI-анализ', 'Приоритетная поддержка', 'Лучшая цена!'],
  },
];

const benefits = [
  { icon: Zap, title: 'Unlimited Predictions', titleRu: 'Безлимитные прогнозы', subtitle: 'No daily limits', subtitleRu: 'Без дневных лимитов' },
  { icon: Sparkles, title: 'Advanced AI Analysis', titleRu: 'Продвинутый AI-анализ', subtitle: 'Deeper match insights', subtitleRu: 'Глубокий анализ матчей' },
  { icon: Bell, title: 'Priority Alerts', titleRu: 'Приоритетные уведомления', subtitle: 'First to know about hot matches', subtitleRu: 'Первыми узнавайте о топ-матчах' },
  { icon: BarChart3, title: 'Detailed Stats', titleRu: 'Детальная статистика', subtitle: 'ROI and performance tracking', subtitleRu: 'Отслеживание ROI и результатов' },
];

export default function PremiumPage() {
  const { selectedTheme } = useThemeStore();
  const { user, isAuthenticated } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);
  const [copied, setCopied] = useState(false);

  const isStadiumTheme = selectedTheme === 'stadium';

  // Theme styles
  const themeStyles = {
    cinematic: {
      bg: 'cinematic-bg',
      card: 'card-cinematic',
      accent: 'text-amber-400',
      accentBg: 'bg-amber-500',
      gradient: 'from-amber-500 to-amber-700',
    },
    neon: {
      bg: 'neon-bg neon-grid',
      card: 'card-neon',
      accent: 'text-emerald-400',
      accentBg: 'bg-emerald-500',
      gradient: 'from-emerald-400 to-cyan-500',
    },
    stadium: {
      bg: '',
      card: '',
      accent: 'text-[#4A7AFF]',
      accentBg: 'bg-[#4A7AFF]',
      gradient: 'from-[#4A7AFF] to-[#3D6AE8]',
    },
  };

  const styles = selectedTheme ? themeStyles[selectedTheme] : themeStyles.neon;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPremium = user?.isPremium ?? false;

  // Stadium Theme Version
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
                rgba(8, 10, 16, 0.85) 0%,
                rgba(8, 10, 16, 0.95) 100%)`
            }}
          />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          {/* Back button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 mb-6 transition-colors hover:text-white"
          >
            <ArrowLeft size={18} />
            Назад
          </Link>

          {/* Epic Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-8 text-center mb-8"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 146, 60, 0.15))',
              border: '2px solid rgba(251, 191, 36, 0.3)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Crown className="w-20 h-20 text-amber-400 mx-auto mb-4" />
            </motion.div>
            <h1
              className="text-4xl font-bold text-white mb-2 uppercase tracking-wide"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              PREMIUM
            </h1>
            <p className="text-gray-300 text-lg">
              Безлимитные AI-прогнозы и продвинутый анализ
            </p>
            {isPremium && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-black font-semibold">
                <CheckCircle size={18} />
                Вы Premium!
              </div>
            )}
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-6 mb-8"
            style={{
              background: STADIUM_COLORS.glass,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${STADIUM_COLORS.glassBorder}`,
            }}
          >
            <h2 className="text-lg font-semibold text-white mb-4">Premium преимущества</h2>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: `linear-gradient(135deg, ${STADIUM_COLORS.blue}, #3D6AE8)` }}
                  >
                    <benefit.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{benefit.titleRu}</p>
                    <p className="text-gray-500 text-sm">{benefit.subtitleRu}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Plans */}
          {!isPremium && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h2 className="text-lg font-semibold text-white mb-4">Выберите план</h2>
              <div className="space-y-3">
                {plans.map((plan, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    onClick={() => setSelectedPlan(plan)}
                    className="w-full rounded-2xl p-4 flex items-center justify-between transition-all"
                    style={{
                      background: STADIUM_COLORS.glass,
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: plan.isPopular
                        ? '2px solid rgba(251, 191, 36, 0.5)'
                        : `1px solid ${STADIUM_COLORS.glassBorder}`,
                    }}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{plan.titleRu}</span>
                        {plan.isPopular && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-xs font-medium">
                            ПОПУЛЯРНО
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm mt-1">
                        {plan.featuresRu.join(' | ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold" style={{ color: STADIUM_COLORS.blue }}>${plan.price}</span>
                      <span className="text-gray-500 text-sm">/{plan.periodRu}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Payment Methods */}
          {!isPremium && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl p-6"
              style={{
                background: STADIUM_COLORS.glass,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${STADIUM_COLORS.glassBorder}`,
              }}
            >
              <h2 className="text-lg font-semibold text-white mb-4">Способы оплаты</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                  <Bitcoin className="w-6 h-6" style={{ color: STADIUM_COLORS.blue }} />
                  <div>
                    <p className="text-white font-medium">USDT (TRC20)</p>
                    <p className="text-gray-500 text-sm">Tether в сети Tron</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                  <Wallet className="w-6 h-6" style={{ color: STADIUM_COLORS.blue }} />
                  <div>
                    <p className="text-white font-medium">TON</p>
                    <p className="text-gray-500 text-sm">Telegram Open Network</p>
                  </div>
                </div>
              </div>
              <p className="text-gray-500 text-sm mt-4 text-center">
                Выберите план выше для получения реквизитов
              </p>
            </motion.div>
          )}

          {/* Already Premium */}
          {isPremium && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-6 text-center"
              style={{
                background: STADIUM_COLORS.glass,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${STADIUM_COLORS.glassBorder}`,
              }}
            >
              <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: STADIUM_COLORS.green }} />
              <h2 className="text-xl font-semibold text-white mb-2">Вы уже Premium!</h2>
              <p className="text-gray-400 mb-4">
                Ваша подписка активна до{' '}
                <span className="text-white font-medium">
                  {user?.premiumUntil
                    ? new Date(user.premiumUntil).toLocaleDateString('ru-RU')
                    : 'Навсегда'}
                </span>
              </p>
              <Link href="/ai-chat">
                <button
                  className="px-6 py-3 rounded-xl font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${STADIUM_COLORS.blue}, #3D6AE8)`,
                  }}
                >
                  Начать использовать AI
                </button>
              </Link>
            </motion.div>
          )}
        </div>

        {/* Stadium Theme Payment Modal */}
        <AnimatePresence>
          {selectedPlan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedPlan(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl p-6"
                style={{
                  background: STADIUM_COLORS.glass,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid ${STADIUM_COLORS.glassBorder}`,
                }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">
                    {selectedPlan.titleRu} Premium
                  </h3>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400">Цена:</span>
                    <span className="text-2xl font-bold text-white">${selectedPlan.price}</span>
                  </div>

                  <div className="space-y-4">
                    <p className="font-medium" style={{ color: STADIUM_COLORS.blue }}>Отправьте оплату на:</p>

                    {/* USDT Address */}
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                      <p className="text-gray-400 text-sm mb-2">USDT (TRC20):</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-white text-xs break-all">
                          TYc8XA1kx4v3uSYjpRxbqjtM1gNYeV3rZC
                        </code>
                        <button
                          onClick={() => copyToClipboard('TYc8XA1kx4v3uSYjpRxbqjtM1gNYeV3rZC')}
                          className="p-2 rounded-lg transition-colors"
                          style={{ backgroundColor: STADIUM_COLORS.blue }}
                        >
                          {copied ? <Check size={16} className="text-white" /> : <Copy size={16} className="text-white" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-500 text-sm mt-4">
                    После оплаты отправьте скриншот в Telegram: @AIBettingSupport
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="flex-1 py-3 rounded-xl font-medium text-gray-400 transition-colors"
                    style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    Отмена
                  </button>
                  <a
                    href="https://t.me/AIBettingSupport"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-xl font-semibold text-white text-center"
                    style={{ background: `linear-gradient(135deg, ${STADIUM_COLORS.blue}, #3D6AE8)` }}
                  >
                    Связаться
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Default theme rendering
  return (
    <div className={cn('min-h-screen py-8 px-4', styles.bg)}>
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <Link
          href="/"
          className={cn('inline-flex items-center gap-2 text-gray-400 mb-6 transition-colors', `hover:${styles.accent}`)}
        >
          <ArrowLeft size={18} />
          Back
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-2xl p-8 text-center mb-8 bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30')}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Crown className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Premium Access</h1>
          <p className="text-gray-300">
            Unlimited AI predictions and advanced analysis
          </p>
          {isPremium && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-black font-medium">
              <CheckCircle size={18} />
              You're Premium!
            </div>
          )}
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn('rounded-2xl p-6 mb-8', styles.card)}
        >
          <h2 className="text-lg font-semibold text-white mb-4">Premium Benefits</h2>
          <div className="space-y-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className={cn('p-3 rounded-xl bg-gradient-to-br', styles.gradient)}>
                  <benefit.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">{benefit.title}</p>
                  <p className="text-gray-500 text-sm">{benefit.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Plans */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Choose Your Plan</h2>
            <div className="space-y-3">
              {plans.map((plan, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  onClick={() => setSelectedPlan(plan)}
                  className={cn(
                    'w-full rounded-2xl p-4 flex items-center justify-between transition-all border-2',
                    styles.card,
                    plan.isPopular
                      ? 'border-amber-500'
                      : 'border-transparent hover:border-white/20'
                  )}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{plan.title}</span>
                      {plan.isPopular && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-xs font-medium">
                          POPULAR
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                      {plan.features.join(' | ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={cn('text-2xl font-bold', styles.accent)}>${plan.price}</span>
                    <span className="text-gray-500 text-sm">/{plan.period}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Payment Methods */}
        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={cn('rounded-2xl p-6', styles.card)}
          >
            <h2 className="text-lg font-semibold text-white mb-4">Payment Methods</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                <Bitcoin className={cn('w-6 h-6', styles.accent)} />
                <div>
                  <p className="text-white font-medium">USDT (TRC20)</p>
                  <p className="text-gray-500 text-sm">Tether on Tron network</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                <Wallet className={cn('w-6 h-6', styles.accent)} />
                <div>
                  <p className="text-white font-medium">TON</p>
                  <p className="text-gray-500 text-sm">Telegram Open Network</p>
                </div>
              </div>
            </div>
            <p className="text-gray-500 text-sm mt-4 text-center">
              Select a plan above to see payment details
            </p>
          </motion.div>
        )}

        {/* Already Premium */}
        {isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={cn('rounded-2xl p-6 text-center', styles.card)}
          >
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">You're Already Premium!</h2>
            <p className="text-gray-400 mb-4">
              Your premium subscription is active until{' '}
              <span className="text-white font-medium">
                {user?.premiumUntil
                  ? new Date(user.premiumUntil).toLocaleDateString()
                  : 'Forever'}
              </span>
            </p>
            <Link href="/ai-chat">
              <button className={cn(
                'px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r',
                styles.gradient
              )}>
                Start Using AI
              </button>
            </Link>
          </motion.div>
        )}
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPlan(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={cn('w-full max-w-md rounded-2xl p-6', styles.card)}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {selectedPlan.days} Days Premium
                </h3>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400">Price:</span>
                  <span className="text-2xl font-bold text-white">${selectedPlan.price}</span>
                </div>

                <div className="space-y-4">
                  <p className={cn('font-medium', styles.accent)}>Send payment to:</p>

                  {/* USDT Address */}
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-gray-400 text-sm mb-2">USDT (TRC20):</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-white text-xs break-all">
                        TYc8XA1kx4v3uSYjpRxbqjtM1gNYeV3rZC
                      </code>
                      <button
                        onClick={() => copyToClipboard('TYc8XA1kx4v3uSYjpRxbqjtM1gNYeV3rZC')}
                        className={cn('p-2 rounded-lg transition-colors', styles.accentBg)}
                      >
                        {copied ? <Check size={16} className="text-white" /> : <Copy size={16} className="text-white" />}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-gray-500 text-sm mt-4">
                  After payment, send screenshot to support via Telegram: @AIBettingSupport
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="flex-1 py-3 rounded-xl font-medium text-gray-400 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <a
                  href="https://t.me/AIBettingSupport"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex-1 py-3 rounded-xl font-medium text-white text-center bg-gradient-to-r',
                    styles.gradient
                  )}
                >
                  Contact Support
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
