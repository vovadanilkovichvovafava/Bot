'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BottomTabBar } from './BottomTabBar';
import { useAuthStore } from '@/store/authStore';

interface ClientLayoutProps {
  children: React.ReactNode;
}

// Public routes that don't require auth
const PUBLIC_ROUTES = ['/login'];

function LayoutContent({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
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
      if (isLoginPage && isAuthenticated) {
        router.replace('/');
      }
      return;
    }

    // Protected routes - must be authenticated
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
  }, [hydrated, pathname, isAuthenticated, isPublicRoute, isLoginPage, router]);

  // Show bottom tab bar only for authenticated users on non-public routes
  const showBottomBar = hydrated && !isPublicRoute && isAuthenticated;

  return (
    <>
      <main className={showBottomBar ? 'min-h-screen pb-20' : 'min-h-screen'}>
        {children}
      </main>
      {showBottomBar && <BottomTabBar />}
    </>
  );
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return <LayoutContent>{children}</LayoutContent>;
}
