'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Brain, TrendingUp, Zap, ChevronRight, ArrowUpRight,
  BarChart3, Target, Clock, Flame, Shield, Swords, Calendar,
  Loader2, Radio
} from 'lucide-react';
import { RadarChart } from '@/components/charts/RadarChart';
import { useMatchesStore } from '@/store/matchesStore';
import { Match, formatMatchDate, isMatchLive } from '@/types';

// Team colors for fallback
const TEAM_COLORS: Record<string, string> = {
  'Arsenal': '#EF0107',
  'Chelsea': '#034694',
  'Manchester United': '#DA291C',
  'Manchester City': '#6CABDD',
  'Liverpool': '#C8102E',
  'Tottenham': '#132257',
  'Real Madrid': '#FEBE10',
  'Barcelona': '#A50044',
  'Bayern Munich': '#DC052D',
  'Dortmund': '#FDE100',
  'PSG': '#004170',
  'Juventus': '#000000',
  'AC Milan': '#FB090B',
  'Inter': '#0068A8',
};

const AI_INSIGHTS = [
  {
    icon: Swords,
    title: 'Home team pressing advantage',
    team: 'HOME',
    confidence: 85,
  },
  {
    icon: Shield,
    title: 'Counter-attack threat detected',
    team: 'AWAY',
    confidence: 78,
  },
  {
    icon: Target,
    title: 'Key player matchup crucial',
    team: null,
    confidence: 92,
  },
];

const TRENDING_BETS = [
  { icon: Flame, name: 'Match Winner', odds: 1.55 },
  { icon: Flame, name: 'Over 2.5 Goals', odds: 2.00 },
  { icon: Flame, name: 'Both Teams Score', odds: 1.75 },
];

