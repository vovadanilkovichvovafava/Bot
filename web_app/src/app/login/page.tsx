'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://appbot-production-152e.up.railway.app';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = isLogin
        ? `${API_URL}/api/v1/auth/login`
        : `${API_URL}/api/v1/auth/register`;

      const body = isLogin
        ? { email: formData.email, password: formData.password }
        : { email: formData.email, password: formData.password, username: formData.username };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      // Store token and redirect
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 stadium-bg">
      {/* Light beams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="light-beam w-[200px] h-[100vh] -rotate-[15deg] left-10 top-0 opacity-30" />
        <div className="light-beam w-[150px] h-[80vh] rotate-[20deg] right-20 top-0 opacity-20" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-[#d4af37] mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        <div className="banner-card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded bg-gradient-to-br from-[#d4af37] to-[#996515] flex items-center justify-center shadow-xl">
              <User className="w-8 h-8 text-[#0d0d14]" />
            </div>
            <h1 className="text-3xl font-bold text-white uppercase tracking-wide">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h1>
            <p className="text-gray-400 mt-2">
              {isLogin ? 'Welcome back to the game' : 'Join the prediction arena'}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37]/50" size={20} />
                <input
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded bg-[#0d0d14] border border-[#d4af37]/20 text-white placeholder-gray-500 focus:border-[#d4af37] transition-colors"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37]/50" size={20} />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-12 pr-4 py-4 rounded bg-[#0d0d14] border border-[#d4af37]/20 text-white placeholder-gray-500 focus:border-[#d4af37] transition-colors"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37]/50" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-12 pr-12 py-4 rounded bg-[#0d0d14] border border-[#d4af37]/20 text-white placeholder-gray-500 focus:border-[#d4af37] transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#d4af37] transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-gold py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-400">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-[#d4af37] hover:text-[#f4d03f] transition-colors font-semibold"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-[#d4af37]/20" />
            <span className="text-gray-500 text-sm uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-[#d4af37]/20" />
          </div>

          {/* Guest Mode */}
          <Link
            href="/"
            className="block w-full py-4 border border-[#d4af37]/30 text-[#d4af37] text-center hover:bg-[#d4af37]/10 transition-colors uppercase font-semibold tracking-wider"
          >
            Continue as Guest
          </Link>
          <p className="text-center text-gray-500 text-xs mt-3">
            3 free AI predictions per day
          </p>
        </div>
      </motion.div>
    </div>
  );
}
