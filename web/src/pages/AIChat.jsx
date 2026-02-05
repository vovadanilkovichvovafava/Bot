import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const QUICK_QUESTIONS = [
  { label: "Today's matches", emoji: '\uD83D\uDCC5' },
  { label: 'Premier League', emoji: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F' },
  { label: 'La Liga', emoji: '\uD83C\uDDEA\uD83C\uDDF8' },
  { label: 'Bundesliga', emoji: '\uD83C\uDDE9\uD83C\uDDEA' },
  { label: 'Serie A', emoji: '\uD83C\uDDEE\uD83C\uDDF9' },
  { label: 'Ligue 1', emoji: '\uD83C\uDDEB\uD83C\uDDF7' },
];

export default function AIChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const messagesEndRef = useRef(null);
  const remaining = user ? (user.daily_limit - user.daily_requests + user.bonus_predictions) : 10;

  useEffect(() => {
    // Welcome message
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to AI Assistant! I can help you with:\n\n\u2022 \uD83D\uDCCA Match predictions and analysis\n\u2022 \uD83C\uDFAF Probabilities: Home/Draw/Away, totals, BTTS\n\u2022 \uD83D\uDCC5 Match overview for today/tomorrow\n\u2022 \uD83D\uDCA1 Betting recommendations\n\n**Example queries:**\n\u2022 "Analyse Bayern vs Dortmund"\n\u2022 "West Ham vs Fulham prediction"\n\u2022 "Premier League today"\n\u2022 "Best bets for today"\n\nPlease bet responsibly`,
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Use prediction API to simulate chat responses
      const todayMatches = await api.getTodayMatches();
      let response = '';

      const lower = text.toLowerCase();
      if (lower.includes('today') || lower.includes('match')) {
        response = `Here are today's matches:\n\n`;
        todayMatches.slice(0, 5).forEach(m => {
          response += `\u26BD **${m.home_team.name} vs ${m.away_team.name}**\n`;
          response += `\uD83C\uDFC6 ${m.league} \u2022 ${new Date(m.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\n`;
        });
        if (todayMatches.length === 0) {
          response = 'No matches scheduled for today. Check back later!';
        }
      } else if (lower.includes('premier') || lower.includes('pl')) {
        const plMatches = todayMatches.filter(m => m.league_code === 'PL');
        if (plMatches.length > 0) {
          response = `**Premier League matches:**\n\n`;
          plMatches.forEach(m => {
            response += `\u26BD ${m.home_team.name} vs ${m.away_team.name}\n`;
            response += `\u23F0 ${new Date(m.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\n`;
          });
        } else {
          response = 'No Premier League matches today.';
        }
      } else if (lower.includes('predict') || lower.includes('analy') || lower.includes('best bet')) {
        if (todayMatches.length > 0) {
          const m = todayMatches[0];
          try {
            const pred = await api.createPrediction(m.id);
            response = `\uD83C\uDFAF **${m.home_team.name} vs ${m.away_team.name}**\n`;
            response += `\uD83C\uDFC6 ${m.league}\n\n`;
            response += `**Prediction:** ${pred.bet_name}\n`;
            response += `**Confidence:** ${pred.confidence}%\n`;
            response += `**Odds:** ${pred.odds}\n\n`;
            response += `${pred.reasoning}\n\n`;
            response += `\u26A0\uFE0F Betting involves risk. Please gamble responsibly.`;
          } catch {
            response = 'Unable to generate prediction at this time.';
          }
        } else {
          response = 'No matches available for predictions today.';
        }
      } else {
        response = `I can help you with match analysis and predictions. Try asking about:\n\n\u2022 Today's matches\n\u2022 Specific league matches\n\u2022 Match predictions\n\u2022 Best bets for today`;
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: response,
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Chat cleared. How can I help you?',
    }]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100 shrink-0">
        <h1 className="text-lg font-bold text-gray-900">AI Assistant</h1>
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
            <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-primary-600 text-white rounded-tr-sm'
                : 'bg-white text-gray-800 rounded-tl-sm shadow-sm'
            }`}>
              {msg.content.split('\n').map((line, i) => {
                const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return <p key={i} className={line === '' ? 'h-2' : ''} dangerouslySetInnerHTML={{ __html: bold }}/>;
              })}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>

      {/* Quick Questions */}
      {showQuick && (
        <div className="px-5 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 .75a8.25 8.25 0 00-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 00.577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.714 6.714 0 01-.937-.171.75.75 0 11.374-1.453 5.261 5.261 0 002.626 0 .75.75 0 11.374 1.452 6.712 6.712 0 01-.937.172v4.66c0 .327.277.586.6.545.364-.047.722-.112 1.074-.195a.75.75 0 00.577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0012 .75z"/>
              </svg>
              Quick questions
            </div>
            <button onClick={() => setShowQuick(false)} className="text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/>
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map(q => (
              <button
                key={q.label}
                onClick={() => sendMessage(q.label)}
                className="bg-white text-gray-700 text-sm px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50"
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
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage(input)}
            placeholder="Ask about any match..."
            className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
