import { useState, useEffect } from 'react'
import { adminApi } from '../api'

function BarChart({ data, color = 'green' }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.count), 1)
  const bg = color === 'blue' ? 'bg-blue-500/40' : 'bg-green-500/40'
  const bgHover = color === 'blue' ? 'hover:bg-blue-400/60' : 'hover:bg-green-400/60'

  // Y-axis: 4 ticks
  const ticks = [0, Math.round(max / 3), Math.round((max * 2) / 3), max]
  // X-axis: show ~5 evenly spaced dates
  const step = Math.max(1, Math.floor((data.length - 1) / 4))
  const xLabels = data.reduce((acc, d, i) => {
    if (i === 0 || i === data.length - 1 || i % step === 0) acc.push({ i, label: d.date?.slice(5) })
    return acc
  }, [])

  return (
    <div className="flex">
      {/* Y axis */}
      <div className="flex flex-col justify-between items-end pr-2 h-24 py-0.5">
        {[...ticks].reverse().map((t, i) => (
          <span key={i} className="text-[9px] text-slate-600 font-mono leading-none">{t}</span>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        {/* Bars */}
        <div className="flex items-end gap-[2px] h-24 border-l border-b border-slate-700/50">
          {data.map((d, i) => (
            <div
              key={i}
              className={`flex-1 ${bg} rounded-t-sm min-w-[2px] ${bgHover} transition-colors`}
              style={{ height: `${Math.max((d.count / max) * 100, 2)}%` }}
              title={`${d.date}: ${d.count}`}
            />
          ))}
        </div>
        {/* X axis labels */}
        <div className="relative h-4 mt-1">
          {xLabels.map(({ i, label }) => (
            <span
              key={i}
              className="absolute text-[9px] text-slate-600 font-mono -translate-x-1/2"
              style={{ left: `${(i / (data.length - 1)) * 100}%` }}
            >{label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdminPredictions() {
  const [stats, setStats] = useState(null)
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  const testSavePrediction = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // Use user API (not admin) to test the actual save endpoint
      const token = localStorage.getItem('access_token')
      const apiUrl = window.__APP_CONFIG__?.API_URL || 'https://appbot-production-152e.up.railway.app/api/v1'
      const res = await fetch(`${apiUrl}/predictions/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          match_id: 999999,
          home_team: 'DEBUG_Test_Home',
          away_team: 'DEBUG_Test_Away',
          league: 'Debug League',
          bet_type: 'test',
          confidence: 50.0,
        }),
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { data = text }
      setTestResult({ status: res.status, ok: res.ok, data })
    } catch (e) {
      setTestResult({ status: 'NETWORK_ERROR', ok: false, data: e.message })
    }
    setTesting(false)
  }

  useEffect(() => {
    Promise.all([
      adminApi.getPredictionsStats().catch(() => null),
      adminApi.getOverview().catch(() => null),
    ]).then(([ps, ov]) => {
      setStats(ps)
      setOverview(ov)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const p = overview?.predictions || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Predictions</h1>
        <p className="text-sm text-slate-500 mt-1">Performance analytics and accuracy breakdown</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: p.total?.toLocaleString() || '0', color: 'text-slate-100' },
          { label: 'Verified', value: p.verified?.toLocaleString() || '0', color: 'text-blue-400' },
          { label: 'Correct', value: p.correct?.toLocaleString() || '0', color: 'text-green-400' },
          { label: 'Accuracy', value: `${p.accuracy || 0}%`, color: p.accuracy >= 50 ? 'text-green-400' : 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-1">Daily Predictions Volume</h3>
        <p className="text-[11px] text-slate-500 mb-4">Last 30 days</p>
        <BarChart data={stats?.daily_predictions || []} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By bet type */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">By Bet Type</h3>
          <div className="space-y-3">
            {(stats?.by_bet_type || []).map(b => (
              <div key={b.bet_type}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-300 truncate max-w-[180px]">{b.bet_type}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-mono">{b.correct}/{b.total}</span>
                    <span className={`text-xs font-bold font-mono ${
                      b.accuracy >= 60 ? 'text-green-400' : b.accuracy >= 45 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {b.accuracy}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      b.accuracy >= 60 ? 'bg-green-500/60' : b.accuracy >= 45 ? 'bg-amber-500/60' : 'bg-red-500/60'
                    }`}
                    style={{ width: `${Math.min(b.accuracy, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {(!stats?.by_bet_type?.length) && (
              <p className="text-xs text-slate-600 text-center py-6">No prediction data yet</p>
            )}
          </div>
        </div>

        {/* By league */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">By League</h3>
          <div className="space-y-3">
            {(stats?.by_league || []).map(l => (
              <div key={l.league}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-300 truncate max-w-[180px]">{l.league}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-mono">{l.correct}/{l.total}</span>
                    <span className={`text-xs font-bold font-mono ${
                      l.accuracy >= 60 ? 'text-green-400' : l.accuracy >= 45 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {l.accuracy}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      l.accuracy >= 60 ? 'bg-green-500/60' : l.accuracy >= 45 ? 'bg-amber-500/60' : 'bg-red-500/60'
                    }`}
                    style={{ width: `${Math.min(l.accuracy, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {(!stats?.by_league?.length) && (
              <p className="text-xs text-slate-600 text-center py-6">No league data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* ROI */}
      {stats?.roi?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold">ROI Analytics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs">
                  <th className="text-left px-5 py-3 font-medium">Period</th>
                  <th className="text-right px-3 py-3 font-medium">Predictions</th>
                  <th className="text-right px-3 py-3 font-medium">Accuracy</th>
                  <th className="text-right px-5 py-3 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {stats.roi.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3 text-xs">
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded mr-2">{r.period}</span>
                      {r.start}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-slate-400">{r.predictions}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-slate-400">{r.accuracy}%</td>
                    <td className={`px-5 py-3 text-right font-mono text-xs font-bold ${
                      r.roi >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {r.roi >= 0 ? '+' : ''}{r.roi}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Debug info — temporary */}
      {stats?._debug && (
        <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-red-400">Debug Info (temporary)</h3>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div><span className="text-slate-500">Python now:</span> <span className="text-slate-300">{stats._debug.python_now}</span></div>
            <div><span className="text-slate-500">DB now:</span> <span className="text-slate-300">{stats._debug.db_now}</span></div>
            <div><span className="text-slate-500">DB date:</span> <span className="text-slate-300">{stats._debug.db_date}</span></div>
            <div><span className="text-slate-500">DB timezone:</span> <span className="text-slate-300">{stats._debug.db_timezone}</span></div>
            <div><span className="text-slate-500">Total (all time):</span> <span className="text-slate-300">{stats._debug.total_predictions_all_time}</span></div>
            <div><span className="text-slate-500">NULL created_at:</span> <span className="text-red-400 font-bold">{stats._debug.predictions_with_null_created_at}</span></div>
            <div className="col-span-2"><span className="text-slate-500">Filter:</span> <span className="text-slate-300">created_at &gt;= {stats._debug.filter_used}</span></div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Last 5 predictions (by ID desc):</p>
            <div className="space-y-1">
              {(stats._debug.recent_5_predictions || []).map(p => (
                <div key={p.id} className="text-[11px] font-mono text-slate-400 bg-slate-900 rounded px-2 py-1">
                  #{p.id} | created_at: <span className={p.created_at === 'None' ? 'text-red-400 font-bold' : 'text-green-400'}>{p.created_at}</span> | {p.match}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Daily counts (raw SQL, last 14d):</p>
            <div className="flex flex-wrap gap-2">
              {(stats._debug.daily_14d_raw_sql || []).map(d => (
                <span key={d.date} className="text-[11px] font-mono bg-slate-900 rounded px-2 py-1 text-slate-300">
                  {d.date}: <span className="text-green-400 font-bold">{d.count}</span>
                </span>
              ))}
              {!stats._debug.daily_14d_raw_sql?.length && (
                <span className="text-[11px] text-red-400">No predictions in last 14 days (raw SQL)</span>
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-red-800/30">
            <button
              onClick={testSavePrediction}
              disabled={testing}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
            >
              {testing ? 'Saving...' : 'Test Save Prediction'}
            </button>
            {testResult && (
              <div className={`mt-2 p-3 rounded-lg text-xs font-mono ${testResult.ok ? 'bg-green-900/30 border border-green-800/50' : 'bg-red-900/50 border border-red-700/50'}`}>
                <p className={testResult.ok ? 'text-green-400' : 'text-red-400'}>
                  Status: {testResult.status} {testResult.ok ? 'OK' : 'FAILED'}
                </p>
                <pre className="text-slate-300 mt-1 whitespace-pre-wrap text-[10px] max-h-40 overflow-auto">
                  {typeof testResult.data === 'string' ? testResult.data : JSON.stringify(testResult.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
