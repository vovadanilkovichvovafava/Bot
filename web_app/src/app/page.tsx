'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { CinematicHome } from '@/components/themes/CinematicHome';
import { NeonHome } from '@/components/themes/NeonHome';
import { StadiumHome } from '@/components/themes/StadiumHome';

export default function HomePage() {
  const router = useRouter();
  const { selectedTheme, hasSelectedTheme } = useThemeStore();
  const { isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  // Wait for hydration
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Redirect logic
  useEffect(() => {
    if (!hydrated) return;

    if (!hasSelectedTheme) {
      router.replace('/select-style');
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
  }, [hydrated, hasSelectedTheme, isAuthenticated, router]);

  // Before hydration or if not ready, show themed content anyway
  // (redirects will happen if needed)
  if (!hydrated) {
    return null; // SSR - return nothing, client will hydrate
  }

  // Show themed home based on selection
  if (selectedTheme === 'cinematic') {
    return <CinematicHome />;
  }

  if (selectedTheme === 'neon') {
    return <NeonHome />;
  }

  if (selectedTheme === 'stadium') {
    return <StadiumHome />;
  }

  // Default - show stadium while redirect happens
  return <StadiumHome />;
}
