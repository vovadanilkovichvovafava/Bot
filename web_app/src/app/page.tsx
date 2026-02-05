'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  Sparkles,
  MessageSquare,
  Trophy,
  Target,
  TrendingUp,
  ChevronRight,
  Zap,
  BarChart3,
  Brain,
  Crown
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated) {
    return null;
  }

  const predictionsUsed = user?.dailyRequests || 0;
  const predictionsLimit = user?.dailyLimit || 3;
  const predictionsLeft = Math.max(0, predictionsLimit - predictionsUsed);
  const totalPredictions = user?.totalPredictions || 0;
  const correctPredictions = user?.correctPredictions || 0;
  const accuracy = user?.accuracy || 0;
  const userName = user?.username || user?.email?.split('@')[0] || 'User';

  const proTools = [
    {
      id: 'value-bets',
      name: 'Value Bets',
      icon: TrendingUp,
      color: 'from-emerald-500 to-green-600',
      description: 'Find undervalued odds'
    },
    {
      id: 'live-scanner',
      name: 'Live Scanner',
      icon: Zap,
      color: 'from-orange-500 to-red-500',
      description: 'Real-time match alerts'
    },
    {
      id: 'stats-hub',
      name: 'Stats Hub',
      icon: BarChart3,
      color: 'from-blue-500 to-indigo-600',
      description: 'Deep match analysis'
    },
    {
      id: 'ai-insights',
      name: 'AI Insights',
      icon: Brain,
      color: 'from-purple-500 to-pink-500',
      description: 'ML-powered tips'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-[#3B5998] via-[#4A66A0] to-[#6B5B95] px-4 pt-12 pb-8">
        <div className="max-w-lg mx-auto">
          {/* Greeting */}
          <div className="mb-6">
            <p className="text-white/70 text-sm">Welcome back,</p>
            <h1 className="text-white text-2xl font-bold">{userName}</h1>
          </div>

          {/* AI Predictions Counter */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">AI Predictions</p>
                  <p className="text-white text-2xl font-bold">{predictionsLeft} <span className="text-sm font-normal text-white/70">left today</span></p>
                </div>
              </div>
              {!user?.isPremium && (
                <Link
                  href="/settings"
                  className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1 shadow-lg"
                >
                  <Crown className="w-4 h-4" />
                  Get Unlimited
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 -mt-4 pb-8">
        <div className="max-w-lg mx-auto space-y-4">

          {/* Ask AI Assistant Card */}
          <Link href="/ai-chat">
            <div className="bg-gradient-to-r from-[#6B5B95] to-[#8B7BB5] rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-white font-bold text-lg">Ask AI Assistant</h2>
                  <p className="text-white/70 text-sm">Get predictions for any match</p>
                </div>
                <ChevronRight className="w-6 h-6 text-white/50" />
              </div>
            </div>
          </Link>

          {/* Your Stats */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-900 font-bold text-lg">Your Stats</h2>
              <Link href="/settings" className="text-[#3B5998] text-sm font-medium">View All</Link>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-[#3B5998]/10 flex items-center justify-center mx-auto mb-2">
                  <Target className="w-6 h-6 text-[#3B5998]" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalPredictions}</p>
                <p className="text-xs text-gray-500">Predictions</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                  <Trophy className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{correctPredictions}</p>
                <p className="text-xs text-gray-500">Wins</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="w-6 h-6 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{accuracy.toFixed(0)}%</p>
                <p className="text-xs text-gray-500">Accuracy</p>
              </div>
            </div>
          </div>

          {/* Pro Tools */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-900 font-bold text-lg">Pro Tools</h2>
              <Link href="/pro-tools" className="text-[#3B5998] text-sm font-medium">See All</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {proTools.map((tool) => (
                <Link
                  key={tool.id}
                  href={`/pro-tools?tab=${tool.id}`}
                  className="flex-shrink-0 w-32"
                >
                  <div className={`bg-gradient-to-br ${tool.color} rounded-2xl p-4 h-32 flex flex-col justify-between`}>
                    <tool.icon className="w-8 h-8 text-white" />
                    <div>
                      <p className="text-white font-semibold text-sm">{tool.name}</p>
                      <p className="text-white/70 text-xs line-clamp-1">{tool.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/matches">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#3B5998]/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-[#3B5998]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Matches</p>
                    <p className="text-xs text-gray-500">View schedule</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/live">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Live Now</p>
                    <p className="text-xs text-gray-500">Watch live</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
