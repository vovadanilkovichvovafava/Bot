'use client';

import { useEffect, useState } from 'react';
import { useThemeStore } from '@/store/themeStore';
import { CinematicMatchDetail } from '@/components/themes/CinematicMatchDetail';
import { NeonMatchDetail } from '@/components/themes/NeonMatchDetail';
import { StadiumMatchDetail } from '@/components/themes/StadiumMatchDetail';

interface PageParams {
  params: { id: string };
}

export default function MatchDetailPage({ params }: PageParams) {
  const { selectedTheme } = useThemeStore();
  const [hydrated, setHydrated] = useState(false);
  const matchId = params.id;

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return null;
  }

  if (selectedTheme === 'cinematic') {
    return <CinematicMatchDetail matchId={matchId} />;
  }

  if (selectedTheme === 'neon') {
    return <NeonMatchDetail matchId={matchId} />;
  }

  if (selectedTheme === 'stadium') {
    return <StadiumMatchDetail matchId={matchId} />;
  }

  // Default to neon
  return <NeonMatchDetail matchId={matchId} />;
}
