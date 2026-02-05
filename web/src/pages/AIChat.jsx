import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { enrichMessage } from '../services/chatEnrichment';

const QUICK_QUESTIONS = [
  { label: "Today's best bets", emoji: '\uD83C\uDFAF' },
  { label: "Live matches now", emoji: '\uD83D\uDD34' },
  { label: 'Premier League today', emoji: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F' },
  { label: 'La Liga today', emoji: '\uD83C\uDDEA\uD83C\uDDF8' },
  { label: 'Champions League', emoji: '\u2B50' },
  { label: 'Serie A today', emoji: '\uD83C\uDDEE\uD83C\uDDF9' },
];

export default function AIChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const remaining = user ? (user.daily_limit - user.daily_requests + user.bonus_predictions) : 10;

  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to **AI Football Assistant**!\n\nI have access to **real-time data** from 900+ leagues:\n\n\u2022 \uD83D\uDCCA **Match predictions** with real probabilities & odds\n\u2022 \uD83D\uDD34 **Live scores** and match statistics\n\u2022 \uD83C\uDFAF **Betting recommendations** based on actual data\n\u2022 \uD83E\uDE7A **Injuries & lineups** for upcoming matches\n\u2022 \uD83D\uDCC5 **Today's overview** with AI predictions\n\n**Try asking:**\n\u2022 "Arsenal vs Chelsea prediction"\n\u2022 "Best bets for today"\n\u2022 "Live matches now"\n\u2022 "Premier League today"`,
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowQuick(false);
    setLoading(true);

    try {
      // Build conversation history (exclude welcome message)
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: text });

      // Enrich with real-time football data from API-Football
      setEnriching(true);
      let matchContext = null;
      try {
        matchContext = await enrichMessage(text);
      } catch (e) {
        console.error('Enrichment failed:', e);
      }
      setEnriching(false);

      const data = await api.aiChat(text, history, matchContext);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response,
        hasData: !!matchContext,
      }]);
    } catch (e) {
      const errorMsg = e.message?.includes('402') || e.message?.includes('limit')
        ? 'You have reached your daily AI request limit. Upgrade to Premium for unlimited access.'
        : 'Sorry, I encountered an error. Please try again.';
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: errorMsg,
      }]);
    } finally {
      setLoading(false);
      setEnriching(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Chat cleared. How can I help you with football analysis?',
    }]);
    setShowQuick(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">AI Assistant</h1>
            <p className="text-[10px] text-green-500 font-medium">Real-time data</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 bg-primary-50 text-primary-600 text-sm font-medium px-2.5 py-1 rounded-lg">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
            {remaining}
          </span>
          <button onClick={clearChat} className="w-8 h-8 flex items-center justify-center text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary-600 text-white rounded-tr-sm'
                : 'bg-white text-gray-800 rounded-tl-sm shadow-sm'
            }`}>
              {/* Data badge for enriched responses */}
              {msg.hasData && msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    Real-time data
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 font-medium">AI Analysis</span>
                </div>
              )}
              <MessageContent content={msg.content} isUser={msg.role === 'user'} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm">
              {enriching ? (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"/>
                  Fetching real-time data...
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                  </div>
                  Analyzing...
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>

      {/* Quick Questions */}
      {showQuick && messages.length <= 1 && (
        <div className="px-5 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 .75a8.25 8.25 0 00-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 00.577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.714 6.714 0 01-.937-.171.75.75 0 11.374-1.453 5.261 5.261 0 002.626 0 .75.75 0 11.374 1.452 6.712 6.712 0 01-.937.172v4.66c0 .327.277.586.6.545.364-.047.722-.112 1.074-.195a.75.75 0 00.577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0012 .75z"/>
              </svg>
              Quick questions
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map(q => (
              <button
                key={q.label}
                onClick={() => sendMessage(q.label)}
                disabled={loading}
                className="bg-white text-gray-700 text-sm px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                {q.emoji} {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-3 bg-white border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage(input)}
            placeholder="Ask about any match, league, or team..."
            className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders message content with markdown-like formatting.
 * Supports: **bold**, bullet points, --- separators
 */
function MessageContent({ content, isUser }) {
  if (!content) return null;

  return (
    <div className="space-y-0.5">
      {content.split('\n').map((line, i) => {
        if (line === '') return <div key={i} className="h-1.5"/>;

        // Horizontal rule
        if (line.match(/^---+$/)) {
          return <hr key={i} className={`my-2 ${isUser ? 'border-white/20' : 'border-gray-100'}`}/>;
        }

        // Bold headers (lines starting with ---)
        if (line.startsWith('---') && line.endsWith('---')) {
          const text = line.replace(/^-+\s*/, '').replace(/\s*-+$/, '');
          return (
            <p key={i} className={`font-semibold text-xs uppercase mt-2 mb-1 ${isUser ? 'text-white/70' : 'text-gray-400'}`}>
              {text}
            </p>
          );
        }

        // Bullet points
        if (line.startsWith('\u2022 ') || line.startsWith('- ') || line.startsWith('* ')) {
          const text = line.replace(/^[\u2022\-*]\s+/, '');
          const bold = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className={isUser ? 'text-white/50' : 'text-gray-300'}>{'\u2022'}</span>
              <p dangerouslySetInnerHTML={{ __html: bold }}/>
            </div>
          );
        }

        // Regular text with bold support
        const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <p key={i} dangerouslySetInnerHTML={{ __html: bold }}/>;
      })}
    </div>
  );
}
