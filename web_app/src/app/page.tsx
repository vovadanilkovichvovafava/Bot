'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { CinematicHome } from '@/components/themes/CinematicHome';
import { NeonHome } from '@/components/themes/NeonHome';
import { StadiumHome } from '@/components/themes/StadiumHome';

export default function HomePage() {
  const router = useRouter();
  const { selectedTheme, hasSelectedTheme } = useThemeStore();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsChecking(false);
    };
    init();
  }, [checkAuth]);

  useEffect(() => {
    if (isChecking || isLoading) return;

    // Flow: select-style → login → home
    if (!hasSelectedTheme) {
      router.replace('/select-style');
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
  }, [hasSelectedTheme, isAuthenticated, isChecking, isLoading, router]);

  // Show loading while checking auth
  if (isChecking || isLoading || !hasSelectedTheme || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a12]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
        />
      </div>
    );
  }

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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a12]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
      />
    </div>
  );
}
