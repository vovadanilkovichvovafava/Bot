import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import {
  StatCard, Card, BarChart, AreaChart, DonutChart, ComparisonBars,
  RankingList, DataTable, Badge, FunnelChart, Empty, GaugeBar,
} from '../components/AdminCharts'

export default function AdminPro() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    adminApi.getProAnalytics()
      .then(setData)
      .catch(e => console.error('PRO analytics load failed:', e))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!data) return <div className="text-center text-slate-400 py-20">Failed to load PRO analytics</div>

  const o = data.overview

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">PRO Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Subscription metrics, engagement and churn tracking</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Active PRO" value={o.active_pro} sub={`${o.pro_percent}% of ${o.total_users}`} color="purple"
          sparkData={data.growth_daily?.map(d => d.pro_count)}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>}
        />
        <StatCard label="New (week)" value={o.new_pro_week} color="green" subColor={o.new_pro_week > 0 ? 'green' : undefined}
          sub={o.new_pro_week > 0 ? 'Growing' : 'No new'} />
        <StatCard label="New (month)" value={o.new_pro_month} color="green" />
        <StatCard label="Churned" value={o.churned_month} color="rose" sub="Last 30 days" subColor={o.churned_month > 0 ? 'red' : undefined} />
        <StatCard label="At Risk" value={data.at_risk?.length || 0} sub="Expiring < 7d" color="amber" subColor="amber" />
        <StatCard label="Avg Days PRO" value={o.avg_pro_days} color="blue" />
        <StatCard label="Countries" value={data.pro_by_country?.length || 0} color="cyan" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 rounded-lg p-1 w-fit border border-slate-800">
        {['overview', 'users', 'churn'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {t === 'overview' ? 'Overview' : t === 'users' ? `PRO Users (${data.pro_users?.length || 0})` : `Churn (${data.churned?.length || 0})`}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab data={data} />}
      {tab === 'users' && <ProUsersTab users={data.pro_users} />}
      {tab === 'churn' && <ChurnTab churned={data.churned} atRisk={data.at_risk} />}
    </div>
  )
}

function OverviewTab({ data }) {
  const engagement = data.engagement
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="PRO Growth" subtitle="New PRO subscriptions (30 days)">
          <BarChart data={(data.growth_daily || []).map(d => ({ date: d.date, count: d.pro_count }))} color="purple" height="h-36" showGrid />
          {data.growth_daily?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
              <span>Total 30d: <span className="text-purple-400 font-mono font-semibold">{data.growth_daily.reduce((s, d) => s + d.pro_count, 0)}</span></span>
              <span>Peak: <span className="text-slate-300 font-mono">{Math.max(...data.growth_daily.map(d => d.pro_count))}/day</span></span>
            </div>
          )}
        </Card>

        <Card title="PRO vs Free Engagement" subtitle="Average metrics per user">
          {engagement ? (
            <ComparisonBars items={[
              { label: 'AI Sessions', labelA: 'PRO', valueA: engagement.pro.avg_ai_sessions, labelB: 'Free', valueB: engagement.free.avg_ai_sessions },
              { label: 'Support Sessions', labelA: 'PRO', valueA: engagement.pro.avg_support_sessions, labelB: 'Free', valueB: engagement.free.avg_support_sessions },
              { label: 'Predictions', labelA: 'PRO', valueA: engagement.pro.avg_predictions, labelB: 'Free', valueB: engagement.free.avg_predictions },
            ]} />
          ) : <Empty />}
          {engagement && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <p className="text-[10px] text-slate-500">
                PRO users are <span className="text-emerald-400 font-semibold">
                  {engagement.free.avg_predictions > 0 ? `${(engagement.pro.avg_predictions / engagement.free.avg_predictions).toFixed(1)}x` : '—'}
                </span> more active in predictions
              </p>
            </div>
          )}
        </Card>
      </div>

      <Card title="Daily Active PRO Users" subtitle="Last 30 days">
        <BarChart data={(data.daily_activity || []).map(d => ({ date: d.date, count: d.active_pro }))} color="green" height="h-32" showGrid />
      </Card>

      {data.pro_by_country?.length > 0 && (
        <Card title="PRO by Country" subtitle={`${data.pro_by_country.length} countries`}>
          <RankingList
            data={data.pro_by_country.map(c => ({ label: c.country, value: c.count }))}
            maxItems={12}
            color="purple"
          />
        </Card>
      )}
    </div>
  )
}

