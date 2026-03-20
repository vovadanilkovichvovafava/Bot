import { useState, useEffect, useMemo } from 'react'
import { adminApi } from '../api'
import { Card, StatCard, StackedBar, DataTable, Badge, RankingList, Empty, GaugeBar } from '../components/AdminCharts'

const SOURCE_COLORS = ['#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']
function getColor(i) { return SOURCE_COLORS[i % SOURCE_COLORS.length] }

function MetricBadge({ value, thresholds = [2, 5] }) {
  const cls = value >= thresholds[1] ? 'bg-green-500/20 text-green-400 border-green-500/30'
    : value >= thresholds[0] ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : 'bg-slate-700 text-slate-300 border-slate-600'
  return <span className={`px-1.5 py-0.5 rounded border text-xs font-medium font-mono ${cls}`}>{value}%</span>
}

export default function AdminTraffic() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminApi.getTrafficStats()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const chartData = useMemo(() => {
    if (!data?.daily_by_source) return null
    const sources = [...new Set(data.daily_by_source.map(d => d.source))]
    const dates = [...new Set(data.daily_by_source.map(d => d.date))].sort()
    const map = {}
    for (const row of data.daily_by_source) {
      if (!map[row.date]) map[row.date] = {}
      map[row.date][row.source] = row.count
    }
    return { sources, dates, map }
  }, [data])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
      <p className="text-red-400 text-sm">{error}</p>
    </div>
  )
  if (!data) return null

  const maxDaily = chartData
    ? Math.max(...chartData.dates.map(d => chartData.sources.reduce((sum, s) => sum + (chartData.map[d]?.[s] || 0), 0)), 1)
    : 1
  const sourceIdx = (src) => data.by_source.findIndex(s => s.source === src)
  const totalUsers = data.by_source?.reduce((s, x) => s + x.total, 0) || 0

  // Find best source per metric
  const bestConv = data.by_source?.reduce((a, b) => (b.conversion_pct > a.conversion_pct ? b : a), data.by_source[0])
  const bestAct = data.by_source?.reduce((a, b) => (b.activation_pct > a.activation_pct ? b : a), data.by_source[0])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Traffic Sources</h1>
        <p className="text-sm text-slate-400 mt-1">Registrations, conversions and retention by traffic source</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Sources" value={data.by_source?.length || 0} color="blue" sub={`${totalUsers} total users`} />
        <StatCard label="Best Conversion" value={`${bestConv?.conversion_pct || 0}%`} color="purple"
          sub={bestConv?.source} subColor="green" />
        <StatCard label="Best Activation" value={`${bestAct?.activation_pct || 0}%`} color="green"
          sub={bestAct?.source} subColor="green" />
        <StatCard label="This Week" value={(data.new_week || []).reduce((s, x) => s + x.count, 0)} color="cyan"
          sub={`${(data.new_month || []).reduce((s, x) => s + x.count, 0)} this month`} />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.by_source.map((s, i) => (
          <div key={s.source} className="bg-slate-900 rounded-xl p-4 border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: getColor(i) }} />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(i) }} />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{s.source}</span>
            </div>
            <p className="text-2xl font-bold">{s.total}</p>
            <p className="text-xs text-slate-500 mt-1 mb-3">{s.percent}% of total</p>
            <div className="space-y-1.5">
              <GaugeBar value={s.activation_pct} label="Activation" color="auto" />
              <GaugeBar value={s.conversion_pct} max={Math.max(...data.by_source.map(x => x.conversion_pct), 1) * 2} label="Conversion" color="auto" />
            </div>
          </div>
        ))}
      </div>

      {/* Distribution */}
      <Card title="User Distribution by Source">
        <StackedBar
          segments={data.by_source.map((s, i) => ({ label: s.source, value: s.total, color: getColor(i) }))}
          height="h-6"
        />
        <div className="flex flex-wrap gap-3 mt-3">
          {data.by_source.map((s, i) => (
            <div key={s.source} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getColor(i) }} />
              <span className="text-xs text-slate-400">{s.source}</span>
              <span className="text-[10px] text-slate-500 font-mono">{s.percent}%</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Source Comparison Table */}
      <Card title="Source Comparison" subtitle="Performance metrics by source">
        <DataTable
          columns={[
            { key: 'source', label: 'Source', render: r => {
              const ci = sourceIdx(r.source)
              return (
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(ci >= 0 ? ci : 0) }} />
                  <span className="font-medium text-slate-200">{r.source}</span>
                </div>
              )
            }},
            { key: 'total', label: 'Users', align: 'right', mono: true },
            { key: 'pro', label: 'PRO', align: 'right', mono: true },
            { key: 'conversion_pct', label: 'Conv %', align: 'right', render: r => <MetricBadge value={r.conversion_pct} thresholds={[2, 5]} /> },
            { key: 'activated', label: 'Activated', align: 'right', mono: true },
            { key: 'activation_pct', label: 'Act %', align: 'right', render: r => <MetricBadge value={r.activation_pct} thresholds={[15, 30]} /> },
          ]}
          rows={data.by_source}
        />
      </Card>

      {/* Daily Stacked Chart */}
      {chartData && chartData.dates.length > 0 && (
        <Card title="Daily Registrations by Source" subtitle="Last 30 days">
          <div className="flex flex-wrap gap-3 mb-4">
            {chartData.sources.map((src, i) => (
              <div key={src} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: getColor(sourceIdx(src) >= 0 ? sourceIdx(src) : i) }} />
                <span className="text-xs text-slate-300">{src}</span>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-[2px] h-44">
            {chartData.dates.map(date => {
              const dayTotal = chartData.sources.reduce((sum, s) => sum + (chartData.map[date]?.[s] || 0), 0)
              return (
                <div key={date} className="flex-1 flex flex-col justify-end h-full group relative">
                  {chartData.sources.map((src, i) => {
                    const val = chartData.map[date]?.[src] || 0
                    if (val === 0) return null
                    const h = (val / maxDaily) * 100
                    const ci = sourceIdx(src) >= 0 ? sourceIdx(src) : i
                    return <div key={src} className="opacity-80 hover:opacity-100 transition-opacity min-h-[2px]"
                      style={{ height: `${h}%`, backgroundColor: getColor(ci) }} />
                  })}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg">
                      <p className="font-medium text-slate-200 mb-1">{date}</p>
                      {chartData.sources.map((src, i) => {
                        const val = chartData.map[date]?.[src] || 0
                        if (val === 0) return null
                        return (
                          <div key={src} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded" style={{ backgroundColor: getColor(sourceIdx(src) >= 0 ? sourceIdx(src) : i) }} />
                            <span className="text-slate-400">{src}:</span>
                            <span className="font-mono text-slate-200">{val}</span>
                          </div>
                        )
                      })}
                      <div className="border-t border-slate-700 mt-1 pt-1 text-slate-300">Total: <span className="font-mono">{dayTotal}</span></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-[2px] mt-1">
            {chartData.dates.map((date, i) => (
              <div key={date} className="flex-1 text-center">
                {i % 5 === 0 && <span className="text-[9px] text-slate-500">{date.slice(5)}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Retention + New This Week/Month */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {data.retention_by_source?.length > 0 && (
          <Card title="Week-1 Retention" subtitle="By source">
            <div className="space-y-3">
              {data.retention_by_source.map((r, i) => {
                const ci = sourceIdx(r.source) >= 0 ? sourceIdx(r.source) : i
                return (
                  <div key={r.source}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(ci) }} />
                        <span className="text-xs text-slate-300">{r.source}</span>
                      </div>
                      <span className={`text-xs font-bold font-mono ${r.retention_pct >= 30 ? 'text-emerald-400' : r.retention_pct >= 15 ? 'text-amber-400' : 'text-red-400'}`}>{r.retention_pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${r.retention_pct}%`, backgroundColor: getColor(ci) }} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{r.returned}/{r.registered} returned</p>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        <Card title="New This Week">
          <RankingList
            data={(data.new_week || []).map(r => ({ label: r.source, value: r.count }))}
            color="blue"
          />
        </Card>

        <Card title="New This Month">
          <RankingList
            data={(data.new_month || []).map(r => ({ label: r.source, value: r.count }))}
            color="green"
          />
        </Card>
      </div>

      {/* UTM Source */}
      {data.by_utm_source?.length > 0 && (
        <Card title="By UTM Source" subtitle="Ad platform performance">
          <DataTable
            columns={[
              { key: 'source', label: 'UTM Source', render: r => <span className="font-medium text-slate-200">{r.source}</span> },
              { key: 'total', label: 'Users', align: 'right', mono: true },
              { key: 'pro', label: 'PRO', align: 'right', mono: true },
              { key: 'conversion_pct', label: 'Conv %', align: 'right', render: r => <MetricBadge value={r.conversion_pct} thresholds={[2, 5]} /> },
              { key: 'activated', label: 'Activated', align: 'right', mono: true },
              { key: 'activation_pct', label: 'Act %', align: 'right', render: r => <MetricBadge value={r.activation_pct} thresholds={[15, 30]} /> },
            ]}
            rows={data.by_utm_source}
          />
        </Card>
      )}

      {/* UTM Campaign */}
      {data.by_utm_campaign?.length > 0 && (
        <Card title="By UTM Campaign" subtitle="Campaign-level breakdown">
          <DataTable
            columns={[
              { key: 'campaign', label: 'Campaign', render: r => <span className="font-medium text-slate-200 truncate max-w-[200px] block">{r.campaign}</span> },
              { key: 'source', label: 'Source', className: () => 'text-slate-500' },
              { key: 'total', label: 'Users', align: 'right', mono: true },
              { key: 'pro', label: 'PRO', align: 'right', mono: true },
              { key: 'conversion_pct', label: 'Conv %', align: 'right', render: r => <MetricBadge value={r.conversion_pct} thresholds={[2, 5]} /> },
              { key: 'activated', label: 'Act.', align: 'right', mono: true },
              { key: 'activation_pct', label: 'Act %', align: 'right', render: r => <MetricBadge value={r.activation_pct} thresholds={[15, 30]} /> },
            ]}
            rows={data.by_utm_campaign}
          />
        </Card>
      )}

      {/* Country breakdown */}
      {data.by_source_country?.length > 0 && (
        <Card title="Top Countries by Source">
          <DataTable
            columns={[
              { key: 'source', label: 'Source', render: r => {
                const ci = sourceIdx(r.source)
                return (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(ci >= 0 ? ci : 0) }} />
                    <span className="text-xs text-slate-300">{r.source}</span>
                  </div>
                )
              }},
              { key: 'country', label: 'Country', className: () => 'text-slate-300' },
              { key: 'count', label: 'Users', align: 'right', mono: true },
            ]}
            rows={data.by_source_country}
          />
        </Card>
      )}
    </div>
  )
}
