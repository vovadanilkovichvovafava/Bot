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

function WorldCupSection() {
  const [until, setUntil] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.getWcPredictionStats(until || undefined)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [until])

  return (
    <div className="bg-slate-900 border border-amber-600/30 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-amber-400">🏆 Чемпионат мира — точность прогнозов</h3>
          <p className="text-xs text-slate-500 mt-0.5">Уникальные ставки (матч + тип), уже завершённые. Стадия не хранится — групповой этап задаётся датой-отсечкой.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
          Групповой этап до:
          <input type="date" value={until} onChange={e => setUntil(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200" />
          {until && <button onClick={() => setUntil('')} className="text-slate-500 hover:text-slate-300">×</button>}
        </label>
      </div>

      {loading ? (
        <p className="text-xs text-slate-600 py-6 text-center">Загрузка…</p>
      ) : !data || data.total === 0 ? (
        <p className="text-xs text-slate-600 py-6 text-center">Нет завершённых WC-прогнозов{until ? ' в этом периоде' : ''} (или они ещё не верифицированы).</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Ставок', value: data.total },
              { label: 'Зашло', value: data.correct, color: 'text-green-400' },
              { label: 'Не зашло', value: data.wrong, color: 'text-red-400' },
              { label: 'Точность', value: `${data.accuracy}%`, color: data.accuracy >= 55 ? 'text-green-400' : data.accuracy >= 45 ? 'text-amber-400' : 'text-red-400' },
              { label: 'Ср. кф захода', value: data.avg_winning_odds || '—' },
            ].map(m => (
              <div key={m.label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                <div className={`text-xl font-bold ${m.color || 'text-white'}`}>{m.value}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>

          {data.by_bet_type?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.by_bet_type.map(b => (
                <span key={b.bet_type} className="text-[11px] bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
                  <span className="text-slate-300">{b.bet_type}</span>
                  <span className="text-slate-500"> {b.correct}/{b.total} · </span>
                  <span className={b.accuracy >= 55 ? 'text-green-400' : b.accuracy >= 45 ? 'text-amber-400' : 'text-red-400'}>{b.accuracy}%</span>
                </span>
              ))}
            </div>
          )}

          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-800 rounded-lg">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-left px-3 py-2 font-medium">Матч</th>
                  <th className="text-left px-3 py-2 font-medium">Ставка</th>
                  <th className="text-right px-3 py-2 font-medium">Кф</th>
                  <th className="text-center px-3 py-2 font-medium">Счёт</th>
                  <th className="text-center px-3 py-2 font-medium">Итог</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {data.bets.map((b, i) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 text-slate-300">{b.match}</td>
                    <td className="px-3 py-2 text-slate-400">{b.bet_type}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-400">{b.odds ?? '—'}</td>
                    <td className="px-3 py-2 text-center font-mono text-slate-500">{b.score ?? '—'}</td>
                    <td className="px-3 py-2 text-center">
                      {b.is_correct
                        ? <span className="text-green-400 font-bold">✓</span>
                        : <span className="text-red-400 font-bold">✗</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pending > 0 && (
            <p className="text-[11px] text-slate-500">Ещё не сыграно/не верифицировано: {data.pending} ставок.</p>
          )}
        </>
      )}
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

      <WorldCupSection />

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

    </div>
  )
}
