'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, User, Globe, Bell, TrendingDown,
  TrendingUp, LogOut, ChevronRight, X, Crown, Zap, Heart, Trash2,
  Check, Loader2, Clock, Brain, Shield
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useMatchesStore } from '@/store/matchesStore';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type ModalType = 'language' | 'minOdds' | 'maxOdds' | 'risk' | 'favorites' | 'timezone' | null;

interface UserSettings {
  language: string;
  timezone: string;
  minOdds: number;
  maxOdds: number;
  riskLevel: string;
}

export default function SettingsPage() {
  const router = useRouter();
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

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  ];

  const timezones = [
    { code: 'UTC', name: 'UTC (GMT+0)' },
    { code: 'Europe/London', name: 'London (GMT+0/+1)' },
    { code: 'Europe/Moscow', name: 'Moscow (GMT+3)' },
    { code: 'Europe/Paris', name: 'Paris (GMT+1/+2)' },
    { code: 'America/New_York', name: 'New York (GMT-5/-4)' },
  ];

  const oddsOptions = [1.3, 1.5, 1.7, 2.0, 2.5, 3.0, 4.0, 5.0];

  const riskLevels = [
    { value: 'low', label: 'Low', description: 'Safer bets, lower returns', color: 'text-emerald-500', bg: 'bg-emerald-100', icon: Shield },
    { value: 'medium', label: 'Medium', description: 'Balanced risk/reward', color: 'text-amber-500', bg: 'bg-amber-100', icon: TrendingUp },
    { value: 'high', label: 'High', description: 'Higher risk, higher reward', color: 'text-red-500', bg: 'bg-red-100', icon: Zap },
  ];

  useEffect(() => {
    if (isAuthenticated) loadFavoriteTeams();
  }, [isAuthenticated]);

  const loadFavoriteTeams = async () => {
    setIsLoadingFavorites(true);
    try {
      const teams = await api.getFavoriteTeams();
      setFavoriteTeams(teams);
    } catch { /* silent */ } finally {
      setIsLoadingFavorites(false);
    }
  };

  const handleAddFavoriteTeam = async () => {
    if (!newFavoriteTeam.trim()) return;
    try {
      await api.addFavoriteTeam(newFavoriteTeam.trim());
      setFavoriteTeams([...favoriteTeams, newFavoriteTeam.trim()]);
      setNewFavoriteTeam('');
    } catch { /* silent */ }
  };

  const handleRemoveFavoriteTeam = async (team: string) => {
    try {
      await api.removeFavoriteTeam(team);
      setFavoriteTeams(favoriteTeams.filter(t => t !== team));
    } catch { /* silent */ }
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
      setSettings(s => ({ ...s, ...newSettings }));
    } finally {
      setIsSaving(false);
    }
  }, [refreshUser]);

  const handleLogout = () => {
    clearCache();
    logout();
    router.push('/login');
  };

  const handleClearCache = () => {
    clearCache();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const currentRisk = riskLevels.find(r => r.value === settings.riskLevel) || riskLevels[1];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-sm">
          <Settings className="w-16 h-16 mx-auto mb-4 text-[#3B5998]" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-500 mb-6">Sign in to customize your experience</p>
          <Link href="/login">
            <button className="w-full py-3 rounded-xl font-medium text-white bg-[#3B5998]">
              Sign In
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3B5998] via-[#4A66A0] to-[#6B5B95] px-4 pt-12 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-7 h-7 text-white" />
              <h1 className="text-2xl font-bold text-white">Settings</h1>
            </div>
            <AnimatePresence>
              {saveSuccess && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-emerald-300 text-sm"
                >
                  <Check size={16} /> Saved
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-3 pb-8">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#3B5998] to-[#6B5B95] flex items-center justify-center text-white text-xl font-bold">
                {(user?.username ?? user?.email)?.[0].toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{user?.username ?? user?.email ?? 'User'}</p>
                <p className="text-gray-500 text-sm truncate">{user?.email ?? ''}</p>
              </div>
              {user?.isPremium && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-600 text-sm font-medium">
                  <Crown size={14} /> PRO
                </span>
              )}
            </div>

            {/* AI Usage */}
            {user && (
              <div className="mt-4 p-4 rounded-xl bg-gray-50">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500">Daily AI Predictions</span>
                  <span className="text-[#3B5998] font-medium">{user.dailyRequests}/{user.dailyLimit}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#3B5998] to-[#6B5B95]"
                    style={{ width: `${Math.min((user.dailyRequests / user.dailyLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Premium CTA */}
          {!user?.isPremium && (
            <Link href="/pro-tools">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">Upgrade to Premium</p>
                  <p className="text-white/80 text-sm">Unlimited predictions</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/70" />
              </div>
            </Link>
          )}

          {/* General Settings */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">General</h3>
            </div>

            <button
              onClick={() => setActiveModal('language')}
              className="w-full p-4 flex items-center gap-4 border-b border-gray-50 active:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-xl bg-[#3B5998]/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-[#3B5998]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-gray-900">Language</p>
                <p className="text-gray-400 text-sm">
                  {languages.find(l => l.code === settings.language)?.flag}{' '}
                  {languages.find(l => l.code === settings.language)?.name ?? 'English'}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>

            <button
              onClick={() => setActiveModal('timezone')}
              className="w-full p-4 flex items-center gap-4 active:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-gray-900">Timezone</p>
                <p className="text-gray-400 text-sm">
                  {timezones.find(t => t.code === settings.timezone)?.name ?? settings.timezone}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </div>

          {/* AI Preferences */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">AI Preferences</h3>
              <p className="text-gray-400 text-sm">Customize predictions</p>
            </div>

            {/* AI Profile */}
            <div className="mx-4 my-4 p-4 rounded-xl bg-[#3B5998]/5 border border-[#3B5998]/10">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-[#3B5998]" />
                <span className="text-[#3B5998] font-medium text-sm">Your AI Profile</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-500">Odds: <strong className="text-gray-900">{settings.minOdds} - {settings.maxOdds}</strong></span>
                <span className="text-gray-500">Risk: <strong className={currentRisk.color}>{currentRisk.label}</strong></span>
              </div>
            </div>

            <button
              onClick={() => setActiveModal('minOdds')}
              className="w-full p-4 flex items-center gap-4 border-b border-gray-50 active:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-gray-900">Min Odds</p>
                <p className="text-gray-400 text-sm">Won't recommend below</p>
              </div>
              <span className="text-[#3B5998] font-semibold">{settings.minOdds}</span>
            </button>

            <button
              onClick={() => setActiveModal('maxOdds')}
              className="w-full p-4 flex items-center gap-4 border-b border-gray-50 active:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-gray-900">Max Odds</p>
                <p className="text-gray-400 text-sm">Won't recommend above</p>
              </div>
              <span className="text-[#3B5998] font-semibold">{settings.maxOdds}</span>
            </button>

            <button
              onClick={() => setActiveModal('risk')}
              className="w-full p-4 flex items-center gap-4 active:bg-gray-50"
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', currentRisk.bg)}>
                <currentRisk.icon className={cn('w-5 h-5', currentRisk.color)} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-gray-900">Risk Level</p>
                <p className="text-gray-400 text-sm">{currentRisk.description}</p>
              </div>
              <span className={cn('font-semibold', currentRisk.color)}>{currentRisk.label}</span>
            </button>
          </div>

          {/* Favorites */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setActiveModal('favorites')}
              className="w-full p-4 flex items-center gap-4 active:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-pink-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-gray-900">Favorite Teams</p>
                <p className="text-gray-400 text-sm">
                  {favoriteTeams.length > 0 ? `${favoriteTeams.length} teams` : 'Add your favorites'}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </div>

          {/* Data */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={handleClearCache}
              className="w-full p-4 flex items-center gap-4 active:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-gray-900">Clear Cache</p>
                <p className="text-gray-400 text-sm">Free up storage</p>
              </div>
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm active:bg-red-50"
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-red-500 font-medium">Sign Out</span>
          </button>

          <p className="text-center text-gray-400 text-sm py-4">
            Football AI Predictor v1.0
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
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[80vh] overflow-hidden bg-white rounded-2xl"
            >
              {/* Language */}
              {activeModal === 'language' && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Language</h3>
                    <button onClick={() => setActiveModal(null)} className="text-gray-400"><X size={20} /></button>
                  </div>
                  <div className="p-2">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { handleSaveSettings({ language: lang.code }); setActiveModal(null); }}
                        className={cn(
                          'w-full p-3 rounded-lg text-left flex items-center gap-3',
                          settings.language === lang.code ? 'bg-[#3B5998] text-white' : 'text-gray-700 hover:bg-gray-50'
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

              {/* Timezone */}
              {activeModal === 'timezone' && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Timezone</h3>
                    <button onClick={() => setActiveModal(null)} className="text-gray-400"><X size={20} /></button>
                  </div>
                  <div className="p-2">
                    {timezones.map(tz => (
                      <button
                        key={tz.code}
                        onClick={() => { handleSaveSettings({ timezone: tz.code }); setActiveModal(null); }}
                        className={cn(
                          'w-full p-3 rounded-lg text-left flex items-center gap-3',
                          settings.timezone === tz.code ? 'bg-[#3B5998] text-white' : 'text-gray-700 hover:bg-gray-50'
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

              {/* Odds */}
              {(activeModal === 'minOdds' || activeModal === 'maxOdds') && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {activeModal === 'minOdds' ? 'Minimum Odds' : 'Maximum Odds'}
                    </h3>
                    <button onClick={() => setActiveModal(null)} className="text-gray-400"><X size={20} /></button>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-2">
                      {oddsOptions.map(odds => {
                        const isSelected = activeModal === 'minOdds' ? settings.minOdds === odds : settings.maxOdds === odds;
                        const isDisabled = activeModal === 'minOdds' ? odds >= settings.maxOdds : odds <= settings.minOdds;
                        return (
                          <button
                            key={odds}
                            disabled={isDisabled}
                            onClick={() => {
                              handleSaveSettings(activeModal === 'minOdds' ? { minOdds: odds } : { maxOdds: odds });
                              setActiveModal(null);
                            }}
                            className={cn(
                              'p-3 rounded-lg font-medium transition-all',
                              isSelected ? 'bg-[#3B5998] text-white' : isDisabled ? 'bg-gray-100 text-gray-300' : 'bg-gray-50 text-gray-700'
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

              {/* Risk */}
              {activeModal === 'risk' && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Risk Level</h3>
                    <button onClick={() => setActiveModal(null)} className="text-gray-400"><X size={20} /></button>
                  </div>
                  <div className="p-4 space-y-3">
                    {riskLevels.map(risk => (
                      <button
                        key={risk.value}
                        onClick={() => { handleSaveSettings({ riskLevel: risk.value }); setActiveModal(null); }}
                        className={cn(
                          'w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all',
                          settings.riskLevel === risk.value ? 'border-[#3B5998] bg-[#3B5998]/5' : 'border-gray-100'
                        )}
                      >
                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', risk.bg)}>
                          <risk.icon className={cn('w-5 h-5', risk.color)} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={cn('font-semibold', risk.color)}>{risk.label}</p>
                          <p className="text-gray-500 text-sm">{risk.description}</p>
                        </div>
                        {settings.riskLevel === risk.value && <Check className="text-[#3B5998]" size={20} />}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Favorites */}
              {activeModal === 'favorites' && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Favorite Teams</h3>
                    <button onClick={() => setActiveModal(null)} className="text-gray-400"><X size={20} /></button>
                  </div>
                  <div className="p-4">
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newFavoriteTeam}
                        onChange={(e) => setNewFavoriteTeam(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddFavoriteTeam()}
                        placeholder="Team name..."
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400"
                      />
                      <button
                        onClick={handleAddFavoriteTeam}
                        disabled={!newFavoriteTeam.trim()}
                        className="px-4 py-2 rounded-lg bg-[#3B5998] text-white disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                    {isLoadingFavorites ? (
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    ) : favoriteTeams.length === 0 ? (
                      <p className="text-center text-gray-400 py-4">No favorite teams yet</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {favoriteTeams.map(team => (
                          <div key={team} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                            <div className="flex items-center gap-2">
                              <Heart className="w-4 h-4 text-pink-500" fill="currentColor" />
                              <span className="text-gray-900">{team}</span>
                            </div>
                            <button onClick={() => handleRemoveFavoriteTeam(team)} className="text-gray-400 hover:text-red-500">
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
