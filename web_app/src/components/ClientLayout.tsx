'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeProvider } from './ThemeProvider';
import { ThemedNavbar } from './ThemedNavbar';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';

interface ClientLayoutProps {
  children: React.ReactNode;
}

// Public routes that don't require auth
const PUBLIC_ROUTES = ['/select-style', '/login'];

function LayoutContent({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasSelectedTheme } = useThemeStore();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  // Wait for zustand hydration
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Check auth on mount
  useEffect(() => {
    if (hydrated) {
      checkAuth();
    }
  }, [hydrated, checkAuth]);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isLoginPage = pathname === '/login';

  // Handle routing logic after hydration
  useEffect(() => {
    if (!hydrated) return;

    // Public routes - allow access
    if (isPublicRoute) {
      // If on login and already authenticated, go to home
      if (isLoginPage && isAuthenticated && hasSelectedTheme) {
        router.replace('/');
      }
      return;
    }

    // Protected routes - check requirements
    // Must select theme first
    if (!hasSelectedTheme) {
      router.replace('/select-style');
      return;
    }

    // Must be authenticated
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
  }, [hydrated, pathname, hasSelectedTheme, isAuthenticated, isPublicRoute, isLoginPage, router]);

  // Show navbar only for authenticated users on non-public routes
  const showNavbar = hydrated && !isPublicRoute && hasSelectedTheme && isAuthenticated;

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
