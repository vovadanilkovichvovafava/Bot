'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, User, Globe, Palette, Bell, Shield, TrendingDown,
  TrendingUp, LogOut, ChevronRight, X, Crown, Zap, RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type ModalType = 'language' | 'theme' | 'minOdds' | 'maxOdds' | 'risk' | null;

interface UserSettings {
  language: string;
  minOdds: number;
  maxOdds: number;
  riskLevel: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { selectedTheme, setTheme } = useThemeStore();
  const { user, isAuthenticated, isDemoMode, logout } = useAuthStore();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [settings, setSettings] = useState<UserSettings>({
    language: user?.language ?? 'en',
    minOdds: user?.minOdds ?? 1.5,
    maxOdds: user?.maxOdds ?? 3.0,
    riskLevel: user?.riskLevel ?? 'medium',
  });

  // Theme styles
  const themeStyles = {
    cinematic: {
      bg: 'cinematic-bg',
      card: 'card-cinematic',
      accent: 'text-amber-400',
      accentBg: 'bg-amber-500',
      gradient: 'from-amber-500 to-amber-700',
      listItem: 'hover:bg-amber-500/10',
    },
    neon: {
      bg: 'neon-bg neon-grid',
      card: 'card-neon',
      accent: 'text-emerald-400',
      accentBg: 'bg-emerald-500',
      gradient: 'from-emerald-400 to-cyan-500',
      listItem: 'hover:bg-emerald-500/10',
    },
    stadium: {
      bg: 'stadium-bg',
      card: 'card-stadium',
      accent: 'text-indigo-400',
      accentBg: 'bg-indigo-500',
      gradient: 'from-indigo-500 to-purple-600',
      listItem: 'hover:bg-indigo-500/10',
    },
  };

  const styles = selectedTheme ? themeStyles[selectedTheme] : themeStyles.neon;

  const languages = [
    { code: 'en', name: 'English', flag: 'GB' },
    { code: 'es', name: 'Espanol', flag: 'ES' },
    { code: 'de', name: 'Deutsch', flag: 'DE' },
    { code: 'fr', name: 'Francais', flag: 'FR' },
    { code: 'it', name: 'Italiano', flag: 'IT' },
  ];

  const oddsOptions = [1.3, 1.5, 1.7, 2.0, 2.5, 3.0, 4.0, 5.0];

  const riskLevels = [
    {
      value: 'low',
      label: 'LOW',
      subtitle: 'Safer bets | 1-2% stakes',
      description: 'Double chance, under goals, low odds favorites',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      icon: Shield,
    },
    {
      value: 'medium',
      label: 'MEDIUM',
      subtitle: 'Balanced | 2-5% stakes',
      description: '1X2, over/under, BTTS, moderate odds',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      icon: TrendingUp,
    },
    {
      value: 'high',
      label: 'HIGH',
      subtitle: 'Aggressive | 5-10% stakes',
      description: 'Accumulators, correct scores, value picks',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      icon: Zap,
    },
  ];

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const getRiskInfo = (level: string) => {
    return riskLevels.find(r => r.value === level) || riskLevels[1];
  };

  const currentRisk = getRiskInfo(settings.riskLevel);

