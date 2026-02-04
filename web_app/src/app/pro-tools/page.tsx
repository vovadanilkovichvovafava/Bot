'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Zap, BarChart3, Brain, Crown, Lock,
  ChevronRight, Target, Percent, Activity
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const tools = [
  {
    id: 'value-bets',
    name: 'Value Bets',
    description: 'Find undervalued odds with positive expected value',
    icon: TrendingUp,
    color: 'from-emerald-500 to-green-600',
    features: ['AI-powered analysis', 'Real-time odds tracking', 'Bookmaker comparison'],
    isPremium: false,
  },
  {
    id: 'live-scanner',
    name: 'Live Scanner',
    description: 'Real-time alerts for in-play betting opportunities',
    icon: Zap,
    color: 'from-orange-500 to-red-500',
    features: ['Instant notifications', 'Momentum detection', 'Score predictions'],
    isPremium: true,
  },
  {
    id: 'stats-hub',
    name: 'Stats Hub',
    description: 'Deep statistical analysis for any match or team',
    icon: BarChart3,
    color: 'from-blue-500 to-indigo-600',
    features: ['Head-to-head stats', 'Form analysis', 'Performance trends'],
    isPremium: false,
  },
  {
    id: 'ai-insights',
    name: 'AI Insights',
    description: 'ML-powered predictions and betting recommendations',
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
    features: ['Confidence scores', 'Risk assessment', 'Bet suggestions'],
    isPremium: true,
  },
  {
    id: 'bankroll',
    name: 'Bankroll Manager',
    description: 'Track and optimize your betting bankroll',
    icon: Target,
    color: 'from-cyan-500 to-blue-500',
    features: ['Stake calculator', 'ROI tracking', 'Performance reports'],
    isPremium: true,
  },
  {
    id: 'odds-compare',
    name: 'Odds Comparison',
    description: 'Compare odds across multiple bookmakers',
    icon: Percent,
    color: 'from-amber-500 to-orange-500',
    features: ['Best odds finder', 'Arbitrage alerts', 'Price history'],
    isPremium: true,
  },
];

export default function ProToolsPage() {
  const { user } = useAuthStore();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const isPremium = user?.isPremium ?? false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3B5998] via-[#4A66A0] to-[#6B5B95] px-4 pt-12 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Pro Tools</h1>
              <p className="text-white/70 text-sm">Advanced analysis & insights</p>
            </div>
          </div>

          {/* Premium badge */}
          {isPremium && (
            <div className="mt-4 bg-amber-500/20 border border-amber-400/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <Crown className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-amber-300 font-medium text-sm">Premium Active</p>
                <p className="text-white/60 text-xs">All tools unlocked</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-3 pb-8">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Unlock Premium Card */}
          {!isPremium && (
            <Link href="/settings">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Crown className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-white font-bold text-lg">Unlock All Tools</h2>
                    <p className="text-white/80 text-sm">Get Premium for full access</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-white/70" />
                </div>
              </motion.div>
            </Link>
          )}

          {/* Tools Grid */}
          <div className="grid grid-cols-1 gap-4">
            {tools.map((tool, index) => {
              const isLocked = tool.isPremium && !isPremium;
              const Icon = tool.icon;

              return (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => !isLocked && setSelectedTool(selectedTool === tool.id ? null : tool.id)}
                  className={cn(
                    'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all',
                    !isLocked && 'cursor-pointer active:scale-[0.98]',
                    isLocked && 'opacity-60'
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', tool.color)}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                          {isLocked && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
                              <Lock size={10} />
                              PRO
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm mt-0.5">{tool.description}</p>
                      </div>
                      {!isLocked && (
                        <ChevronRight
                          className={cn(
                            'w-5 h-5 text-gray-400 transition-transform flex-shrink-0',
                            selectedTool === tool.id && 'rotate-90'
                          )}
                        />
                      )}
                    </div>

                    {/* Expanded features */}
                    {selectedTool === tool.id && !isLocked && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-4 pt-4 border-t border-gray-100"
                      >
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Features</p>
                        <div className="space-y-2">
                          {tool.features.map((feature, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3B5998]" />
                              {feature}
                            </div>
                          ))}
                        </div>
                        <Link href={`/ai-chat?tool=${tool.id}`}>
                          <button className="w-full mt-4 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-[#3B5998] to-[#6B5B95] transition-all active:scale-[0.98]">
                            Use {tool.name}
                          </button>
                        </Link>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Coming Soon */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-400 text-sm">More tools coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