function ProUsersTab({ users }) {
  const [sort, setSort] = useState('last_active')
  const [search, setSearch] = useState('')

  const filtered = (users || []).filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.email || '').toLowerCase().includes(q) ||
           (u.phone || '').includes(q) ||
           (u.public_id || '').toLowerCase().includes(q) ||
           (u.country || '').toLowerCase().includes(q)
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'last_active') return a.last_active_hours_ago - b.last_active_hours_ago
    if (sort === 'predictions') return (b.total_predictions || 0) - (a.total_predictions || 0)
    if (sort === 'ai_sessions') return (b.ai_sessions || 0) - (a.ai_sessions || 0)
    if (sort === 'days_remaining') return (a.days_remaining || 0) - (b.days_remaining || 0)
    if (sort === 'accuracy') return (b.accuracy || 0) - (a.accuracy || 0)
    return 0
  })

  const fmtActive = (hours) => {
    if (hours < 1) return 'Online'
    if (hours < 24) return `${Math.round(hours)}h ago`
    return `${Math.round(hours / 24)}d ago`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input type="text" placeholder="Search by email, phone, ID..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" />
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
          <option value="last_active">Sort: Last Active</option>
          <option value="predictions">Sort: Predictions</option>
          <option value="ai_sessions">Sort: AI Sessions</option>
          <option value="days_remaining">Sort: Expiring Soon</option>
          <option value="accuracy">Sort: Accuracy</option>
        </select>
      </div>

      <DataTable
        maxHeight="max-h-[600px]"
        columns={[
          { key: 'user', label: 'User', render: r => (
            <div>
              <div className="font-medium text-xs text-slate-300">{r.email || r.phone || r.public_id}</div>
              <div className="text-[10px] text-slate-500">{r.public_id}</div>
            </div>
          )},
          { key: 'country', label: 'Country' },
          { key: 'total_predictions', label: 'Preds', align: 'right', mono: true },
          { key: 'accuracy', label: 'Acc.', align: 'right', mono: true, render: r => (
            <span className={r.accuracy >= 60 ? 'text-green-400' : r.accuracy >= 40 ? 'text-amber-400' : 'text-slate-400'}>{r.accuracy}%</span>
          )},
          { key: 'ai_sessions', label: 'AI', align: 'right', mono: true },
          { key: 'support_sessions', label: 'Sup.', align: 'right', mono: true },
          { key: 'days_as_pro', label: 'Days PRO', align: 'right', render: r => <span className="text-slate-400">{r.days_as_pro}d</span> },
          { key: 'days_remaining', label: 'Left', align: 'right', render: r => (
            <span className={r.days_remaining <= 3 ? 'text-red-400 font-bold' : r.days_remaining <= 7 ? 'text-amber-400' : 'text-green-400'}>{r.days_remaining}d</span>
          )},
          { key: 'last_active', label: 'Active', align: 'right', render: r => (
            <span className={r.last_active_hours_ago < 1 ? 'text-green-400' : r.last_active_hours_ago < 24 ? 'text-slate-300' : 'text-slate-500'}>
              {fmtActive(r.last_active_hours_ago)}
            </span>
          )},
        ]}
        rows={sorted}
      />
    </div>
  )
}

function ChurnTab({ churned, atRisk }) {
  return (
    <div className="space-y-6">
      {atRisk?.length > 0 && (
        <Card title={`At Risk — Expiring in 7 days (${atRisk.length})`} className="border-amber-500/20">
          <DataTable
            columns={[
              { key: 'user', label: 'User', render: r => <span className="text-xs text-slate-300">{r.email || r.phone || r.public_id}</span> },
              { key: 'days_remaining', label: 'Days Left', align: 'right', render: r => (
                <span className="text-red-400 font-bold font-mono">{r.days_remaining}d</span>
              )},
              { key: 'total_predictions', label: 'Preds', align: 'right', mono: true },
              { key: 'ai_sessions', label: 'AI Sess.', align: 'right', mono: true },
              { key: 'last_active', label: 'Last Active', align: 'right', render: r => (
                <span className="text-slate-400">{r.last_active_hours_ago < 24 ? `${Math.round(r.last_active_hours_ago)}h` : `${Math.round(r.last_active_hours_ago / 24)}d`}</span>
              )},
            ]}
            rows={atRisk}
          />
        </Card>
      )}

      <Card title={`Churned — Expired in Last 30 Days (${churned?.length || 0})`}>
        <DataTable
          columns={[
            { key: 'user', label: 'User', render: r => <span className="text-xs text-slate-300">{r.email || r.phone || r.public_id}</span> },
            { key: 'country', label: 'Country' },
            { key: 'expired_at', label: 'Expired', render: r => <span className="text-slate-400">{r.expired_at ? new Date(r.expired_at).toLocaleDateString() : '-'}</span> },
            { key: 'days_since_expiry', label: 'Days Ago', align: 'right', render: r => <span className="text-red-400 font-mono">{r.days_since_expiry}d</span> },
            { key: 'total_predictions', label: 'Preds', align: 'right', mono: true },
            { key: 'last_active', label: 'Last Active', align: 'right', render: r => (
              <span className="text-slate-400">{r.last_active_hours_ago < 24 ? `${Math.round(r.last_active_hours_ago)}h` : `${Math.round(r.last_active_hours_ago / 24)}d`}</span>
            )},
          ]}
          rows={churned || []}
        />
      </Card>
    </div>
  )
}
