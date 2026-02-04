'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Calendar, Zap, MessageSquare, BarChart3, Settings,
  Menu, X, Sparkles, Tv, Cpu, Brain, Bell, Globe, Download, Wifi, WifiOff
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useThemeStore, ThemeStyle } from '@/store/themeStore';
import { cn } from '@/lib/utils';
import { usePWA } from './PWAProvider';

// Navigation items with Russian labels for stadium theme
const navItems = [
  { href: '/', label: 'Home', labelRu: 'Главная', icon: Home },
  { href: '/matches', label: 'Matches', labelRu: 'Матчи', icon: Calendar },
  { href: '/live', label: 'Live', labelRu: 'Live', icon: Zap, isLive: true },
  { href: '/ai-chat', label: 'AI Chat', labelRu: 'AI Чат', icon: MessageSquare },
  { href: '/stats', label: 'Stats', labelRu: 'Статистика', icon: BarChart3 },
];

const themeIcons = {
  cinematic: Tv,
  neon: Cpu,
  stadium: Brain,
};

// Colors for AI Analysis Center (Stadium) theme
const STADIUM_COLORS = {
  bg: 'rgba(8, 10, 16, 0.95)',
  border: 'rgba(255, 255, 255, 0.08)',
  blue: '#4A7AFF',
  navActive: '#FFFFFF',
  navInactive: '#A0A8BE',
  textPrimary: '#FFFFFF',
};

