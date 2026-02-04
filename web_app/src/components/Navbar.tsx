'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Home, Calendar, Radio, Bot, User, Menu, X } from 'lucide-react';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d0d14]/95 backdrop-blur-md border-b border-[#d4af37]/20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-gradient-to-br from-[#d4af37] to-[#996515] flex items-center justify-center shadow-lg">
              <span className="text-[#0d0d14] font-bold text-lg">BP</span>
            </div>
            <span className="font-bold text-xl tracking-wide text-[#d4af37] hidden sm:block">
              BETPREDICT
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/" icon={<Home size={18} />} label="Home" />
            <NavLink href="/matches" icon={<Calendar size={18} />} label="Matches" />
            <NavLink href="/live" icon={<Radio size={18} />} label="Live" isLive />
            <NavLink href="/ai-chat" icon={<Bot size={18} />} label="AI Chat" />
          </div>

          {/* Auth Button */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden sm:flex items-center gap-2 px-5 py-2 border border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors uppercase text-sm font-semibold tracking-wider"
            >
              <User size={16} />
              Sign In
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-[#d4af37]"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#0d0d14]/98 border-t border-[#d4af37]/20">
          <div className="px-4 py-4 space-y-2">
            <MobileNavLink href="/" icon={<Home size={20} />} label="Home" onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink href="/matches" icon={<Calendar size={20} />} label="Matches" onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink href="/live" icon={<Radio size={20} />} label="Live" isLive onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink href="/ai-chat" icon={<Bot size={20} />} label="AI Chat" onClick={() => setIsMenuOpen(false)} />
            <MobileNavLink href="/login" icon={<User size={20} />} label="Sign In" onClick={() => setIsMenuOpen(false)} />
          </div>
        </div>
      )}
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
      className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-[#d4af37] transition-colors uppercase text-sm font-medium tracking-wider"
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
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isLive?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-[#d4af37] hover:bg-[#d4af37]/5 transition-colors uppercase text-sm font-medium tracking-wider border-b border-[#d4af37]/10"
    >
      {icon}
      <span>{label}</span>
      {isLive && (
        <span className="w-2 h-2 rounded-full bg-red-500 live-pulse ml-auto" />
      )}
    </Link>
  );
}
