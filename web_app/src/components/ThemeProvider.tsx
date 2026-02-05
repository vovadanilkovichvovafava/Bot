'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useThemeStore, themes, ThemeStyle } from '@/store/themeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { selectedTheme, hasSelectedTheme } = useThemeStore();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to style selector if no theme selected
  useEffect(() => {
    if (!hasSelectedTheme && pathname !== '/select-style') {
      router.push('/select-style');
    }
  }, [hasSelectedTheme, pathname, router]);

  // Apply theme CSS variables
  useEffect(() => {
    if (selectedTheme && themes[selectedTheme]) {
      const theme = themes[selectedTheme];
      const root = document.documentElement;

      // Set CSS variables
      Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
      });

      // Set theme class on body
      document.body.className = `theme-${selectedTheme}`;
    }
  }, [selectedTheme]);

  // Show nothing while checking theme (prevents flash)
  if (!hasSelectedTheme && pathname !== '/select-style') {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

// Hook to get current theme
export function useTheme() {
  const { selectedTheme } = useThemeStore();
  const theme = selectedTheme ? themes[selectedTheme] : null;

  return {
    theme,
    themeName: selectedTheme,
    colors: theme?.colors || themes.neon.colors,
    isCinematic: selectedTheme === 'cinematic',
    isNeon: selectedTheme === 'neon',
    isStadium: selectedTheme === 'stadium',
  };
}
