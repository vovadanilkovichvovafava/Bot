import { useState, useEffect, useCallback, Fragment } from 'react'
import { adminApi } from '../api'

const SOURCE_COLORS = {
  generic: 'bg-blue-500/20 text-blue-400',
  bookmaker_postback: 'bg-blue-500/20 text-blue-400',
  '1win': 'bg-green-500/20 text-green-400',
  keitaro: 'bg-purple-500/20 text-purple-400',
  keitaro_direct: 'bg-purple-500/20 text-purple-400',
}

const EVENT_COLORS = {
  deposit: 'bg-emerald-500/20 text-emerald-400',
  first_deposit: 'bg-emerald-500/20 text-emerald-400',
  ftd: 'bg-emerald-500/20 text-emerald-400',
  registration: 'bg-blue-500/20 text-blue-400',
  lead: 'bg-amber-500/20 text-amber-400',
  sale: 'bg-green-500/20 text-green-400',
}

export default function AdminPostbacks() {
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState({})
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(() => new Set())

  const toggleRow = (id) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const load = useCallback(async (q, source, event, p) => {
    setLoading(true)
    try {
      const data = await adminApi.getPostbackLogs(q, source || undefined, event || undefined, p)
      setLogs(data.logs || [])
      setTotal(data.total || 0)
      setSummary(data.summary || {})
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    load(query, sourceFilter, eventFilter, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sourceFilter, eventFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    load(query, sourceFilter, eventFilter, 1)
  }

  const totalPages = Math.ceil(total / 30)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Postbacks</h1>
        <p className="text-sm text-slate-400 mt-1">Все постбэки, что реально прилетали от букмекера и Keitaro. Раскрой строку, чтобы увидеть click_id / sub_id для сверки в Keitaro.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-xs text-slate-400">Всего постбэков</p>
          <p className="text-2xl font-bold mt-1 text-white">{summary.total_all_time ?? '—'}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-xs text-slate-400">За 24ч</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">{summary.last_24h ?? '—'}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-xs text-slate-400">PRO активировано</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{summary.total_activated ?? '—'}</p>
        </div>
      </div>

      {/* Search + filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по user_id, click_id, transaction_id..."
          className="flex-1 min-w-[200px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        />
        <select
          value={sourceFilter}
          onChange={e => { setSourceFilter(e.target.value); setPage(1) }}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">Все источники</option>
          <option value="generic">Generic</option>
          <option value="1win">1win</option>
          <option value="keitaro">Keitaro</option>
        </select>
        <select
          value={eventFilter}
          onChange={e => { setEventFilter(e.target.value); setPage(1) }}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">Все события</option>
          <option value="deposit">deposit</option>
          <option value="first_deposit">first_deposit</option>
          <option value="ftd">ftd</option>
          <option value="registration">registration</option>
          <option value="lead">lead</option>
          <option value="sale">sale</option>
        </select>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Найти
        </button>
      </form>

      <p className="text-xs text-slate-400">{total} записей</p>

      {/* Logs table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs">
              <th className="text-left px-4 py-3 font-medium">Время</th>
              <th className="text-left px-4 py-3 font-medium">Юзер</th>
              <th className="text-center px-4 py-3 font-medium">Источник</th>
              <th className="text-center px-4 py-3 font-medium">Событие</th>
              <th className="text-right px-4 py-3 font-medium">Сумма</th>
              <th className="text-center px-4 py-3 font-medium">PRO</th>
              <th className="text-left px-4 py-3 font-medium">Ошибка</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">Загрузка...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">Постбэков пока нет</td></tr>
            ) : logs.map(l => (
              <Fragment key={l.id}>
                <tr onClick={() => toggleRow(l.id)} className="hover:bg-slate-800/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    <span className="inline-block w-3 text-slate-500">{expanded.has(l.id) ? '▾' : '▸'}</span>{' '}
                    {l.created_at ? new Date(l.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-slate-200">{l.user_id || '—'}</p>
                    {l.user_db_id && <p className="text-[10px] text-slate-500">#{l.user_db_id}</p>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${SOURCE_COLORS[l.source] || 'bg-slate-700 text-slate-300'}`}>
                      {l.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${EVENT_COLORS[l.event] || 'bg-slate-700 text-slate-300'}`}>
                      {l.event || '—'}
                    </span>
                  </td>
                  <td className="text-right px-4 py-3 font-mono text-xs text-slate-200">
                    {l.amount ? `${l.amount} ${l.currency || ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {l.premium_activated ? (
                      <span className="text-emerald-400 text-xs font-medium">Да</span>
                    ) : (
                      <span className="text-slate-500 text-xs">Нет</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-red-400 max-w-[200px] truncate">
                    {l.error || ''}
                  </td>
                </tr>
                {expanded.has(l.id) && (
                  <tr className="bg-slate-950/60">
                    <td colSpan="7" className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                        <div>
                          <span className="text-slate-500">click_id: </span>
                          <span className="font-mono text-slate-200 select-all break-all">{l.click_id || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">transaction_id: </span>
                          <span className="font-mono text-slate-200 select-all break-all">{l.transaction_id || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">country: </span>
                          <span className="font-mono text-slate-200">{l.country || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">user_db_id: </span>
                          <span className="font-mono text-slate-200">{l.user_db_id ?? '—'}</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-slate-500 mb-1 text-xs">raw params (sub_id / keitaro subid):</p>
                        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap break-all select-all">
{l.raw_params ? (typeof l.raw_params === 'string' ? l.raw_params : JSON.stringify(l.raw_params, null, 2)) : '— сырые параметры не записаны —'}
                        </pre>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-xs rounded bg-slate-900 border border-slate-800 disabled:opacity-30 hover:bg-slate-800 text-slate-200"
          >
            Назад
          </button>
          <span className="text-xs text-slate-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-xs rounded bg-slate-900 border border-slate-800 disabled:opacity-30 hover:bg-slate-800 text-slate-200"
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  )
}
