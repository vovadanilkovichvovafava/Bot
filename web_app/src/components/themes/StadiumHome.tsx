'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare, ChevronRight, Trophy, Star,
  Zap, TrendingUp, Users, ArrowRight
} from 'lucide-react';

// Featured match data
const FEATURED_MATCH = {
  id: '1',
  homeTeam: {
    name: 'Manchester City',
    shortName: 'Man City',
    logo: 'https://media.api-sports.io/football/teams/50.png',
    color: '#6CABDD',
  },
  awayTeam: {
    name: 'Real Madrid',
    shortName: 'Real Madrid',
    logo: 'https://media.api-sports.io/football/teams/541.png',
    color: '#FEBE10',
  },
  aiPrediction: {
    confidence: 42,
    score: '3-1',
    verdict: 'Slight advantage - Home side',
  },
};

const TOP_LEAGUES = [
  { name: 'Premier League', logo: 'https://media.api-sports.io/football/leagues/39.png', color: '#3D195B' },
  { name: 'LaLiga', logo: 'https://media.api-sports.io/football/leagues/140.png', color: '#EE8707' },
  { name: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png', color: '#024494' },
  { name: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png', color: '#D20515' },
  { name: 'Ligue 1', logo: 'https://media.api-sports.io/football/leagues/61.png', color: '#091C3E' },
];

// Confetti colors
const CONFETTI_COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#f472b6', '#fbbf24', '#34d399'];

export function StadiumHome() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen stadium-bg relative overflow-hidden">
      {/* Stadium lights effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="stadium-light absolute top-0 left-[10%] w-40 h-[500px] rotate-12" />
        <div className="stadium-light absolute top-0 left-[30%] w-32 h-[400px] rotate-6" />
        <div className="stadium-light absolute top-0 right-[10%] w-40 h-[500px] -rotate-12" />
        <div className="stadium-light absolute top-0 right-[30%] w-32 h-[400px] -rotate-6" />
      </div>

      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-sm confetti"
            style={{
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
            }}
            initial={{ y: -20, rotate: 0 }}
            animate={{
              y: '110vh',
              rotate: 720 * (Math.random() > 0.5 ? 1 : -1),
            }}
            transition={{
              duration: 8 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 10,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          {/* AI Question Prompt */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Спроси ИИ, кто победит сегодня?
            </h1>
            <Link href="/ai-chat">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary rounded-xl px-8 py-4 text-lg inline-flex items-center gap-3"
              >
                <MessageSquare className="w-6 h-6" />
                ЗАДАТЬ ВОПРОС AI
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>

          {/* Featured Match Display */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            {/* Match Cards */}
            <div className="flex items-center justify-center gap-8 md:gap-16 mb-8">
              {/* Home Team Flag */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6, type: 'spring' }}
                className="relative"
              >
                <div
                  className="w-36 h-48 md:w-48 md:h-64 rounded-lg overflow-hidden shadow-2xl"
                  style={{
                    background: `linear-gradient(180deg, ${FEATURED_MATCH.homeTeam.color}60 0%, ${FEATURED_MATCH.homeTeam.color}30 100%)`,
                    border: `3px solid ${FEATURED_MATCH.homeTeam.color}80`,
                  }}
                >
                  {/* Flag pole */}
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-2 h-8 bg-gradient-to-b from-gray-300 to-gray-500 rounded-full" />

                  <motion.div
                    animate={{
                      rotateY: [-2, 2, -2],
                      skewX: [-1, 1, -1],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-full h-full flex items-center justify-center p-6"
                    style={{ transformOrigin: 'top center' }}
                  >
                    <img
                      src={FEATURED_MATCH.homeTeam.logo}
                      alt={FEATURED_MATCH.homeTeam.name}
                      className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-2xl"
                    />
                  </motion.div>
                </div>
                <p className="mt-4 text-center text-white font-bold text-lg md:text-xl">
                  {FEATURED_MATCH.homeTeam.shortName}
                </p>
              </motion.div>

              {/* Score/VS */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
                className="text-center"
              >
                <div className="text-5xl md:text-7xl font-bold text-white drop-shadow-lg">
                  {FEATURED_MATCH.aiPrediction.score}
                </div>
              </motion.div>

              {/* Away Team Flag */}
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6, type: 'spring' }}
                className="relative"
              >
                <div
                  className="w-36 h-48 md:w-48 md:h-64 rounded-lg overflow-hidden shadow-2xl"
                  style={{
                    background: `linear-gradient(180deg, ${FEATURED_MATCH.awayTeam.color}60 0%, ${FEATURED_MATCH.awayTeam.color}30 100%)`,
                    border: `3px solid ${FEATURED_MATCH.awayTeam.color}80`,
                  }}
                >
                  {/* Flag pole */}
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-2 h-8 bg-gradient-to-b from-gray-300 to-gray-500 rounded-full" />

                  <motion.div
                    animate={{
                      rotateY: [2, -2, 2],
                      skewX: [1, -1, 1],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                    className="w-full h-full flex items-center justify-center p-6"
                    style={{ transformOrigin: 'top center' }}
                  >
                    <img
                      src={FEATURED_MATCH.awayTeam.logo}
                      alt={FEATURED_MATCH.awayTeam.name}
                      className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-2xl"
                    />
                  </motion.div>
                </div>
                <p className="mt-4 text-center text-white font-bold text-lg md:text-xl">
                  {FEATURED_MATCH.awayTeam.shortName}
                </p>
              </motion.div>
            </div>

            {/* AI Verdict */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="card-stadium rounded-2xl p-6 max-w-md mx-auto"
            >
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-500/50">
                  <span className="text-indigo-300 text-sm font-semibold">AI VERDICT</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mb-2">
                <span className="text-3xl font-bold stadium-gradient">{FEATURED_MATCH.aiPrediction.confidence}%</span>
                <span className="text-gray-400">vs</span>
                <span className="text-3xl font-bold text-white">{FEATURED_MATCH.aiPrediction.score}</span>
              </div>
              <p className="text-center text-indigo-300">{FEATURED_MATCH.aiPrediction.verdict}</p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Top 5 Leagues */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 30 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-bold text-white text-center mb-8">ТОP-5 ЛИГ</h2>

          <div className="grid grid-cols-5 gap-3 md:gap-4">
            {TOP_LEAGUES.map((league, index) => (
              <motion.div
                key={league.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <Link href={`/matches?league=${league.name.toLowerCase()}`}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="card-stadium rounded-xl p-3 md:p-4 text-center cursor-pointer hover:border-indigo-500/50 transition-all"
                    style={{
                      background: `linear-gradient(180deg, ${league.color}40 0%, rgba(30, 27, 75, 0.9) 100%)`,
                    }}
                  >
                    <img
                      src={league.logo}
                      alt={league.name}
                      className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 object-contain"
                    />
                    <p className="text-xs md:text-sm font-semibold text-white truncate">{league.name}</p>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 30 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { icon: TrendingUp, value: '72%', label: 'Точность ИИ', color: 'from-green-500 to-emerald-600' },
            { icon: Zap, value: '24', label: 'Live матчей', color: 'from-red-500 to-rose-600' },
            { icon: Users, value: '12K+', label: 'Пользователей', color: 'from-blue-500 to-indigo-600' },
            { icon: Trophy, value: '156', label: 'Прогнозов сегодня', color: 'from-amber-500 to-orange-600' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 + index * 0.1 }}
              className="card-stadium rounded-xl p-4 text-center"
            >
              <div className={`w-10 h-10 mx-auto mb-3 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold stadium-gradient">{stat.value}</div>
              <div className="text-xs text-indigo-300">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: mounted ? 1 : 0 }}
          transition={{ delay: 1.1 }}
          className="mt-12 text-center"
        >
          <Link href="/matches">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-secondary rounded-xl px-8 py-4 inline-flex items-center gap-2 border-indigo-500/30 hover:border-indigo-500/60"
            >
              Смотреть все матчи
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </Link>
        </motion.div>

        {/* Crowd wave effect at bottom */}
        <div className="fixed bottom-0 left-0 right-0 h-16 pointer-events-none overflow-hidden">
          <div className="flex h-full">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="flex-1 bg-indigo-950/50 crowd-wave"
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
