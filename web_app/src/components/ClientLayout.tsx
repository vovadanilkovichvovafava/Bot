'use client';

import { usePathname } from 'next/navigation';
import { ThemeProvider } from './ThemeProvider';
import { ThemedNavbar } from './ThemedNavbar';
import { useThemeStore } from '@/store/themeStore';

interface ClientLayoutProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const { hasSelectedTheme, selectedTheme } = useThemeStore();

  const isStyleSelector = pathname === '/select-style';
  const showNavbar = hasSelectedTheme && !isStyleSelector;

  return (
    <>
      {showNavbar && <ThemedNavbar />}
      <main className={showNavbar ? 'min-h-screen pt-16' : 'min-h-screen'}>
        {children}
      </main>
    </>
  );
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <ThemeProvider>
      <LayoutContent>{children}</LayoutContent>
    </ThemeProvider>
  );
}
