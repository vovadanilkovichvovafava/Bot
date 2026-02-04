'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const { selectedTheme, hasSelectedTheme } = useThemeStore();
  const { login, register, loginDemo, isAuthenticated, isLoading: authLoading, error: authError, clearError } = useAuthStore();

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

  const handleDemoMode = async () => {
    setIsLoading(true);
    setError(null);
    await loginDemo();
    router.push('/');
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
      bg: 'stadium-bg',
      card: 'card-stadium',
      accent: 'text-indigo-400',
      accentBg: 'bg-indigo-500',
      accentBorder: 'border-indigo-500/30',
      accentHover: 'hover:border-indigo-500',
      gradient: 'from-indigo-500 to-purple-600',
      inputBorder: 'border-indigo-500/20 focus:border-indigo-500',
    },
  };

  const styles = selectedTheme ? themeStyles[selectedTheme] : themeStyles.neon;

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

      {selectedTheme === 'stadium' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="stadium-light absolute top-0 left-[20%] w-32 h-[400px] rotate-12" />
          <div className="stadium-light absolute top-0 right-[20%] w-32 h-[400px] -rotate-12" />
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

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className={cn('flex-1 h-px', styles.accentBorder.replace('border-', 'bg-'))} />
            <span className="text-gray-500 text-sm uppercase tracking-wider">or</span>
            <div className={cn('flex-1 h-px', styles.accentBorder.replace('border-', 'bg-'))} />
          </div>

          {/* Demo Mode */}
          <motion.button
            onClick={handleDemoMode}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'w-full py-4 rounded-xl text-center font-semibold transition-all border flex items-center justify-center gap-2',
              styles.accent,
              styles.accentBorder,
              'hover:bg-white/5'
            )}
          >
            <Zap size={18} />
            Try Demo Mode
          </motion.button>
          <p className="text-center text-gray-500 text-xs mt-3">
            Full access for 30 minutes - no registration needed
          </p>
        </div>
      </motion.div>
    </div>
  );
}
