'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useThemeStore, ThemeStyle, themes } from '@/store/themeStore';
import { Sparkles, Tv, Cpu, Trophy, ArrowRight, Check } from 'lucide-react';

const themeIcons = {
  cinematic: Tv,
  neon: Cpu,
  stadium: Trophy,
};

const themeGradients = {
  cinematic: 'from-amber-500 via-yellow-600 to-orange-700',
  neon: 'from-emerald-400 via-cyan-500 to-blue-600',
  stadium: 'from-indigo-500 via-purple-600 to-pink-600',
};

const themeBgEffects = {
  cinematic: (
    <>
      {/* Golden light beams */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-amber-500/30 via-amber-500/10 to-transparent rotate-12 blur-sm" />
        <div className="absolute top-0 right-1/3 w-1 h-full bg-gradient-to-b from-yellow-500/20 via-yellow-500/5 to-transparent -rotate-12 blur-sm" />
        <div className="absolute top-0 right-1/4 w-0.5 h-full bg-gradient-to-b from-orange-500/25 via-orange-500/5 to-transparent rotate-6 blur-sm" />
      </div>
      {/* Particle effects */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-400/60 rounded-full"
            initial={{
              x: Math.random() * 100 + '%',
              y: '100%',
              opacity: 0
            }}
            animate={{
              y: '-10%',
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'linear'
            }}
          />
        ))}
      </div>
    </>
  ),
  neon: (
    <>
      {/* Neon grid */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }} />
      </div>
      {/* Glowing lines */}
      <svg className="absolute inset-0 w-full h-full">
        <motion.line
          x1="0%" y1="30%" x2="100%" y2="70%"
          stroke="url(#neonGradient)"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 0.6, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0 }}
        />
        <motion.line
          x1="100%" y1="20%" x2="0%" y2="80%"
          stroke="url(#neonGradient2)"
          strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 0.4, 0] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1.5 }}
        />
        <defs>
          <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00ff88" />
            <stop offset="100%" stopColor="#00d4ff" />
          </linearGradient>
          <linearGradient id="neonGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#00ff88" />
          </linearGradient>
        </defs>
      </svg>
      {/* Floating orbs */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-xl"
          style={{
            width: 100 + i * 50,
            height: 100 + i * 50,
            background: i % 2 === 0
              ? 'radial-gradient(circle, rgba(0,255,136,0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)',
          }}
          initial={{
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%',
          }}
          animate={{
            x: [null, Math.random() * 100 + '%', Math.random() * 100 + '%'],
            y: [null, Math.random() * 100 + '%', Math.random() * 100 + '%'],
          }}
          transition={{
            duration: 20 + i * 5,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      ))}
    </>
  ),
  stadium: (
    <>
      {/* Stadium lights */}
      <div className="absolute top-0 left-1/4 w-32 h-[500px] bg-gradient-to-b from-white/10 via-indigo-500/5 to-transparent transform -rotate-12 blur-2xl" />
      <div className="absolute top-0 right-1/4 w-32 h-[500px] bg-gradient-to-b from-white/10 via-purple-500/5 to-transparent transform rotate-12 blur-2xl" />
      {/* Crowd wave effect */}
      <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden opacity-30">
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600"
          style={{ backgroundSize: '200% 100%' }}
          animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      {/* Confetti */}
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            background: ['#6366f1', '#818cf8', '#a5b4fc', '#f472b6', '#fbbf24'][i % 5],
            left: Math.random() * 100 + '%',
          }}
          initial={{ y: -20, rotate: 0, opacity: 0 }}
          animate={{
            y: '110vh',
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
            opacity: [0, 1, 1, 0]
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 10,
            ease: 'linear'
          }}
        />
      ))}
    </>
  ),
};

