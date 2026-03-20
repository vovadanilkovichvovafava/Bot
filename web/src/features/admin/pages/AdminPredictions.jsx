import { useState, useEffect } from 'react'
import { adminApi } from '../api'

/* ── Reusable chart components ─────────────────────────────────── */

function BarChart({ data, color = 'green', height = 'h-40', valueKey = 'count', labelKey = 'date', formatLabel }) {
  if (!data.length) return <p className="text-xs text-slate-600 text-center py-8">No data</p>
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  const colors = {
    green: { bg: 'bg-emerald-500/50', hover: 'hover:bg-emerald-400/70', text: 'text-emerald-400' },
    blue: { bg: 'bg-blue-500/50', hover: 'hover:bg-blue-400/70', text: 'text-blue-400' },
    amber: { bg: 'bg-amber-500/50', hover: 'hover:bg-amber-400/70', text: 'text-amber-400' },
    purple: { bg: 'bg-purple-500/50', hover: 'hover:bg-purple-400/70', text: 'text-purple-400' },
    cyan: { bg: 'bg-cyan-500/50', hover: 'hover:bg-cyan-400/70', text: 'text-cyan-400' },
  }
  const c = colors[color] || colors.green
  const ticks = [0, Math.round(max / 3), Math.round((max * 2) / 3), max]
  const step = Math.max(1, Math.floor((data.length - 1) / 5))
  const xLabels = data.reduce((acc, d, i) => {
    if (i === 0 || i === data.length - 1 || i % step === 0) {
      const lbl = formatLabel ? formatLabel(d[labelKey]) : (d[labelKey]?.slice?.(5) || d[labelKey])
      acc.push({ i, label: lbl })
    }
    return acc
  }, [])

  return (
    <div className="flex">
      <div className={`flex flex-col justify-between items-end pr-2 ${height} py-0.5`}>
        {[...ticks].reverse().map((t, i) => (
          <span key={i} className="text-[10px] text-slate-500 font-mono leading-none">{t}</span>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`flex items-end gap-[2px] ${height} border-l border-b border-slate-700/40`}>
          {data.map((d, i) => (
            <div
              key={i}
              className={`flex-1 ${c.bg} rounded-t-sm min-w-[3px] ${c.hover} transition-all cursor-default`}
              style={{ height: `${Math.max((d[valueKey] / max) * 100, 1.5)}%` }}
              title={`${d[labelKey]}: ${d[valueKey]}`}
            />
          ))}
        </div>
        <div className="relative h-5 mt-1">
          {xLabels.map(({ i, label }) => (
            <span
              key={i}
              className="absolute text-[10px] text-slate-500 font-mono -translate-x-1/2"
              style={{ left: `${(i / (data.length - 1)) * 100}%` }}
            >{label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function LineChart({ data, height = 'h-40', valueKey = 'accuracy', labelKey = 'date', formatLabel, suffix = '%', color = 'cyan' }) {
  if (!data.length) return <p className="text-xs text-slate-600 text-center py-8">No data</p>
  const values = data.map(d => d[valueKey])
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const colors = {
    cyan: { stroke: '#22d3ee', fill: 'rgba(34,211,238,0.08)', dot: '#22d3ee' },
    green: { stroke: '#34d399', fill: 'rgba(52,211,153,0.08)', dot: '#34d399' },
    amber: { stroke: '#fbbf24', fill: 'rgba(251,191,36,0.08)', dot: '#fbbf24' },
    purple: { stroke: '#a78bfa', fill: 'rgba(167,139,250,0.08)', dot: '#a78bfa' },
  }
  const c = colors[color] || colors.cyan
  const w = 500
  const h = 120
  const pad = { t: 10, b: 5, l: 0, r: 0 }
  const pw = w - pad.l - pad.r
  const ph = h - pad.t - pad.b
  const points = data.map((d, i) => ({
    x: pad.l + (i / (data.length - 1 || 1)) * pw,
    y: pad.t + ph - ((d[valueKey] - min) / range) * ph,
    d,
  }))
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const area = `${line} L ${points[points.length - 1].x} ${h - pad.b} L ${points[0].x} ${h - pad.b} Z`

  const ticks = [min, min + range / 2, max].map(v => Math.round(v * 10) / 10)
  const step = Math.max(1, Math.floor((data.length - 1) / 5))
  const xLabels = data.reduce((acc, d, i) => {
    if (i === 0 || i === data.length - 1 || i % step === 0) {
      const lbl = formatLabel ? formatLabel(d[labelKey]) : (d[labelKey]?.slice?.(5) || d[labelKey])
      acc.push({ i, label: lbl, x: points[i].x })
    }
    return acc
  }, [])

  return (
    <div className="flex">
      <div className={`flex flex-col justify-between items-end pr-2 ${height} py-0.5`}>
        {[...ticks].reverse().map((t, i) => (
          <span key={i} className="text-[10px] text-slate-500 font-mono leading-none">{t}{suffix}</span>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <svg viewBox={`0 0 ${w} ${h}`} className={`w-full ${height}`} preserveAspectRatio="none">
          <path d={area} fill={c.fill} />
          <path d={line} fill="none" stroke={c.stroke} strokeWidth="2" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill={c.dot} opacity="0.7">
              <title>{`${p.d[labelKey]}: ${p.d[valueKey]}${suffix}`}</title>
            </circle>
          ))}
        </svg>
        <div className="relative h-5 mt-1">
          {xLabels.map(({ i, label, x }) => (
            <span
              key={i}
              className="absolute text-[10px] text-slate-500 font-mono -translate-x-1/2"
              style={{ left: `${(x / w) * 100}%` }}
            >{label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function DonutChart({ data, size = 140 }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return <p className="text-xs text-slate-600 text-center py-8">No data</p>
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 12
  const strokeWidth = 22
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="flex-shrink-0">
        {data.map((d, i) => {
          const pct = d.value / total
          const dash = pct * circumference
          const gap = circumference - dash
          const rotation = (offset / total) * 360 - 90
          offset += d.value
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotation} ${cx} ${cy})`}
              className="transition-all"
            >
              <title>{`${d.label}: ${d.value} (${(pct * 100).toFixed(1)}%)`}</title>
            </circle>
          )
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-white text-lg font-bold">{total.toLocaleString()}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-400 text-[10px]">total</text>
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-slate-300">{d.label}</span>
            <span className="text-xs text-slate-500 font-mono ml-auto">{d.value.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 font-mono w-10 text-right">{(d.value / total * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeatmapRow({ data, labelKey = 'day', valueKey = 'total', secondaryKey = 'accuracy', unit = '' }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  return (
    <div className="flex gap-2 items-end">
      {data.map((d, i) => {
        const intensity = d[valueKey] / max
        return (
          <div key={i} className="flex-1 text-center">
            <div
              className="rounded-lg mx-auto transition-all mb-2 flex items-center justify-center"
              style={{
                height: '52px',
                backgroundColor: `rgba(52, 211, 153, ${Math.max(intensity * 0.7, 0.05)})`,
              }}
              title={`${d[labelKey]}: ${d[valueKey]} predictions, ${d[secondaryKey]}% accuracy`}
            >
              <span className="text-xs font-bold text-white/80">{d[valueKey]}</span>
            </div>
            {d[secondaryKey] !== undefined && (
              <p className={`text-[10px] font-mono mb-1 ${
                d[secondaryKey] >= 60 ? 'text-emerald-400' : d[secondaryKey] >= 45 ? 'text-amber-400' : d[secondaryKey] > 0 ? 'text-red-400' : 'text-slate-600'
              }`}>{d[secondaryKey] > 0 ? `${d[secondaryKey]}%` : '—'}</p>
            )}
            <p className="text-[10px] text-slate-500 font-medium">{d[labelKey]}</p>
          </div>
        )
      })}
    </div>
  )
}

/* ── Card wrapper ────────────────────────────────────────────── */

function Card({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${className}`}>
      {title && <h3 className="text-sm font-semibold mb-0.5">{title}</h3>}
      {subtitle && <p className="text-[11px] text-slate-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────── */

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
  const sb = stats?.status_breakdown || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Predictions Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Comprehensive performance breakdown and trends</p>
      </div>

      {/* ── Top KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: p.total?.toLocaleString() || '0', color: 'text-slate-100', icon: '📊' },
          { label: 'Verified', value: p.verified?.toLocaleString() || '0', color: 'text-blue-400', icon: '✓' },
          { label: 'Correct', value: p.correct?.toLocaleString() || '0', color: 'text-emerald-400', icon: '✅' },
          { label: 'Accuracy', value: `${p.accuracy || 0}%`, color: p.accuracy >= 50 ? 'text-emerald-400' : 'text-amber-400', icon: '🎯' },
          { label: 'Today', value: p.today?.toLocaleString() || '0', color: 'text-cyan-400', icon: '📅' },
          { label: 'Yesterday', value: p.yesterday?.toLocaleString() || '0', color: 'text-slate-400', icon: '📆' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Status donut + Day-of-week heatmap ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Prediction Status" subtitle="Overall outcome breakdown">
          <DonutChart data={[
            { label: 'Correct', value: sb.correct || 0, color: '#34d399' },
            { label: 'Incorrect', value: sb.incorrect || 0, color: '#f87171' },
            { label: 'Pending', value: sb.pending || 0, color: '#64748b' },
          ]} />
        </Card>

        <Card title="By Day of Week" subtitle="Volume & accuracy per weekday">
          <HeatmapRow data={stats?.by_day_of_week || []} />
        </Card>
      </div>

      {/* ── Daily Volume + Daily Accuracy line ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Daily Predictions Volume" subtitle="Last 30 days">
          <BarChart data={stats?.daily_predictions || []} color="green" height="h-36" />
        </Card>

        <Card title="Daily Accuracy Trend" subtitle="Last 30 days (verified only)">
          <LineChart
            data={(stats?.daily_accuracy || []).filter(d => d.verified > 0)}
            color="cyan"
            height="h-36"
            valueKey="accuracy"
            suffix="%"
          />
        </Card>
      </div>

      {/* ── Weekly Accuracy Trend ── */}
      <Card title="Weekly Accuracy Trend" subtitle="Last 12 weeks">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LineChart
              data={stats?.weekly_accuracy || []}
              color="green"
              height="h-44"
              valueKey="accuracy"
              labelKey="week"
              suffix="%"
              formatLabel={w => w?.slice(5)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-medium mb-3">Weekly Details</p>
            {(stats?.weekly_accuracy || []).slice(-6).reverse().map((w, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400 font-mono">{w.week?.slice(5)}</span>
                <span className="text-slate-500">{w.total} preds</span>
                <span className="text-slate-500">{w.verified} verified</span>
                <span className={`font-bold font-mono ${
                  w.accuracy >= 60 ? 'text-emerald-400' : w.accuracy >= 45 ? 'text-amber-400' : 'text-red-400'
                }`}>{w.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Confidence Distribution ── */}
      <Card title="Confidence Distribution" subtitle="Predictions grouped by confidence level">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChart
            data={stats?.confidence_dist || []}
            color="purple"
            height="h-36"
            valueKey="total"
            labelKey="bucket"
            formatLabel={v => v}
          />
          <div className="space-y-3">
            {(stats?.confidence_dist || []).map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-slate-300 font-mono w-14">{b.bucket}%</span>
                <div className="flex-1 h-6 bg-slate-800 rounded-md overflow-hidden relative">
                  <div
                    className="h-full bg-purple-500/40 rounded-md transition-all"
                    style={{ width: `${Math.min((b.total / Math.max(...(stats?.confidence_dist || []).map(x => x.total), 1)) * 100, 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-[10px] text-slate-300 font-mono">
                    {b.total} total &middot; {b.verified} verified &middot;
                    <span className={`ml-1 font-bold ${
                      b.accuracy >= 60 ? 'text-emerald-400' : b.accuracy >= 45 ? 'text-amber-400' : b.accuracy > 0 ? 'text-red-400' : 'text-slate-500'
                    }`}>{b.accuracy}% acc</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── By Bet Type + By League ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="By Bet Type" subtitle="Top 10 bet types by volume">
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {(stats?.by_bet_type || []).map((b, i) => (
              <div key={b.bet_type}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono w-4">{i + 1}</span>
                    <span className="text-xs text-slate-300 truncate max-w-[160px]">{b.bet_type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-mono">{b.correct}/{b.total}</span>
                    <span className={`text-xs font-bold font-mono min-w-[40px] text-right ${
                      b.accuracy >= 60 ? 'text-emerald-400' : b.accuracy >= 45 ? 'text-amber-400' : 'text-red-400'
                    }`}>{b.accuracy}%</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      b.accuracy >= 60 ? 'bg-emerald-500/60' : b.accuracy >= 45 ? 'bg-amber-500/60' : 'bg-red-500/60'
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
        </Card>

        <Card title="By League" subtitle="Top 10 leagues by volume">
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {(stats?.by_league || []).map((l, i) => (
              <div key={l.league}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono w-4">{i + 1}</span>
                    <span className="text-xs text-slate-300 truncate max-w-[160px]">{l.league}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-mono">{l.correct}/{l.total}</span>
                    <span className={`text-xs font-bold font-mono min-w-[40px] text-right ${
                      l.accuracy >= 60 ? 'text-emerald-400' : l.accuracy >= 45 ? 'text-amber-400' : 'text-red-400'
                    }`}>{l.accuracy}%</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      l.accuracy >= 60 ? 'bg-emerald-500/60' : l.accuracy >= 45 ? 'bg-amber-500/60' : 'bg-red-500/60'
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
        </Card>
      </div>

      {/* ── By Source ── */}
      {stats?.by_source?.length > 0 && (
        <Card title="By Source" subtitle="Where predictions originated">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.by_source.map(s => (
              <div key={s.source} className="bg-slate-800/50 rounded-lg p-4 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  {s.source === 'ai_chat' ? 'AI Chat' : s.source === 'api' ? 'API' : s.source === 'bot' ? 'Bot' : 'Unknown'}
                </p>
                <p className="text-xl font-bold text-slate-100">{s.total.toLocaleString()}</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-500">{s.verified} verified</span>
                  <span className={`text-xs font-bold font-mono ${
                    s.accuracy >= 60 ? 'text-emerald-400' : s.accuracy >= 45 ? 'text-amber-400' : s.accuracy > 0 ? 'text-red-400' : 'text-slate-500'
                  }`}>{s.accuracy}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── ROI Analytics ── */}
      {stats?.roi?.length > 0 && (
        <Card title="ROI Analytics" subtitle="Return on investment by period">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">Period</th>
                  <th className="text-right px-3 py-3 font-medium">Predictions</th>
                  <th className="text-right px-3 py-3 font-medium">Accuracy</th>
                  <th className="text-right px-4 py-3 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {stats.roi.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-xs">
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded mr-2">{r.period}</span>
                      {r.start}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-slate-400">{r.predictions}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">
                      <span className={r.accuracy >= 50 ? 'text-emerald-400' : 'text-amber-400'}>{r.accuracy}%</span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${
                      r.roi >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {r.roi >= 0 ? '+' : ''}{r.roi}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
