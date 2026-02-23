import { useState, useEffect } from 'react'
import { adminApi } from '../api'

function MiniBar({ data }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-[2px] h-20">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 bg-green-500/40 rounded-t-sm min-w-[2px] hover:bg-green-400/60 transition-colors"
          style={{ height: `${Math.max((d.count / max) * 100, 3)}%` }}
          title={`${d.date}: ${d.count}`}
        />
      ))}
    </div>
  )
}

export default function AdminPredictions() {
  const [stats, setStats] = useState(null)
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

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
        <MiniBar data={stats?.daily_predictions || []} />
        {stats?.daily_predictions?.length > 0 && (
          <div className="flex justify-between mt-2 text-[10px] text-slate-600">
            <span>{stats.daily_predictions[0]?.date}</span>
            <span>{stats.daily_predictions[stats.daily_predictions.length - 1]?.date}</span>
          </div>
        )}
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
    </div>
  )
}
