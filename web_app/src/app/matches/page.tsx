'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Filter, Loader2, Search } from 'lucide-react';
import { MatchCard } from '@/components/MatchCard';

interface Match {
  id: number;
  homeTeam: { name: string; logo?: string };
  awayTeam: { name: string; logo?: string };
  league: string;
  leagueCode: string;
  matchDate: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
}

const LEAGUES = [
  { code: 'all', name: 'All Leagues' },
  { code: 'PL', name: 'Premier League' },
  { code: 'PD', name: 'La Liga' },
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'SA', name: 'Serie A' },
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'CL', name: 'Champions League' },
];

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/matches/today');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setMatches(data);
    } catch (err) {
      // Mock data for demo
      setMatches([
        { id: 1, homeTeam: { name: 'Arsenal' }, awayTeam: { name: 'Chelsea' }, league: 'Premier League', leagueCode: 'PL', matchDate: new Date().toISOString(), status: 'SCHEDULED' },
        { id: 2, homeTeam: { name: 'Liverpool' }, awayTeam: { name: 'Manchester City' }, league: 'Premier League', leagueCode: 'PL', matchDate: new Date().toISOString(), status: 'SCHEDULED' },
        { id: 3, homeTeam: { name: 'Real Madrid' }, awayTeam: { name: 'Barcelona' }, league: 'La Liga', leagueCode: 'PD', matchDate: new Date().toISOString(), status: 'SCHEDULED' },
        { id: 4, homeTeam: { name: 'Bayern Munich' }, awayTeam: { name: 'Dortmund' }, league: 'Bundesliga', leagueCode: 'BL1', matchDate: new Date().toISOString(), status: 'SCHEDULED' },
        { id: 5, homeTeam: { name: 'Juventus' }, awayTeam: { name: 'AC Milan' }, league: 'Serie A', leagueCode: 'SA', matchDate: new Date().toISOString(), status: 'SCHEDULED' },
        { id: 6, homeTeam: { name: 'PSG' }, awayTeam: { name: 'Marseille' }, league: 'Ligue 1', leagueCode: 'FL1', matchDate: new Date().toISOString(), status: 'SCHEDULED' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMatches = matches.filter((match) => {
    const matchesLeague = selectedLeague === 'all' || match.leagueCode === selectedLeague;
    const matchesSearch = searchQuery === '' ||
      match.homeTeam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.awayTeam.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLeague && matchesSearch;
  });

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-8 h-8 text-accent" />
            <h1 className="text-3xl font-bold">Matches</h1>
          </div>
          <p className="text-gray-400">
            Browse today&apos;s and upcoming matches, get AI predictions
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teams..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none transition-colors"
              />
            </div>

            {/* League Filter */}
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                {LEAGUES.map((league) => (
                  <option key={league.code} value={league.code} className="bg-gray-900">
                    {league.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Matches Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No matches found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((match, index) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <MatchCard match={match} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
