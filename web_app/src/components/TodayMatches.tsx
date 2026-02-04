'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { MatchCard } from './MatchCard';

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

export function TodayMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/matches/today');
      if (!response.ok) throw new Error('Failed to fetch matches');
      const data = await response.json();
      setMatches(data.slice(0, 6)); // Show only first 6
    } catch (err) {
      setError('Could not load matches');
      // Use mock data for demo
      setMatches([
        {
          id: 1,
          homeTeam: { name: 'Arsenal' },
          awayTeam: { name: 'Chelsea' },
          league: 'Premier League',
          leagueCode: 'PL',
          matchDate: new Date().toISOString(),
          status: 'SCHEDULED',
        },
        {
          id: 2,
          homeTeam: { name: 'Real Madrid' },
          awayTeam: { name: 'Barcelona' },
          league: 'La Liga',
          leagueCode: 'PD',
          matchDate: new Date().toISOString(),
          status: 'SCHEDULED',
        },
        {
          id: 3,
          homeTeam: { name: 'Bayern Munich' },
          awayTeam: { name: 'Dortmund' },
          league: 'Bundesliga',
          leagueCode: 'BL1',
          matchDate: new Date().toISOString(),
          status: 'SCHEDULED',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-accent" />
            <h2 className="text-2xl font-bold">Today&apos;s Matches</h2>
          </div>
          <Link
            href="/matches"
            className="flex items-center gap-1 text-accent hover:text-accent-light transition-colors"
          >
            View All
            <ChevronRight size={18} />
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No matches scheduled for today
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match, index) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <MatchCard match={match} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