export function ThemedNavbar() {
  const pathname = usePathname();
  const { selectedTheme, setTheme } = useThemeStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);
  const { isInstallable, isOnline, install } = usePWA();

  const ThemeIcon = selectedTheme ? themeIcons[selectedTheme] : Sparkles;
  const isStadiumTheme = selectedTheme === 'stadium';

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setShowThemeSwitcher(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const handleInstall = async () => {
    await install();
  };

  return (
    <>
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b safe-area-top',
        selectedTheme === 'cinematic' && 'bg-[#0a0a12]/90 border-amber-500/20',
        selectedTheme === 'neon' && 'bg-[#0a0e14]/90 border-emerald-500/20',
        selectedTheme === 'stadium' && 'border-white/[0.08]',
      )}
      style={isStadiumTheme ? {
        background: STADIUM_COLORS.bg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      } : undefined}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 sm:h-[60px]">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
              {isStadiumTheme ? (
                <>
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <span
                    className="font-montserrat font-bold text-sm sm:text-base tracking-wide truncate"
                    style={{ color: STADIUM_COLORS.textPrimary }}
                  >
                    AI ANALYSIS
                  </span>
                </>
              ) : (
                <>
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    className={cn(
                      'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0',
                      selectedTheme === 'cinematic' && 'bg-gradient-to-br from-amber-500 to-amber-700 text-black',
                      selectedTheme === 'neon' && 'bg-gradient-to-br from-emerald-400 to-cyan-500 text-black',
                    )}
                  >
                    AI
                  </motion.div>
                  <span className={cn(
                    'font-bold text-lg sm:text-xl truncate',
                    selectedTheme === 'cinematic' && 'golden-gradient',
                    selectedTheme === 'neon' && 'neon-gradient',
                  )}>
                    {selectedTheme === 'cinematic' ? 'AI ANALYSIS' : 'AI BET PRO'}
                  </span>
                </>
              )}
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const label = isStadiumTheme ? item.labelRu : item.label;

                return (
                  <div key={item.href} className="flex items-center">
                    <Link href={item.href}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          'relative px-4 py-2 flex items-center gap-2 transition-all',
                          isStadiumTheme
                            ? 'rounded-none'
                            : 'rounded-lg',
                          isActive
                            ? isStadiumTheme
                              ? ''
                              : selectedTheme === 'cinematic'
                              ? 'bg-amber-500/20 text-amber-400'
                              : selectedTheme === 'neon'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : ''
                            : !isStadiumTheme && 'text-gray-400 hover:text-white hover:bg-white/5'
                        )}
                        style={isStadiumTheme ? {
                          color: isActive ? STADIUM_COLORS.navActive : STADIUM_COLORS.navInactive,
                        } : undefined}
                      >
                        {!isStadiumTheme && <Icon className="w-4 h-4" />}
                        <span
                          className={cn(
                            'font-medium',
                            isStadiumTheme
                              ? 'font-inter text-[13px] uppercase tracking-[1.5px]'
                              : 'text-sm'
                          )}
                        >
                          {label}
                        </span>
                        {item.isLive && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                          </span>
                        )}
                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="navbar-indicator"
                            className={cn(
                              'absolute bottom-0 left-2 right-2 rounded-full',
                              isStadiumTheme ? 'h-[2px]' : 'h-0.5',
                              selectedTheme === 'cinematic' && 'bg-amber-500',
                              selectedTheme === 'neon' && 'bg-emerald-400',
                              selectedTheme === 'stadium' && '',
                            )}
                            style={isStadiumTheme ? { background: STADIUM_COLORS.blue } : undefined}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                      </motion.div>
                    </Link>
                    {/* Dot separator for stadium theme */}
                    {isStadiumTheme && index < navItems.length - 1 && (
                      <span
                        className="text-[10px] mx-1"
                        style={{ color: STADIUM_COLORS.navInactive }}
                      >
                        ·
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Online status indicator */}
              {!isOnline && (
                <div className="p-2 text-orange-400" title="Offline">
                  <WifiOff className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              )}

              {/* Install PWA button */}
              {isInstallable && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleInstall}
                  className={cn(
                    'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isStadiumTheme
                      ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                      : selectedTheme === 'cinematic'
                      ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  )}
                >
                  <Download className="w-4 h-4" />
                  Install
                </motion.button>
              )}

              {/* Language Switcher (Stadium theme only) */}
              {isStadiumTheme && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="hidden sm:flex p-2 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: STADIUM_COLORS.navInactive }}
                >
                  <Globe className="w-5 h-5" />
                </motion.button>
              )}

              {/* Notifications (Stadium theme only) */}
              {isStadiumTheme && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="hidden sm:flex p-2 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: STADIUM_COLORS.navInactive }}
                >
                  <Bell className="w-5 h-5" />
                </motion.button>
              )}

              {/* Theme Switcher */}
              <div className="relative hidden sm:block">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowThemeSwitcher(!showThemeSwitcher)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    selectedTheme === 'cinematic' && 'hover:bg-amber-500/20 text-amber-400',
                    selectedTheme === 'neon' && 'hover:bg-emerald-500/20 text-emerald-400',
                    selectedTheme === 'stadium' && 'hover:bg-white/5',
                  )}
                  style={isStadiumTheme ? { color: STADIUM_COLORS.navInactive } : undefined}
                >
                  <ThemeIcon className="w-5 h-5" />
                </motion.button>

                {/* Theme dropdown */}
                <AnimatePresence>
                  {showThemeSwitcher && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={cn(
                        'absolute right-0 mt-2 w-48 rounded-xl p-2 shadow-xl border',
                        selectedTheme === 'cinematic' && 'bg-[#1a1a2e] border-amber-500/30',
                        selectedTheme === 'neon' && 'bg-[#161b22] border-emerald-500/30',
                        selectedTheme === 'stadium' && 'bg-[#10141E] border-white/10',
                      )}
                      style={isStadiumTheme ? { backdropFilter: 'blur(16px)' } : undefined}
                    >
                      <p
                        className="text-xs px-3 py-2 uppercase tracking-wider"
                        style={{ color: isStadiumTheme ? STADIUM_COLORS.navInactive : '#6B7280' }}
                      >
                        {isStadiumTheme ? 'Сменить тему' : 'Switch Theme'}
                      </p>
                      {(['cinematic', 'neon', 'stadium'] as ThemeStyle[]).map((theme) => {
                        if (!theme) return null;
                        const Icon = themeIcons[theme];
                        const labels = {
                          cinematic: 'Cinematic',
                          neon: 'Neon Tech',
                          stadium: 'AI Analysis Center',
                        };
                        const labelsRu = {
                          cinematic: 'Кинематограф',
                          neon: 'Неон',
                          stadium: 'AI Центр',
                        };
                        return (
                          <button
                            key={theme}
                            onClick={() => {
                              setTheme(theme);
                              setShowThemeSwitcher(false);
                            }}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                              selectedTheme === theme
                                ? theme === 'cinematic' ? 'bg-amber-500/20 text-amber-400'
                                  : theme === 'neon' ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-blue-500/20 text-blue-400'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{isStadiumTheme ? labelsRu[theme] : labels[theme]}</span>
                            {selectedTheme === theme && (
                              <span className="ml-auto text-xs">{isStadiumTheme ? 'Активна' : 'Active'}</span>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Settings - desktop only */}
              <Link href="/settings" className="hidden sm:block">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isStadiumTheme ? 'hover:bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                  style={isStadiumTheme ? { color: STADIUM_COLORS.navInactive } : undefined}
                >
                  <Settings className="w-5 h-5" />
                </motion.button>
              </Link>

              {/* Mobile menu button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn(
                  'md:hidden p-2.5 -mr-2 rounded-lg transition-colors touch-manipulation',
                  isStadiumTheme ? 'hover:bg-white/5 active:bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                )}
                style={isStadiumTheme ? { color: STADIUM_COLORS.navInactive } : undefined}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              >
                <AnimatePresence mode="wait">
                  {isMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <X className="w-6 h-6" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Menu className="w-6 h-6" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Full-screen Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                'fixed top-0 right-0 bottom-0 w-[85%] max-w-[320px] z-50 md:hidden overflow-y-auto',
                'safe-area-top safe-area-bottom'
              )}
              style={{
                background: isStadiumTheme ? '#10141E' : selectedTheme === 'cinematic' ? '#0a0a12' : '#0a0e14',
              }}
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b"
                style={{ borderColor: isStadiumTheme ? STADIUM_COLORS.border : 'rgba(255,255,255,0.1)' }}
              >
                <span
                  className={cn(
                    'font-bold text-lg',
                    isStadiumTheme && 'font-montserrat text-white'
                  )}
                  style={{ color: !isStadiumTheme ? (selectedTheme === 'cinematic' ? '#F59E0B' : '#10B981') : undefined }}
                >
                  {isStadiumTheme ? 'Меню' : 'Menu'}
                </span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/5 active:bg-white/10"
                  style={{ color: STADIUM_COLORS.navInactive }}
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Navigation Items */}
              <div className="p-4 space-y-1">
                {navItems.map((item, index) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  const label = isStadiumTheme ? item.labelRu : item.label;

                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={item.href} onClick={() => setIsMenuOpen(false)}>
                        <div
                          className={cn(
                            'flex items-center gap-4 px-4 py-4 rounded-xl transition-all touch-manipulation',
                            'active:scale-[0.98]',
                            isActive
                              ? selectedTheme === 'cinematic'
                                ? 'bg-amber-500/20'
                                : selectedTheme === 'neon'
                                ? 'bg-emerald-500/20'
                                : 'bg-blue-500/15'
                              : 'hover:bg-white/5 active:bg-white/10'
                          )}
                          style={isStadiumTheme ? {
                            color: isActive ? STADIUM_COLORS.textPrimary : STADIUM_COLORS.navInactive,
                          } : {
                            color: isActive
                              ? selectedTheme === 'cinematic' ? '#F59E0B' : '#10B981'
                              : '#9CA3AF'
                          }}
                        >
                          <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center',
                            isActive
                              ? isStadiumTheme
                                ? 'bg-blue-500/20'
                                : selectedTheme === 'cinematic'
                                ? 'bg-amber-500/30'
                                : 'bg-emerald-500/30'
                              : 'bg-white/5'
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className={cn(
                            'font-medium text-base',
                            isStadiumTheme && 'uppercase tracking-wider text-sm'
                          )}>
                            {label}
                          </span>
                          {item.isLive && (
                            <span
                              className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full"
                              style={{
                                background: 'rgba(255, 59, 59, 0.2)',
                                color: '#FF3B3B'
                              }}
                            >
                              LIVE
                            </span>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="mx-4 border-t" style={{ borderColor: isStadiumTheme ? STADIUM_COLORS.border : 'rgba(255,255,255,0.1)' }} />

              {/* Settings and Theme */}
              <div className="p-4 space-y-1">
                {/* Settings */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navItems.length * 0.05 }}
                >
                  <Link href="/settings" onClick={() => setIsMenuOpen(false)}>
                    <div
                      className={cn(
                        'flex items-center gap-4 px-4 py-4 rounded-xl transition-all touch-manipulation',
                        'hover:bg-white/5 active:bg-white/10 active:scale-[0.98]'
                      )}
                      style={{ color: STADIUM_COLORS.navInactive }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <Settings className="w-5 h-5" />
                      </div>
                      <span className={cn(
                        'font-medium text-base',
                        isStadiumTheme && 'uppercase tracking-wider text-sm'
                      )}>
                        {isStadiumTheme ? 'Настройки' : 'Settings'}
                      </span>
                    </div>
                  </Link>
                </motion.div>

                {/* Install PWA */}
                {isInstallable && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (navItems.length + 1) * 0.05 }}
                  >
                    <button
                      onClick={() => {
                        handleInstall();
                        setIsMenuOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all touch-manipulation',
                        'active:scale-[0.98]',
                        isStadiumTheme
                          ? 'bg-blue-500/15 text-blue-400'
                          : selectedTheme === 'cinematic'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-emerald-500/15 text-emerald-400'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        isStadiumTheme
                          ? 'bg-blue-500/20'
                          : selectedTheme === 'cinematic'
                          ? 'bg-amber-500/20'
                          : 'bg-emerald-500/20'
                      )}>
                        <Download className="w-5 h-5" />
                      </div>
                      <span className={cn(
                        'font-medium text-base',
                        isStadiumTheme && 'uppercase tracking-wider text-sm'
                      )}>
                        {isStadiumTheme ? 'Установить' : 'Install App'}
                      </span>
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Theme Selector */}
              <div className="p-4">
                <p
                  className="text-xs px-4 pb-2 uppercase tracking-wider"
                  style={{ color: STADIUM_COLORS.navInactive }}
                >
                  {isStadiumTheme ? 'Тема' : 'Theme'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['cinematic', 'neon', 'stadium'] as ThemeStyle[]).map((theme) => {
                    if (!theme) return null;
                    const Icon = themeIcons[theme];
                    const isSelected = selectedTheme === theme;
                    const shortLabels = {
                      cinematic: 'Cinema',
                      neon: 'Neon',
                      stadium: 'AI',
                    };

                    return (
                      <motion.button
                        key={theme}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setTheme(theme)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-xl transition-all touch-manipulation',
                          isSelected
                            ? theme === 'cinematic' ? 'bg-amber-500/20 text-amber-400'
                              : theme === 'neon' ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-blue-500/20 text-blue-400'
                            : 'bg-white/5 text-gray-400'
                        )}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-xs font-medium">{shortLabels[theme]}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom safe area spacer */}
              <div className="h-6" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
