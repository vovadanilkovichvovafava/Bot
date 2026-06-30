import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

const SOURCE_COLORS = {
  generic: 'bg-blue-500/20 text-blue-400',
  '1win': 'bg-green-500/20 text-green-400',
  keitaro: 'bg-purple-500/20 text-purple-400',
}

const EVENT_COLORS = {
  deposit: 'bg-emerald-500/20 text-emerald-400',
  first_deposit: 'bg-emerald-500/20 text-emerald-400',
  ftd: 'bg-emerald-500/20 text-emerald-400',
  registration: 'bg-blue-500/20 text-blue-400',
  lead: 'bg-amber-500/20 text-amber-400',
  sale: 'bg-green-500/20 text-green-400',
}

export default function Postbacks() {
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState({})
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (q, source, event, p) => {
    setLoading(true)
    try {
      const data = await api.getPostbackLogs(q, source || undefined, event || undefined, p)
      setLogs(data.logs)
      setTotal(data.total)
      setSummary(data.summary)
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => {
    load(query, sourceFilter, eventFilter, page)
  }, [page, sourceFilter, eventFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    load(query, sourceFilter, eventFilter, 1)
  }

  const totalPages = Math.ceil(total / 30)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Postback Logs</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">Total postbacks</p>
          <p className="text-2xl font-bold mt-1">{summary.total_all_time ?? '—'}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">Last 24h</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">{summary.last_24h ?? '—'}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">PRO activated</p>
          <p className="text-2xl font-bold mt-1 text-green-400">{summary.total_activated ?? '—'}</p>
        </div>
      </div>

      {/* Search + filters */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by user_id, click_id, transaction_id..."
          className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <select
          value={sourceFilter}
          onChange={e => { setSourceFilter(e.target.value); setPage(1) }}
          className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All sources</option>
          <option value="generic">Generic</option>
          <option value="1win">1win</option>
          <option value="keitaro">Keitaro</option>
        </select>
        <select
          value={eventFilter}
          onChange={e => { setEventFilter(e.target.value); setPage(1) }}
          className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All events</option>
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
          Search
        </button>
      </form>

      <p className="text-xs text-dark-400">{total} records found</p>

      {/* Logs table */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-700 text-dark-400 text-xs">
              <th className="text-left px-4 py-3 font-medium">Time</th>
              <th className="text-left px-4 py-3 font-medium">User</th>
              <th className="text-center px-4 py-3 font-medium">Source</th>
              <th className="text-center px-4 py-3 font-medium">Event</th>
              <th className="text-right px-4 py-3 font-medium">Amount</th>
              <th className="text-center px-4 py-3 font-medium">PRO</th>
              <th className="text-left px-4 py-3 font-medium">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {loading ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-dark-500">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-dark-500">No postback logs yet</td></tr>
            ) : logs.map(l => (
              <tr key={l.id} className="hover:bg-dark-700/50 transition-colors">
                <td className="px-4 py-3 text-xs text-dark-400 whitespace-nowrap">
                  {l.created_at ? new Date(l.created_at).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <p className="font-mono text-xs">{l.user_id || '—'}</p>
                  {l.user_db_id && <p className="text-[10px] text-dark-500">#{l.user_db_id}</p>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${SOURCE_COLORS[l.source] || 'bg-dark-600 text-dark-300'}`}>
                    {l.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${EVENT_COLORS[l.event] || 'bg-dark-600 text-dark-300'}`}>
                    {l.event || '—'}
                  </span>
                </td>
                <td className="text-right px-4 py-3 font-mono text-xs">
                  {l.amount ? `${l.amount} ${l.currency || ''}` : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {l.premium_activated ? (
                    <span className="text-green-400 text-xs font-medium">Yes</span>
                  ) : (
                    <span className="text-dark-500 text-xs">No</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-red-400 max-w-[200px] truncate">
                  {l.error || ''}
                </td>
              </tr>
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
            className="px-3 py-1 text-xs rounded bg-dark-800 border border-dark-700 disabled:opacity-30 hover:bg-dark-700"
          >
            Prev
          </button>
          <span className="text-xs text-dark-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-xs rounded bg-dark-800 border border-dark-700 disabled:opacity-30 hover:bg-dark-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
