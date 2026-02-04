'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio, Loader2, RefreshCw, Bot, Clock } from 'lucide-react';
import Link from 'next/link';

interface LiveMatch {
  id: number;
  homeTeam: { name: string; logo?: string };
  awayTeam: { name: string; logo?: string };
  league: string;
  leagueCode: string;
  matchDate: string;
  status: string;
  homeScore: number;
  awayScore: number;
  minute?: number;
}

export default function LiveMatchesPage() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchLiveMatches();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLiveMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveMatches = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/matches/live');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setMatches(data);
    } catch (err) {
      // Mock data for demo
      setMatches([
        { id: 101, homeTeam: { name: 'Arsenal' }, awayTeam: { name: 'Chelsea' }, league: 'Premier League', leagueCode: 'PL', matchDate: new Date().toISOString(), status: 'IN_PLAY', homeScore: 2, awayScore: 1, minute: 67 },
        { id: 102, homeTeam: { name: 'Real Madrid' }, awayTeam: { name: 'Atletico' }, league: 'La Liga', leagueCode: 'PD', matchDate: new Date().toISOString(), status: 'IN_PLAY', homeScore: 1, awayScore: 1, minute: 45 },
      ]);
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Radio className="w-8 h-8 text-red-500" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full live-pulse" />
              </div>
              <h1 className="text-3xl font-bold">Live Matches</h1>
            </div>

            <button
              onClick={fetchLiveMatches}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {lastUpdated && (
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <Clock size={14} />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </motion.div>

        {/* Live Matches */}
        {isLoading && matches.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : matches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 glass-card"
          >
            <Radio className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Live Matches</h2>
            <p className="text-gray-400">There are no matches currently in play</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {matches.map((match, index) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <LiveMatchCard match={match} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveMatchCard({ match }: { match: LiveMatch }) {
  return (
    <Link href={`/match/${match.id}`}>
      <div className="glass-card p-6 hover:border-red-500/50 transition-all cursor-pointer group">
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {match.homeTeam.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{match.homeTeam.name}</h3>
                <span className="text-sm text-gray-400">Home</span>
              </div>
            </div>
          </div>

          {/* Score & Status */}
          <div className="text-center px-8">
            <div className="flex items-center gap-1 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500 live-pulse" />
              <span className="text-red-500 text-sm font-medium">{match.minute}&apos;</span>
            </div>
            <div className="flex items-center gap-4 text-4xl font-bold">
              <span className="text-accent">{match.homeScore}</span>
              <span className="text-gray-600">:</span>
              <span className="text-accent">{match.awayScore}</span>
            </div>
            <span className="text-sm text-gray-400 mt-2">{match.league}</span>
          </div>

          {/* Away Team */}
          <div className="flex-1">
            <div className="flex items-center gap-4 justify-end">
              <div className="text-right">
                <h3 className="font-semibold text-lg">{match.awayTeam.name}</h3>
                <span className="text-sm text-gray-400">Away</span>
              </div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {match.awayTeam.name.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* AI Button */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <button className="w-full py-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2 font-medium">
            <Bot size={20} />
            Get Live AI Analysis
          </button>
        </div>
      </div>
    </Link>
  );
}
