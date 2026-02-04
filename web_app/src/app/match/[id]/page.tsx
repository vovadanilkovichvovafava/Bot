'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Clock, Send, Loader2, ArrowLeft, MapPin, User,
  TrendingUp, History, Zap, ChevronDown, ChevronUp, Star
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { api } from '@/services/api';
import { useChatStore } from '@/store/chatStore';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { MatchDetail, isMatchLive, isMatchFinished, formatMatchDate } from '@/types';
import { cn } from '@/lib/utils';

// Team colors for fallback
const TEAM_COLORS: Record<string, string> = {
  'Arsenal': '#EF0107',
  'Chelsea': '#034694',
  'Manchester United': '#DA291C',
  'Manchester City': '#6CABDD',
  'Liverpool': '#C8102E',
  'Tottenham': '#132257',
  'Real Madrid': '#FEBE10',
  'Barcelona': '#A50044',
  'Bayern Munich': '#DC052D',
  'Dortmund': '#FDE100',
  'PSG': '#004170',
  'Juventus': '#000000',
  'AC Milan': '#FB090B',
  'Inter': '#0068A8',
  'Napoli': '#12A0D7',
  'Atletico Madrid': '#CB3524',
};

interface PageParams {
  params: Promise<{ id: string }>;
}

export default function MatchDetailPage({ params }: PageParams) {
  const { selectedTheme } = useThemeStore();
  const { user, isAuthenticated } = useAuthStore();
  const {
    sendMessage,
    messages: chatMessages,
    isLoading: chatLoading,
    tokensRemaining,
    clearMessages
  } = useChatStore();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmblems, setShowEmblems] = useState(false);
  const [question, setQuestion] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>('ai');
  const [matchId, setMatchId] = useState<string | null>(null);

  // Unwrap params
  useEffect(() => {
    params.then(p => setMatchId(p.id));
  }, [params]);

  // Load match details
  useEffect(() => {
    if (!matchId) return;

    const loadMatch = async () => {
      setIsLoading(true);
      setError(null);
      clearMessages();

      try {
        const matchData = await api.getMatchDetail(parseInt(matchId));
        setMatch(matchData);
        setShowEmblems(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load match');
        // Use fallback data for demo
        setMatch({
          id: parseInt(matchId),
          homeTeam: { name: 'Arsenal', logo: 'https://media.api-sports.io/football/teams/42.png' },
          awayTeam: { name: 'Chelsea', logo: 'https://media.api-sports.io/football/teams/49.png' },
          league: 'Premier League',
          leagueCode: 'PL',
          matchDate: new Date().toISOString(),
          status: 'SCHEDULED',
          venue: 'Emirates Stadium',
          referee: 'Michael Oliver',
          homeForm: ['W', 'W', 'D', 'W', 'L'],
          awayForm: ['D', 'W', 'W', 'L', 'W'],
        });
        setShowEmblems(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadMatch();
  }, [matchId, clearMessages]);

  // Quick questions for AI
  const quickQuestions = [
    { text: 'Who will win?', icon: '🏆' },
    { text: 'Best bet?', icon: '💰' },
    { text: 'Over 2.5 goals?', icon: '⚽' },
    { text: 'Both teams score?', icon: '🎯' },
    { text: 'Predicted score?', icon: '📊' },
  ];

  // Handle AI question
  const handleAskAI = useCallback(async (q: string) => {
    if (!match || !q.trim()) return;

    const matchInfo = {
      matchId: match.id.toString(),
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      leagueCode: match.leagueCode,
      matchDate: match.matchDate,
    };

    const preferences = user ? {
      minOdds: user.minOdds,
      maxOdds: user.maxOdds,
      riskLevel: user.riskLevel,
    } : undefined;

    await sendMessage(q, preferences, matchInfo);
    setQuestion('');
  }, [match, user, sendMessage]);

  // Theme styles
  const themeStyles = {
    cinematic: {
      bg: 'cinematic-bg',
      card: 'bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-amber-500/20',
      accent: 'text-amber-400',
      accentBg: 'bg-amber-500',
      gradient: 'from-amber-500 to-amber-700',
      inputBg: 'bg-gray-900/50 border-amber-500/20 focus:border-amber-500',
      button: 'bg-amber-500 hover:bg-amber-400 text-black',
    },
    neon: {
      bg: 'neon-bg',
      card: 'bg-gray-900/80 backdrop-blur-xl border border-emerald-500/20',
      accent: 'text-emerald-400',
      accentBg: 'bg-emerald-500',
      gradient: 'from-emerald-400 to-cyan-500',
      inputBg: 'bg-gray-900/50 border-emerald-500/20 focus:border-emerald-500',
      button: 'bg-emerald-500 hover:bg-emerald-400 text-black',
    },
    stadium: {
      bg: 'stadium-bg',
      card: 'bg-black/60 backdrop-blur-md border border-white/20',
      accent: 'text-indigo-400',
      accentBg: 'bg-indigo-500',
      gradient: 'from-indigo-500 to-purple-600',
      inputBg: 'bg-black/50 border-indigo-500/20 focus:border-indigo-500',
      button: 'bg-indigo-500 hover:bg-indigo-400 text-white',
    },
  };

  const styles = selectedTheme ? themeStyles[selectedTheme] : themeStyles.neon;
  const live = match ? isMatchLive(match) : false;
  const finished = match ? isMatchFinished(match) : false;

  if (isLoading) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center', styles.bg)}>
        <Loader2 className={cn('w-10 h-10 animate-spin', styles.accent)} />
      </div>
    );
  }

  if (!match) {
    return (
      <div className={cn('min-h-screen flex flex-col items-center justify-center', styles.bg)}>
        <p className="text-red-400 mb-4">{error || 'Match not found'}</p>
        <Link href="/matches" className={cn('px-6 py-2 rounded-lg', styles.button)}>
          Back to Matches
        </Link>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen relative', styles.bg)}>
      {/* Side Emblems - Desktop Only */}
      <AnimatePresence>
        {showEmblems && (
          <>
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden xl:block"
            >
              <SideEmblem team={match.homeTeam} side="left" />
            </motion.div>

            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden xl:block"
            >
              <SideEmblem team={match.awayTeam} side="right" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Button */}
        <Link
          href="/matches"
          className={cn('inline-flex items-center gap-2 text-gray-400 mb-6 transition-colors', styles.accent.replace('text-', 'hover:text-'))}
        >
          <ArrowLeft size={20} />
          Back to Matches
        </Link>

        {/* Match Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-2xl p-6 md:p-8 mb-6', styles.card)}
        >
          {/* League & Status */}
          <div className="text-center mb-6">
            <span className={cn('font-semibold text-lg', styles.accent)}>{match.league}</span>
            <div className="flex items-center justify-center gap-4 mt-2">
              {live ? (
                <span className="flex items-center gap-2 text-red-500 font-bold">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  LIVE {match.minute && `${match.minute}'`}
                </span>
              ) : finished ? (
                <span className="text-gray-400 font-medium">Full Time</span>
              ) : (
                <span className="flex items-center gap-2 text-gray-400">
                  <Clock size={16} />
                  {formatMatchDate(match.matchDate)}
                </span>
              )}
              {match.matchday && (
                <span className="text-gray-500 text-sm">Matchday {match.matchday}</span>
              )}
            </div>
          </div>

          {/* Teams and Score */}
          <div className="flex items-center justify-between">
            {/* Home Team */}
            <div className="flex-1 text-center">
              <TeamBadge team={match.homeTeam} size="large" />
              <h2 className="text-xl font-bold text-white mt-4">{match.homeTeam.name}</h2>
              {match.homeForm && match.homeForm.length > 0 && (
                <FormIndicator form={match.homeForm} className="mt-2" />
              )}
            </div>

            {/* Score / VS */}
            <div className="px-4 md:px-8 py-4">
              {live || finished ? (
                <div className="text-center">
                  <div className="flex items-center gap-3 text-4xl md:text-5xl font-bold">
                    <span className={live ? 'text-red-400' : 'text-white'}>{match.homeScore ?? 0}</span>
                    <span className="text-gray-500">:</span>
                    <span className={live ? 'text-red-400' : 'text-white'}>{match.awayScore ?? 0}</span>
                  </div>
                  {match.halfTimeScore && (
                    <p className="text-gray-500 text-sm mt-2">HT: {match.halfTimeScore}</p>
                  )}
                </div>
              ) : (
                <span className={cn('text-4xl font-bold', styles.accent)}>VS</span>
              )}
            </div>

            {/* Away Team */}
            <div className="flex-1 text-center">
              <TeamBadge team={match.awayTeam} size="large" />
              <h2 className="text-xl font-bold text-white mt-4">{match.awayTeam.name}</h2>
              {match.awayForm && match.awayForm.length > 0 && (
                <FormIndicator form={match.awayForm} className="mt-2" />
              )}
            </div>
          </div>

          {/* Venue & Referee */}
          {(match.venue || match.referee) && (
            <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-6 border-t border-white/10">
              {match.venue && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <MapPin size={16} />
                  <span>{match.venue}</span>
                </div>
              )}
              {match.referee && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <User size={16} />
                  <span>{match.referee}</span>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Collapsible Sections */}
        <div className="space-y-4">
          {/* AI Analysis Section */}
          <CollapsibleSection
            title="AI Match Analysis"
            icon={<Bot className={cn('w-5 h-5', styles.accent)} />}
            isExpanded={expandedSection === 'ai'}
            onToggle={() => setExpandedSection(expandedSection === 'ai' ? null : 'ai')}
            styles={styles}
            badge={
              <span className={cn('text-xs px-2 py-0.5 rounded-full', styles.accentBg, 'text-white')}>
                {tokensRemaining} left
              </span>
            }
          >
            {/* Quick Questions */}
            <div className="flex flex-wrap gap-2 mb-4">
              {quickQuestions.map((q) => (
                <button
                  key={q.text}
                  onClick={() => handleAskAI(q.text)}
                  disabled={chatLoading}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm transition-all border',
                    'border-white/10 hover:border-current',
                    styles.accent,
                    'hover:bg-current/10 disabled:opacity-50'
                  )}
                >
                  {q.icon} {q.text}
                </button>
              ))}
            </div>

            {/* Custom Question */}
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAskAI(question)}
                placeholder="Ask anything about this match..."
                className={cn(
                  'flex-1 px-4 py-3 rounded-xl text-white placeholder-gray-500 transition-all border',
                  styles.inputBg
                )}
              />
              <button
                onClick={() => handleAskAI(question)}
                disabled={chatLoading || !question.trim()}
                className={cn(
                  'px-5 py-3 rounded-xl font-medium transition-all disabled:opacity-50',
                  styles.button
                )}
              >
                {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={20} />}
              </button>
            </div>

            {/* Chat Messages */}
            {chatMessages.length > 0 && (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {chatMessages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'p-4 rounded-xl',
                      msg.isUser
                        ? 'bg-white/5 ml-8'
                        : cn('border', styles.card)
                    )}
                  >
                    {msg.isUser ? (
                      <p className="text-white">{msg.text}</p>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )}
                  </motion.div>
                ))}

                {chatLoading && (
                  <div className="flex items-center gap-3 text-gray-400 p-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyzing match data...</span>
                  </div>
                )}
              </div>
            )}

            {!isAuthenticated && (
              <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
                <Zap className="inline w-4 h-4 mr-2" />
                <Link href="/login" className="underline hover:no-underline">
                  Sign in
                </Link>{' '}
                for more AI predictions and personalized analysis
              </div>
            )}
          </CollapsibleSection>

          {/* Head to Head Section */}
          {match.headToHead && (
            <CollapsibleSection
              title="Head to Head"
              icon={<History className={cn('w-5 h-5', styles.accent)} />}
              isExpanded={expandedSection === 'h2h'}
              onToggle={() => setExpandedSection(expandedSection === 'h2h' ? null : 'h2h')}
              styles={styles}
            >
              <HeadToHead data={match.headToHead} homeTeam={match.homeTeam.name} awayTeam={match.awayTeam.name} styles={styles} />
            </CollapsibleSection>
          )}

          {/* Statistics Section */}
          <CollapsibleSection
            title="Match Statistics"
            icon={<TrendingUp className={cn('w-5 h-5', styles.accent)} />}
            isExpanded={expandedSection === 'stats'}
            onToggle={() => setExpandedSection(expandedSection === 'stats' ? null : 'stats')}
            styles={styles}
          >
            <MatchStats homeTeam={match.homeTeam.name} awayTeam={match.awayTeam.name} styles={styles} />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}

