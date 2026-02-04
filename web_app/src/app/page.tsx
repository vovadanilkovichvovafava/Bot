'use client';

import { motion } from 'framer-motion';
import { useThemeStore } from '@/store/themeStore';
import { CinematicHome } from '@/components/themes/CinematicHome';
import { NeonHome } from '@/components/themes/NeonHome';
import { StadiumHome } from '@/components/themes/StadiumHome';

export default function HomePage() {
  const { selectedTheme } = useThemeStore();

  if (selectedTheme === 'cinematic') {
    return <CinematicHome />;
  }

  if (selectedTheme === 'neon') {
    return <NeonHome />;
  }

  if (selectedTheme === 'stadium') {
    return <StadiumHome />;
  }

  // Fallback loading
  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
      />
    </div>
  );
}
