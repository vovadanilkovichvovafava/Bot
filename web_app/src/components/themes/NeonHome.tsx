'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Brain, TrendingUp, Zap, ChevronRight, ArrowUpRight,
  BarChart3, Target, Clock, Flame, Shield, Swords, Calendar
} from 'lucide-react';
import { RadarChart } from '@/components/charts/RadarChart';

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
  league: 'Champions League',
  time: '21:00',
  aiPrediction: {
    homeWin: 65,
    draw: 20,
    awayWin: 15,
  },
  stats: {
    home: { attack: 92, defense: 85, midfield: 90, form: 88, setpieces: 78 },
    away: { attack: 88, defense: 82, midfield: 85, form: 85, setpieces: 82 },
  },
};

const AI_INSIGHTS = [
  {
    icon: Swords,
    title: 'Man City high press advantage',
    team: 'MAN CITY',
    confidence: 85,
  },
  {
    icon: Shield,
    title: 'Real Madrid counter-attack threat',
    team: 'REAL MADRID',
    confidence: 78,
  },
  {
    icon: Target,
    title: 'Haaland vs. Vinicius Jr. key duel',
    team: null,
    confidence: 92,
  },
];

const LIVE_MARKETS = [
  { name: 'Match Winner', odds: { home: 1.85, draw: 3.60, away: 4.20 } },
  { name: 'Total Goals (Over/Under 2.5)', odds: { over: 1.75, under: 2.10 } },
  { name: 'Both Teams to Score', odds: { yes: 1.65, no: 2.25 } },
  { name: 'First Goalscorer', odds: { value: 3.50 } },
];

const TRENDING_BETS = [
  { icon: Flame, name: 'Match Winner', odds: 1.55 },
  { icon: Flame, name: 'Total Goals (Over/Under 2.5)', odds: 2.00 },
  { icon: Flame, name: 'First Goalscorer', odds: 1.25 },
];

