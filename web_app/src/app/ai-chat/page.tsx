'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Loader2, Trash2, Sparkles, ChevronDown,
  Edit3, RefreshCw, X, Plus, Crown, Zap, Brain
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useMatchesStore } from '@/store/matchesStore';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';

// Stadium theme colors
const STADIUM_COLORS = {
  bgPrimary: '#080A10',
  bgSecondary: '#10141E',
  blue: '#4A7AFF',
  blueHover: '#5D8AFF',
  green: '#3DDC84',
  red: '#FF3B3B',
  glass: 'rgba(12, 15, 24, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
};

const STADIUM_BG = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80';

// Russian quick questions for stadium theme
const STADIUM_QUICK_QUESTIONS_RU = [
  'Кто победит сегодня?',
  'Лучшие ставки на сегодня',
  'Анализ Лиги Чемпионов',
  'Прогноз на топ-матч',
  'Статистика команды',
];

export default function AIChatPage() {
  const { selectedTheme } = useThemeStore();
  const [input, setInput] = useState('');
  const [showEditQuestions, setShowEditQuestions] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isStadiumTheme = selectedTheme === 'stadium';

  // Stores
  const {
    messages,
    isLoading,
    aiAvailable,
    quickQuestions,
    suggestionsExpanded,
    localTokens,
    initializeChat,
    sendMessage,
    clearChat,
    setSuggestionsExpanded,
    addQuickQuestion,
    removeQuickQuestion,
    resetQuickQuestions,
    checkAndResetTokens,
  } = useChatStore();

  const { user, isAuthenticated } = useAuthStore();
  const { todayMatches, tomorrowMatches, loadTodayMatches, loadTomorrowMatches } = useMatchesStore();

  const isPremium = user?.isPremium ?? false;

  // Theme styles
  const themeStyles = {
    cinematic: {
      bg: 'cinematic-bg',
      card: 'card-cinematic',
      accent: 'text-amber-400',
      accentBg: 'bg-amber-500',
      gradient: 'from-amber-500 to-amber-700',
      userBubble: 'bg-amber-500 text-black',
      aiBubble: 'bg-white/5 border border-amber-500/20',
      input: 'bg-black/30 border-amber-500/30 focus:border-amber-500',
      chip: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
    },
    neon: {
      bg: 'neon-bg neon-grid',
      card: 'card-neon',
      accent: 'text-emerald-400',
      accentBg: 'bg-emerald-500',
      gradient: 'from-emerald-400 to-cyan-500',
      userBubble: 'bg-emerald-500 text-black',
      aiBubble: 'bg-white/5 border border-emerald-500/20',
      input: 'bg-black/30 border-emerald-500/30 focus:border-emerald-500',
      chip: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
    },
    stadium: {
      bg: '',
      card: '',
      accent: 'text-[#4A7AFF]',
      accentBg: 'bg-[#4A7AFF]',
      gradient: 'from-[#4A7AFF] to-[#3D6AE8]',
      userBubble: 'bg-[#4A7AFF] text-white',
      aiBubble: '',
      input: '',
      chip: '',
    },
  };

  const styles = selectedTheme ? themeStyles[selectedTheme] : themeStyles.neon;

  // Initialize chat on mount
  useEffect(() => {
    initializeChat();
    checkAndResetTokens();
    loadTodayMatches();
    loadTomorrowMatches();
  }, [initializeChat, checkAndResetTokens, loadTodayMatches, loadTomorrowMatches]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Check token limit for non-premium
    if (!isPremium && localTokens <= 0) {
      setShowLimitModal(true);
      return;
    }

    setInput('');

    await sendMessage(
      content,
      {
        minOdds: user?.minOdds ?? 1.5,
        maxOdds: user?.maxOdds ?? 3.0,
        riskLevel: user?.riskLevel ?? 'medium',
      },
      undefined,
      isPremium
    );
  };

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      addQuickQuestion(newQuestion);
      setNewQuestion('');
    }
  };

  // Stadium Theme Version
  if (isStadiumTheme) {
    const stadiumQuickQuestions = STADIUM_QUICK_QUESTIONS_RU;

    return (
      <div
        className="min-h-screen flex flex-col relative"
        style={{ backgroundColor: STADIUM_COLORS.bgPrimary }}
      >
        {/* Stadium Background */}
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: `url(${STADIUM_BG})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom,
                rgba(8, 10, 16, 0.85) 0%,
                rgba(8, 10, 16, 0.95) 50%,
                rgba(8, 10, 16, 0.98) 100%)`
            }}
          />
        </div>

        <div className="relative z-10 flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Large AI Icon */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${STADIUM_COLORS.blue}, #3D6AE8)`,
                    boxShadow: `0 0 30px ${STADIUM_COLORS.blue}40`
                  }}
                >
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1
                    className="text-2xl font-bold uppercase tracking-wide"
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      color: 'white'
                    }}
                  >
                    AI ЧАТБОТ
                  </h1>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: aiAvailable ? STADIUM_COLORS.green : STADIUM_COLORS.red }}
                      />
                      <span style={{ color: aiAvailable ? STADIUM_COLORS.green : STADIUM_COLORS.red }}>
                        {aiAvailable ? 'Онлайн' : 'Оффлайн'}
                      </span>
                    </span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-400">Claude AI</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Token counter */}
                <button
                  onClick={() => setShowLimitModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: isPremium
                      ? 'rgba(251, 191, 36, 0.15)'
                      : localTokens > 3
                        ? `${STADIUM_COLORS.blue}20`
                        : localTokens > 0
                          ? 'rgba(251, 146, 60, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                    color: isPremium
                      ? '#FBBF24'
                      : localTokens > 3
                        ? STADIUM_COLORS.blue
                        : localTokens > 0
                          ? '#FB923C'
                          : '#EF4444',
                    border: `1px solid ${isPremium
                      ? 'rgba(251, 191, 36, 0.3)'
                      : localTokens > 3
                        ? `${STADIUM_COLORS.blue}40`
                        : localTokens > 0
                          ? 'rgba(251, 146, 60, 0.3)'
                          : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  {isPremium ? (
                    <>
                      <Crown size={16} />
                      <span>PRO</span>
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      <span>{localTokens}</span>
                    </>
                  )}
                </button>

                {/* Clear chat */}
                {messages.length > 1 && (
                  <button
                    onClick={clearChat}
                    className="p-2.5 rounded-xl transition-all text-gray-400 hover:text-white"
                    style={{
                      background: STADIUM_COLORS.glass,
                      border: `1px solid ${STADIUM_COLORS.glassBorder}`,
                    }}
                    title="Очистить чат"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Chat Area - Glassmorphism */}
          <div
            className="flex-1 rounded-2xl p-5 mb-4 overflow-hidden flex flex-col"
            style={{
              background: STADIUM_COLORS.glass,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${STADIUM_COLORS.glassBorder}`,
            }}
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.length === 1 && (
                // Welcome screen
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center py-12"
                >
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                    style={{
                      background: `linear-gradient(135deg, ${STADIUM_COLORS.blue}, #3D6AE8)`,
                      boxShadow: `0 0 40px ${STADIUM_COLORS.blue}50`
                    }}
                  >
                    <Brain className="w-10 h-10 text-white" />
                  </div>
                  <h2
                    className="text-2xl font-bold mb-3"
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      color: 'white'
                    }}
                  >
                    Привет! Я ваш AI-аналитик
                  </h2>
                  <p className="text-gray-400 max-w-md mb-8">
                    Задайте мне любой вопрос о футбольных матчах, командах или прогнозах
                  </p>

                  {/* Quick question suggestions */}
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                    {stadiumQuickQuestions.slice(0, 3).map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(q)}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 disabled:opacity-50"
                        style={{
                          background: `${STADIUM_COLORS.blue}15`,
                          color: STADIUM_COLORS.blue,
                          border: `1px solid ${STADIUM_COLORS.blue}30`,
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <AnimatePresence>
                {messages.slice(1).map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn('flex', message.isUser ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className="max-w-[85%] p-4 rounded-2xl"
                      style={message.isUser ? {
                        background: STADIUM_COLORS.blue,
                        color: 'white',
                        borderBottomRightRadius: '4px',
                      } : {
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${STADIUM_COLORS.glassBorder}`,
                        borderBottomLeftRadius: '4px',
                      }}
                    >
                      {message.isUser ? (
                        <p className="text-sm">{message.text}</p>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-200">{children}</p>,
                              strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                              ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                              li: ({ children }) => <li className="text-gray-300 mb-1">{children}</li>,
                              h1: ({ children }) => <h1 className="text-lg font-bold text-white mb-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-base font-bold text-white mb-2">{children}</h2>,
                            }}
                          >
                            {message.text}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div
                    className="p-4 rounded-2xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${STADIUM_COLORS.glassBorder}`,
                      borderBottomLeftRadius: '4px',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: STADIUM_COLORS.blue }}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                      <span className="ml-2 text-gray-400 text-sm">Анализирую...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Questions Panel - Glassmorphism */}
          <div
            className="rounded-2xl mb-4 overflow-hidden"
            style={{
              background: STADIUM_COLORS.glass,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${STADIUM_COLORS.glassBorder}`,
            }}
          >
            <button
              onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: STADIUM_COLORS.blue }} />
                <span className="text-sm font-medium text-white">Быстрые вопросы</span>
              </div>
              <div className="flex items-center gap-2">
                {suggestionsExpanded && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditQuestions(true);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                    style={{
                      background: `${STADIUM_COLORS.blue}15`,
                      color: STADIUM_COLORS.blue,
                    }}
                  >
                    <Edit3 size={12} />
                    Изменить
                  </button>
                )}
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-gray-400 transition-transform',
                    suggestionsExpanded && 'rotate-180'
                  )}
                />
              </div>
            </button>

            <AnimatePresence>
              {suggestionsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    {(quickQuestions.length > 0 ? quickQuestions : stadiumQuickQuestions).map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSend(question)}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-full text-sm transition-all disabled:opacity-50 hover:scale-105"
                        style={{
                          background: `${STADIUM_COLORS.blue}15`,
                          color: STADIUM_COLORS.blue,
                          border: `1px solid ${STADIUM_COLORS.blue}30`,
                        }}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input Area - Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Спросите AI о матче..."
              className="flex-1 px-5 py-3.5 rounded-xl text-white placeholder-gray-500 outline-none transition-all"
              style={{
                background: STADIUM_COLORS.glass,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${STADIUM_COLORS.glassBorder}`,
              }}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50 hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${STADIUM_COLORS.blue}, #3D6AE8)`,
                boxShadow: !isLoading && input.trim() ? `0 4px 20px ${STADIUM_COLORS.blue}40` : 'none',
              }}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={20} />}
            </button>
          </motion.div>

          {/* Footer info */}
          <p className="text-center text-gray-500 text-xs mt-4">
            {isPremium ? (
              'Безлимитные AI-прогнозы с Premium'
            ) : (
              <>
                Осталось {localTokens} прогнозов сегодня
                {' · '}
                <Link href="/premium" className="underline" style={{ color: STADIUM_COLORS.blue }}>
                  Безлимит с Premium
                </Link>
              </>
            )}
          </p>
        </div>

        {/* Stadium Theme Modals */}
        {/* Edit Quick Questions Modal */}
        <AnimatePresence>
          {showEditQuestions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
              onClick={() => setShowEditQuestions(false)}
            >
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl overflow-hidden"
                style={{
                  background: STADIUM_COLORS.glass,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid ${STADIUM_COLORS.glassBorder}`,
                }}
              >
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Редактировать вопросы</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={resetQuickQuestions}
                      className="flex items-center gap-1 px-2 py-1 rounded text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      <RefreshCw size={14} />
                      Сброс
                    </button>
                    <button
                      onClick={() => setShowEditQuestions(false)}
                      className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="p-4 border-b border-white/10">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddQuestion()}
                      placeholder="Добавить новый вопрос..."
                      className="flex-1 px-3 py-2 rounded-lg text-white text-sm placeholder-gray-500 outline-none"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${STADIUM_COLORS.glassBorder}`,
                      }}
                    />
                    <button
                      onClick={handleAddQuestion}
                      disabled={!newQuestion.trim()}
                      className="p-2 rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: STADIUM_COLORS.blue }}
                    >
                      <Plus size={18} className="text-white" />
                    </button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {(quickQuestions.length > 0 ? quickQuestions : stadiumQuickQuestions).map((question, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0"
                    >
                      <span className="text-sm text-gray-300">{question}</span>
                      <button
                        onClick={() => removeQuickQuestion(index)}
                        className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-4">
                  <button
                    onClick={() => setShowEditQuestions(false)}
                    className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
                    style={{
                      background: `linear-gradient(135deg, ${STADIUM_COLORS.blue}, #3D6AE8)`,
                    }}
                  >
                    Готово
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Limit Reached Modal */}
        <AnimatePresence>
          {showLimitModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
              onClick={() => setShowLimitModal(false)}
            >
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl p-6 text-center"
                style={{
                  background: STADIUM_COLORS.glass,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid ${STADIUM_COLORS.glassBorder}`,
                }}
              >
                {isPremium ? (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Crown className="w-8 h-8 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Premium Активен</h3>
                    <p className="text-gray-400 mb-6">
                      У вас безлимитные AI-прогнозы!
                    </p>
                    <button
                      onClick={() => setShowLimitModal(false)}
                      className="w-full py-3 rounded-xl font-semibold text-white"
                      style={{ background: `linear-gradient(135deg, ${STADIUM_COLORS.blue}, #3D6AE8)` }}
                    >
                      Понятно
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Zap className="w-8 h-8 text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {localTokens > 0 ? 'Дневные прогнозы' : 'Лимит исчерпан'}
                    </h3>
                    <p className="text-gray-400 mb-4">
                      {localTokens > 0
                        ? `Осталось ${localTokens} прогнозов сегодня`
                        : 'Вы использовали все бесплатные прогнозы на сегодня'
                      }
                    </p>

                    <div
                      className="rounded-xl p-4 mb-6 text-left"
                      style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <p className="text-sm text-gray-300 mb-2">· Каждый AI-анализ = 1 прогноз</p>
                      <p className="text-sm text-gray-300 mb-2">· Прогнозы обновляются через 24ч</p>
                      <p className="text-sm text-gray-300">· Просмотр матчей безлимитный</p>
                    </div>

                    <div
                      className="rounded-xl p-4 mb-6 text-left"
                      style={{ background: `${STADIUM_COLORS.blue}10`, border: `1px solid ${STADIUM_COLORS.blue}30` }}
                    >
                      <p className="text-sm font-medium mb-2" style={{ color: STADIUM_COLORS.blue }}>Premium преимущества:</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <span style={{ color: STADIUM_COLORS.green }}>+</span>
                          Безлимитные AI-прогнозы
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <span style={{ color: STADIUM_COLORS.green }}>+</span>
                          Продвинутые инструменты
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <span style={{ color: STADIUM_COLORS.green }}>+</span>
                          Приоритетная поддержка
                        </div>
                      </div>
                    </div>

                    <Link href="/premium" className="block">
                      <button
                        className="w-full py-3 rounded-xl font-semibold text-black mb-3 transition-all hover:scale-[1.02]"
                        style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)' }}
                      >
                        Получить Premium
                      </button>
                    </Link>
                    <button
                      onClick={() => setShowLimitModal(false)}
                      className="text-gray-500 text-sm hover:text-gray-400 transition-colors"
                    >
                      Позже
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Default theme rendering
  return (
    <div className={cn('min-h-screen flex flex-col py-4 px-4', styles.bg)}>
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br', styles.gradient)}>
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI Football Analyst</h1>
                <div className="flex items-center gap-2 text-sm">
                  <span className={cn('flex items-center gap-1', aiAvailable ? 'text-green-400' : 'text-red-400')}>
                    <span className={cn('w-2 h-2 rounded-full', aiAvailable ? 'bg-green-400' : 'bg-red-400')} />
                    {aiAvailable ? 'Online' : 'Offline'}
                  </span>
                  <span className="text-gray-500">|</span>
                  <span className="text-gray-400">Claude AI</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Token counter */}
              <button
                onClick={() => setShowLimitModal(true)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  isPremium
                    ? 'bg-amber-500/20 text-amber-400'
                    : localTokens > 3
                    ? styles.chip
                    : localTokens > 0
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-red-500/20 text-red-400'
                )}
              >
                {isPremium ? (
                  <>
                    <Crown size={14} />
                    <span>PRO</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    <span>{localTokens}</span>
                  </>
                )}
              </button>

              {/* Clear chat */}
              {messages.length > 1 && (
                <button
                  onClick={clearChat}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  title="Clear chat"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Chat Area */}
        <div className={cn('flex-1 rounded-2xl p-4 mb-4 overflow-hidden flex flex-col', styles.card)}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn('flex', message.isUser ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] p-4 rounded-2xl',
                      message.isUser
                        ? cn(styles.userBubble, 'rounded-br-sm')
                        : cn(styles.aiBubble, 'rounded-bl-sm')
                    )}
                  >
                    {message.isUser ? (
                      <p className="text-sm">{message.text}</p>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-200">{children}</p>,
                            strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                            li: ({ children }) => <li className="text-gray-300 mb-1">{children}</li>,
                            h1: ({ children }) => <h1 className="text-lg font-bold text-white mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold text-white mb-2">{children}</h2>,
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className={cn('p-4 rounded-2xl rounded-bl-sm', styles.aiBubble)}>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className={cn('w-2 h-2 rounded-full', styles.accentBg)}
                        animate={{
                          opacity: [0.3, 1, 0.3],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                    <span className="ml-2 text-gray-400 text-sm">Analyzing...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Questions Panel */}
        <div className={cn('rounded-2xl mb-4 overflow-hidden', styles.card)}>
          {/* Toggle header */}
          <button
            onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className={cn('w-4 h-4', styles.accent)} />
              <span className="text-sm font-medium text-white">Quick questions</span>
            </div>
            <div className="flex items-center gap-2">
              {suggestionsExpanded && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEditQuestions(true);
                  }}
                  className={cn('flex items-center gap-1 px-2 py-1 rounded text-xs', styles.chip)}
                >
                  <Edit3 size={12} />
                  Edit
                </button>
              )}
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-gray-400 transition-transform',
                  suggestionsExpanded && 'rotate-180'
                )}
              />
            </div>
          </button>

          {/* Collapsible content */}
          <AnimatePresence>
            {suggestionsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 flex flex-wrap gap-2">
                  {quickQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSend(question)}
                      disabled={isLoading}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm transition-colors disabled:opacity-50',
                        styles.chip
                      )}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="Ask about any football match..."
            className={cn(
              'flex-1 px-5 py-3 rounded-xl border text-white placeholder-gray-500 outline-none transition-colors',
              styles.input
            )}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={isLoading || !input.trim()}
            className={cn(
              'px-5 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50 bg-gradient-to-r',
              styles.gradient
            )}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={20} />}
          </button>
        </motion.div>

        {/* Footer info */}
        <p className="text-center text-gray-500 text-xs mt-3">
          {isPremium ? (
            'Unlimited AI predictions with Premium'
          ) : (
            <>
              {localTokens} predictions remaining today
              {' '}
              <Link href="/premium" className={cn('underline', styles.accent)}>
                Upgrade for unlimited
              </Link>
            </>
          )}
        </p>
      </div>

      {/* Edit Quick Questions Modal */}
      <AnimatePresence>
        {showEditQuestions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowEditQuestions(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={cn('w-full max-w-md rounded-2xl overflow-hidden', styles.card)}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Edit Quick Questions</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetQuickQuestions}
                    className="flex items-center gap-1 px-2 py-1 rounded text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <RefreshCw size={14} />
                    Reset
                  </button>
                  <button
                    onClick={() => setShowEditQuestions(false)}
                    className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Add new */}
              <div className="p-4 border-b border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddQuestion()}
                    placeholder="Add new question..."
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg border text-white text-sm placeholder-gray-500 outline-none',
                      styles.input
                    )}
                  />
                  <button
                    onClick={handleAddQuestion}
                    disabled={!newQuestion.trim()}
                    className={cn(
                      'p-2 rounded-lg transition-colors disabled:opacity-50',
                      styles.accentBg
                    )}
                  >
                    <Plus size={18} className="text-white" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-64 overflow-y-auto">
                {quickQuestions.map((question, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0"
                  >
                    <span className="text-sm text-gray-300">{question}</span>
                    <button
                      onClick={() => removeQuickQuestion(index)}
                      className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Done button */}
              <div className="p-4">
                <button
                  onClick={() => setShowEditQuestions(false)}
                  className={cn(
                    'w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r',
                    styles.gradient
                  )}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Limit Reached Modal */}
      <AnimatePresence>
        {showLimitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowLimitModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={cn('w-full max-w-md rounded-2xl p-6 text-center', styles.card)}
            >
              {isPremium ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Crown className="w-8 h-8 text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Premium Active</h3>
                  <p className="text-gray-400 mb-6">
                    You have unlimited AI predictions!
                  </p>
                  <p className="text-gray-300 text-sm mb-6">
                    Enjoy unlimited match analysis with your Premium subscription.
                  </p>
                  <button
                    onClick={() => setShowLimitModal(false)}
                    className={cn(
                      'w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r',
                      styles.gradient
                    )}
                  >
                    Got it
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {localTokens > 0 ? 'Daily Predictions' : 'Daily Limit Reached'}
                  </h3>
                  <p className="text-gray-400 mb-4">
                    {localTokens > 0
                      ? `You have ${localTokens} predictions left today`
                      : "You've used all your free predictions for today"
                    }
                  </p>

                  <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
                    <p className="text-sm text-gray-300 mb-2">- Each AI analysis uses 1 prediction</p>
                    <p className="text-sm text-gray-300 mb-2">- Predictions reset 24h after first use</p>
                    <p className="text-sm text-gray-300">- Match browsing is unlimited</p>
                  </div>

                  <div className="bg-amber-500/10 rounded-xl p-4 mb-6 text-left">
                    <p className={cn('text-sm font-medium mb-2', styles.accent)}>Premium Benefits:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <span className="text-green-400">+</span>
                        Unlimited AI Predictions
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <span className="text-green-400">+</span>
                        Pro Analysis Tools
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <span className="text-green-400">+</span>
                        Priority Support
                      </div>
                    </div>
                  </div>

                  <Link href="/premium" className="block">
                    <button className="w-full py-3 rounded-xl font-medium text-black bg-amber-500 hover:bg-amber-400 transition-colors mb-3">
                      Unlock Premium
                    </button>
                  </Link>
                  <button
                    onClick={() => setShowLimitModal(false)}
                    className="text-gray-500 text-sm hover:text-gray-400 transition-colors"
                  >
                    Maybe Later
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
