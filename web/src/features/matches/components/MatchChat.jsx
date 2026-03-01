import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import api from '../../../shared/api';

const POLL_INTERVAL = 10000; // 10 seconds

export default function MatchChat({ matchId }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.getMatchChat(matchId);
      setMessages(data.messages || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load chat:', e);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // Poll for new messages
  const pollMessages = useCallback(async () => {
    if (!messages.length) return;
    const lastId = messages[messages.length - 1]?.id;
    try {
      const data = await api.getMatchChat(matchId, lastId);
      if (data.messages?.length > 0) {
        setMessages(prev => [...prev, ...data.messages]);
        setTotal(data.total || 0);
        scrollToBottom();
      }
    } catch {}
  }, [matchId, messages]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [loading]);

  useEffect(() => {
    const interval = setInterval(pollMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [pollMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const msg = await api.sendMatchChat(matchId, text);
      setMessages(prev => [...prev, msg]);
      setTotal(prev => prev + 1);
      setNewMessage('');
      scrollToBottom();
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="card border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd"/>
          </svg>
          <h3 className="font-bold text-gray-900 text-sm">{t('matchChat.title')}</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="shimmer h-10 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card border border-gray-100">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd"/>
        </svg>
        <h3 className="font-bold text-gray-900 text-sm">{t('matchChat.title')}</h3>
        {total > 0 && (
          <span className="ml-auto text-xs text-gray-400">
            {total} {t('matchChat.messages')}
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="max-h-80 overflow-y-auto space-y-2.5 mb-3 scrollbar-thin"
      >
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <svg className="w-10 h-10 mx-auto text-gray-200 mb-2" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd"/>
            </svg>
            <p className="text-gray-400 text-sm">{t('matchChat.empty')}</p>
            <p className="text-gray-300 text-xs mt-1">{t('matchChat.beFirst')}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                    isOwn
                      ? 'bg-primary-500 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}
                >
                  {!isOwn && (
                    <p className="text-xs font-semibold text-primary-600 mb-0.5">
                      {msg.username}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                  <p
                    className={`text-[10px] mt-0.5 ${
                      isOwn ? 'text-white/60' : 'text-gray-400'
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t('matchChat.placeholder')}
          maxLength={500}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="bg-primary-500 hover:bg-primary-600 text-white rounded-xl px-3.5 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {sending ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