export function NeonHome() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen neon-bg neon-grid relative">
      {/* Floating orbs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full blur-3xl"
            style={{
              width: 200 + i * 100,
              height: 200 + i * 100,
              background: i % 2 === 0
                ? 'radial-gradient(circle, rgba(0,255,136,0.08) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
              left: `${20 + i * 15}%`,
              top: `${10 + i * 20}%`,
            }}
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Main Grid Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Team Comparison */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: mounted ? 1 : 0, x: mounted ? 0 : -20 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1"
          >
            <div className="card-neon rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Brain className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white">TEAM COMPARISON (AI ANALYSIS)</h3>
              </div>

              {/* Team legend */}
              <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-sm text-gray-400">Man City</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400" />
                  <span className="text-sm text-gray-400">Real Madrid</span>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="h-56 mb-6">
                <RadarChart
                  homeStats={FEATURED_MATCH.stats.home}
                  awayStats={FEATURED_MATCH.stats.away}
                  theme="neon"
                />
              </div>

              {/* Key AI Insights */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  KEY AI INSIGHTS
                </h4>
                <div className="space-y-3">
                  {AI_INSIGHTS.map((insight, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="p-1.5 rounded bg-emerald-500/20">
                        <insight.icon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">{insight.title}</p>
                        {insight.team && (
                          <span className="text-xs text-emerald-400">{insight.team}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{insight.confidence}%</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Recent AI Performance */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">RECENT AI PERFORMANCE</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-emerald-400">Successful prediction - Man City</span>
                    <ArrowUpRight className="w-3 h-3 text-emerald-400 ml-auto" />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-emerald-400">Successful prediction - Man City</span>
                    <ArrowUpRight className="w-3 h-3 text-emerald-400 ml-auto" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Center Column - Featured Match */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="card-neon rounded-2xl overflow-hidden">
              {/* Match header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <span className="text-emerald-400 text-sm font-semibold">FEATURED MATCH</span>
                <span className="text-gray-500 text-sm">{FEATURED_MATCH.league}</span>
              </div>

              {/* Teams */}
              <div className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {FEATURED_MATCH.homeTeam.shortName.toUpperCase()} VS. {FEATURED_MATCH.awayTeam.shortName.toUpperCase()}
                  </h2>
                </div>

                <div className="flex items-center justify-center gap-8 mb-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 p-3 mb-2 mx-auto border border-white/10">
                      <img
                        src={FEATURED_MATCH.homeTeam.logo}
                        alt={FEATURED_MATCH.homeTeam.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </motion.div>

                  <div className="text-3xl font-bold text-gray-600">VS</div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 p-3 mb-2 mx-auto border border-white/10">
                      <img
                        src={FEATURED_MATCH.awayTeam.logo}
                        alt={FEATURED_MATCH.awayTeam.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </motion.div>
                </div>

                {/* AI Win Probability */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">AI WIN PROBABILITY:</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold neon-gradient">{FEATURED_MATCH.aiPrediction.homeWin}% MAN CITY</span>
                  </div>
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${FEATURED_MATCH.aiPrediction.homeWin}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-l-full"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${FEATURED_MATCH.aiPrediction.draw}%` }}
                      transition={{ duration: 1, delay: 0.7 }}
                      className="bg-gray-600"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${FEATURED_MATCH.aiPrediction.awayWin}%` }}
                      transition={{ duration: 1, delay: 0.9 }}
                      className="bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-r-full"
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>DRAW: {FEATURED_MATCH.aiPrediction.draw}%</span>
                    <span>REAL MADRID: {FEATURED_MATCH.aiPrediction.awayWin}%</span>
                  </div>
                </div>

                {/* Probability chart placeholder */}
                <div className="h-24 mb-6 rounded-lg bg-white/5 flex items-end justify-around p-2">
                  {[40, 65, 55, 70, 60, 75, 65].map((height, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                      className="w-6 bg-gradient-to-t from-emerald-500/50 to-emerald-400/80 rounded-t"
                    />
                  ))}
                </div>

                {/* CTA Button */}
                <Link href={`/match/${FEATURED_MATCH.id}`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full btn-primary rounded-xl py-4 flex items-center justify-center gap-2"
                  >
                    <BarChart3 className="w-5 h-5" />
                    VIEW ANALYSIS & BET
                  </motion.button>
                </Link>
              </div>

              {/* News Feed */}
              <div className="p-4 border-t border-white/10 bg-white/5">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">NEWS FEED</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">AI predicts upset in Serie A</p>
                  <p className="text-gray-300">Injury update: Key defender out for Bayern</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Live Betting Markets */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: mounted ? 1 : 0, x: mounted ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="card-neon rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-white">LIVE BETTING MARKETS</h3>
                <motion.button
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.3 }}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                </motion.button>
              </div>

              {/* Markets */}
              <div className="space-y-4 mb-6">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">Match Winner</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors">
                      <div className="text-xs text-gray-400 mb-1">Man City</div>
                      <div className="text-lg font-bold text-emerald-400">3.00</div>
                    </button>
                    <button className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="text-xs text-gray-400 mb-1">Draw</div>
                      <div className="text-lg font-bold text-white">3.60</div>
                    </button>
                    <button className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="text-xs text-gray-400 mb-1">Real Madrid</div>
                      <div className="text-lg font-bold text-white">4.20</div>
                    </button>
                  </div>
                </div>

                {[
                  { name: 'Total Goals (Over/Under 2.5)', value: '2.5', odds: 1.30, tag: 'BET NOW' },
                  { name: 'Both Teams to Score', value: 'Yes', odds: -1.50, tag: 'BET NOW' },
                  { name: 'First Goalscorer', value: 'First', odds: 1.50, tag: 'BET NOW' },
                ].map((market, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div>
                      <p className="text-sm text-white">{market.name}</p>
                      <p className="text-xs text-gray-500">{market.value}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${market.odds > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {market.odds > 0 ? '+' : ''}{market.odds.toFixed(2)}
                      </span>
                      <button className="px-3 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors">
                        {market.tag}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trending Bets */}
              <div className="pt-6 border-t border-white/10">
                <h4 className="text-sm font-semibold text-gray-400 mb-4">TRENDING BETS</h4>
                <div className="space-y-3">
                  {TRENDING_BETS.map((bet, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <bet.icon className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-white">{bet.name}</span>
                      </div>
                      <span className="text-emerald-400 font-bold">{bet.odds.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { icon: Calendar, label: 'All Matches', href: '/matches', color: 'from-emerald-500 to-emerald-600' },
            { icon: Zap, label: 'Live Now', href: '/live', color: 'from-red-500 to-red-600' },
            { icon: Brain, label: 'AI Chat', href: '/ai-chat', color: 'from-cyan-500 to-cyan-600' },
            { icon: BarChart3, label: 'My Stats', href: '/stats', color: 'from-purple-500 to-purple-600' },
          ].map((action, index) => (
            <Link key={index} href={action.href}>
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="card-neon rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-emerald-500/30"
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color}`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-white">{action.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-500 ml-auto" />
              </motion.div>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
