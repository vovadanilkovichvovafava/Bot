'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, MessageSquare, Sparkles, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/matches', label: 'Matches', icon: Trophy },
  { href: '/ai-chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/pro-tools', label: 'Pro Tools', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomTabBar() {
  const pathname = usePathname();

  // Don't show on login/auth pages
  if (pathname === '/login' || pathname === '/select-style') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href ||
            (tab.href !== '/' && pathname.startsWith(tab.href));
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center w-16 h-full touch-manipulation',
                'transition-all active:scale-95'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl transition-all',
                  isActive ? 'bg-[#3B5998]/10' : 'bg-transparent'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isActive ? 'text-[#3B5998]' : 'text-gray-400'
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] mt-0.5 font-medium transition-colors',
                  isActive ? 'text-[#3B5998]' : 'text-gray-400'
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
