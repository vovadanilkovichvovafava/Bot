'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isStyleSelector = pathname === '/select-style';
  const isLoginPage = pathname === '/login';

  // Check auth on mount
  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsChecking(false);
    };
    init();
  }, [checkAuth]);

  // Handle routing logic
  useEffect(() => {
    if (isChecking || isLoading) return;

    // If on public route, no redirect needed
    if (isPublicRoute) {
      // But if on login and already authenticated, go to home
      if (isLoginPage && isAuthenticated && hasSelectedTheme) {
        router.replace('/');
      }
      return;
    }

    // For protected routes:
    // 1. Must have selected theme first
    if (!hasSelectedTheme) {
      router.replace('/select-style');
      return;
    }

    // 2. Must be authenticated
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
  }, [pathname, hasSelectedTheme, isAuthenticated, isChecking, isLoading, isPublicRoute, isLoginPage, router]);

  // Show loading while checking auth (only for protected routes)
  if (!isPublicRoute && (isChecking || isLoading)) {
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

  // Don't render protected content until auth is confirmed
  if (!isPublicRoute && (!hasSelectedTheme || !isAuthenticated)) {
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

  // Show navbar only for authenticated users on non-public routes
  const showNavbar = !isPublicRoute && hasSelectedTheme && isAuthenticated;

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
