'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home, Calendar, Zap, MessageSquare, BarChart3, Settings,
  Menu, X, Sparkles, Tv, Cpu, Trophy
} from 'lucide-react';
import { useState } from 'react';
import { useThemeStore, ThemeStyle } from '@/store/themeStore';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/matches', label: 'Matches', icon: Calendar },
  { href: '/live', label: 'Live', icon: Zap, isLive: true },
  { href: '/ai-chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
];

const themeIcons = {
  cinematic: Tv,
  neon: Cpu,
  stadium: Trophy,
};

export function ThemedNavbar() {
  const pathname = usePathname();
  const { selectedTheme, setTheme, resetTheme } = useThemeStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);

  const ThemeIcon = selectedTheme ? themeIcons[selectedTheme] : Sparkles;

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b',
      selectedTheme === 'cinematic' && 'bg-[#0a0a12]/90 border-amber-500/20',
      selectedTheme === 'neon' && 'bg-[#0a0e14]/90 border-emerald-500/20',
      selectedTheme === 'stadium' && 'bg-[#0f0f23]/90 border-indigo-500/20',
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg',
                selectedTheme === 'cinematic' && 'bg-gradient-to-br from-amber-500 to-amber-700 text-black',
                selectedTheme === 'neon' && 'bg-gradient-to-br from-emerald-400 to-cyan-500 text-black',
                selectedTheme === 'stadium' && 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white',
              )}
            >
              AI
            </motion.div>
            <span className={cn(
              'font-bold text-xl hidden sm:block',
              selectedTheme === 'cinematic' && 'golden-gradient',
              selectedTheme === 'neon' && 'neon-gradient',
              selectedTheme === 'stadium' && 'stadium-gradient',
            )}>
              {selectedTheme === 'cinematic' ? 'AI ANALYSIS' : selectedTheme === 'neon' ? 'AI BET PRO' : 'AI CENTER'}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'relative px-4 py-2 rounded-lg flex items-center gap-2 transition-all',
                      isActive
                        ? selectedTheme === 'cinematic'
                          ? 'bg-amber-500/20 text-amber-400'
                          : selectedTheme === 'neon'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-indigo-500/20 text-indigo-400'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.isLive && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className={cn(
                          'absolute bottom-0 left-2 right-2 h-0.5 rounded-full',
                          selectedTheme === 'cinematic' && 'bg-amber-500',
                          selectedTheme === 'neon' && 'bg-emerald-400',
                          selectedTheme === 'stadium' && 'bg-indigo-400',
                        )}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
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
                  selectedTheme === 'stadium' && 'hover:bg-indigo-500/20 text-indigo-400',
                )}
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
                    selectedTheme === 'stadium' && 'bg-[#1e1b4b] border-indigo-500/30',
                  )}
                >
                  <p className="text-xs text-gray-500 px-3 py-2 uppercase tracking-wider">Switch Theme</p>
                  {(['cinematic', 'neon', 'stadium'] as ThemeStyle[]).map((theme) => {
                    if (!theme) return null;
                    const Icon = themeIcons[theme];
                    const labels = {
                      cinematic: 'Cinematic',
                      neon: 'Neon Tech',
                      stadium: 'Stadium',
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
                              : 'bg-indigo-500/20 text-indigo-400'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{labels[theme]}</span>
                        {selectedTheme === theme && (
                          <span className="ml-auto text-xs">Active</span>
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
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              >
                <Settings className="w-5 h-5" />
              </motion.button>
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
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
            className="md:hidden py-4 border-t border-white/10"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>
                  <div className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? selectedTheme === 'cinematic'
                        ? 'bg-amber-500/20 text-amber-400'
                        : selectedTheme === 'neon'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-indigo-500/20 text-indigo-400'
                      : 'text-gray-400'
                  )}>
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {item.isLive && (
                      <span className="live-indicator ml-auto">LIVE</span>
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