export default function SelectStylePage() {
  const router = useRouter();
  const { setTheme } = useThemeStore();
  const [hoveredTheme, setHoveredTheme] = useState<ThemeStyle>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeStyle>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSelectTheme = (theme: ThemeStyle) => {
    if (!theme) return;
    setSelectedTheme(theme);
    setIsTransitioning(true);

    setTimeout(() => {
      setTheme(theme);
      router.push('/login');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#08080f] text-white overflow-hidden relative">
      {/* Dynamic background based on hovered theme */}
      <AnimatePresence mode="wait">
        {hoveredTheme && (
          <motion.div
            key={hoveredTheme}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 pointer-events-none"
          >
            {themeBgEffects[hoveredTheme]}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection animation overlay */}
      <AnimatePresence>
        {isTransitioning && selectedTheme && (
          <motion.div
            initial={{ scale: 0, borderRadius: '100%' }}
            animate={{ scale: 50, borderRadius: '0%' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed top-1/2 left-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 z-50 bg-gradient-to-br ${themeGradients[selectedTheme]}`}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 pt-16 pb-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-gray-300">AI-Powered Predictions</span>
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
            Choose Your
          </span>
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500">
            Experience
          </span>
        </h1>

        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Select a visual style that matches your preference. You can change it anytime.
        </p>
      </motion.div>

      {/* Theme Cards */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {(Object.keys(themes) as ThemeStyle[]).filter(Boolean).map((themeKey, index) => {
            if (!themeKey) return null;
            const theme = themes[themeKey];
            const Icon = themeIcons[themeKey];
            const isSelected = selectedTheme === themeKey;
            const isHovered = hoveredTheme === themeKey;

            return (
              <motion.div
                key={themeKey}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.15, duration: 0.6 }}
                onHoverStart={() => setHoveredTheme(themeKey)}
                onHoverEnd={() => setHoveredTheme(null)}
                onClick={() => handleSelectTheme(themeKey)}
                className="relative group cursor-pointer"
              >
                {/* Glow effect */}
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${themeGradients[themeKey]} rounded-2xl blur opacity-0 group-hover:opacity-50 transition-all duration-500 ${isSelected ? 'opacity-75' : ''}`} />

                {/* Card */}
                <div className={`relative h-full bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden transition-all duration-300 ${isHovered ? 'border-white/30 scale-[1.02]' : ''} ${isSelected ? 'border-white/50' : ''}`}>
                  {/* Preview area */}
                  <div className="h-48 relative overflow-hidden">
                    <div
                      className="absolute inset-0"
                      style={{ background: theme.colors.background }}
                    >
                      {/* Theme-specific preview */}
                      {themeKey === 'cinematic' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="absolute inset-0 bg-gradient-to-b from-amber-900/30 via-transparent to-black/50" />
                          <div className="relative flex items-center gap-8">
                            <div className="w-16 h-20 rounded bg-gradient-to-b from-blue-500 to-blue-700 shadow-lg transform -rotate-3" />
                            <span className="text-2xl font-bold text-amber-400">VS</span>
                            <div className="w-16 h-20 rounded bg-gradient-to-b from-white to-gray-300 shadow-lg transform rotate-3" />
                          </div>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-black/50 rounded text-amber-400 text-xs font-medium">
                            AI VERDICT
                          </div>
                        </div>
                      )}

                      {themeKey === 'neon' && (
                        <div className="absolute inset-0 flex items-center justify-center p-6">
                          <div className="absolute inset-0 opacity-30" style={{
                            backgroundImage: 'linear-gradient(rgba(0,255,136,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.1) 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                          }} />
                          <div className="relative w-full">
                            <div className="flex justify-between items-center mb-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                                <span className="text-sm font-medium text-emerald-400">MAN CITY</span>
                              </div>
                              <span className="text-emerald-400 font-bold">65%</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                                initial={{ width: 0 }}
                                animate={{ width: isHovered ? '65%' : '0%' }}
                                transition={{ duration: 0.8 }}
                              />
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1 text-center text-emerald-400">WIN</div>
                              <div className="bg-gray-800 rounded px-2 py-1 text-center text-gray-400">DRAW</div>
                              <div className="bg-gray-800 rounded px-2 py-1 text-center text-gray-400">LOSE</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {themeKey === 'stadium' && (
                        <div className="absolute inset-0">
                          <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/50 via-purple-900/30 to-black/70" />
                          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-green-900/40 to-transparent" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="flex items-center gap-6 mb-2">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-xl" />
                                <div className="text-3xl font-bold text-white">3 - 1</div>
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-gray-300 shadow-xl" />
                              </div>
                              <div className="text-indigo-300 text-sm">AI Prediction</div>
                            </div>
                          </div>
                          {/* Mini crowd */}
                          <div className="absolute bottom-0 left-0 right-0 h-8 flex">
                            {[...Array(20)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="flex-1 bg-indigo-950"
                                animate={{ scaleY: [1, 1.2, 1] }}
                                transition={{
                                  duration: 0.5 + Math.random() * 0.5,
                                  repeat: Infinity,
                                  delay: i * 0.1
                                }}
                                style={{ transformOrigin: 'bottom' }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selection checkmark */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white flex items-center justify-center"
                        >
                          <Check className="w-5 h-5 text-gray-900" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Info */}
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${themeGradients[themeKey]}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold">{theme.name}</h3>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">{theme.description}</p>

                    {/* Color palette preview */}
                    <div className="flex gap-2 mb-4">
                      {Object.entries(theme.colors).slice(0, 5).map(([name, color]) => (
                        <div
                          key={name}
                          className="w-6 h-6 rounded-full border-2 border-white/20"
                          style={{ background: color }}
                          title={name}
                        />
                      ))}
                    </div>

                    {/* CTA */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all bg-gradient-to-r ${themeGradients[themeKey]} text-white shadow-lg`}
                    >
                      Select Style
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-gray-500 text-sm pb-8"
      >
        Hover over a card to preview the style effects
      </motion.p>
    </div>
  );
}
