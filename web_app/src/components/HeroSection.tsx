'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from './AudioProvider';
import { Bot, Zap, TrendingUp, Shield } from 'lucide-react';
import Link from 'next/link';

// Top league emblems that will fall
const LEAGUE_EMBLEMS = [
  { id: 'pl', name: 'Premier League', color: '#38003c' },
  { id: 'laliga', name: 'La Liga', color: '#ee8707' },
  { id: 'bundesliga', name: 'Bundesliga', color: '#d20515' },
  { id: 'seriea', name: 'Serie A', color: '#024494' },
  { id: 'ligue1', name: 'Ligue 1', color: '#091c3e' },
  { id: 'ucl', name: 'Champions League', color: '#071d49' },
];

export function HeroSection() {
  const { playEpicMoment, isPlaying } = useAudio();
  const [showEmblems, setShowEmblems] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    // Start emblem animation after a short delay
    const timer = setTimeout(() => setShowEmblems(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleExperience = () => {
    if (!hasInteracted) {
      playEpicMoment();
      setHasInteracted(true);
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Falling Emblems Background */}
      <AnimatePresence>
        {showEmblems && (
          <div className="absolute inset-0 pointer-events-none">
            {LEAGUE_EMBLEMS.map((league, index) => (
              <FallingEmblem
                key={league.id}
                league={league}
                delay={index * 0.3}
                startX={15 + (index % 3) * 30 + Math.random() * 10}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Hero Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">AI-Powered</span>
            <br />
            <span className="text-white">Football Predictions</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Get intelligent match analysis, betting recommendations, and live insights powered by advanced AI
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/matches"
              onClick={handleExperience}
              className="px-8 py-4 bg-accent text-primary-dark font-bold rounded-xl hover:bg-accent-light transition-all transform hover:scale-105 fire-glow"
            >
              <span className="flex items-center gap-2 justify-center">
                <Zap size={20} />
                Get Predictions
              </span>
            </Link>

            <button
              onClick={handleExperience}
              className={`px-8 py-4 glass-card font-bold rounded-xl transition-all transform hover:scale-105 ${
                isPlaying ? 'border-fire text-fire' : 'border-accent/50 text-white hover:border-accent'
              }`}
            >
              <span className="flex items-center gap-2 justify-center">
                {isPlaying ? '🔥 FIRE!' : '🎵 Experience'}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <FeatureCard
            icon={<Bot className="w-8 h-8" />}
            title="AI Analysis"
            description="Claude-powered match predictions with detailed reasoning"
          />
          <FeatureCard
            icon={<TrendingUp className="w-8 h-8" />}
            title="Live Updates"
            description="Real-time analysis for in-play betting opportunities"
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Risk Management"
            description="Personalized recommendations based on your risk profile"
          />
        </motion.div>
      </div>

      {/* Gradient overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
    </section>
  );
}

function FallingEmblem({
  league,
  delay,
  startX,
}: {
  league: { id: string; name: string; color: string };
  delay: number;
  startX: number;
}) {
  return (
    <motion.div
      initial={{ y: '-100vh', x: `${startX}vw`, rotate: 0, opacity: 0 }}
      animate={{
        y: '100vh',
        rotate: 720,
        opacity: [0, 1, 1, 0.5, 0],
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        delay,
        ease: 'easeIn',
      }}
      className="absolute"
    >
      <div
        className="w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${league.color}, ${league.color}88)`,
          boxShadow: `0 0 30px ${league.color}66`,
        }}
      >
        {league.name.split(' ')[0]}
      </div>
    </motion.div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card p-6 text-center hover:border-accent/50 transition-colors">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center text-accent">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
