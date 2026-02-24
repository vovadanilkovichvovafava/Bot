import { useState, useEffect, useCallback, useRef } from 'react'
import { adminApi } from '../api'

const TABS = [
  { key: 'support', label: 'Support Chat' },
  { key: 'ai', label: 'AI Chat' },
  { key: 'analytics', label: 'Analytics' },
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


/* ── Expandable session card (used inside analytics items) ──────── */

function InsightSessionCard({ sessionId, sourceType }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [translation, setTranslation] = useState(null)
  const [translating, setTranslating] = useState(false)

  const toggle = () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (messages.length) return // already loaded
    setLoading(true)
    const fetch = sourceType === 'ai'
      ? adminApi.getAIChatSessionMessages(sessionId)
      : adminApi.getSupportSessionMessages(sessionId)
    fetch
      .then(d => {
        const msgs = d.messages || []
        setMessages(msgs)
        // auto-translate
        if (msgs.length) {
          setTranslating(true)
          adminApi.translateMessages(msgs)
            .then(r => { if (r?.translated?.length) setTranslation(r) })
            .catch(() => {})
            .finally(() => setTranslating(false))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg overflow-hidden">
      <button onClick={toggle} className="w-full text-left px-3 py-2 hover:bg-slate-800/40 transition-colors flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
            sourceType === 'ai' ? 'bg-green-500/15 text-green-400' : 'bg-blue-500/15 text-blue-400'
          }`}>
            {sourceType === 'ai' ? 'AI' : 'SUP'}
          </span>
          <span className="text-[11px] text-slate-400 font-mono truncate">{sessionId}</span>
        </div>
        <svg className={`w-3.5 h-3.5 text-slate-600 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
        </svg>
      </button>
      {open && (
        <div className="border-t border-slate-800">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {translating && !translation && <TranslatingSpinner />}
              {translation?.keywords && (
                <div className="px-3 pt-2">
                  <KeywordsBadge keywords={translation.keywords} />
                </div>
              )}
              <ChatMessages
                messages={messages}
                translation={translation}
                assistantLabel={sourceType === 'ai' ? 'AI Assistant' : null}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}


/* ── Clickable insight item with expandable sessions ───────────── */

function InsightItem({ children, sessions }) {
  const [expanded, setExpanded] = useState(false)
  const hasSessions = sessions?.length > 0

  return (
    <div className="bg-slate-800/40 rounded-lg overflow-hidden">
      <button
        onClick={() => hasSessions && setExpanded(e => !e)}
        className={`w-full text-left px-3 py-2.5 flex items-start gap-3 ${hasSessions ? 'hover:bg-slate-800/60 cursor-pointer' : 'cursor-default'} transition-colors`}
      >
        <div className="flex-1 min-w-0">{children}</div>
        {hasSessions && (
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <span className="text-[10px] text-slate-600">{sessions.length} chats</span>
            <svg className={`w-3.5 h-3.5 text-slate-600 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
            </svg>
          </div>
        )}
      </button>
      {expanded && hasSessions && (
        <div className="px-3 pb-3 space-y-1.5">
          {sessions.map((s, i) => (
            <InsightSessionCard key={s.session_id + i} sessionId={s.session_id} sourceType={s.type} />
          ))}
        </div>
      )}
    </div>
  )
}


/* ── Analytics Tab ───────────────────────────────────────────────── */

const SEVERITY_COLORS = {
  high: 'bg-red-500/20 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
  low: 'bg-slate-700/50 text-slate-400 border-slate-700/50',
}

function AnalyticsTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminApi.getChatInsights()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Analyzing chats with AI...</p>
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-400 text-center py-12">{error}</p>
  }

  const ins = data?.insights

  return (
    <div className="space-y-5">
      {/* Week stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Support msgs (7d)', value: data?.support_messages_week || 0, color: 'text-blue-400' },
          { label: 'AI msgs (7d)', value: data?.ai_messages_week || 0, color: 'text-green-400' },
          { label: 'Support sessions', value: data?.support_sessions_week || 0, color: 'text-cyan-400' },
          { label: 'AI sessions', value: data?.ai_sessions_week || 0, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-[11px] text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Language distribution */}
      {data?.by_locale?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Messages by Language (7d)</h3>
          <div className="flex gap-3 flex-wrap">
            {data.by_locale.map(l => {
              const total = data.by_locale.reduce((s, x) => s + x.count, 0) || 1
              const pct = Math.round(l.count / total * 100)
              return (
                <div key={l.locale} className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 rounded-lg">
                  <span className="text-xs uppercase font-mono font-bold text-slate-300">{l.locale || '??'}</span>
                  <span className="text-[11px] text-slate-500">{l.count}</span>
                  <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-600">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {ins?.summary && (
        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/15 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
            <h3 className="text-sm font-semibold text-indigo-300">AI Summary</h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{ins.summary}</p>
        </div>
      )}

      {/* Top Topics + Sentiment row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Topics */}
        {ins?.top_topics?.length > 0 && (
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3">Top Topics</h3>
            <div className="space-y-2">
              {ins.top_topics.map((t, i) => (
                <InsightItem key={i} sessions={t.sessions}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{t.emoji || '#'}</span>
                      <span className="text-sm text-slate-200">{t.topic}</span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">~{t.count_approx}</span>
                  </div>
                </InsightItem>
              ))}
            </div>
          </div>
        )}

        {/* Sentiment */}
        {ins?.user_sentiment && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">User Sentiment</h3>
            <div className="space-y-4">
              {[
                { label: 'Positive', value: ins.user_sentiment.positive || 0, color: 'bg-green-500', text: 'text-green-400' },
                { label: 'Neutral', value: ins.user_sentiment.neutral || 0, color: 'bg-slate-500', text: 'text-slate-400' },
                { label: 'Negative', value: ins.user_sentiment.negative || 0, color: 'bg-red-500', text: 'text-red-400' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs ${s.text}`}>{s.label}</span>
                    <span className="text-xs font-mono text-slate-400">{s.value}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${s.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bugs & Feature Requests row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bugs / Issues */}
        {ins?.bugs_issues?.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
              <h3 className="text-sm font-semibold">Bugs & Issues</h3>
            </div>
            <div className="space-y-2">
              {ins.bugs_issues.map((b, i) => (
                <InsightItem key={i} sessions={b.sessions}>
                  <div className="flex items-start gap-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${SEVERITY_COLORS[b.severity] || SEVERITY_COLORS.low}`}>
                      {b.severity}
                    </span>
                    <span className="text-sm text-slate-300 flex-1">{b.issue}</span>
                    <span className="text-xs text-slate-600 font-mono shrink-0">~{b.count_approx}</span>
                  </div>
                </InsightItem>
              ))}
            </div>
          </div>
        )}

        {/* Feature Requests */}
        {ins?.feature_requests?.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/>
              </svg>
              <h3 className="text-sm font-semibold">Feature Requests</h3>
            </div>
            <div className="space-y-2">
              {ins.feature_requests.map((f, i) => (
                <InsightItem key={i} sessions={f.sessions}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{f.request}</span>
                    <span className="text-xs text-slate-600 font-mono shrink-0 ml-3">~{f.count_approx}</span>
                  </div>
                </InsightItem>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No insights fallback */}
      {!ins && (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-slate-700 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"/>
          </svg>
          <p className="text-sm text-slate-500">Not enough chat data for insights</p>
          <p className="text-xs text-slate-600 mt-1">Analytics will appear once users start chatting</p>
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
        <p className="text-sm text-slate-500 mt-1">Review conversations and chat analytics</p>
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
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  )
}
