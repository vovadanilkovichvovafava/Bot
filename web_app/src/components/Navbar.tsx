'use client';

import Link from 'next/link';
import { Home, Calendar, Radio, Bot, User } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl gradient-text">BetPredict AI</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/" icon={<Home size={18} />} label="Home" />
            <NavLink href="/matches" icon={<Calendar size={18} />} label="Matches" />
            <NavLink href="/live" icon={<Radio size={18} />} label="Live" isLive />
            <NavLink href="/ai-chat" icon={<Bot size={18} />} label="AI Chat" />
          </div>

          {/* User */}
          <Link
            href="/login"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
          >
            <User size={18} />
            <span className="hidden sm:inline">Sign In</span>
          </Link>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden flex justify-around py-2 border-t border-white/10">
        <MobileNavLink href="/" icon={<Home size={20} />} label="Home" />
        <MobileNavLink href="/matches" icon={<Calendar size={20} />} label="Matches" />
        <MobileNavLink href="/live" icon={<Radio size={20} />} label="Live" isLive />
        <MobileNavLink href="/ai-chat" icon={<Bot size={20} />} label="AI" />
      </div>
    </nav>
  );
}

function NavLink({
  href,
  icon,
  label,
  isLive = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isLive?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
    >
      {icon}
      <span>{label}</span>
      {isLive && (
        <span className="w-2 h-2 rounded-full bg-red-500 live-pulse" />
      )}
    </Link>
  );
}

function MobileNavLink({
  href,
  icon,
  label,
  isLive = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isLive?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
    >
      <div className="relative">
        {icon}
        {isLive && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 live-pulse" />
        )}
      </div>
      <span>{label}</span>
    </Link>
  );
}
