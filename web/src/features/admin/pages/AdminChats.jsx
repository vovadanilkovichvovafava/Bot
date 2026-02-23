import { useState, useEffect, useCallback, useRef } from 'react'
import { adminApi } from '../api'

const TABS = [
  { key: 'support', label: 'Support Chat' },
  { key: 'ai', label: 'AI Chat' },
]

/* ── Keyword badge ─────────────────────────────────────────────── */

function KeywordsBadge({ keywords }) {
  if (!keywords) return null
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/15 rounded-lg">
      <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
      <span className="text-[11px] text-amber-300">{keywords}</span>
    </div>
  )
}

function TranslatingSpinner() {
  return (
    <div className="px-4 pt-3 flex items-center gap-2">
      <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-[11px] text-indigo-400">Translating to Russian...</span>
    </div>
  )
}


/* ── Chat messages display ─────────────────────────────────────── */

function ChatMessages({ messages, translation, assistantLabel }) {
  return (
    <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
      {messages.map((m, idx) => (
        <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
            m.role === 'user'
              ? 'bg-blue-600/20 border border-blue-500/20 text-slate-200'
              : 'bg-slate-800/70 border border-slate-700/50 text-slate-300'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-semibold ${
                m.role === 'user' ? 'text-blue-400' : 'text-cyan-400'
              }`}>
                {m.role === 'user' ? 'User' : (assistantLabel || m.agent_name || 'Assistant')}
              </span>
              <span className="text-[9px] text-slate-600">
                {m.created_at ? new Date(m.created_at).toLocaleTimeString() : ''}
              </span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {translation?.translated?.[idx] || m.content}
            </p>
            {translation?.translated?.[idx] && (
              <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed whitespace-pre-wrap break-words border-t border-slate-700/30 pt-1.5">
                {m.content}
              </p>
            )}
          </div>
        </div>
      ))}
      {!messages.length && (
        <p className="text-xs text-slate-600 text-center py-4">No messages</p>
      )}
    </div>
  )
}


/* ── Support Chat Tab ────────────────────────────────────────────── */

function SupportChatTab() {
  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [openSession, setOpenSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [translations, setTranslations] = useState({})
  const [translating, setTranslating] = useState(false)
  const translatingRef = useRef(null) // track which session is being translated
  const PAGE_SIZE = 20

  const load = useCallback(() => {
    setLoading(true)
    adminApi.getSupportSessions(PAGE_SIZE, page * PAGE_SIZE)
      .then(d => { setSessions(d.sessions || []); setTotal(d.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => { load() }, [load])

  // Auto-translate when messages are loaded
  const autoTranslate = useCallback(async (sessionId, msgs) => {
    if (translations[sessionId] || !msgs.length) return
    setTranslating(true)
    translatingRef.current = sessionId
    try {
      const result = await adminApi.translateMessages(msgs)
      if (translatingRef.current === sessionId && result?.translated?.length) {
        setTranslations(prev => ({ ...prev, [sessionId]: result }))
      }
    } catch (e) {
      console.warn('Translate failed:', e)
    } finally {
      setTranslating(false)
    }
  }, [translations])

  const openChat = (sessionId) => {
    if (openSession === sessionId) { setOpenSession(null); return }
    setOpenSession(sessionId)
    setMessages([])
    setMsgLoading(true)
    adminApi.getSupportSessionMessages(sessionId)
      .then(d => {
        const msgs = d.messages || []
        setMessages(msgs)
        // fire translate in background
        autoTranslate(sessionId, msgs)
      })
      .catch(() => setMessages([]))
      .finally(() => setMsgLoading(false))
  }

  if (loading && !sessions.length) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>{total} sessions total</span>
        {totalPages > 1 && <span>Page {page + 1} / {totalPages}</span>}
      </div>

      <div className="space-y-2">
        {sessions.map(s => {
          const tr = translations[s.session_id]
          return (
          <div key={s.session_id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => openChat(s.session_id)}
              className="w-full text-left px-4 py-3.5 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                    {s.user_id === 0 ? 'G' : `U${s.user_id}`}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">
                        {s.user_id === 0 ? 'Guest' : `User #${s.user_id}`}
                      </span>
                      {s.was_pro && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded whitespace-nowrap">PRO</span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded uppercase font-mono">{s.locale}</span>
                      {s.agent_name && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/15 text-cyan-400 rounded">{s.agent_name}</span>
                      )}
                    </div>
                    {s.preview && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{s.preview}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
                      </svg>
                      <span className="text-xs font-mono text-slate-400">{s.total_messages}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {s.last_message ? new Date(s.last_message).toLocaleDateString() : '\u2014'}
                    </p>
                  </div>
                  <svg className={`w-4 h-4 text-slate-600 transition-transform ${openSession === s.session_id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
                  </svg>
                </div>
              </div>
            </button>

            {openSession === s.session_id && (
              <div className="border-t border-slate-800 bg-slate-950/50">
                {msgLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {translating && !tr && <TranslatingSpinner />}
                    {tr?.keywords && (
                      <div className="px-4 pt-3">
                        <KeywordsBadge keywords={tr.keywords} />
                      </div>
                    )}
                    <ChatMessages messages={messages} translation={tr} assistantLabel={null} />
                  </>
                )}
              </div>
            )}
          </div>
          )
        })}
      </div>

      {!sessions.length && (
        <p className="text-sm text-slate-600 text-center py-12">No support sessions yet</p>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500 px-3">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}


/* ── AI Chat Tab ─────────────────────────────────────────────────── */

function AIChatTab() {
  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [openSession, setOpenSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [translations, setTranslations] = useState({})
  const [translating, setTranslating] = useState(false)
  const translatingRef = useRef(null)
  const PAGE_SIZE = 20

  const load = useCallback(() => {
    setLoading(true)
    adminApi.getAIChatSessions(PAGE_SIZE, page * PAGE_SIZE)
      .then(d => { setSessions(d.sessions || []); setTotal(d.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => { load() }, [load])

  const autoTranslate = useCallback(async (sessionId, msgs) => {
    if (translations[sessionId] || !msgs.length) return
    setTranslating(true)
    translatingRef.current = sessionId
    try {
      const result = await adminApi.translateMessages(msgs)
      if (translatingRef.current === sessionId && result?.translated?.length) {
        setTranslations(prev => ({ ...prev, [sessionId]: result }))
      }
    } catch (e) {
      console.warn('Translate failed:', e)
    } finally {
      setTranslating(false)
    }
  }, [translations])

  const openChat = (sessionId) => {
    if (openSession === sessionId) { setOpenSession(null); return }
    setOpenSession(sessionId)
    setMessages([])
    setMsgLoading(true)
    adminApi.getAIChatSessionMessages(sessionId)
      .then(d => {
        const msgs = d.messages || []
        setMessages(msgs)
        autoTranslate(sessionId, msgs)
      })
      .catch(() => setMessages([]))
      .finally(() => setMsgLoading(false))
  }

  if (loading && !sessions.length) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>{total} AI chat sessions</span>
        {totalPages > 1 && <span>Page {page + 1} / {totalPages}</span>}
      </div>

      {!sessions.length && (
        <div className="text-center py-16">
          <svg className="w-12 h-12 text-slate-700 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
          </svg>
          <p className="text-sm text-slate-500">No AI chat sessions yet</p>
          <p className="text-xs text-slate-600 mt-1">Dialogs will appear here as users chat with AI</p>
        </div>
      )}

      <div className="space-y-2">
        {sessions.map(s => {
          const tr = translations[s.session_id]
          return (
            <div key={s.session_id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <button
                onClick={() => openChat(s.session_id)}
                className="w-full text-left px-4 py-3.5 hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">User #{s.user_id}</span>
                        {s.was_pro && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">PRO</span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded uppercase font-mono">{s.locale}</span>
                      </div>
                      {s.preview && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{s.preview}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
                        </svg>
                        <span className="text-xs font-mono text-slate-400">{s.total_messages}</span>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {s.last_message ? new Date(s.last_message).toLocaleDateString() : '\u2014'}
                      </p>
                    </div>
                    <svg className={`w-4 h-4 text-slate-600 transition-transform ${openSession === s.session_id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
                    </svg>
                  </div>
                </div>
              </button>

              {openSession === s.session_id && (
                <div className="border-t border-slate-800 bg-slate-950/50">
                  {msgLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {translating && !tr && <TranslatingSpinner />}
                      {tr?.keywords && (
                        <div className="px-4 pt-3">
                          <KeywordsBadge keywords={tr.keywords} />
                        </div>
                      )}
                      <ChatMessages messages={messages} translation={tr} assistantLabel="AI Assistant" />
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500 px-3">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}


/* ── Main Page ───────────────────────────────────────────────────── */

export default function AdminChats() {
  const [tab, setTab] = useState('support')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Chats</h1>
        <p className="text-sm text-slate-500 mt-1">Review AI and Support chat conversations</p>
      </div>

      <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              tab === t.key
                ? 'bg-blue-600/20 text-blue-400 font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'support' && <SupportChatTab />}
      {tab === 'ai' && <AIChatTab />}
    </div>
  )
}