export function NeonHome() {
  const [mounted, setMounted] = useState(false);
  const {
    todayMatches,
    liveMatches,
    isLoading,
    loadTodayMatches,
    loadLiveMatches,
  } = useMatchesStore();

  useEffect(() => {
    setMounted(true);
    loadTodayMatches();
    loadLiveMatches();
  }, [loadTodayMatches, loadLiveMatches]);

  // Get featured match - prioritize live matches, then today's upcoming
  const featuredMatch = liveMatches.length > 0
    ? liveMatches[0]
    : todayMatches.length > 0
      ? todayMatches[0]
      : null;

  // Get upcoming matches for display
  const upcomingMatches = todayMatches.slice(0, 5);

  // Generate AI prediction percentages based on match
  const getAIPrediction = (match: Match | null) => {
    if (!match) return { homeWin: 50, draw: 25, awayWin: 25 };
    // Simulate AI prediction based on match id
    const seed = match.id % 100;
    const homeWin = 40 + (seed % 30);
    const draw = 15 + ((seed * 7) % 20);
    const awayWin = 100 - homeWin - draw;
    return { homeWin, draw, awayWin };
  };

  const prediction = getAIPrediction(featuredMatch);

  // Generate mock stats
  const getStats = () => ({
    home: { attack: 85 + Math.random() * 10, defense: 80 + Math.random() * 10, midfield: 82 + Math.random() * 10, form: 78 + Math.random() * 15, setpieces: 75 + Math.random() * 10 },
    away: { attack: 80 + Math.random() * 10, defense: 78 + Math.random() * 10, midfield: 80 + Math.random() * 10, form: 75 + Math.random() * 15, setpieces: 78 + Math.random() * 10 },
  });

  const stats = getStats();

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
        {/* Loading State */}
        {isLoading && !featuredMatch && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
            <p className="text-gray-400">Loading matches...</p>
          </div>
        )}

        {/* Main Grid Layout */}
        {(featuredMatch || !isLoading) && (
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
                  <h3 className="font-bold text-white">TEAM COMPARISON (AI)</h3>
                </div>

                {featuredMatch ? (
                  <>
                    {/* Team legend */}
                    <div className="flex items-center gap-6 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                        <span className="text-sm text-gray-400 truncate max-w-[100px]">
                          {featuredMatch.homeTeam.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-400" />
                        <span className="text-sm text-gray-400 truncate max-w-[100px]">
                          {featuredMatch.awayTeam.name}
                        </span>
                      </div>
                    </div>

                    {/* Radar Chart */}
                    <div className="h-56 mb-6">
                      <RadarChart
                        homeStats={stats.home}
                        awayStats={stats.away}
                        theme="neon"
                      />
                    </div>
                  </>
                ) : (
                  <div className="h-56 mb-6 flex items-center justify-center">
                    <p className="text-gray-500">No match selected</p>
                  </div>
                )}

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
                      <span className="text-emerald-400">82% accuracy last 7 days</span>
                      <ArrowUpRight className="w-3 h-3 text-emerald-400 ml-auto" />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-emerald-400">15 correct predictions streak</span>
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
                  <div className="flex items-center gap-2">
                    {featuredMatch && isMatchLive(featuredMatch) && (
                      <span className="flex items-center gap-1 text-red-500 text-sm font-bold">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        LIVE
                      </span>
                    )}
                    {!featuredMatch || !isMatchLive(featuredMatch) && (
                      <span className="text-emerald-400 text-sm font-semibold">FEATURED MATCH</span>
                    )}
                  </div>
                  <span className="text-gray-500 text-sm">
                    {featuredMatch?.league || 'No matches'}
                  </span>
                </div>

                {/* Teams */}
                <div className="p-6">
                  {featuredMatch ? (
                    <>
                      <div className="text-center mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                          {featuredMatch.homeTeam.name.toUpperCase()} VS. {featuredMatch.awayTeam.name.toUpperCase()}
                        </h2>
                        <p className="text-gray-400 text-sm">
                          {formatMatchDate(featuredMatch.matchDate)}
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-4 md:gap-8 mb-6">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="text-center"
                        >
                          <TeamBadge team={featuredMatch.homeTeam} />
                        </motion.div>

                        {isMatchLive(featuredMatch) ? (
                          <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-red-400">
                              {featuredMatch.homeScore ?? 0} : {featuredMatch.awayScore ?? 0}
                            </div>
                            {featuredMatch.minute && (
                              <span className="text-red-500 text-sm">{featuredMatch.minute}'</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-3xl font-bold text-gray-600">VS</div>
                        )}

                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="text-center"
                        >
                          <TeamBadge team={featuredMatch.awayTeam} />
                        </motion.div>
                      </div>

                      {/* AI Win Probability */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">AI WIN PROBABILITY:</span>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xl md:text-2xl font-bold neon-gradient">
                            {prediction.homeWin}% {featuredMatch.homeTeam.name.split(' ')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-gray-800">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${prediction.homeWin}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-l-full"
                          />
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${prediction.draw}%` }}
                            transition={{ duration: 1, delay: 0.7 }}
                            className="bg-gray-600"
                          />
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${prediction.awayWin}%` }}
                            transition={{ duration: 1, delay: 0.9 }}
                            className="bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-r-full"
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                          <span>DRAW: {prediction.draw}%</span>
                          <span>{featuredMatch.awayTeam.name.split(' ')[0].toUpperCase()}: {prediction.awayWin}%</span>
                        </div>
                      </div>

                      {/* Probability chart */}
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
                      <Link href={`/match/${featuredMatch.id}`}>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full btn-primary rounded-xl py-4 flex items-center justify-center gap-2"
                        >
                          <BarChart3 className="w-5 h-5" />
                          VIEW ANALYSIS & BET
                        </motion.button>
                      </Link>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-400">No matches available</p>
                      <Link href="/matches" className="text-emerald-400 text-sm hover:underline mt-2 block">
                        View all matches
                      </Link>
                    </div>
                  )}
                </div>

                {/* Upcoming Matches */}
                {upcomingMatches.length > 1 && (
                  <div className="p-4 border-t border-white/10 bg-white/5">
                    <h4 className="text-sm font-semibold text-gray-400 mb-3">UPCOMING TODAY</h4>
                    <div className="space-y-2">
                      {upcomingMatches.slice(1, 4).map((match) => (
                        <Link key={match.id} href={`/match/${match.id}`}>
                          <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <span className="text-gray-300 truncate max-w-[60%]">
                              {match.homeTeam.name} vs {match.awayTeam.name}
                            </span>
                            <span className="text-emerald-400">{formatMatchDate(match.matchDate)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
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
                  <h3 className="font-bold text-white">BETTING MARKETS</h3>
                  {liveMatches.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                      <Radio size={12} />
                      {liveMatches.length} LIVE
                    </span>
                  )}
                </div>

                {/* Markets */}
                <div className="space-y-4 mb-6">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">Match Winner</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors">
                        <div className="text-xs text-gray-400 mb-1">Home</div>
                        <div className="text-lg font-bold text-emerald-400">1.85</div>
                      </button>
                      <button className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="text-xs text-gray-400 mb-1">Draw</div>
                        <div className="text-lg font-bold text-white">3.60</div>
                      </button>
                      <button className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="text-xs text-gray-400 mb-1">Away</div>
                        <div className="text-lg font-bold text-white">4.20</div>
                      </button>
                    </div>
                  </div>

                  {[
                    { name: 'Over 2.5 Goals', value: 'Total Goals', odds: 1.75, tag: 'POPULAR' },
                    { name: 'Both Teams Score', value: 'BTTS Yes', odds: 1.65, tag: 'HOT' },
                    { name: 'First Half Goals', value: 'Over 0.5', odds: 1.30, tag: 'SAFE' },
                  ].map((market, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                      <div>
                        <p className="text-sm text-white">{market.name}</p>
                        <p className="text-xs text-gray-500">{market.value}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400">
                          {market.odds.toFixed(2)}
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

                {/* Live Matches Quick Access */}
                {liveMatches.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <Link href="/live">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Radio className="w-5 h-5 text-red-400" />
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{liveMatches.length} Live Matches</p>
                            <p className="text-red-400 text-xs">Watch & bet now</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-red-400" />
                      </motion.div>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { icon: Calendar, label: 'All Matches', href: '/matches', color: 'from-emerald-500 to-emerald-600' },
            { icon: Zap, label: 'Live Now', href: '/live', color: 'from-red-500 to-red-600', badge: liveMatches.length > 0 ? liveMatches.length : null },
            { icon: Brain, label: 'AI Chat', href: '/ai-chat', color: 'from-cyan-500 to-cyan-600' },
            { icon: BarChart3, label: 'My Stats', href: '/stats', color: 'from-purple-500 to-purple-600' },
          ].map((action, index) => (
            <Link key={index} href={action.href}>
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="card-neon rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-emerald-500/30"
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} relative`}>
                  <action.icon className="w-5 h-5 text-white" />
                  {action.badge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {action.badge}
                    </span>
                  )}
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

// Team Badge Component - FIFA Card Style with Neon Glow
function TeamBadge({ team }: { team: { name: string; logo?: string } }) {
  const [imgError, setImgError] = useState(false);
  const bgColor = TEAM_COLORS[team.name] || '#10b981';

  if (team.logo && !imgError) {
    return (
      <div className="relative group">
        {/* Neon glow background */}
        <div
          className="absolute inset-0 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"
          style={{ background: `radial-gradient(circle, ${bgColor}80 0%, transparent 70%)` }}
        />
        {/* Main container - dark background */}
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gray-900/90 backdrop-blur-sm p-2 md:p-3 mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
          <img
            src={team.logo}
            alt={team.name}
            className="w-full h-full object-contain drop-shadow-lg"
            onError={() => setImgError(true)}
          />
        </div>
      </div>
    );
  }

  // Fallback with team color gradient
  return (
    <div className="relative group">
      <div
        className="absolute inset-0 rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity"
        style={{ background: `radial-gradient(circle, ${bgColor}80 0%, transparent 70%)` }}
      />
      <div
        className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto border border-white/20"
        style={{
          background: `linear-gradient(135deg, ${bgColor}, ${bgColor}99)`,
          boxShadow: `0 4px 30px ${bgColor}40, inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}
      >
        {team.name.substring(0, 3).toUpperCase()}
      </div>
    </div>
  );
}
