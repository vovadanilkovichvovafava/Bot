'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, ArrowRight } from 'lucide-react';

// Featured match data
const FEATURED_MATCH = {
  id: '1',
  homeTeam: {
    name: 'Manchester City',
    shortName: 'Man City',
    logo: 'https://media.api-sports.io/football/teams/50.png',
    color: '#6CABDD',
    bgColor: '#6CABDD',
  },
  awayTeam: {
    name: 'Real Madrid',
    shortName: 'Real Madrid',
    logo: 'https://media.api-sports.io/football/teams/541.png',
    color: '#FEBE10',
    bgColor: '#D4A017',
  },
  aiPrediction: {
    confidence: 42,
    score: '3-1',
    verdict: 'Slight advantage — Home side',
  },
};

const TOP_LEAGUES = [
  {
    name: 'Premier League',
    logo: 'https://media.api-sports.io/football/leagues/39.png',
  },
  {
    name: 'LaLiga',
    logo: 'https://media.api-sports.io/football/leagues/140.png',
  },
  {
    name: 'Serie A',
    logo: 'https://media.api-sports.io/football/leagues/135.png',
  },
  {
    name: 'Bundesliga',
    logo: 'https://media.api-sports.io/football/leagues/78.png',
  },
  {
    name: 'Ligue 1',
    logo: 'https://media.api-sports.io/football/leagues/61.png',
  },
];

