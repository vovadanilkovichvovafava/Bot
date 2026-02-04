'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Loader2, Trash2, Sparkles, ChevronDown,
  Edit3, RefreshCw, X, Plus, Crown, Zap, Brain, MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useMatchesStore } from '@/store/matchesStore';
import { cn } from '@/lib/utils';

const QUICK_QUESTIONS = [
  'Best bets for today?',
  'Champions League analysis',
  'Top match prediction',
  'Team stats comparison',
  'Value bets this week',
];

export default function AIChatPage() {
  const [input, setInput] = useState('');
  const [showEditQuestions, setShowEditQuestions] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const { user } = useAuthStore();
  const { loadTodayMatches, loadTomorrowMatches } = useMatchesStore();

  const isPremium = user?.isPremium ?? false;

  useEffect(() => {
    initializeChat();
    checkAndResetTokens();
    loadTodayMatches();
    loadTomorrowMatches();
  }, [initializeChat, checkAndResetTokens, loadTodayMatches, loadTomorrowMatches]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!content.trim() || isLoading) return;

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

  const displayQuestions = quickQuestions.length > 0 ? quickQuestions : QUICK_QUESTIONS;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#3B5998] via-[#4A66A0] to-[#6B5B95] px-4 pt-12 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI Assistant</h1>
                <div className="flex items-center gap-2 text-sm">
                  <span className={cn('flex items-center gap-1', aiAvailable ? 'text-emerald-300' : 'text-red-300')}>
                    <span className={cn('w-2 h-2 rounded-full', aiAvailable ? 'bg-emerald-400' : 'bg-red-400')} />
                    {aiAvailable ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Token counter */}
              <button
                onClick={() => setShowLimitModal(true)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold',
                  isPremium
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                    : localTokens > 3
                    ? 'bg-white/10 text-white border border-white/20'
                    : localTokens > 0
                    ? 'bg-orange-400/20 text-orange-300 border border-orange-400/30'
                    : 'bg-red-400/20 text-red-300 border border-red-400/30'
                )}
              >
                {isPremium ? (
                  <>
                    <Crown size={14} />
                    PRO
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    {localTokens}
                  </>
                )}
              </button>

              {messages.length > 1 && (
                <button
                  onClick={clearChat}
                  className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-white transition-all active:scale-95"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 px-4 py-4 overflow-hidden flex flex-col">
        <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
            {messages.length === 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full text-center py-12"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#3B5998] to-[#6B5B95] flex items-center justify-center mb-6 shadow-lg">
                  <MessageSquare className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Ask me anything about football
                </h2>
                <p className="text-gray-500 max-w-sm mb-8">
                  I can help with match predictions, team analysis, and betting insights
                </p>

                <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                  {displayQuestions.slice(0, 3).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q)}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-[#3B5998]/10 text-[#3B5998] border border-[#3B5998]/20 transition-all active:scale-95 disabled:opacity-50"
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
                    className={cn(
                      'max-w-[85%] p-4 rounded-2xl',
                      message.isUser
                        ? 'bg-[#3B5998] text-white rounded-br-sm'
                        : 'bg-white shadow-sm border border-gray-100 rounded-bl-sm'
                    )}
                  >
                    {message.isUser ? (
                      <p className="text-sm">{message.text}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-700 text-sm">{children}</p>,
                            strong: ({ children }) => <strong className="text-gray-900 font-semibold">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 text-sm">{children}</ul>,
                            li: ({ children }) => <li className="text-gray-600 mb-1">{children}</li>,
                            h1: ({ children }) => <h1 className="text-base font-bold text-gray-900 mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-sm font-bold text-gray-900 mb-2">{children}</h2>,
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

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-white shadow-sm border border-gray-100 p-4 rounded-2xl rounded-bl-sm">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-[#3B5998]"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                    <span className="ml-2 text-gray-400 text-sm">Analyzing...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
            <button
              onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#3B5998]" />
                <span className="text-sm font-medium text-gray-900">Quick questions</span>
              </div>
              <div className="flex items-center gap-2">
                {suggestionsExpanded && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditQuestions(true);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 text-gray-600"
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
                    {displayQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSend(question)}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Ask about any match..."
              className="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 outline-none focus:border-[#3B5998]/50 transition-colors"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={isLoading || !input.trim()}
              className="px-5 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-[#3B5998] to-[#6B5B95] transition-all disabled:opacity-50 active:scale-95"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={20} />}
            </button>
          </div>

          <p className="text-center text-gray-400 text-xs mt-3">
            {isPremium ? (
              'Unlimited predictions with Premium'
            ) : (
              <>
                {localTokens} predictions left today · <Link href="/settings" className="text-[#3B5998] underline">Upgrade</Link>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Edit Quick Questions Modal */}
      <AnimatePresence>
        {showEditQuestions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowEditQuestions(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Edit Quick Questions</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetQuickQuestions}
                    className="flex items-center gap-1 px-2 py-1 rounded text-sm text-gray-500"
                  >
                    <RefreshCw size={14} />
                    Reset
                  </button>
                  <button
                    onClick={() => setShowEditQuestions(false)}
                    className="p-1 rounded text-gray-400"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-4 border-b border-gray-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddQuestion()}
                    placeholder="Add new question..."
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-gray-900 text-sm placeholder-gray-400 outline-none"
                  />
                  <button
                    onClick={handleAddQuestion}
                    disabled={!newQuestion.trim()}
                    className="p-2 rounded-lg bg-[#3B5998] text-white disabled:opacity-50"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {displayQuestions.map((question, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-sm text-gray-700">{question}</span>
                    <button
                      onClick={() => removeQuickQuestion(index)}
                      className="p-1 rounded text-gray-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-4">
                <button
                  onClick={() => setShowEditQuestions(false)}
                  className="w-full py-3 rounded-xl font-medium text-white bg-[#3B5998]"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Limit Modal */}
      <AnimatePresence>
        {showLimitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowLimitModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl p-6 text-center"
            >
              {isPremium ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                    <Crown className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Premium Active</h3>
                  <p className="text-gray-500 mb-6">
                    You have unlimited AI predictions!
                  </p>
                  <button
                    onClick={() => setShowLimitModal(false)}
                    className="w-full py-3 rounded-xl font-medium text-white bg-[#3B5998]"
                  >
                    Got it
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {localTokens > 0 ? 'Daily Predictions' : 'Limit Reached'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {localTokens > 0
                      ? `You have ${localTokens} predictions left today`
                      : "You've used all free predictions"
                    }
                  </p>

                  <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left">
                    <p className="text-sm text-gray-600 mb-2">- Each AI analysis uses 1 token</p>
                    <p className="text-sm text-gray-600 mb-2">- Tokens reset every 24 hours</p>
                    <p className="text-sm text-gray-600">- Match browsing is unlimited</p>
                  </div>

                  <div className="bg-[#3B5998]/10 rounded-xl p-4 mb-6 text-left">
                    <p className="text-sm font-medium text-[#3B5998] mb-2">Premium Benefits:</p>
                    <div className="space-y-1.5 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-500">+</span> Unlimited predictions
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-500">+</span> Pro analysis tools
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-500">+</span> Priority support
                      </div>
                    </div>
                  </div>

                  <Link href="/settings" className="block">
                    <button className="w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 mb-3">
                      Unlock Premium
                    </button>
                  </Link>
                  <button
                    onClick={() => setShowLimitModal(false)}
                    className="text-gray-400 text-sm"
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