// Team Badge Component
function TeamBadge({ team, size = 'medium' }: { team: { name: string; logo?: string }; size?: 'small' | 'medium' | 'large' }) {
  const [imgError, setImgError] = useState(false);
  const bgColor = TEAM_COLORS[team.name] || '#6366f1';

  const sizeClasses = {
    small: 'w-12 h-12 text-lg',
    medium: 'w-16 h-16 text-xl',
    large: 'w-20 h-20 md:w-24 md:h-24 text-2xl',
  };

  if (team.logo && !imgError) {
    return (
      <div className={cn('mx-auto rounded-full bg-white/10 p-2 overflow-hidden', sizeClasses[size])}>
        <img
          src={team.logo}
          alt={team.name}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn('mx-auto rounded-full flex items-center justify-center text-white font-bold shadow-xl', sizeClasses[size])}
      style={{
        background: `linear-gradient(135deg, ${bgColor}, ${bgColor}99)`,
        boxShadow: `0 8px 30px ${bgColor}50`,
      }}
    >
      {team.name.substring(0, 2).toUpperCase()}
    </div>
  );
}

// Form Indicator Component
function FormIndicator({ form, className }: { form: string[]; className?: string }) {
  const getColor = (result: string) => {
    switch (result.toUpperCase()) {
      case 'W': return 'bg-green-500';
      case 'D': return 'bg-yellow-500';
      case 'L': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      {form.slice(0, 5).map((result, idx) => (
        <div
          key={idx}
          className={cn('w-6 h-6 rounded text-xs flex items-center justify-center text-white font-bold', getColor(result))}
        >
          {result.toUpperCase()}
        </div>
      ))}
    </div>
  );
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  styles: { card: string; accent: string };
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, isExpanded, onToggle, styles, badge, children }: CollapsibleSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl overflow-hidden', styles.card)}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 md:p-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-white">{title}</span>
          {badge}
        </div>
        {isExpanded ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-6 pb-4 md:pb-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Head to Head Component
function HeadToHead({ data, homeTeam, awayTeam, styles }: {
  data: Record<string, unknown>;
  homeTeam: string;
  awayTeam: string;
  styles: { accent: string };
}) {
  const h2hData = {
    totalMatches: (data.total_matches as number) || 10,
    homeWins: (data.home_wins as number) || 4,
    awayWins: (data.away_wins as number) || 3,
    draws: (data.draws as number) || 3,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <p className="text-2xl font-bold text-green-400">{h2hData.homeWins}</p>
          <p className="text-sm text-gray-400">{homeTeam}</p>
        </div>
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-2xl font-bold text-yellow-400">{h2hData.draws}</p>
          <p className="text-sm text-gray-400">Draws</p>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <p className="text-2xl font-bold text-blue-400">{h2hData.awayWins}</p>
          <p className="text-sm text-gray-400">{awayTeam}</p>
        </div>
      </div>
      <p className="text-center text-gray-500 text-sm">
        Based on last {h2hData.totalMatches} meetings
      </p>
    </div>
  );
}

// Match Stats Component
function MatchStats({ homeTeam, awayTeam, styles }: {
  homeTeam: string;
  awayTeam: string;
  styles: { accent: string };
}) {
  // Mock stats - would come from API in real implementation
  const stats = [
    { label: 'Goals Scored (Avg)', home: 2.1, away: 1.8 },
    { label: 'Goals Conceded (Avg)', home: 0.9, away: 1.2 },
    { label: 'Shots per Game', home: 15.3, away: 12.8 },
    { label: 'Possession (%)', home: 58, away: 52 },
    { label: 'Clean Sheets (%)', home: 45, away: 35 },
  ];

  return (
    <div className="space-y-3">
      {stats.map((stat, idx) => (
        <div key={idx} className="flex items-center gap-4">
          <span className="w-16 text-right font-semibold text-white">{stat.home}</span>
          <div className="flex-1">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-green-500"
                style={{ width: `${(stat.home / (stat.home + stat.away)) * 100}%` }}
              />
              <div
                className="h-full bg-blue-500"
                style={{ width: `${(stat.away / (stat.home + stat.away)) * 100}%` }}
              />
            </div>
            <p className="text-center text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
          <span className="w-16 text-left font-semibold text-white">{stat.away}</span>
        </div>
      ))}
      <div className="flex justify-between text-sm text-gray-400 pt-2">
        <span>{homeTeam}</span>
        <span>{awayTeam}</span>
      </div>
    </div>
  );
}

// Side Emblem Component
function SideEmblem({ team, side }: { team: { name: string; logo?: string }; side: 'left' | 'right' }) {
  const [imgError, setImgError] = useState(false);
  const bgColor = TEAM_COLORS[team.name] || '#6366f1';

  return (
    <motion.div
      animate={{
        y: [0, -15, 0],
        rotate: side === 'left' ? [-3, 3, -3] : [3, -3, 3],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className="relative"
    >
      {team.logo && !imgError ? (
        <div className="w-28 h-28 rounded-full bg-white/10 backdrop-blur-sm p-3 shadow-2xl">
          <img
            src={team.logo}
            alt={team.name}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center text-white text-3xl font-bold"
          style={{
            background: `linear-gradient(135deg, ${bgColor}, ${bgColor}88)`,
            boxShadow: `0 0 60px ${bgColor}66, 0 0 100px ${bgColor}33`,
          }}
        >
          {team.name.substring(0, 2).toUpperCase()}
        </div>
      )}
      <div className="text-center mt-3 text-sm font-medium text-gray-300 max-w-[110px] truncate">
        {team.name}
      </div>
    </motion.div>
  );
}