export function StadiumHome() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Stadium image URLs - fallback chain
  const stadiumImages = [
    'https://images.pexels.com/photos/46798/the-ball-stadance-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1920',
    'https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg?auto=compress&cs=tinysrgb&w=1920',
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Stadium Background - Using img tag for better compatibility */}
      <div className="absolute inset-0 z-0">
        {/* Primary stadium image */}
        <img
          src={stadiumImages[0]}
          alt="Stadium"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 40%' }}
          onError={(e) => {
            // Fallback to second image
            (e.target as HTMLImageElement).src = stadiumImages[1];
          }}
        />

        {/* Dark overlay with gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/90" />

        {/* Floodlight glow effects */}
        <div className="absolute top-0 left-[10%] w-80 h-[500px] bg-white/20 blur-[120px] rounded-full" />
        <div className="absolute top-0 right-[10%] w-80 h-[500px] bg-white/20 blur-[120px] rounded-full" />
        <div className="absolute top-0 left-[40%] w-60 h-96 bg-white/10 blur-[100px] rounded-full" />
        <div className="absolute top-0 right-[40%] w-60 h-96 bg-white/10 blur-[100px] rounded-full" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        {/* Header Text */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : -20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-4"
        >
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
            Спроси ИИ, кто победит сегодня?
          </h1>

          {/* CTA Button */}
          <Link href="/ai-chat">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="bg-white/90 hover:bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg inline-flex items-center gap-3 shadow-xl transition-all"
            >
              <MessageSquare className="w-5 h-5" />
              ЗАДАТЬ ВОПРОС AI
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
        </motion.div>

        {/* Stadium Banners Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: mounted ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative flex items-start justify-center gap-6 md:gap-16 lg:gap-24 mt-8 mb-6"
        >
          {/* Home Team Banner */}
          <div className="relative">
            {/* Hanging rod */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-[90%] h-2 bg-gradient-to-r from-gray-600 via-gray-400 to-gray-600 rounded-full shadow-lg z-10" />
            <div className="absolute -top-3 left-[10%] w-2 h-6 bg-gray-500 rounded-b-lg shadow-md z-20" />
            <div className="absolute -top-3 right-[10%] w-2 h-6 bg-gray-500 rounded-b-lg shadow-md z-20" />

            {/* Banner fabric */}
            <motion.div
              animate={{
                rotateZ: [-0.5, 0.5, -0.5],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: 'top center' }}
              className="relative w-40 h-56 md:w-52 md:h-72 lg:w-60 lg:h-80"
            >
              {/* Banner with fabric texture */}
              <div
                className="absolute inset-0 rounded-b-lg overflow-hidden shadow-2xl"
                style={{
                  background: `linear-gradient(180deg, ${FEATURED_MATCH.homeTeam.bgColor} 0%, ${FEATURED_MATCH.homeTeam.bgColor}dd 100%)`,
                  border: `3px solid ${FEATURED_MATCH.homeTeam.color}`,
                  borderTop: 'none',
                }}
              >
                {/* Fabric fold effects */}
                <div className="absolute inset-0 opacity-30"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 20%, transparent 40%, rgba(0,0,0,0.1) 60%, transparent 80%, rgba(255,255,255,0.2) 100%)`,
                  }}
                />

                {/* Wave effect on fabric */}
                <motion.div
                  animate={{
                    x: [-5, 5, -5],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 flex items-center justify-center p-8"
                >
                  <img
                    src={FEATURED_MATCH.homeTeam.logo}
                    alt={FEATURED_MATCH.homeTeam.name}
                    className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 object-contain drop-shadow-2xl"
                  />
                </motion.div>
              </div>

              {/* Bottom tassels/fringe */}
              <div className="absolute -bottom-2 left-2 right-2 flex justify-between">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ rotateZ: [-5, 5, -5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
                    className="w-1 h-4 rounded-b-full"
                    style={{ backgroundColor: FEATURED_MATCH.homeTeam.color }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Team name */}
            <p className="mt-6 text-center text-white font-bold text-xl md:text-2xl drop-shadow-lg">
              {FEATURED_MATCH.homeTeam.shortName}
            </p>
          </div>

          {/* Score Display */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: mounted ? 1 : 0, opacity: mounted ? 1 : 0 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            className="self-center text-center py-8"
          >
            <div className="text-6xl md:text-8xl lg:text-9xl font-bold text-white drop-shadow-2xl">
              {FEATURED_MATCH.aiPrediction.score}
            </div>
          </motion.div>

          {/* Away Team Banner */}
          <div className="relative">
            {/* Hanging rod */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-[90%] h-2 bg-gradient-to-r from-gray-600 via-gray-400 to-gray-600 rounded-full shadow-lg z-10" />
            <div className="absolute -top-3 left-[10%] w-2 h-6 bg-gray-500 rounded-b-lg shadow-md z-20" />
            <div className="absolute -top-3 right-[10%] w-2 h-6 bg-gray-500 rounded-b-lg shadow-md z-20" />

            {/* Banner fabric */}
            <motion.div
              animate={{
                rotateZ: [0.5, -0.5, 0.5],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              style={{ transformOrigin: 'top center' }}
              className="relative w-40 h-56 md:w-52 md:h-72 lg:w-60 lg:h-80"
            >
              {/* Banner with fabric texture */}
              <div
                className="absolute inset-0 rounded-b-lg overflow-hidden shadow-2xl"
                style={{
                  background: `linear-gradient(180deg, ${FEATURED_MATCH.awayTeam.bgColor} 0%, ${FEATURED_MATCH.awayTeam.bgColor}dd 100%)`,
                  border: `3px solid ${FEATURED_MATCH.awayTeam.color}`,
                  borderTop: 'none',
                }}
              >
                {/* Fabric fold effects */}
                <div className="absolute inset-0 opacity-30"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 20%, transparent 40%, rgba(0,0,0,0.1) 60%, transparent 80%, rgba(255,255,255,0.2) 100%)`,
                  }}
                />

                {/* Wave effect on fabric */}
                <motion.div
                  animate={{
                    x: [5, -5, 5],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center p-8"
                >
                  <img
                    src={FEATURED_MATCH.awayTeam.logo}
                    alt={FEATURED_MATCH.awayTeam.name}
                    className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 object-contain drop-shadow-2xl"
                  />
                </motion.div>
              </div>

              {/* Bottom tassels/fringe */}
              <div className="absolute -bottom-2 left-2 right-2 flex justify-between">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ rotateZ: [5, -5, 5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
                    className="w-1 h-4 rounded-b-full"
                    style={{ backgroundColor: FEATURED_MATCH.awayTeam.color }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Team name */}
            <p className="mt-6 text-center text-white font-bold text-xl md:text-2xl drop-shadow-lg">
              {FEATURED_MATCH.awayTeam.shortName}
            </p>
          </div>
        </motion.div>

        {/* AI Verdict Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
          transition={{ delay: 0.7 }}
          className="max-w-lg mx-auto mb-12"
        >
          <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-xl p-5 text-center">
            {/* AI VERDICT label */}
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="h-px flex-1 bg-white/30" />
              <span className="text-indigo-300 text-sm font-semibold tracking-wider px-3 py-1 bg-indigo-500/20 rounded-full border border-indigo-500/30">
                AI VERDICT
              </span>
              <div className="h-px flex-1 bg-white/30" />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-3xl md:text-4xl font-bold text-indigo-400">
                {FEATURED_MATCH.aiPrediction.confidence}%
              </span>
              <span className="text-gray-400 text-lg">vs</span>
              <span className="text-3xl md:text-4xl font-bold text-white">
                {FEATURED_MATCH.aiPrediction.score}
              </span>
            </div>

            <p className="text-gray-300">{FEATURED_MATCH.aiPrediction.verdict}</p>
          </div>
        </motion.div>

        {/* Top 5 Leagues */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 30 }}
          transition={{ delay: 0.9 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-white text-center mb-6 tracking-wide">
            ТОP-5 ЛИГ
          </h2>

          <div className="flex justify-center items-center gap-2 md:gap-4 flex-wrap">
            {TOP_LEAGUES.map((league, index) => (
              <motion.div
                key={league.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
              >
                <Link href={`/matches?league=${league.name.toLowerCase().replace(' ', '-')}`}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white rounded-xl px-4 py-3 md:px-6 md:py-4 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer min-w-[100px] md:min-w-[120px]"
                  >
                    <img
                      src={league.logo}
                      alt={league.name}
                      className="w-10 h-10 md:w-14 md:h-14 object-contain"
                    />
                    <span className="text-xs md:text-sm font-semibold text-gray-800 text-center whitespace-nowrap">
                      {league.name}
                    </span>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
