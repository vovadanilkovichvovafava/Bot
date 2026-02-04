'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, User, Globe, Palette, Bell, Shield, TrendingDown,
  TrendingUp, LogOut, ChevronRight, X, Crown, Zap, Heart, Trash2,
  Check, Loader2, Save, Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useMatchesStore } from '@/store/matchesStore';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type ModalType = 'language' | 'theme' | 'minOdds' | 'maxOdds' | 'risk' | 'favorites' | 'timezone' | null;

interface UserSettings {
  language: string;
  timezone: string;
  minOdds: number;
  maxOdds: number;
  riskLevel: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { selectedTheme } = useThemeStore();
  const { user, isAuthenticated, logout, refreshUser } = useAuthStore();
  const { clearCache } = useMatchesStore();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [settings, setSettings] = useState<UserSettings>({
    language: user?.language ?? 'en',
    timezone: user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    minOdds: user?.minOdds ?? 1.5,
    maxOdds: user?.maxOdds ?? 3.0,
    riskLevel: user?.riskLevel ?? 'medium',
  });
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newFavoriteTeam, setNewFavoriteTeam] = useState('');
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);

  // Theme styles
  const themeStyles = {
    cinematic: {
      bg: 'cinematic-bg',
      card: 'bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-amber-500/20',
      accent: 'text-amber-400',
      accentBg: 'bg-amber-500',
      gradient: 'from-amber-500 to-amber-700',
      listItem: 'hover:bg-amber-500/10',
      input: 'bg-gray-900/50 border-amber-500/20 focus:border-amber-500',
    },
    neon: {
      bg: 'neon-bg',
      card: 'bg-gray-900/80 backdrop-blur-xl border border-emerald-500/20',
      accent: 'text-emerald-400',
      accentBg: 'bg-emerald-500',
      gradient: 'from-emerald-400 to-cyan-500',
      listItem: 'hover:bg-emerald-500/10',
      input: 'bg-gray-900/50 border-emerald-500/20 focus:border-emerald-500',
    },
    stadium: {
      bg: 'stadium-bg',
      card: 'bg-black/60 backdrop-blur-md border border-white/20',
      accent: 'text-indigo-400',
      accentBg: 'bg-indigo-500',
      gradient: 'from-indigo-500 to-purple-600',
      listItem: 'hover:bg-indigo-500/10',
      input: 'bg-black/50 border-indigo-500/20 focus:border-indigo-500',
    },
  };

  const styles = selectedTheme ? themeStyles[selectedTheme] : themeStyles.neon;

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
  ];

  const timezones = [
    { code: 'UTC', name: 'UTC (GMT+0)' },
    { code: 'Europe/London', name: 'London (GMT+0/+1)' },
    { code: 'Europe/Moscow', name: 'Moscow (GMT+3)' },
    { code: 'Europe/Paris', name: 'Paris (GMT+1/+2)' },
    { code: 'America/New_York', name: 'New York (GMT-5/-4)' },
    { code: 'America/Los_Angeles', name: 'Los Angeles (GMT-8/-7)' },
    { code: 'Asia/Dubai', name: 'Dubai (GMT+4)' },
    { code: 'Asia/Tokyo', name: 'Tokyo (GMT+9)' },
  ];

  const oddsOptions = [1.3, 1.5, 1.7, 2.0, 2.5, 3.0, 4.0, 5.0, 7.0, 10.0];

  const riskLevels = [
    {
      value: 'low',
      label: 'LOW',
      subtitle: 'Safer bets | 1-2% stakes',
      description: 'Double chance, under goals, low odds favorites',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/50',
      icon: Shield,
    },
    {
      value: 'medium',
      label: 'MEDIUM',
      subtitle: 'Balanced | 2-5% stakes',
      description: '1X2, over/under, BTTS, moderate odds',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/50',
      icon: TrendingUp,
    },
    {
      value: 'high',
      label: 'HIGH',
      subtitle: 'Aggressive | 5-10% stakes',
      description: 'Accumulators, correct scores, value picks',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/50',
      icon: Zap,
    },
  ];

  // Load favorite teams
  useEffect(() => {
    if (isAuthenticated) {
      loadFavoriteTeams();
    }
  }, [isAuthenticated]);

  const loadFavoriteTeams = async () => {
    setIsLoadingFavorites(true);
    try {
      const teams = await api.getFavoriteTeams();
      setFavoriteTeams(teams);
    } catch {
      // Silent fail
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  const handleAddFavoriteTeam = async () => {
    if (!newFavoriteTeam.trim()) return;
    try {
      await api.addFavoriteTeam(newFavoriteTeam.trim());
      setFavoriteTeams([...favoriteTeams, newFavoriteTeam.trim()]);
      setNewFavoriteTeam('');
    } catch {
      // Silent fail
    }
  };

  const handleRemoveFavoriteTeam = async (team: string) => {
    try {
      await api.removeFavoriteTeam(team);
      setFavoriteTeams(favoriteTeams.filter(t => t !== team));
    } catch {
      // Silent fail
    }
  };

  const handleSaveSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    setIsSaving(true);
    try {
      await api.updateUser({
        language: newSettings.language,
        timezone: newSettings.timezone,
        minOdds: newSettings.minOdds,
        maxOdds: newSettings.maxOdds,
        riskLevel: newSettings.riskLevel,
      });
      setSettings(s => ({ ...s, ...newSettings }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      refreshUser();
    } catch {
      // Still update local state on error
      setSettings(s => ({ ...s, ...newSettings }));
    } finally {
      setIsSaving(false);
    }
  }, [refreshUser]);

  const handleLogout = () => {
    clearCache();
    logout();
    router.push('/');
  };

  const handleClearCache = () => {
    clearCache();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const getRiskInfo = (level: string) => {
    return riskLevels.find(r => r.value === level) || riskLevels[1];
  };

  const currentRisk = getRiskInfo(settings.riskLevel);

  if (!isAuthenticated) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center py-8 px-4', styles.bg)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('max-w-md w-full rounded-2xl p-8 text-center', styles.card)}
        >
          <Settings className={cn('w-16 h-16 mx-auto mb-4', styles.accent)} />
          <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400 mb-6">
            Sign in to customize your experience and betting preferences.
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
    <div className={cn('min-h-screen py-6 px-4', styles.bg)}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br', styles.gradient)}>
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-gray-400 text-sm">Customize your experience</p>
              </div>
            </div>

            {/* Save indicator */}
            <AnimatePresence>
              {(isSaving || saveSuccess) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                    saveSuccess ? 'bg-green-500/20 text-green-400' : styles.card
                  )}
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Check className="w-4 h-4" /> Saved</>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="space-y-4">
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn('rounded-2xl overflow-hidden', styles.card)}
          >
            <div className="p-4 flex items-center gap-4">
              <div className={cn('w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold', styles.accentBg)}>
                {(user?.username ?? user?.email)?.[0].toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user?.username ?? user?.email ?? 'User'}</p>
                <p className="text-gray-500 text-sm truncate">{user?.email ?? ''}</p>
              </div>
              {user?.isPremium && (
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm">
                  <Crown size={14} />
                  <span>PRO</span>
                </div>
              )}
            </div>

            {/* AI Limits */}
            {user && (
              <div className="px-4 pb-4">
                <div className="p-3 rounded-xl bg-white/5">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">Daily AI Predictions</span>
                    <span className={styles.accent}>{user.dailyRequests}/{user.dailyLimit}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full bg-gradient-to-r', styles.gradient)}
                      style={{ width: `${Math.min((user.dailyRequests / user.dailyLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* General Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={cn('rounded-2xl overflow-hidden', styles.card)}
          >
            <div className="p-4 border-b border-white/5">
              <h3 className={cn('font-semibold', styles.accent)}>General</h3>
            </div>

            <button
              onClick={() => setActiveModal('language')}
              className={cn('w-full p-4 flex items-center gap-4 border-b border-white/5', styles.listItem)}
            >
              <div className={cn('p-2 rounded-lg bg-white/5')}>
                <Globe className={cn('w-5 h-5', styles.accent)} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white">Language</p>
                <p className="text-gray-500 text-sm">
                  {languages.find(l => l.code === settings.language)?.flag}{' '}
                  {languages.find(l => l.code === settings.language)?.name ?? 'English'}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>

            <button
              onClick={() => setActiveModal('timezone')}
              className={cn('w-full p-4 flex items-center gap-4 border-b border-white/5', styles.listItem)}
            >
              <div className={cn('p-2 rounded-lg bg-white/5')}>
                <Clock className={cn('w-5 h-5', styles.accent)} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white">Timezone</p>
                <p className="text-gray-500 text-sm">
                  {timezones.find(t => t.code === settings.timezone)?.name ?? settings.timezone}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>

            <button
              onClick={() => router.push('/select-style')}
              className={cn('w-full p-4 flex items-center gap-4', styles.listItem)}
            >
              <div className={cn('p-2 rounded-lg bg-white/5')}>
                <Palette className={cn('w-5 h-5', styles.accent)} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white">Theme</p>
                <p className="text-gray-500 text-sm capitalize">{selectedTheme ?? 'Neon'}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </motion.div>

          {/* AI Betting Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn('rounded-2xl overflow-hidden', styles.card)}
          >
            <div className="p-4 border-b border-white/5">
              <h3 className={cn('font-semibold', styles.accent)}>AI Betting Preferences</h3>
              <p className="text-gray-500 text-sm">Personalize AI recommendations</p>
            </div>

            {/* AI Profile Preview */}
            <div className="mx-4 my-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Zap className={cn('w-4 h-4', styles.accent)} />
                <span className={cn('font-medium', styles.accent)}>Your AI Profile</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Odds Range:</span>
                  <span className="text-white ml-2">{settings.minOdds} - {settings.maxOdds}</span>
                </div>
                <div>
                  <span className="text-gray-500">Risk:</span>
                  <span className={cn('ml-2', currentRisk.color)}>{currentRisk.label}</span>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-2 italic">{currentRisk.description}</p>
            </div>

            <button
              onClick={() => setActiveModal('minOdds')}
              className={cn('w-full p-4 flex items-center gap-4 border-b border-white/5', styles.listItem)}
            >
              <div className="p-2 rounded-lg bg-blue-500/20">
                <TrendingDown className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white">Minimum Odds</p>
                <p className="text-gray-500 text-sm">AI won't recommend below {settings.minOdds}</p>
              </div>
              <span className={cn('font-semibold', styles.accent)}>{settings.minOdds}</span>
            </button>

            <button
              onClick={() => setActiveModal('maxOdds')}
              className={cn('w-full p-4 flex items-center gap-4 border-b border-white/5', styles.listItem)}
            >
              <div className="p-2 rounded-lg bg-purple-500/20">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white">Maximum Odds</p>
                <p className="text-gray-500 text-sm">AI won't recommend above {settings.maxOdds}</p>
              </div>
              <span className={cn('font-semibold', styles.accent)}>{settings.maxOdds}</span>
            </button>

            <button
              onClick={() => setActiveModal('risk')}
              className={cn('w-full p-4 flex items-center gap-4', styles.listItem)}
            >
              <div className={cn('p-2 rounded-lg', currentRisk.bgColor)}>
                <currentRisk.icon className={cn('w-5 h-5', currentRisk.color)} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white">Risk Level</p>
                <p className="text-gray-500 text-sm">{currentRisk.subtitle}</p>
              </div>
              <span className={cn('font-semibold', currentRisk.color)}>{currentRisk.label}</span>
            </button>
          </motion.div>

          {/* Favorite Teams */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={cn('rounded-2xl overflow-hidden', styles.card)}
          >
            <button
              onClick={() => setActiveModal('favorites')}
              className={cn('w-full p-4 flex items-center gap-4', styles.listItem)}
            >
              <div className="p-2 rounded-lg bg-pink-500/20">
                <Heart className="w-5 h-5 text-pink-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white">Favorite Teams</p>
                <p className="text-gray-500 text-sm">
                  {favoriteTeams.length > 0
                    ? `${favoriteTeams.length} teams selected`
                    : 'Get notified about their matches'}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </motion.div>

          {/* Premium */}
          {!user?.isPremium && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Link href="/premium">
                <div className={cn(
                  'rounded-2xl p-4 flex items-center gap-4 border-2 border-amber-500/30',
                  'bg-gradient-to-r from-amber-500/10 to-orange-500/10',
                  'hover:from-amber-500/20 hover:to-orange-500/20 transition-all'
                )}>
                  <div className="p-2 rounded-lg bg-amber-500/30">
                    <Crown className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">Upgrade to Premium</p>
                    <p className="text-amber-400/70 text-sm">Unlimited AI predictions + exclusive features</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-400" />
                </div>
              </Link>
            </motion.div>
          )}

          {/* Data & Cache */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className={cn('rounded-2xl overflow-hidden', styles.card)}
          >
            <div className="p-4 border-b border-white/5">
              <h3 className={cn('font-semibold', styles.accent)}>Data & Storage</h3>
            </div>

            <button
              onClick={handleClearCache}
              className={cn('w-full p-4 flex items-center gap-4', styles.listItem)}
            >
              <div className="p-2 rounded-lg bg-white/5">
                <Trash2 className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white">Clear Cache</p>
                <p className="text-gray-500 text-sm">Free up storage and refresh data</p>
              </div>
            </button>
          </motion.div>

          {/* Logout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={handleLogout}
              className={cn(
                'w-full rounded-2xl p-4 flex items-center gap-4',
                styles.card,
                'hover:bg-red-500/10 transition-colors'
              )}
            >
              <div className="p-2 rounded-lg bg-red-500/20">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-red-400 font-medium">Sign Out</span>
            </button>
          </motion.div>

          {/* Version */}
          <p className="text-center text-gray-600 text-sm py-4">
            Football AI Predictor v1.0.0
          </p>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={cn('w-full max-w-md max-h-[80vh] overflow-hidden rounded-2xl', styles.card)}
            >
              {/* Language Modal */}
              {activeModal === 'language' && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">Select Language</h3>
                    <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-2 max-h-[60vh] overflow-y-auto">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          handleSaveSettings({ language: lang.code });
                          setActiveModal(null);
                        }}
                        className={cn(
                          'w-full p-3 rounded-lg text-left flex items-center gap-3',
                          settings.language === lang.code ? styles.accentBg : 'hover:bg-white/5',
                          settings.language === lang.code ? 'text-white' : 'text-gray-300'
                        )}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span>{lang.name}</span>
                        {settings.language === lang.code && <Check className="ml-auto" size={18} />}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Timezone Modal */}
              {activeModal === 'timezone' && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">Select Timezone</h3>
                    <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-2 max-h-[60vh] overflow-y-auto">
                    {timezones.map(tz => (
                      <button
                        key={tz.code}
                        onClick={() => {
                          handleSaveSettings({ timezone: tz.code });
                          setActiveModal(null);
                        }}
                        className={cn(
                          'w-full p-3 rounded-lg text-left flex items-center gap-3',
                          settings.timezone === tz.code ? styles.accentBg : 'hover:bg-white/5',
                          settings.timezone === tz.code ? 'text-white' : 'text-gray-300'
                        )}
                      >
                        <Clock size={18} className="opacity-50" />
                        <span>{tz.name}</span>
                        {settings.timezone === tz.code && <Check className="ml-auto" size={18} />}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Min/Max Odds Modal */}
              {(activeModal === 'minOdds' || activeModal === 'maxOdds') && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">
                      {activeModal === 'minOdds' ? 'Minimum Odds' : 'Maximum Odds'}
                    </h3>
                    <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-400 text-sm mb-4">
                      {activeModal === 'minOdds'
                        ? 'AI will not recommend bets with odds below this value'
                        : 'AI will not recommend bets with odds above this value'}
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {oddsOptions.map(odds => {
                        const isSelected = activeModal === 'minOdds'
                          ? settings.minOdds === odds
                          : settings.maxOdds === odds;
                        const isDisabled = activeModal === 'minOdds'
                          ? odds >= settings.maxOdds
                          : odds <= settings.minOdds;
                        return (
                          <button
                            key={odds}
                            disabled={isDisabled}
                            onClick={() => {
                              if (activeModal === 'minOdds') {
                                handleSaveSettings({ minOdds: odds });
                              } else {
                                handleSaveSettings({ maxOdds: odds });
                              }
                              setActiveModal(null);
                            }}
                            className={cn(
                              'p-3 rounded-lg text-center font-medium transition-all',
                              isSelected
                                ? cn('text-white', styles.accentBg)
                                : isDisabled
                                  ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
                            )}
                          >
                            {odds}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Risk Level Modal */}
              {activeModal === 'risk' && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">Risk Level</h3>
                    <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-gray-400 text-sm mb-4">
                      Choose how aggressive AI recommendations should be:
                    </p>
                    {riskLevels.map(risk => (
                      <button
                        key={risk.value}
                        onClick={() => {
                          handleSaveSettings({ riskLevel: risk.value });
                          setActiveModal(null);
                        }}
                        className={cn(
                          'w-full p-4 rounded-xl border-2 flex items-start gap-3 transition-all',
                          settings.riskLevel === risk.value
                            ? cn(risk.bgColor, risk.borderColor)
                            : 'border-white/10 hover:border-white/20'
                        )}
                      >
                        <div className={cn('p-2 rounded-lg', risk.bgColor)}>
                          <risk.icon className={cn('w-5 h-5', risk.color)} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className={cn('font-bold', risk.color)}>{risk.label}</span>
                            <span className="text-gray-500 text-sm">{risk.subtitle.split('|')[1]?.trim()}</span>
                          </div>
                          <p className="text-gray-500 text-xs mt-1">{risk.description}</p>
                        </div>
                        {settings.riskLevel === risk.value && (
                          <Check className={cn('w-5 h-5', risk.color)} />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Favorites Modal */}
              {activeModal === 'favorites' && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">Favorite Teams</h3>
                    <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4">
                    {/* Add new team */}
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newFavoriteTeam}
                        onChange={(e) => setNewFavoriteTeam(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddFavoriteTeam()}
                        placeholder="Enter team name..."
                        className={cn(
                          'flex-1 px-4 py-2 rounded-lg text-white placeholder-gray-500 border',
                          styles.input
                        )}
                      />
                      <button
                        onClick={handleAddFavoriteTeam}
                        disabled={!newFavoriteTeam.trim()}
                        className={cn(
                          'px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50',
                          styles.accentBg, 'text-white'
                        )}
                      >
                        Add
                      </button>
                    </div>

                    {/* Teams list */}
                    {isLoadingFavorites ? (
                      <div className="text-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                      </div>
                    ) : favoriteTeams.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">
                        No favorite teams yet. Add one above!
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                        {favoriteTeams.map(team => (
                          <div
                            key={team}
                            className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <Heart className="w-4 h-4 text-pink-400" fill="currentColor" />
                              <span className="text-white">{team}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveFavoriteTeam(team)}
                              className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
