/**
 * Shared chart & visualization components for the Admin panel.
 * All components are self-contained — no external chart library required.
 */

/* ── Stat / KPI Card ───────────────────────────────────────────── */

export function StatCard({ label, value, sub, subColor, color = 'blue', icon, trend, sparkData }) {
  const palette = {
    blue:   { bg: 'from-blue-600/20 to-blue-600/5 border-blue-500/20',   text: 'text-blue-400' },
    green:  { bg: 'from-green-600/20 to-green-600/5 border-green-500/20', text: 'text-green-400' },
    purple: { bg: 'from-purple-600/20 to-purple-600/5 border-purple-500/20', text: 'text-purple-400' },
    amber:  { bg: 'from-amber-600/20 to-amber-600/5 border-amber-500/20', text: 'text-amber-400' },
    cyan:   { bg: 'from-cyan-600/20 to-cyan-600/5 border-cyan-500/20',   text: 'text-cyan-400' },
    rose:   { bg: 'from-rose-600/20 to-rose-600/5 border-rose-500/20',   text: 'text-rose-400' },
    slate:  { bg: 'from-slate-600/20 to-slate-600/5 border-slate-500/20', text: 'text-slate-400' },
  }
  const c = palette[color] || palette.blue
  const subClr = subColor === 'green' ? 'text-emerald-400' : subColor === 'red' ? 'text-red-400' : subColor === 'amber' ? 'text-amber-400' : 'text-slate-500'

  return (
    <div className={`bg-gradient-to-br ${c.bg} border rounded-xl p-4 relative overflow-hidden`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{label}</p>
        {icon && <span className={c.text}>{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        {trend !== undefined && (
          <span className={`text-xs font-mono font-semibold mb-0.5 ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-slate-500'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      {sub && <p className={`text-[11px] mt-1 ${subClr}`}>{sub}</p>}
      {sparkData?.length > 1 && (
        <div className="absolute bottom-0 right-0 w-24 h-10 opacity-30">
          <MiniSparkline data={sparkData} color={color} />
        </div>
      )}
    </div>
  )
}

/* ── Mini Sparkline (for stat cards) ───────────────────────────── */

export function MiniSparkline({ data, color = 'cyan', width = 96, height = 40 }) {
  if (!data?.length) return null
  const values = data.map(d => typeof d === 'number' ? d : (d.value ?? d.count ?? 0))
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1 || 1)) * width,
    y: height - 4 - ((v - min) / range) * (height - 8),
  }))
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const colors = { blue: '#3b82f6', green: '#34d399', purple: '#a78bfa', amber: '#fbbf24', cyan: '#22d3ee', rose: '#fb7185' }
  const stroke = colors[color] || colors.cyan

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Card Wrapper ──────────────────────────────────────────────── */

export function Card({ title, subtitle, children, action, className = '' }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-1">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {action}
        </div>
      )}
      {subtitle && <p className="text-[11px] text-slate-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  )
}

/* ── Bar Chart ─────────────────────────────────────────────────── */

export function BarChart({ data, color = 'green', height = 'h-40', valueKey = 'count', labelKey = 'date', formatLabel, showGrid = false }) {
  if (!data?.length) return <Empty />
  const values = data.map(d => d[valueKey] ?? 0)
  const max = Math.max(...values, 1)
  const colors = {
    green:  { bg: 'bg-emerald-500/50', hover: 'hover:bg-emerald-400/70' },
    blue:   { bg: 'bg-blue-500/50',    hover: 'hover:bg-blue-400/70' },
    amber:  { bg: 'bg-amber-500/50',   hover: 'hover:bg-amber-400/70' },
    purple: { bg: 'bg-purple-500/50',   hover: 'hover:bg-purple-400/70' },
    cyan:   { bg: 'bg-cyan-500/50',     hover: 'hover:bg-cyan-400/70' },
    rose:   { bg: 'bg-rose-500/50',     hover: 'hover:bg-rose-400/70' },
  }
  const c = colors[color] || colors.green
  const ticks = [0, Math.round(max / 3), Math.round((max * 2) / 3), max]
  const step = Math.max(1, Math.floor((data.length - 1) / 6))

  return (
    <div className="flex">
      <div className={`flex flex-col justify-between items-end pr-2 ${height} py-0.5`}>
        {[...ticks].reverse().map((t, i) => (
          <span key={i} className="text-[10px] text-slate-500 font-mono leading-none">{t}</span>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`flex items-end gap-[2px] ${height} border-l border-b border-slate-700/40 relative`}>
          {showGrid && ticks.slice(1).map((_, i) => (
            <div key={i} className="absolute w-full border-t border-slate-800/40" style={{ bottom: `${((i + 1) / 3) * 100}%` }} />
          ))}
          {data.map((d, i) => (
            <div
              key={i}
              className={`flex-1 ${c.bg} rounded-t-sm min-w-[3px] ${c.hover} transition-all cursor-default relative group`}
              style={{ height: `${Math.max((d[valueKey] / max) * 100, 1.5)}%` }}
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-[9px] text-slate-200 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-mono border border-slate-700">
                {d[valueKey]}
              </div>
            </div>
          ))}
        </div>
        <div className="relative h-5 mt-1">
          {data.reduce((acc, d, i) => {
            if (i === 0 || i === data.length - 1 || i % step === 0) {
              const lbl = formatLabel ? formatLabel(d[labelKey]) : (d[labelKey]?.slice?.(5) || d[labelKey])
              acc.push(
                <span key={i} className="absolute text-[10px] text-slate-500 font-mono -translate-x-1/2" style={{ left: `${(i / (data.length - 1 || 1)) * 100}%` }}>
                  {lbl}
                </span>
              )
            }
            return acc
          }, [])}
        </div>
      </div>
    </div>
  )
}

/* ── Area / Line Chart (SVG) ───────────────────────────────────── */

export function AreaChart({ data, height = 'h-40', valueKey = 'value', labelKey = 'date', formatLabel, suffix = '', color = 'cyan', showDots = true, showArea = true }) {
  if (!data?.length) return <Empty />
  const values = data.map(d => d[valueKey] ?? 0)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const colorMap = {
    cyan:   { stroke: '#22d3ee', fill: 'rgba(34,211,238,0.10)', dot: '#22d3ee' },
    green:  { stroke: '#34d399', fill: 'rgba(52,211,153,0.10)', dot: '#34d399' },
    amber:  { stroke: '#fbbf24', fill: 'rgba(251,191,36,0.10)', dot: '#fbbf24' },
    purple: { stroke: '#a78bfa', fill: 'rgba(167,139,250,0.10)', dot: '#a78bfa' },
    blue:   { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.10)', dot: '#3b82f6' },
    rose:   { stroke: '#fb7185', fill: 'rgba(251,113,133,0.10)', dot: '#fb7185' },
  }
  const c = colorMap[color] || colorMap.cyan
  const w = 500, h = 120
  const pad = { t: 10, b: 5, l: 0, r: 0 }
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b
  const points = data.map((d, i) => ({
    x: pad.l + (i / (data.length - 1 || 1)) * pw,
    y: pad.t + ph - ((d[valueKey] - min) / range) * ph,
    d,
  }))
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const area = `${line} L ${points[points.length - 1].x} ${h - pad.b} L ${points[0].x} ${h - pad.b} Z`
  const ticks = [min, min + range / 2, max].map(v => Math.round(v * 10) / 10)
  const step = Math.max(1, Math.floor((data.length - 1) / 5))

  return (
    <div className="flex">
      <div className={`flex flex-col justify-between items-end pr-2 ${height} py-0.5`}>
        {[...ticks].reverse().map((t, i) => (
          <span key={i} className="text-[10px] text-slate-500 font-mono leading-none">{t}{suffix}</span>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <svg viewBox={`0 0 ${w} ${h}`} className={`w-full ${height}`} preserveAspectRatio="none">
          {showArea && <path d={area} fill={c.fill} />}
          <path d={line} fill="none" stroke={c.stroke} strokeWidth="2" strokeLinejoin="round" />
          {showDots && points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill={c.dot} opacity="0.7">
              <title>{`${p.d[labelKey]}: ${p.d[valueKey]}${suffix}`}</title>
            </circle>
          ))}
        </svg>
        <div className="relative h-5 mt-1">
          {data.reduce((acc, d, i) => {
            if (i === 0 || i === data.length - 1 || i % step === 0) {
              const lbl = formatLabel ? formatLabel(d[labelKey]) : (d[labelKey]?.slice?.(5) || d[labelKey])
              acc.push(
                <span key={i} className="absolute text-[10px] text-slate-500 font-mono -translate-x-1/2"
                  style={{ left: `${(points[i].x / w) * 100}%` }}>{lbl}</span>
              )
            }
            return acc
          }, [])}
        </div>
      </div>
    </div>
  )
}

/* ── Donut / Pie Chart ─────────────────────────────────────────── */

export function DonutChart({ data, size = 140, strokeWidth = 22, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0)
  if (!total) return <Empty />
  const cx = size / 2, cy = size / 2
  const r = size / 2 - 12
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
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotation} ${cx} ${cy})`}
              className="transition-all">
              <title>{`${d.label}: ${d.value} (${(pct * 100).toFixed(1)}%)`}</title>
            </circle>
          )
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-white text-lg font-bold">
          {centerValue ?? total.toLocaleString()}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-400 text-[10px]">
          {centerLabel ?? 'total'}
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-slate-300">{d.label}</span>
            <span className="text-xs text-slate-500 font-mono ml-auto">{d.value.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 font-mono w-10 text-right">{(d.value / total * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Heatmap Row (days of week, etc.) ──────────────────────────── */

export function HeatmapRow({ data, labelKey = 'day', valueKey = 'total', secondaryKey = 'accuracy', unit = '' }) {
  if (!data?.length) return <Empty />
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  return (
    <div className="flex gap-2 items-end">
      {data.map((d, i) => {
        const intensity = d[valueKey] / max
        return (
          <div key={i} className="flex-1 text-center">
            <div
              className="rounded-lg mx-auto transition-all mb-2 flex items-center justify-center"
              style={{ height: '52px', backgroundColor: `rgba(52, 211, 153, ${Math.max(intensity * 0.7, 0.05)})` }}
              title={`${d[labelKey]}: ${d[valueKey]} predictions${d[secondaryKey] !== undefined ? `, ${d[secondaryKey]}% accuracy` : ''}`}
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

/* ── Horizontal Bar List (top-N rankings) ──────────────────────── */

export function RankingList({ data, labelKey = 'label', valueKey = 'value', secondaryKey, maxItems = 10, color = 'blue', formatValue }) {
  if (!data?.length) return <Empty />
  const items = data.slice(0, maxItems)
  const max = Math.max(...items.map(d => d[valueKey] ?? 0), 1)
  const colorMap = {
    blue: 'bg-blue-500/40', green: 'bg-emerald-500/40', purple: 'bg-purple-500/40',
    amber: 'bg-amber-500/40', cyan: 'bg-cyan-500/40', rose: 'bg-rose-500/40',
    auto: null, // color per item accuracy
  }

  return (
    <div className="space-y-2.5">
      {items.map((d, i) => {
        const pct = (d[valueKey] / max) * 100
        const barColor = color === 'auto'
          ? ((d[secondaryKey] ?? 0) >= 60 ? 'bg-emerald-500/50' : (d[secondaryKey] ?? 0) >= 45 ? 'bg-amber-500/50' : 'bg-red-500/50')
          : (colorMap[color] || colorMap.blue)
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-slate-500 font-mono w-4 shrink-0">{i + 1}</span>
                <span className="text-xs text-slate-300 truncate">{d[labelKey]}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500 font-mono">{formatValue ? formatValue(d[valueKey]) : d[valueKey]}</span>
                {secondaryKey && d[secondaryKey] !== undefined && (
                  <span className={`text-xs font-bold font-mono min-w-[40px] text-right ${
                    d[secondaryKey] >= 60 ? 'text-emerald-400' : d[secondaryKey] >= 45 ? 'text-amber-400' : d[secondaryKey] > 0 ? 'text-red-400' : 'text-slate-500'
                  }`}>{d[secondaryKey]}%</span>
                )}
              </div>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden ml-6">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Progress / Gauge ──────────────────────────────────────────── */

export function GaugeBar({ value, max = 100, label, color = 'green', showPct = true }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const colorMap = {
    green: 'bg-emerald-500', blue: 'bg-blue-500', purple: 'bg-purple-500',
    amber: 'bg-amber-500', cyan: 'bg-cyan-500', rose: 'bg-rose-500',
    auto: pct >= 60 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500',
  }
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">{label}</span>
          {showPct && <span className="text-xs font-mono text-slate-500">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorMap[color] || colorMap.green}`} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
    </div>
  )
}

/* ── Stacked Bar (multi-series) ────────────────────────────────── */

export function StackedBar({ segments, height = 'h-6' }) {
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0)
  if (!total) return <Empty />
  return (
    <div className={`flex ${height} rounded-lg overflow-hidden`}>
      {segments.map((seg, i) => {
        const pct = (seg.value / total) * 100
        if (pct < 0.5) return null
        return (
          <div
            key={i}
            className="transition-all relative group"
            style={{ width: `${pct}%`, backgroundColor: seg.color }}
            title={`${seg.label}: ${seg.value} (${pct.toFixed(1)}%)`}
          >
            {pct > 8 && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/80">
                {Math.round(pct)}%
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Comparison Bars (A vs B) ──────────────────────────────────── */

export function ComparisonBars({ items }) {
  if (!items?.length) return <Empty />
  const max = Math.max(...items.flatMap(d => [d.valueA || 0, d.valueB || 0]), 1)
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-300 font-medium">{item.label}</span>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-emerald-400">{item.labelA}: {item.valueA}</span>
              <span className="text-blue-400">{item.labelB}: {item.valueB}</span>
            </div>
          </div>
          <div className="flex gap-1">
            <div className="h-3 bg-emerald-500/40 rounded-l" style={{ width: `${(item.valueA / max) * 100}%` }} />
            <div className="h-3 bg-blue-500/40 rounded-r" style={{ width: `${(item.valueB / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Data Table ────────────────────────────────────────────────── */

export function DataTable({ columns, rows, maxHeight = 'max-h-[400px]' }) {
  if (!rows?.length) return <Empty />
  return (
    <div className={`overflow-x-auto ${maxHeight} overflow-y-auto`}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 sticky top-0 bg-slate-900">
            {columns.map(col => (
              <th key={col.key} className={`px-3 py-2.5 font-medium ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-800/30 transition-colors">
              {columns.map(col => (
                <td key={col.key} className={`px-3 py-2.5 ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.mono ? 'font-mono' : ''} ${col.className?.(row) || 'text-slate-400'}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Multi-Line Chart (multiple series on same axes) ───────────── */

export function MultiLineChart({ series, height = 'h-40', labelKey = 'date', formatLabel, suffix = '' }) {
  if (!series?.length || !series[0]?.data?.length) return <Empty />
  const allValues = series.flatMap(s => s.data.map(d => d[s.valueKey] ?? 0))
  const max = Math.max(...allValues, 1)
  const min = Math.min(...allValues, 0)
  const range = max - min || 1
  const w = 500, h = 120
  const pad = { t: 10, b: 5, l: 0, r: 0 }
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b
  const ticks = [min, min + range / 2, max].map(v => Math.round(v * 10) / 10)
  const baseData = series[0].data
  const step = Math.max(1, Math.floor((baseData.length - 1) / 5))

  return (
    <div className="flex">
      <div className={`flex flex-col justify-between items-end pr-2 ${height} py-0.5`}>
        {[...ticks].reverse().map((t, i) => (
          <span key={i} className="text-[10px] text-slate-500 font-mono leading-none">{t}{suffix}</span>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <svg viewBox={`0 0 ${w} ${h}`} className={`w-full ${height}`} preserveAspectRatio="none">
          {series.map((s, si) => {
            const pts = s.data.map((d, i) => ({
              x: pad.l + (i / (s.data.length - 1 || 1)) * pw,
              y: pad.t + ph - ((d[s.valueKey] - min) / range) * ph,
            }))
            const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
            return <path key={si} d={line} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" opacity={0.8} />
          })}
        </svg>
        <div className="flex items-center gap-3 mt-2">
          {series.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ backgroundColor: s.color }} />
              <span className="text-[10px] text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="relative h-5 mt-1">
          {baseData.reduce((acc, d, i) => {
            if (i === 0 || i === baseData.length - 1 || i % step === 0) {
              const lbl = formatLabel ? formatLabel(d[labelKey]) : (d[labelKey]?.slice?.(5) || d[labelKey])
              acc.push(
                <span key={i} className="absolute text-[10px] text-slate-500 font-mono -translate-x-1/2"
                  style={{ left: `${(i / (baseData.length - 1 || 1)) * 100}%` }}>{lbl}</span>
              )
            }
            return acc
          }, [])}
        </div>
      </div>
    </div>
  )
}

/* ── Conversion Funnel ─────────────────────────────────────────── */

export function FunnelChart({ steps }) {
  if (!steps?.length) return <Empty />
  const max = Math.max(steps[0]?.value || 1, 1)

  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const pct = Math.round((s.value / max) * 100)
        const prevValue = i > 0 ? steps[i - 1].value : null
        const convRate = prevValue > 0 ? Math.round((s.value / prevValue) * 100) : null
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-300">{s.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">{s.value?.toLocaleString()}</span>
                {convRate !== null && (
                  <span className={`text-[10px] font-mono ${convRate >= 50 ? 'text-emerald-400' : convRate >= 20 ? 'text-amber-400' : 'text-red-400'}`}>
                    {convRate}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-5 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${s.color || 'bg-blue-500/40'}`} style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Badge / Tag ───────────────────────────────────────────────── */

export function Badge({ children, color = 'slate' }) {
  const colorMap = {
    green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${colorMap[color] || colorMap.slate}`}>
      {children}
    </span>
  )
}

/* ── Percentage Change Indicator ───────────────────────────────── */

export function TrendIndicator({ value, suffix = '%' }) {
  if (value === null || value === undefined) return null
  const isUp = value > 0
  const isDown = value < 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-mono font-semibold ${isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-slate-500'}`}>
      {isUp ? '↑' : isDown ? '↓' : '–'}{Math.abs(value)}{suffix}
    </span>
  )
}

/* ── Empty State ───────────────────────────────────────────────── */

export function Empty({ text = 'No data' }) {
  return <p className="text-xs text-slate-600 text-center py-8">{text}</p>
}
