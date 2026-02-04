'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, Sparkles, Brain } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

// Stadium theme colors
const STADIUM_COLORS = {
  bgPrimary: '#080A10',
  bgSecondary: '#10141E',
  blue: '#4A7AFF',
  blueHover: '#5D8AFF',
  glass: 'rgba(12, 15, 24, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
};

const STADIUM_BG = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80';

export default function LoginPage() {
  const router = useRouter();
  const { selectedTheme, hasSelectedTheme } = useThemeStore();
  const { login, register, isAuthenticated, isLoading: authLoading, error: authError, clearError } = useAuthStore();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });

  const isStadiumTheme = selectedTheme === 'stadium';

  // Wait for hydration
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.push('/');
    }
  }, [hydrated, isAuthenticated, router]);

  // Sync auth error
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    clearError();

    try {
      let success: boolean;
      if (isLogin) {
        success = await login(formData.email, formData.password);
      } else {
        success = await register(formData.email, formData.password, formData.username);
      }

      if (success) {
        router.push('/');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Theme-specific styles
  const themeStyles = {
    cinematic: {
      bg: 'cinematic-bg',
      card: 'card-cinematic',
      accent: 'text-amber-400',
      accentBg: 'bg-amber-500',
      accentBorder: 'border-amber-500/30',
      accentHover: 'hover:border-amber-500',
      gradient: 'from-amber-500 to-amber-700',
      inputBorder: 'border-amber-500/20 focus:border-amber-500',
    },
    neon: {
      bg: 'neon-bg neon-grid',
      card: 'card-neon',
      accent: 'text-emerald-400',
      accentBg: 'bg-emerald-500',
      accentBorder: 'border-emerald-500/30',
      accentHover: 'hover:border-emerald-500',
      gradient: 'from-emerald-400 to-cyan-500',
      inputBorder: 'border-emerald-500/20 focus:border-emerald-500',
    },
    stadium: {
      bg: '',
      card: '',
      accent: 'text-[#4A7AFF]',
      accentBg: 'bg-[#4A7AFF]',
      accentBorder: 'border-[#4A7AFF]/30',
      accentHover: 'hover:border-[#4A7AFF]',
      gradient: 'from-[#4A7AFF] to-[#3D6AE8]',
      inputBorder: 'border-[#4A7AFF]/20 focus:border-[#4A7AFF]',
    },
  };

  const styles = selectedTheme ? themeStyles[selectedTheme] : themeStyles.neon;

  // Stadium Theme - Split Layout
  if (isStadiumTheme) {
    return (
      <div
        className="min-h-screen flex"
        style={{ backgroundColor: STADIUM_COLORS.bgPrimary }}
      >
        {/* Left Side - Stadium Image */}
        <div className="hidden lg:flex lg:w-1/2 relative">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${STADIUM_BG})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Gradient Overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to right,
                  rgba(8, 10, 16, 0.5) 0%,
                  rgba(8, 10, 16, 0.7) 50%,
                  rgba(8, 10, 16, 0.95) 100%)`
              }}
            />
          </div>

          {/* Centered Text */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              {/* AI Icon */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8"
                style={{
                  background: `linear-gradient(135deg, ${STADIUM_COLORS.blue}, #3D6AE8)`,
                  boxShadow: `0 0 40px ${STADIUM_COLORS.blue}50`
                }}
              >
                <Brain className="w-10 h-10 text-white" />
              </div>

              {/* Decorative Title */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className="text-gray-500 text-2xl tracking-widest">———</span>
                <h1
                  className="text-3xl font-bold uppercase tracking-wider"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    color: 'white',
                  }}
                >
                  AI ЦЕНТР АНАЛИЗА
                </h1>
                <span className="text-gray-500 text-2xl tracking-widest">———</span>
              </div>

              <p className="text-gray-400 text-lg max-w-md">
                Профессиональные AI-прогнозы на спорт с точностью до 85%
              </p>

              {/* Features */}
              <div className="mt-12 space-y-4">
                {[
                  'Анализ более 1000 матчей ежедневно',
                  'Мгновенные AI-прогнозы',
                  'Детальная статистика команд',
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-center gap-3 text-gray-300"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: STADIUM_COLORS.blue }}
                    />
                    {feature}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-md"
          >
            {/* Back link */}
            <Link
              href="/select-style"
              className="inline-flex items-center gap-2 text-gray-400 mb-8 transition-colors hover:text-white"
            >
              <ArrowLeft size={18} />
              Сменить стиль
            </Link>

            {/* Form Card - Glassmorphism */}
            <div
              className="rounded-2xl p-8"
              style={{
                background: STADIUM_COLORS.glass,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${STADIUM_COLORS.glassBorder}`,
              }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                {/* Mobile only logo */}
                <div
                  className="lg:hidden w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                  style={{
                    background: `linear-gradient(135deg, ${STADIUM_COLORS.blue}, #3D6AE8)`,
                    boxShadow: `0 0 30px ${STADIUM_COLORS.blue}40`
                  }}
                >
                  <Brain className="w-8 h-8 text-white" />
                </div>

                <h1
                  className="text-2xl font-bold uppercase tracking-wide"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    color: 'white',
                  }}
                >
                  {isLogin ? 'ВХОД' : 'РЕГИСТРАЦИЯ'}
                </h1>
                <p className="text-gray-400 mt-2">
                  {isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
                </p>
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-xl text-sm"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#EF4444',
                  }}
                >
                  {error}
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="relative">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
                      style={{ color: STADIUM_COLORS.blue }}
                      size={20}
                    />
                    <input
                      type="text"
                      placeholder="Имя пользователя"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 rounded-xl text-white placeholder-gray-500 transition-all outline-none"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${STADIUM_COLORS.glassBorder}`,
                      }}
                      onFocus={(e) => e.target.style.borderColor = STADIUM_COLORS.blue}
                      onBlur={(e) => e.target.style.borderColor = STADIUM_COLORS.glassBorder}
                      required={!isLogin}
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
                    style={{ color: STADIUM_COLORS.blue }}
                    size={20}
                  />
                  <input
                    type="email"
                    placeholder="Почта"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 rounded-xl text-white placeholder-gray-500 transition-all outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${STADIUM_COLORS.glassBorder}`,
                    }}
                    onFocus={(e) => e.target.style.borderColor = STADIUM_COLORS.blue}
                    onBlur={(e) => e.target.style.borderColor = STADIUM_COLORS.glassBorder}
                    required
                  />
                </div>

                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
                    style={{ color: STADIUM_COLORS.blue }}
                    size={20}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Пароль"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-12 pr-12 py-4 rounded-xl text-white placeholder-gray-500 transition-all outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${STADIUM_COLORS.glassBorder}`,
                    }}
                    onFocus={(e) => e.target.style.borderColor = STADIUM_COLORS.blue}
                    onBlur={(e) => e.target.style.borderColor = STADIUM_COLORS.glassBorder}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors"
                    style={{ color: showPassword ? STADIUM_COLORS.blue : undefined }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 text-lg font-bold uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all text-white"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    background: `linear-gradient(135deg, ${STADIUM_COLORS.blue}, #3D6AE8)`,
                    boxShadow: `0 4px 20px ${STADIUM_COLORS.blue}40`,
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    isLogin ? 'ВОЙТИ' : 'СОЗДАТЬ АККАУНТ'
                  )}
                </motion.button>
              </form>

              {/* Toggle */}
              <div className="mt-6 text-center text-sm">
                <span className="text-gray-400">
                  {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
                </span>
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                  className="font-semibold transition-colors"
                  style={{ color: STADIUM_COLORS.blue }}
                >
                  {isLogin ? 'Регистрация' : 'Войти'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Default theme rendering
  return (
    <div className={cn('min-h-screen flex items-center justify-center py-12 px-4 relative', styles.bg)}>
      {/* Background effects */}
      {selectedTheme === 'cinematic' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="light-beam absolute top-0 left-[15%] h-[500px] w-[3px] rotate-12 opacity-40" />
          <div className="light-beam absolute top-0 right-[20%] h-[400px] w-[2px] -rotate-12 opacity-30" />
        </div>
      )}

      {selectedTheme === 'neon' && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full blur-3xl opacity-10"
              style={{
                width: 300,
                height: 300,
                background: i % 2 === 0 ? '#00ff88' : '#00d4ff',
                left: `${20 + i * 30}%`,
                top: `${20 + i * 20}%`,
              }}
              animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
              transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back link */}
        <Link
          href="/select-style"
          className={cn('inline-flex items-center gap-2 text-gray-400 mb-6 transition-colors', styles.accent.replace('text-', 'hover:text-'))}
        >
          <ArrowLeft size={18} />
          Change Style
        </Link>

        <div className={cn('rounded-2xl p-8', styles.card)}>
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className={cn('w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center shadow-xl bg-gradient-to-br', styles.gradient)}
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className={cn('text-3xl font-bold text-white', selectedTheme === 'cinematic' && 'uppercase tracking-wide')}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-400 mt-2">
              {isLogin ? 'Sign in to continue' : 'Join the AI prediction arena'}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className={cn('absolute left-4 top-1/2 -translate-y-1/2 opacity-50', styles.accent)} size={20} />
                <input
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={cn('w-full pl-12 pr-4 py-4 rounded-xl text-white placeholder-gray-500 transition-all', styles.inputBorder)}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="relative">
              <Mail className={cn('absolute left-4 top-1/2 -translate-y-1/2 opacity-50', styles.accent)} size={20} />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={cn('w-full pl-12 pr-4 py-4 rounded-xl text-white placeholder-gray-500 transition-all', styles.inputBorder)}
                required
              />
            </div>

            <div className="relative">
              <Lock className={cn('absolute left-4 top-1/2 -translate-y-1/2 opacity-50', styles.accent)} size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={cn('w-full pl-12 pr-12 py-4 rounded-xl text-white placeholder-gray-500 transition-all', styles.inputBorder)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={cn('absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors', styles.accent.replace('text-', 'hover:text-'))}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'w-full py-4 text-lg font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all',
                'bg-gradient-to-r text-white',
                styles.gradient
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </motion.button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-400">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className={cn('font-semibold transition-colors', styles.accent)}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