  if (!isAuthenticated && !isDemoMode) {
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
    <div className={cn('min-h-screen py-8 px-4', styles.bg)}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br', styles.gradient)}>
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-gray-400 text-sm">Customize your experience</p>
            </div>
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
              <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold', styles.accentBg)}>
                {(user?.username ?? user?.email)?.[0].toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{user?.username ?? user?.email}</p>
                <p className="text-gray-500 text-sm">{user?.email}</p>
              </div>
              {user?.isPremium && (
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm">
                  <Crown size={14} />
                  <span>PRO</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* General Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn('rounded-2xl overflow-hidden', styles.card)}
          >
            <button
              onClick={() => setActiveModal('language')}
              className={cn('w-full p-4 flex items-center gap-4 border-b border-white/5', styles.listItem)}
            >
              <div className={cn('p-2 rounded-lg', `${styles.accentBg}/20`)}>
                <Globe className={cn('w-5 h-5', styles.accent)} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white">Language</p>
                <p className="text-gray-500 text-sm">
                  {languages.find(l => l.code === settings.language)?.name ?? 'English'}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>

            <button
              onClick={() => router.push('/select-style')}
              className={cn('w-full p-4 flex items-center gap-4', styles.listItem)}
            >
              <div className={cn('p-2 rounded-lg', `${styles.accentBg}/20`)}>
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
            transition={{ delay: 0.3 }}
            className={cn('rounded-2xl overflow-hidden', styles.card)}
          >
            <div className="p-4 border-b border-white/5">
              <h3 className={cn('font-semibold', styles.accent)}>AI Betting Preferences</h3>
              <p className="text-gray-500 text-sm">These settings personalize AI recommendations</p>
            </div>

            {/* AI Profile Preview */}
            <div className={cn('mx-4 my-4 p-4 rounded-xl border', `${styles.accentBg}/10 border-${styles.accent.replace('text-', '')}/20`)}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className={cn('w-4 h-4', styles.accent)} />
                <span className={cn('font-medium', styles.accent)}>Your AI Profile</span>
              </div>
              <p className="text-gray-300 text-sm mb-1">
                Odds range: {settings.minOdds} - {settings.maxOdds}
              </p>
              <p className="text-gray-300 text-sm mb-2">
                Risk: {settings.riskLevel.toUpperCase()} ({currentRisk.subtitle.split('|')[1]?.trim()})
              </p>
              <p className="text-gray-500 text-xs italic">{currentRisk.description}</p>
            </div>

            <button
              onClick={() => setActiveModal('minOdds')}
              className={cn('w-full p-4 flex items-center gap-4 border-b border-white/5', styles.listItem)}
            >
              <div className={cn('p-2 rounded-lg', `${styles.accentBg}/20`)}>
                <TrendingDown className={cn('w-5 h-5', styles.accent)} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white">Minimum Odds</p>
                <p className="text-gray-500 text-sm">AI won't recommend below {settings.minOdds}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>

            <button
              onClick={() => setActiveModal('maxOdds')}
              className={cn('w-full p-4 flex items-center gap-4 border-b border-white/5', styles.listItem)}
            >
              <div className={cn('p-2 rounded-lg', `${styles.accentBg}/20`)}>
                <TrendingUp className={cn('w-5 h-5', styles.accent)} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white">Maximum Odds</p>
                <p className="text-gray-500 text-sm">AI won't recommend above {settings.maxOdds}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
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
                <p className="text-gray-500 text-sm">{currentRisk.label} - {currentRisk.subtitle.split('|')[1]?.trim()}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </motion.div>

          {/* Premium */}
          {!user?.isPremium && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Link href="/premium">
                <div className={cn('rounded-2xl p-4 flex items-center gap-4', styles.card, styles.listItem)}>
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Crown className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white">Upgrade to Premium</p>
                    <p className="text-gray-500 text-sm">Unlimited predictions</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>
            </motion.div>
          )}

          {/* Logout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={handleLogout}
              className={cn('w-full rounded-2xl p-4 flex items-center gap-4', styles.card, 'hover:bg-red-500/10')}
            >
              <div className="p-2 rounded-lg bg-red-500/20">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-red-400">Sign Out</span>
            </button>
          </motion.div>

          {/* Version */}
          <p className="text-center text-gray-600 text-sm py-4">
            Version 1.0.0
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
            className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={cn('w-full max-w-md rounded-2xl overflow-hidden', styles.card)}
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
                  <div className="p-2">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSettings({ ...settings, language: lang.code });
                          setActiveModal(null);
                        }}
                        className={cn(
                          'w-full p-3 rounded-lg text-left flex items-center gap-3',
                          settings.language === lang.code ? styles.accentBg : 'hover:bg-white/5',
                          settings.language === lang.code ? 'text-white' : 'text-gray-300'
                        )}
                      >
                        <span className="text-lg">{lang.flag === 'GB' ? 'GB' : lang.flag}</span>
                        <span>{lang.name}</span>
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
                  <div className="p-2 grid grid-cols-4 gap-2">
                    {oddsOptions.map(odds => {
                      const isSelected = activeModal === 'minOdds'
                        ? settings.minOdds === odds
                        : settings.maxOdds === odds;
                      return (
                        <button
                          key={odds}
                          onClick={() => {
                            if (activeModal === 'minOdds') {
                              setSettings({ ...settings, minOdds: odds });
                            } else {
                              setSettings({ ...settings, maxOdds: odds });
                            }
                            setActiveModal(null);
                          }}
                          className={cn(
                            'p-3 rounded-lg text-center font-medium',
                            isSelected ? styles.accentBg : 'bg-white/5 hover:bg-white/10',
                            isSelected ? 'text-white' : 'text-gray-300'
                          )}
                        >
                          {odds}
                        </button>
                      );
                    })}
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
                          setSettings({ ...settings, riskLevel: risk.value });
                          setActiveModal(null);
                        }}
                        className={cn(
                          'w-full p-4 rounded-xl border flex items-start gap-3',
                          settings.riskLevel === risk.value
                            ? `${risk.bgColor} border-${risk.color.replace('text-', '')}`
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
                      </button>
                    ))}
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
