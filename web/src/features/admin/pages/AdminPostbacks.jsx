import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../api'
import { StatCard, Card, DataTable, Badge, Empty } from '../components/AdminCharts'

const SOURCE_COLORS = {
  generic: 'blue', '1win': 'green', keitaro: 'purple',
}
const EVENT_COLORS = {
  deposit: 'green', first_deposit: 'green', ftd: 'green',
  registration: 'blue', lead: 'amber', sale: 'green', confirmed: 'green',
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

  const load = useCallback(async (q, source, event, p) => {
    setLoading(true)
    try {
      const data = await adminApi.getPostbackLogs(q, source, event, p)
      setLogs(data.logs)
      setTotal(data.total)
      setSummary(data.summary)
    } catch (e) {
      console.error('Postback logs load failed:', e)
    }
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
      <div>
        <h1 className="text-xl font-semibold">Postback Logs</h1>
        <p className="text-sm text-slate-500 mt-1">Affiliate postbacks, deposits and PRO activations</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Postbacks" value={summary.total_all_time ?? '—'} color="blue"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>}
        />
        <StatCard label="Last 24h" value={summary.last_24h ?? '—'} color="cyan"
          sub="Recent activity"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <StatCard label="PRO Activated" value={summary.total_activated ?? '—'} color="green"
          sub="Via postback"
          subColor="green"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
      </div>

      {/* Search + Filters */}
      <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by user_id, click_id, transaction_id..."
          className="flex-1 min-w-[250px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <select
          value={sourceFilter}
          onChange={e => { setSourceFilter(e.target.value); setPage(1) }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All sources</option>
          <option value="generic">Generic</option>
          <option value="1win">1win</option>
          <option value="keitaro">Keitaro</option>
        </select>
        <select
          value={eventFilter}
          onChange={e => { setEventFilter(e.target.value); setPage(1) }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
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

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{total} records found</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 text-xs rounded bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700">Prev</button>
            <span className="text-xs text-slate-400">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1 text-xs rounded bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700">Next</button>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <Empty text="No postback logs yet" />
        ) : (
          <DataTable
            maxHeight="max-h-[600px]"
            columns={[
              { key: 'created_at', label: 'Time', render: r => (
                <span className="text-slate-300 font-mono whitespace-nowrap">
                  {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                </span>
              )},
              { key: 'user_id', label: 'User', render: r => (
                <div>
                  <p className="font-mono text-xs text-slate-300">{r.user_id || '—'}</p>
                  {r.user_db_id && <p className="text-[10px] text-slate-500">#{r.user_db_id}</p>}
                </div>
              )},
              { key: 'source', label: 'Source', render: r => (
                <Badge color={SOURCE_COLORS[r.source] || 'slate'}>{r.source || '—'}</Badge>
              )},
              { key: 'event', label: 'Event', render: r => (
                <Badge color={EVENT_COLORS[r.event] || 'slate'}>{r.event || '—'}</Badge>
              )},
              { key: 'amount', label: 'Amount', align: 'right', render: r => (
                r.amount ? (
                  <span className="text-emerald-400 font-mono font-medium">
                    {r.amount} {r.currency || ''}
                  </span>
                ) : <span className="text-slate-600">—</span>
              )},
              { key: 'premium_activated', label: 'PRO', render: r => (
                r.premium_activated
                  ? <Badge color="green">Yes</Badge>
                  : <span className="text-slate-600 text-xs">No</span>
              )},
              { key: 'error', label: 'Error', render: r => (
                r.error
                  ? <span className="text-red-400 text-xs truncate max-w-[200px] block">{r.error}</span>
                  : null
              )},
            ]}
            rows={logs}
          />
        )}
      </Card>

      {/* Bottom pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 text-xs rounded bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700">Prev</button>
          <span className="text-xs text-slate-400">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1 text-xs rounded bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700">Next</button>
        </div>
      )}
    </div>
  )
}
