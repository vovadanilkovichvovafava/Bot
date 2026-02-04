'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Play, ChevronRight, Trophy, TrendingUp, Users, Zap,
  Calendar, Star, ArrowRight
} from 'lucide-react';
import { RadarChart } from '@/components/charts/RadarChart';

// Featured match data (would come from API)
const FEATURED_MATCH = {
  id: '1',
  homeTeam: {
    name: 'Manchester City',
    shortName: 'MAN CITY',
    logo: 'https://media.api-sports.io/football/teams/50.png',
    color: '#6CABDD',
  },
  awayTeam: {
    name: 'Real Madrid',
    shortName: 'REAL MADRID',
    logo: 'https://media.api-sports.io/football/teams/541.png',
    color: '#FFFFFF',
  },
  league: 'UEFA Champions League',
  date: 'Wednesday, 28 April',
  time: '21:00',
  aiVerdict: {
    prediction: 'Home side slightly favoured due to midfield control',
    homeWin: 45,
    draw: 30,
    awayWin: 25,
  },
  stats: {
    home: { attack: 92, defense: 85, midfield: 90, form: 88, setpieces: 78 },
    away: { attack: 88, defense: 82, midfield: 85, form: 85, setpieces: 82 },
  },
};

const TOP_LEAGUES = [
  { name: 'Premier League', logo: 'https://media.api-sports.io/football/leagues/39.png', matches: 10 },
  { name: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png', matches: 10 },
  { name: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png', matches: 10 },
  { name: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png', matches: 9 },
  { name: 'Ligue 1', logo: 'https://media.api-sports.io/football/leagues/61.png', matches: 10 },
];

export function CinematicHome() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen cinematic-bg relative overflow-hidden">
      {/* Dramatic light beams */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="light-beam absolute top-0 left-[15%] h-[600px] w-[3px] rotate-12 opacity-60" />
        <div className="light-beam absolute top-0 left-[25%] h-[500px] w-[2px] rotate-6 opacity-40" />
        <div className="light-beam absolute top-0 right-[20%] h-[550px] w-[3px] -rotate-12 opacity-50" />
        <div className="light-beam absolute top-0 right-[30%] h-[450px] w-[2px] -rotate-6 opacity-30" />
      </div>

      {/* Particle effects */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-400/40 rounded-full"
            initial={{ x: `${Math.random() * 100}%`, y: '110%', opacity: 0 }}
            animate={{
              y: '-10%',
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 8,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Section - Featured Match */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-amber-500/20 border border-amber-500/30">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm text-amber-400 uppercase tracking-widest">AI ANALYSIS</h2>
                <p className="text-xs text-gray-500">POWERED BY ADVANCED MACHINE LEARNING</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-amber-400 font-bold uppercase tracking-wider">UPCOMING</p>
              <p className="text-sm text-gray-400">{FEATURED_MATCH.date} • {FEATURED_MATCH.time}</p>
            </div>
          </div>

          {/* Main Match Card */}
          <div className="card-cinematic rounded-xl overflow-hidden">
            {/* League header */}
            <div className="px-6 py-3 border-b border-amber-500/20 flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-semibold uppercase tracking-wider">
                {FEATURED_MATCH.league}
              </span>
            </div>

            {/* Match Display */}
            <div className="p-8">
              <div className="flex items-center justify-center gap-8 md:gap-16 mb-8">
                {/* Home Team */}
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="text-center"
                >
                  <div className="banner-flag flag-animate w-32 h-40 md:w-40 md:h-52 rounded-lg overflow-hidden shadow-2xl mb-4 mx-auto"
                    style={{
                      background: `linear-gradient(180deg, ${FEATURED_MATCH.homeTeam.color}40 0%, ${FEATURED_MATCH.homeTeam.color}20 100%)`,
                      border: `2px solid ${FEATURED_MATCH.homeTeam.color}50`,
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img
                        src={FEATURED_MATCH.homeTeam.logo}
                        alt={FEATURED_MATCH.homeTeam.name}
                        className="w-20 h-20 md:w-28 md:h-28 object-contain drop-shadow-2xl"
                      />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold golden-gradient">
                    {FEATURED_MATCH.homeTeam.shortName}
                  </h3>
                </motion.div>

                {/* VS */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                  className="text-center"
                >
                  <div className="text-4xl md:text-6xl font-bold text-gray-600">VS</div>
                </motion.div>

                {/* Away Team */}
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="text-center"
                >
                  <div className="banner-flag flag-animate w-32 h-40 md:w-40 md:h-52 rounded-lg overflow-hidden shadow-2xl mb-4 mx-auto"
                    style={{
                      background: `linear-gradient(180deg, ${FEATURED_MATCH.awayTeam.color}40 0%, ${FEATURED_MATCH.awayTeam.color}20 100%)`,
                      border: `2px solid ${FEATURED_MATCH.awayTeam.color}30`,
                      animationDelay: '0.5s',
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img
                        src={FEATURED_MATCH.awayTeam.logo}
                        alt={FEATURED_MATCH.awayTeam.name}
                        className="w-20 h-20 md:w-28 md:h-28 object-contain drop-shadow-2xl"
                      />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold golden-gradient">
                    {FEATURED_MATCH.awayTeam.shortName}
                  </h3>
                </motion.div>
              </div>

              {/* AI Verdict */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="text-center mb-8"
              >
                <div className="inline-block px-6 py-2 bg-black/40 rounded-full border border-amber-500/30 mb-3">
                  <span className="text-amber-400 text-sm uppercase tracking-widest">AI Verdict</span>
                </div>
                <p className="text-lg text-gray-300 max-w-md mx-auto">
                  {FEATURED_MATCH.aiVerdict.prediction}
                </p>
              </motion.div>

              {/* Tactical Analysis */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="border-t border-amber-500/20 pt-6"
              >
                <h4 className="text-center text-amber-400 text-sm uppercase tracking-widest mb-6">
                  Tactical Analysis
                </h4>
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  {/* Home team stats */}
                  <div className="flex items-center gap-4">
                    <img
                      src={FEATURED_MATCH.homeTeam.logo}
                      alt=""
                      className="w-10 h-10 object-contain"
                    />
                    <span className="text-white font-semibold">{FEATURED_MATCH.homeTeam.shortName}</span>
                  </div>

                  {/* Radar Chart */}
                  <div className="w-64 h-48">
                    <RadarChart
                      homeStats={FEATURED_MATCH.stats.home}
                      awayStats={FEATURED_MATCH.stats.away}
                      theme="cinematic"
                    />
                  </div>

                  {/* Away team stats */}
                  <div className="flex items-center gap-4">
                    <span className="text-white font-semibold">{FEATURED_MATCH.awayTeam.shortName}</span>
                    <img
                      src={FEATURED_MATCH.awayTeam.logo}
                      alt=""
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                </div>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="mt-8 text-center"
              >
                <Link href={`/match/${FEATURED_MATCH.id}`}>
                  <button className="btn-primary inline-flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    View Full Analysis
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Top Leagues Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold golden-gradient">TOP 5 LEAGUES</h2>
            <Link href="/matches" className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-sm">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {TOP_LEAGUES.map((league, index) => (
              <motion.div
                key={league.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <Link href={`/league/${league.name.toLowerCase().replace(' ', '-')}`}>
                  <div className="card-cinematic rounded-xl p-4 text-center hover:border-amber-500/50 transition-all cursor-pointer group">
                    <img
                      src={league.logo}
                      alt={league.name}
                      className="w-16 h-16 mx-auto mb-3 object-contain group-hover:scale-110 transition-transform"
                    />
                    <h3 className="text-sm font-semibold text-white mb-1">{league.name}</h3>
                    <p className="text-xs text-gray-500">{league.matches} matches</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-12 grid md:grid-cols-3 gap-6"
        >
          {[
            { icon: TrendingUp, label: 'AI Accuracy', value: '72%', desc: 'Last 30 days' },
            { icon: Users, label: 'Active Users', value: '12,450', desc: 'Worldwide' },
            { icon: Calendar, label: 'Predictions Today', value: '156', desc: 'Across all leagues' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="card-cinematic rounded-xl p-6 text-center"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-3xl font-bold golden-gradient mb-1">{stat.value}</h3>
              <p className="text-white font-medium">{stat.label}</p>
              <p className="text-xs text-gray-500">{stat.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
