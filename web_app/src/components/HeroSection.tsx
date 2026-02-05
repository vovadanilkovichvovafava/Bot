'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

// Club banners with their colors - like EPL 2010 promo
const CLUB_BANNERS = [
  { id: 'arsenal', name: 'Arsenal', color: '#EF0107', accent: '#ffffff' },
  { id: 'chelsea', name: 'Chelsea', color: '#034694', accent: '#ffffff' },
  { id: 'manu', name: 'Man United', color: '#DA291C', accent: '#FBE122' },
  { id: 'mancity', name: 'Man City', color: '#6CABDD', accent: '#1C2C5B' },
  { id: 'liverpool', name: 'Liverpool', color: '#C8102E', accent: '#F6EB61' },
  { id: 'tottenham', name: 'Tottenham', color: '#132257', accent: '#ffffff' },
];

export function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden stadium-bg">
      {/* Stadium light beams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="light-beam w-[300px] h-[150vh] -rotate-[20deg] -left-20 -top-20 opacity-50" />
        <div className="light-beam w-[200px] h-[120vh] rotate-[15deg] right-10 -top-10 opacity-40" />
        <div className="light-beam w-[150px] h-[100vh] -rotate-[10deg] left-1/3 -top-10 opacity-30" />
      </div>

      {/* Banner Flags - EPL 2010 Style */}
      <div className="absolute inset-0 flex justify-between px-4 md:px-8 pt-20 pointer-events-none">
        {/* Left banners */}
        <div className="hidden lg:flex flex-col gap-8">
          {CLUB_BANNERS.slice(0, 3).map((club, index) => (
            <motion.div
              key={club.id}
              initial={{ y: -200, opacity: 0 }}
              animate={isLoaded ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 1, delay: index * 0.2, ease: 'easeOut' }}
            >
              <BannerFlag club={club} />
            </motion.div>
          ))}
        </div>

        {/* Right banners */}
        <div className="hidden lg:flex flex-col gap-8">
          {CLUB_BANNERS.slice(3, 6).map((club, index) => (
            <motion.div
              key={club.id}
              initial={{ y: -200, opacity: 0 }}
              animate={isLoaded ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 1, delay: 0.3 + index * 0.2, ease: 'easeOut' }}
            >
              <BannerFlag club={club} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="max-w-4xl"
        >
          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 text-shadow-dark">
            <span className="gradient-text">FOOTBALL</span>
            <br />
            <span className="text-white">PREDICTIONS</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto font-light">
            AI-powered match analysis inspired by the golden era of football
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/matches">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-gold text-lg px-10 py-4"
              >
                View Matches
              </motion.button>
            </Link>
            <Link href="/live">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-4 border-2 border-[#d4af37] text-[#d4af37] font-semibold uppercase tracking-wider hover:bg-[#d4af37]/10 transition-colors"
              >
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full live-pulse" />
                  Live Now
                </span>
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Features Row */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl"
        >
          <FeatureItem
            title="AI Analysis"
            description="Powered by advanced AI for accurate predictions"
          />
          <FeatureItem
            title="Live Updates"
            description="Real-time insights during matches"
          />
          <FeatureItem
            title="All Leagues"
            description="Premier League, La Liga, Serie A & more"
          />
        </motion.div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0d0d14] to-transparent" />
    </section>
  );
}

function BannerFlag({ club }: { club: typeof CLUB_BANNERS[0] }) {
  return (
    <div className="flag-wave">
      {/* Flag pole */}
      <div className="w-1 h-8 mx-auto bg-gradient-to-b from-[#d4af37] to-[#996515] rounded-full" />

      {/* Flag */}
      <div
        className="relative w-24 md:w-32"
        style={{
          background: `linear-gradient(180deg, ${club.color} 0%, ${club.color}dd 100%)`,
          borderRadius: '0 0 4px 4px',
          boxShadow: `0 10px 30px ${club.color}66, inset 0 0 30px rgba(0,0,0,0.3)`,
        }}
      >
        {/* Top border accent */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: club.accent }}
        />

        {/* Flag content */}
        <div className="py-8 px-4 text-center">
          <div
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ color: club.accent }}
          >
            {club.name.substring(0, 3).toUpperCase()}
          </div>
          <div className="w-8 h-8 mx-auto rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-xs font-bold" style={{ color: club.accent }}>FC</span>
          </div>
        </div>

        {/* Flag bottom point */}
        <div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '48px solid transparent',
            borderRight: '48px solid transparent',
            borderTop: `16px solid ${club.color}dd`,
          }}
        />
      </div>
    </div>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center">
      <h3 className="text-[#d4af37] text-lg font-semibold mb-2 uppercase tracking-wider">
        {title}
      </h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
