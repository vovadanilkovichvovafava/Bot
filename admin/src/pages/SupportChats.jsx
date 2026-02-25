import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

const LOCALE_FLAGS = { en: '🇬🇧', it: '🇮🇹', de: '🇩🇪', pl: '🇵🇱' }

export default function SupportChats() {
  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSession, setSelectedSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  // Load sessions
  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async (q = '') => {
    setLoading(true)
    try {
      const data = await api.getSupportSessions(50, 0, q)
      setSessions(data.sessions || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to load sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadSessions(search)
  }

  const openSession = async (session) => {
    setSelectedSession(session)
    setLoadingMessages(true)
    setReplyText('')
    try {
      const data = await api.getSupportSessionMessages(session.session_id)
      setMessages(data.messages || [])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      console.error('Failed to load messages:', err)
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleReply = async () => {
    if (!replyText.trim() || !selectedSession || sending) return
    setSending(true)
    try {
      const result = await api.replyToSupport(selectedSession.session_id, replyText.trim())
      // Add the new message to the list
      setMessages(prev => [...prev, {
        id: result.id,
        role: 'assistant',
        content: replyText.trim(),
        is_admin_reply: true,
        created_at: result.created_at || new Date().toISOString(),
      }])
      setReplyText('')
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      alert('Failed to send: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleReply()
    }
  }

  const formatTime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diff = now - d
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 100px)' }}>
      {/* Sessions list */}
      <div className="w-80 shrink-0 flex flex-col bg-dark-800 rounded-xl border border-dark-700">
        <div className="p-3 border-b border-dark-700">
          <h2 className="text-sm font-semibold text-dark-200 mb-2">
            Support Chats {total > 0 && <span className="text-dark-500">({total})</span>}
          </h2>
          <form onSubmit={handleSearch} className="flex gap-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search user ID or text..."
              className="flex-1 text-xs bg-dark-900 border border-dark-600 rounded-lg px-2.5 py-1.5 text-dark-200 placeholder-dark-500 focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="text-xs bg-dark-700 hover:bg-dark-600 text-dark-300 px-2.5 py-1.5 rounded-lg">
              Go
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-dark-700/50">
          {loading ? (
            <p className="text-center text-xs text-dark-500 py-8">Loading...</p>
          ) : sessions.length === 0 ? (
            <p className="text-center text-xs text-dark-500 py-8">No sessions found</p>
          ) : sessions.map(s => (
            <button
              key={s.session_id}
              onClick={() => openSession(s)}
              className={`w-full text-left px-3 py-2.5 hover:bg-dark-700/50 transition-colors ${
                selectedSession?.session_id === s.session_id ? 'bg-dark-700/70 border-l-2 border-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-dark-200">User #{s.user_id}</span>
                  <span className="text-xs">{LOCALE_FLAGS[s.locale] || s.locale}</span>
                  {s.was_pro && (
                    <span className="text-[9px] px-1 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">PRO</span>
                  )}
                </div>
                <span className="text-[10px] text-dark-500">{formatTime(s.last_message || s.started)}</span>
              </div>
              <p className="text-[11px] text-dark-400 truncate">{s.preview || '...'}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-dark-500">{s.total_messages} msgs</span>
                {s.agent_name && <span className="text-[10px] text-dark-500">{s.agent_name}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat view */}
      <div className="flex-1 flex flex-col bg-dark-800 rounded-xl border border-dark-700">
        {!selectedSession ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-dark-500">Select a chat to view</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-dark-200">
                  User #{selectedSession.user_id}
                </span>
                <span>{LOCALE_FLAGS[selectedSession.locale] || selectedSession.locale}</span>
                {selectedSession.was_pro && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">PRO</span>
                )}
                {selectedSession.agent_name && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-dark-600 text-dark-300 rounded">
                    {selectedSession.agent_name}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-dark-500">{selectedSession.session_id.slice(0, 8)}...</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {loadingMessages ? (
                <p className="text-center text-xs text-dark-500 py-8">Loading messages...</p>
              ) : messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 ${
                    m.role === 'user'
                      ? 'bg-blue-600/20 text-blue-100'
                      : m.is_admin_reply
                        ? 'bg-amber-600/20 text-amber-100 border border-amber-500/30'
                        : 'bg-dark-700 text-dark-200'
                  }`}>
                    {m.is_admin_reply && (
                      <p className="text-[9px] text-amber-400 font-medium mb-1">ADMIN REPLY</p>
                    )}
                    <p className="text-xs whitespace-pre-wrap">{m.content}</p>
                    <p className="text-[10px] text-dark-500 mt-1">
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <div className="px-4 py-3 border-t border-dark-700">
              <div className="flex gap-2">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your reply to the user..."
                  rows={2}
                  className="flex-1 text-xs bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-dark-200 placeholder-dark-500 focus:outline-none focus:border-amber-500 resize-none"
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || sending}
                  className="self-end px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {sending ? '...' : 'Send'}
                </button>
              </div>
              <p className="text-[10px] text-dark-500 mt-1.5">
                User will see this as a message from {selectedSession?.agent_name || 'support'}. Enter to send.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
