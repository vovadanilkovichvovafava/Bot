import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import { Card, StatCard, StackedBar, DataTable, Badge, Empty, GaugeBar } from '../components/AdminCharts'

const FUNNEL_COLORS = {
  'funnel-1': '#3b82f6', 'funnel-2': '#22c55e', 'funnel-3': '#a855f7', 'funnel-4': '#f97316',
}
const FUNNEL_LABELS = {
  'funnel-1': 'Degressive + Pro', 'funnel-2': 'All Free (No Pro)', 'funnel-3': 'Fixed 7/day', 'funnel-4': 'Express-First',
}
const FUNNEL_DESC = {
  'funnel-1': 'Limits: 3→2→1/day. Upsell to Pro.',
  'funnel-2': 'Everything unlocked. No paywall. Bonus banners.',
  'funnel-3': 'Fixed 7 requests/day. No degradation.',
  'funnel-4': 'Express-first UX. All free. Leads with accumulators + bonus ads.',
}

export default function AdminFunnels() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminApi.getFunnelStats()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

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
  if (!data?.funnels) return null

  const funnels = data.funnels
  const totalUsers = funnels.reduce((sum, f) => sum + f.total_users, 0)

  // Find best performer for each metric
  const bestActivation = funnels.reduce((a, b) => (b.activation_rate > a.activation_rate ? b : a), funnels[0])
  const bestConversion = funnels.reduce((a, b) => (b.conversion_rate > a.conversion_rate ? b : a), funnels[0])
  const bestChat = funnels.reduce((a, b) => (b.chat_usage_rate > a.chat_usage_rate ? b : a), funnels[0])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">A/B Funnels</h1>
        <p className="text-sm text-slate-400 mt-1">Compare engagement, conversion & retention across funnel variants</p>
      </div>

      {/* Top winners row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Best Activation" value={`${bestActivation.activation_rate}%`} color="green"
          sub={FUNNEL_LABELS[bestActivation.funnel]} subColor="green" />
        <StatCard label="Best Conversion" value={`${bestConversion.conversion_rate}%`} color="purple"
          sub={FUNNEL_LABELS[bestConversion.funnel]} subColor="green" />
        <StatCard label="Best Chat Usage" value={`${bestChat.chat_usage_rate}%`} color="cyan"
          sub={FUNNEL_LABELS[bestChat.funnel]} subColor="green" />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {funnels.map(f => {
          const color = FUNNEL_COLORS[f.funnel] || '#64748b'
          const pct = totalUsers > 0 ? ((f.total_users / totalUsers) * 100).toFixed(1) : 0
          return (
            <div key={f.funnel} className="bg-slate-900 rounded-xl p-5 border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm font-semibold text-slate-200">{FUNNEL_LABELS[f.funnel] || f.funnel}</span>
              </div>
              <p className="text-3xl font-bold mb-1">{f.total_users.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mb-3">{pct}% of users</p>
              <div className="space-y-2">
                <GaugeBar value={f.activation_rate} label="Activation" color="auto" />
                <GaugeBar value={f.chat_usage_rate} label="Chat usage" color="auto" />
                <GaugeBar value={f.conversion_rate} label="Conversion" color="auto" />
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed mt-3 pt-3 border-t border-slate-800">{FUNNEL_DESC[f.funnel]}</p>
            </div>
          )
        })}
      </div>

      {/* Distribution Bar */}
      <Card title="User Distribution">
        <StackedBar
          segments={funnels.map(f => ({
            label: FUNNEL_LABELS[f.funnel] || f.funnel,
            value: f.total_users,
            color: FUNNEL_COLORS[f.funnel] || '#64748b',
          }))}
          height="h-8"
        />
        <div className="flex gap-4 mt-3">
          {funnels.map(f => (
            <div key={f.funnel} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: FUNNEL_COLORS[f.funnel] || '#64748b' }} />
              <span className="text-xs text-slate-400">{FUNNEL_LABELS[f.funnel]}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Comparison Table */}
      <Card title="Funnel Comparison" subtitle="Side-by-side metrics">
        <DataTable
          columns={[
            { key: 'funnel', label: 'Funnel', render: r => (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: FUNNEL_COLORS[r.funnel] || '#64748b' }} />
                <span className="font-medium text-slate-200">{FUNNEL_LABELS[r.funnel] || r.funnel}</span>
              </div>
            )},
            { key: 'total_users', label: 'Users', align: 'right', mono: true },
            { key: 'active_users', label: 'Active', align: 'right', mono: true },
            { key: 'activation_rate', label: 'Act. %', align: 'right', render: r => <MetricBadge value={r.activation_rate} thresholds={[15, 30]} /> },
            { key: 'users_with_chat', label: 'Chat', align: 'right', mono: true },
            { key: 'chat_usage_rate', label: 'Chat %', align: 'right', render: r => <MetricBadge value={r.chat_usage_rate} thresholds={[10, 25]} /> },
            { key: 'premium_users', label: 'PRO', align: 'right', mono: true },
            { key: 'conversion_rate', label: 'Conv %', align: 'right', render: r => <MetricBadge value={r.conversion_rate} thresholds={[2, 5]} /> },
            { key: 'avg_predictions', label: 'Avg Preds', align: 'right', mono: true },
          ]}
          rows={funnels}
        />
      </Card>

      {/* Metric comparison charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { title: 'Activation Rate', metric: 'activation_rate', suffix: '%' },
          { title: 'Chat Usage Rate', metric: 'chat_usage_rate', suffix: '%' },
          { title: 'Conversion Rate (PRO)', metric: 'conversion_rate', suffix: '%' },
          { title: 'Avg Predictions per User', metric: 'avg_predictions', suffix: '' },
        ].map(chart => {
          const maxVal = Math.max(...funnels.map(f => f[chart.metric] || 0), 1)
          return (
            <Card key={chart.metric} title={chart.title}>
              <div className="space-y-3">
                {funnels.map(f => {
                  const val = f[chart.metric] || 0
                  const pct = (val / maxVal) * 100
                  const color = FUNNEL_COLORS[f.funnel] || '#64748b'
                  const isBest = val === maxVal
                  return (
                    <div key={f.funnel}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-xs text-slate-300">{FUNNEL_LABELS[f.funnel]}</span>
                          {isBest && <Badge color="green">Best</Badge>}
                        </div>
                        <span className="text-sm font-bold text-slate-200">{val}{chart.suffix}</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function MetricBadge({ value, thresholds = [2, 5] }) {
  const cls = value >= thresholds[1]
    ? 'bg-green-500/20 text-green-400'
    : value >= thresholds[0]
    ? 'bg-amber-500/20 text-amber-400'
    : 'bg-slate-700 text-slate-300'
  return <span className={`px-1.5 py-0.5 rounded text-xs font-medium font-mono ${cls}`}>{value}%</span>
}
