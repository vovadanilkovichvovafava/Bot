'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Loader2, Trash2, Sparkles, ChevronDown,
  Edit3, RefreshCw, X, Plus, Crown, Zap
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useMatchesStore } from '@/store/matchesStore';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';

export default function AIChatPage() {
  const { selectedTheme } = useThemeStore();
  const [input, setInput] = useState('');
  const [showEditQuestions, setShowEditQuestions] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      bg: 'stadium-bg',
      card: 'card-stadium',
      accent: 'text-indigo-400',
      accentBg: 'bg-indigo-500',
      gradient: 'from-indigo-500 to-purple-600',
      userBubble: 'bg-indigo-500 text-white',
      aiBubble: 'bg-white/5 border border-indigo-500/20',
      input: 'bg-black/30 border-indigo-500/30 focus:border-indigo-500',
      chip: 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20',
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
