'use client';

import { motion } from 'framer-motion';
import { Bot, Clock } from 'lucide-react';
import Link from 'next/link';

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

export function MatchCard({ match }: { match: Match }) {
  const matchTime = new Date(match.matchDate);
  const isLive = match.status === 'IN_PLAY' || match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <Link href={`/match/${match.id}`}>
      <motion.div
        className="match-card glass-card p-6 cursor-pointer group"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* League & Status */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-accent font-medium">{match.league}</span>
          {isLive ? (
            <span className="flex items-center gap-1 text-red-500 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500 live-pulse" />
              LIVE
            </span>
          ) : isFinished ? (
            <span className="text-gray-400 text-sm">FT</span>
          ) : (
            <span className="flex items-center gap-1 text-gray-400 text-sm">
              <Clock size={14} />
              {formatTime(matchTime)}
            </span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex-1 text-center">
            <TeamEmblem name={match.homeTeam.name} logo={match.homeTeam.logo} />
            <p className="mt-2 font-medium truncate">{match.homeTeam.name}</p>
          </div>

          {/* Score or VS */}
          <div className="px-4">
            {isLive || isFinished ? (
              <div className="flex items-center gap-2 text-2xl font-bold">
                <span className={isLive ? 'text-accent' : ''}>{match.homeScore ?? 0}</span>
                <span className="text-gray-500">:</span>
                <span className={isLive ? 'text-accent' : ''}>{match.awayScore ?? 0}</span>
              </div>
            ) : (
              <span className="text-gray-500 font-medium">VS</span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 text-center">
            <TeamEmblem name={match.awayTeam.name} logo={match.awayTeam.logo} />
            <p className="mt-2 font-medium truncate">{match.awayTeam.name}</p>
          </div>
        </div>

        {/* AI Button */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <button className="w-full py-2 px-4 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex items-center justify-center gap-2 group-hover:bg-accent group-hover:text-primary-dark">
            <Bot size={18} />
            <span>Get AI Prediction</span>
          </button>
        </div>
      </motion.div>
    </Link>
  );
}

function TeamEmblem({ name, logo }: { name: string; logo?: string }) {
  // Generate color based on team name
  const colors: Record<string, string> = {
    Arsenal: '#EF0107',
    Chelsea: '#034694',
    'Manchester United': '#DA291C',
    'Manchester City': '#6CABDD',
    Liverpool: '#C8102E',
    Tottenham: '#132257',
    'Real Madrid': '#FEBE10',
    Barcelona: '#A50044',
    'Bayern Munich': '#DC052D',
    Dortmund: '#FDE100',
    PSG: '#004170',
    Juventus: '#000000',
  };

  const bgColor = colors[name] || '#38003c';

  if (logo) {
    return (
      <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-white/10">
        <img src={logo} alt={name} className="w-full h-full object-contain p-2" />
      </div>
    );
  }

  return (
    <div
      className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${bgColor}, ${bgColor}99)`,
        boxShadow: `0 4px 20px ${bgColor}44`,
      }}
    >
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
}
