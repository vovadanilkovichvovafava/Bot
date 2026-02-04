'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Clock, Send, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAudio } from '@/components/AudioProvider';
import ReactMarkdown from 'react-markdown';

interface Match {
  id: number;
  homeTeam: { name: string; logo?: string };
  awayTeam: { name: string; logo?: string };
  league: string;
  leagueCode: string;
  matchDate: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
}

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const { playEpicMoment, isPlaying } = useAudio();
  const [match, setMatch] = useState<Match | null>(null);
  const [showEmblems, setShowEmblems] = useState(false);
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  useEffect(() => {
    // Show emblems animation
    setShowEmblems(true);

    // Fetch match or use mock
    setMatch({
      id: parseInt(params.id),
      homeTeam: { name: 'Arsenal' },
      awayTeam: { name: 'Chelsea' },
      league: 'Premier League',
      leagueCode: 'PL',
      matchDate: new Date().toISOString(),
      status: 'SCHEDULED',
    });

    // Play epic music
    playEpicMoment();
  }, [params.id]);

  const quickQuestions = [
    'Who will win this match?',
    'Best bet for this match?',
    'Will there be over 2.5 goals?',
    'Will both teams score?',
  ];

  const handleAskAI = async (q: string) => {
    if (!match || !q.trim()) return;

    setIsLoadingAI(true);
    setQuestion(q);
    setAiResponse(null);

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          match_info: {
            match_id: match.id.toString(),
            home_team: match.homeTeam.name,
            away_team: match.awayTeam.name,
            league_code: match.leagueCode,
            match_date: match.matchDate,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');
      const data = await response.json();
      setAiResponse(data.response);
    } catch (err) {
      setAiResponse('Sorry, I could not analyze this match right now. Please try again later.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Side Emblems - EPL Style! */}
      <AnimatePresence>
        {showEmblems && (
          <>
            {/* Home Team Emblem - Left Side */}
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden lg:block"
            >
              <SideEmblem team={match.homeTeam} side="left" />
            </motion.div>

            {/* Away Team Emblem - Right Side */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden lg:block"
            >
              <SideEmblem team={match.awayTeam} side="right" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          href="/matches"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Matches
        </Link>

        {/* Match Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 mb-8"
        >
          <div className="text-center mb-6">
            <span className="text-accent font-medium">{match.league}</span>
            <div className="flex items-center justify-center gap-2 mt-2 text-gray-400">
              <Clock size={16} />
              <span>{new Date(match.matchDate).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {/* Home Team */}
            <div className="flex-1 text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white text-2xl font-bold shadow-2xl">
                {match.homeTeam.name.substring(0, 2).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold">{match.homeTeam.name}</h2>
            </div>

            {/* VS */}
            <div className="px-8">
              <span className="text-4xl font-bold text-gray-500">VS</span>
            </div>

            {/* Away Team */}
            <div className="flex-1 text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-2xl font-bold shadow-2xl">
                {match.awayTeam.name.substring(0, 2).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold">{match.awayTeam.name}</h2>
            </div>
          </div>
        </motion.div>

        {/* AI Chat Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-bold">AI Match Analysis</h3>
              <p className="text-sm text-gray-400">Powered by Claude AI</p>
            </div>
          </div>

          {/* Quick Questions */}
          <div className="flex flex-wrap gap-2 mb-6">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleAskAI(q)}
                disabled={isLoadingAI}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-accent/20 hover:text-accent transition-colors text-sm disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Custom Question Input */}
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAskAI(question)}
              placeholder="Ask anything about this match..."
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-accent focus:outline-none transition-colors"
            />
            <button
              onClick={() => handleAskAI(question)}
              disabled={isLoadingAI || !question.trim()}
              className="px-6 py-3 rounded-xl bg-accent text-primary-dark font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
            >
              {isLoadingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={20} />}
            </button>
          </div>

          {/* AI Response */}
          {(isLoadingAI || aiResponse) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl bg-white/5 border border-white/10"
            >
              {isLoadingAI ? (
                <div className="flex items-center gap-3 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing match data...</span>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{aiResponse || ''}</ReactMarkdown>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function SideEmblem({ team, side }: { team: { name: string; logo?: string }; side: 'left' | 'right' }) {
  const colors: Record<string, string> = {
    Arsenal: '#EF0107',
    Chelsea: '#034694',
    'Manchester United': '#DA291C',
    'Manchester City': '#6CABDD',
    Liverpool: '#C8102E',
    'Real Madrid': '#FEBE10',
    Barcelona: '#A50044',
    'Bayern Munich': '#DC052D',
  };

  const bgColor = colors[team.name] || '#38003c';

  return (
    <motion.div
      animate={{
        y: [0, -10, 0],
        rotate: side === 'left' ? [-5, 5, -5] : [5, -5, 5],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className="relative"
    >
      <div
        className="w-32 h-32 rounded-full flex items-center justify-center text-white text-3xl font-bold"
        style={{
          background: `linear-gradient(135deg, ${bgColor}, ${bgColor}88)`,
          boxShadow: `0 0 60px ${bgColor}66, 0 0 100px ${bgColor}33`,
        }}
      >
        {team.name.substring(0, 2).toUpperCase()}
      </div>
      <div className="text-center mt-4 text-sm font-medium text-gray-300 max-w-[120px]">
        {team.name}
      </div>
    </motion.div>
  );
}
