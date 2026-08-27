import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../api'
import { Card, StatCard, DataTable, Badge, Empty } from '../components/AdminCharts'

// Flag from ISO 3166-1 alpha-2 code
function flag(code) {
  if (!code || code.length !== 2) return ''
  try {
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
  } catch { return '' }
}

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

const SEGMENT_META = [
  { key: 'by_country', title: 'By Country', label: (s) => `${flag(s)} ${s}` },
  { key: 'by_language', title: 'By Language', label: (s) => (s || '?').toUpperCase() },
  { key: 'by_source', title: 'By Traffic Source', label: (s) => s },
  { key: 'by_funnel', title: 'By Funnel', label: (s) => s },
]

function SegmentTable({ title, rows, labelFn }) {
  if (!rows?.length) return <Card title={title}><Empty /></Card>
  // Best converter = highest pro_pct among segments with >=5 users
  const eligible = rows.filter(r => r.users >= 5)
  const bestPro = eligible.length ? Math.max(...eligible.map(r => r.pro_pct)) : -1
  const maxUsers = Math.max(...rows.map(r => r.users), 1)

  return (
    <Card title={title} subtitle="Ranked by user volume">
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-slate-500 font-mono w-4 shrink-0">{i + 1}</span>
                <span className="text-xs text-slate-300 truncate">{labelFn(r.segment)}</span>
                {r.users >= 5 && r.pro_pct === bestPro && bestPro > 0 && <Badge color="green">top conv</Badge>}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono">
                <span className="text-slate-400" title="users">{r.users}</span>
                <span className={r.pro_pct >= 5 ? 'text-emerald-400' : r.pro_pct >= 2 ? 'text-amber-400' : 'text-slate-500'} title="PRO conversion">{r.pro_pct}%</span>
                <span className="text-cyan-400" title="avg AI requests">{r.avg_ai_requests}</span>
              </div>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden ml-6">
              <div className="h-full bg-blue-500/40 rounded-full" style={{ width: `${Math.max((r.users / maxUsers) * 100, 2)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-500">
        <span>users</span>
        <span className="text-emerald-400">PRO %</span>
        <span className="text-cyan-400">avg AI req</span>
      </div>
    </Card>
  )
}

export default function AdminAudience() {
  const [data, setData] = useState(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('last_session')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async (q, s, p) => {
    setLoading(true)
    try {
      const res = await adminApi.getAudience(q, '', '', s, p)
      setData(res)
    } catch (e) {
      console.error('Audience load failed:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(query, sort, page) }, [sort, page])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    load(query, sort, 1)
  }

  const handleExport = async () => {
    setExporting(true)
    try { await adminApi.downloadUsersCsv() }
    catch (e) { alert(e.message) }
    setExporting(false)
  }

  const total = data?.total || 0
  const totalPages = Math.ceil(total / (data?.per_page || 50))
  const segments = data?.segments || {}

  // Best audience insight
  const bestCountry = (segments.by_country || []).filter(s => s.users >= 5).sort((a, b) => b.pro_pct - a.pro_pct)[0]
  const bestSource = (segments.by_source || []).filter(s => s.users >= 5).sort((a, b) => b.pro_pct - a.pro_pct)[0]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Audience Insights</h1>
          <p className="text-sm text-slate-500 mt-1">Who registers, where from, and which segments convert best</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {exporting ? 'Exporting...' : '⬇ Export CSV'}
        </button>
      </div>

      {/* Best audience insight */}
      {(bestCountry || bestSource) && (
        <div className="bg-gradient-to-r from-emerald-600/15 to-blue-600/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge color="green">Insight</Badge>
            <span className="text-sm font-medium text-slate-200">Best-converting audience</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
            {bestCountry && (
              <p>Top region: <span className="text-emerald-400 font-semibold">{flag(bestCountry.segment)} {bestCountry.segment}</span> — {bestCountry.pro_pct}% PRO conversion, {bestCountry.avg_ai_requests} avg AI requests ({bestCountry.users} users)</p>
            )}
            {bestSource && (
              <p>Top source: <span className="text-emerald-400 font-semibold">{bestSource.segment}</span> — {bestSource.pro_pct}% PRO conversion, {bestSource.activation_pct}% activated ({bestSource.users} users)</p>
            )}
          </div>
        </div>
      )}

      {/* Segment rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {SEGMENT_META.map(m => (
          <SegmentTable key={m.key} title={m.title} rows={segments[m.key]} labelFn={m.label} />
        ))}
      </div>

      {/* Per-user table */}
      <Card title="All Users" subtitle={`${total.toLocaleString()} registered users`}>
        <form onSubmit={handleSearch} className="flex gap-2 flex-wrap mb-4">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by phone, ID, email..."
            className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <select
            value={sort}
            onChange={e => { setSort(e.target.value); setPage(1) }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="last_session">Sort: Last Session</option>
            <option value="ai_requests">Sort: AI Requests</option>
            <option value="predictions">Sort: Predictions</option>
            <option value="created_at">Sort: Newest</option>
          </select>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Search
          </button>
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DataTable
            maxHeight="max-h-[600px]"
            columns={[
              { key: 'phone', label: 'Phone', render: r => (
                <div>
                  <p className="text-slate-300 font-mono">{r.phone || '—'}</p>
                  <p className="text-[10px] text-slate-500">{r.public_id}</p>
                </div>
              )},
              { key: 'country', label: 'Region', render: r => (
                <span className="text-slate-300">{r.country ? `${flag(r.country)} ${r.country}` : '—'}</span>
              )},
              { key: 'language', label: 'Lang', render: r => <span className="text-slate-400 uppercase text-[11px]">{r.language || '—'}</span> },
              { key: 'traffic_source', label: 'Source', render: r => <Badge color="blue">{r.traffic_source}</Badge> },
              { key: 'funnel', label: 'Funnel', render: r => <span className="text-slate-400 text-[11px]">{r.funnel?.replace('funnel-', 'F')}</span> },
              { key: 'is_premium', label: 'PRO', render: r => r.is_premium ? <Badge color="purple">PRO</Badge> : <span className="text-slate-600 text-xs">—</span> },
              { key: 'ai_requests', label: 'AI Req', align: 'right', mono: true, render: r => (
                <span className={r.ai_requests > 10 ? 'text-cyan-400 font-semibold' : 'text-slate-400'}>{r.ai_requests}</span>
              )},
              { key: 'total_predictions', label: 'Preds', align: 'right', mono: true },
              { key: 'last_session', label: 'Last Session', align: 'right', render: r => (
                <span className={r.last_session && Date.now() - new Date(r.last_session).getTime() < 864e5 ? 'text-emerald-400' : 'text-slate-400'}>
                  {timeAgo(r.last_session)}
                </span>
              )},
            ]}
            rows={data?.users || []}
          />
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 text-xs rounded bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700">Prev</button>
            <span className="text-xs text-slate-400">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1 text-xs rounded bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700">Next</button>
          </div>
        )}
      </Card>
    </div>
  )
}
