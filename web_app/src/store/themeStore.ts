'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeStyle = 'cinematic' | 'neon' | 'stadium' | null;

interface ThemeState {
  selectedTheme: ThemeStyle;
  hasSelectedTheme: boolean;
  setTheme: (theme: ThemeStyle) => void;
  resetTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      selectedTheme: 'stadium', // Default to stadium theme
      hasSelectedTheme: false,
      setTheme: (theme) => set({ selectedTheme: theme, hasSelectedTheme: true }),
      resetTheme: () => set({ selectedTheme: 'stadium', hasSelectedTheme: false }),
    }),
    {
      name: 'theme-storage',
    }
  )
);

// Theme configurations
export const themes = {
  cinematic: {
    name: 'Cinematic Broadcast',
    description: 'UEFA Champions League broadcast style',
    colors: {
      primary: '#d4af37',
      secondary: '#1a1a2e',
      accent: '#c9a227',
      background: '#0a0a12',
      surface: 'rgba(26, 26, 46, 0.9)',
      text: '#ffffff',
      textMuted: '#a0a0a0',
      border: 'rgba(212, 175, 55, 0.3)',
      glow: 'rgba(212, 175, 55, 0.5)',
    },
  },
  neon: {
    name: 'Neon Tech',
    description: 'Modern AI-powered sports tech',
    colors: {
      primary: '#00ff88',
      secondary: '#0d1117',
      accent: '#00d4ff',
      background: '#0a0e14',
      surface: 'rgba(22, 27, 34, 0.95)',
      text: '#e6edf3',
      textMuted: '#7d8590',
      border: 'rgba(0, 255, 136, 0.2)',
      glow: 'rgba(0, 255, 136, 0.4)',
    },
  },
  stadium: {
    name: 'Stadium Immersive',
    description: 'Feel the atmosphere of the stadium',
    colors: {
      primary: '#6366f1',
      secondary: '#1e1b4b',
      accent: '#818cf8',
      background: '#0f0f23',
      surface: 'rgba(30, 27, 75, 0.85)',
      text: '#ffffff',
      textMuted: '#a5b4fc',
      border: 'rgba(99, 102, 241, 0.3)',
      glow: 'rgba(99, 102, 241, 0.5)',
    },
  },
};
