'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home, Calendar, Zap, MessageSquare, BarChart3, Settings,
  Menu, X, Sparkles, Tv, Cpu, Brain, Bell, Globe
} from 'lucide-react';
import { useState } from 'react';
import { useThemeStore, ThemeStyle } from '@/store/themeStore';
import { cn } from '@/lib/utils';

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
  bg: 'rgba(8, 10, 16, 0.8)',
  border: 'rgba(255, 255, 255, 0.08)',
  blue: '#4A7AFF',
  navActive: '#FFFFFF',
  navInactive: '#A0A8BE',
  textPrimary: '#FFFFFF',
};

export function ThemedNavbar() {
  const pathname = usePathname();
  const { selectedTheme, setTheme, resetTheme } = useThemeStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);

  const ThemeIcon = selectedTheme ? themeIcons[selectedTheme] : Sparkles;
  const isStadiumTheme = selectedTheme === 'stadium';

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b',
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[60px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            {isStadiumTheme ? (
              <>
                <div className="w-8 h-8 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <span
                  className="font-montserrat font-bold text-base tracking-wide hidden sm:block"
                  style={{ color: STADIUM_COLORS.textPrimary }}
                >
                  AI ANALYSIS CENTER
                </span>
              </>
            ) : (
              <>
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg',
                    selectedTheme === 'cinematic' && 'bg-gradient-to-br from-amber-500 to-amber-700 text-black',
                    selectedTheme === 'neon' && 'bg-gradient-to-br from-emerald-400 to-cyan-500 text-black',
                  )}
                >
                  AI
                </motion.div>
                <span className={cn(
                  'font-bold text-xl hidden sm:block',
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
          <div className="flex items-center gap-2">
            {/* Language Switcher (Stadium theme only) */}
            {isStadiumTheme && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg transition-colors hover:bg-white/5"
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
                className="p-2 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: STADIUM_COLORS.navInactive }}
              >
                <Bell className="w-5 h-5" />
              </motion.button>
            )}

            {/* Theme Switcher */}
            <div className="relative">
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
            </div>

            {/* Settings */}
            <Link href="/settings">
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
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={cn(
                'md:hidden p-2 rounded-lg transition-colors',
                isStadiumTheme ? 'hover:bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
              style={isStadiumTheme ? { color: STADIUM_COLORS.navInactive } : undefined}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 border-t"
            style={isStadiumTheme ? { borderColor: STADIUM_COLORS.border } : { borderColor: 'rgba(255,255,255,0.1)' }}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const label = isStadiumTheme ? item.labelRu : item.label;

              return (
                <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>
                  <div
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? selectedTheme === 'cinematic'
                          ? 'bg-amber-500/20 text-amber-400'
                          : selectedTheme === 'neon'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : selectedTheme === 'stadium'
                          ? 'bg-blue-500/20'
                          : ''
                        : ''
                    )}
                    style={isStadiumTheme ? {
                      color: isActive ? STADIUM_COLORS.textPrimary : STADIUM_COLORS.navInactive,
                      background: isActive ? 'rgba(74, 122, 255, 0.15)' : 'transparent',
                    } : { color: isActive ? undefined : '#9CA3AF' }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className={cn(
                      'font-medium',
                      isStadiumTheme && 'uppercase tracking-wider text-sm'
                    )}>
                      {label}
                    </span>
                    {item.isLive && (
                      <span
                        className="ml-auto text-xs font-bold px-2 py-0.5 rounded"
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
              );
            })}
          </motion.div>
        )}
      </div>
    </nav>
  );
}
