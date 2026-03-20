import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { adminApi } from '../api'
import {
  StatCard, Card, BarChart, AreaChart, DonutChart, FunnelChart,
  RankingList, DataTable, Badge, StackedBar, HeatmapRow, Empty,
  MiniSparkline, ComparisonBars,
} from '../components/AdminCharts'

const COUNTRY_CODES = {
  'Italy': 'IT', 'Germany': 'DE', 'Spain': 'ES', 'France': 'FR', 'United Kingdom': 'GB',
  'UK': 'GB', 'USA': 'US', 'United States': 'US', 'Brazil': 'BR', 'Portugal': 'PT',
  'Netherlands': 'NL', 'Belgium': 'BE', 'Turkey': 'TR', 'Poland': 'PL', 'Argentina': 'AR',
  'Mexico': 'MX', 'Russia': 'RU', 'Ukraine': 'UA', 'Romania': 'RO', 'Greece': 'GR',
  'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK', 'Finland': 'FI', 'Austria': 'AT',
  'Switzerland': 'CH', 'Croatia': 'HR', 'Serbia': 'RS', 'Czech Republic': 'CZ', 'Hungary': 'HU',
  'Japan': 'JP', 'South Korea': 'KR', 'India': 'IN', 'Australia': 'AU', 'Canada': 'CA',
  'Colombia': 'CO', 'Chile': 'CL', 'Peru': 'PE', 'Nigeria': 'NG', 'Egypt': 'EG',
  'South Africa': 'ZA', 'Morocco': 'MA', 'Kenya': 'KE', 'Ghana': 'GH', 'Israel': 'IL',
  'Saudi Arabia': 'SA', 'China': 'CN', 'Indonesia': 'ID', 'Thailand': 'TH', 'Vietnam': 'VN',
  'Ireland': 'IE', 'Scotland': 'GB', 'Wales': 'GB', 'Bulgaria': 'BG', 'Slovakia': 'SK',
}
function countryFlag(name) {
  const code = COUNTRY_CODES[name]
  if (!code) return ''
  return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}

export default function AdminDashboard() {
  const { admin } = useAdminAuth()
  const [overview, setOverview] = useState(null)
  const [usersStats, setUsersStats] = useState(null)
  const [predStats, setPredStats] = useState(null)
  const [retention, setRetention] = useState(null)
  const [onlineHistory, setOnlineHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentRegs, setRecentRegs] = useState(null)
  const [recentRegsLoading, setRecentRegsLoading] = useState(false)

  const loadRecentRegistrations = () => {
    setRecentRegsLoading(true)
    adminApi.getRecentRegistrations()
      .then(setRecentRegs)
      .catch(() => setRecentRegs(null))
      .finally(() => setRecentRegsLoading(false))
  }

  useEffect(() => {
    Promise.all([
      adminApi.getOverview().catch(() => null),
      adminApi.getUsersStats().catch(() => null),
      adminApi.getPredictionsStats().catch(() => null),
      adminApi.getRetentionStats().catch(() => null),
      adminApi.getOnlineHistory().catch(() => null),
    ]).then(([ov, us, ps, rt, oh]) => {
      setOverview(ov)
      setUsersStats(us)
      setPredStats(ps)
      setRetention(rt)
      setOnlineHistory(oh)
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

  const o = overview || { users: {}, predictions: {}, ai_chats_today: 0, support_sessions: 0, football_api: {} }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back, <span className="text-slate-300">{admin?.name}</span>
        </p>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Total Users" value={o.users.total?.toLocaleString() || '0'}
          sub={`+${o.users.new_today || 0} today`}
          subColor={o.users.new_today > 0 ? 'green' : undefined}
          color="blue"
          sparkData={usersStats?.daily_registrations}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>}
        />
        <StatCard label="PRO Users" value={o.users.pro?.toLocaleString() || '0'}
          sub={o.users.pro_new_today > 0 ? `+${o.users.pro_new_today} today` : 'No new today'}
          subColor={o.users.pro_new_today > 0 ? 'green' : undefined}
          color="purple"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>}
        />
        <StatCard label="Online Now" value={o.users.online?.toLocaleString() || '0'}
          sub="Active last 15 min" color="cyan"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"/></svg>}
        />
        <StatCard label="Predictions" value={o.predictions.total?.toLocaleString() || '0'}
          sub={`+${o.predictions.today || 0} today · ${o.predictions.accuracy || 0}% acc`}
          subColor={o.predictions.today > 0 ? 'green' : undefined}
          color="green"
          sparkData={predStats?.daily_predictions}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z"/></svg>}
        />
        <StatCard label="Support" value={o.support_sessions?.toLocaleString() || '0'}
          sub={o.support_sessions_today > 0 ? `+${o.support_sessions_today} today` : 'None today'}
          subColor={o.support_sessions_today > 0 ? 'amber' : undefined}
          color="rose"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>}
        />
        <StatCard label="Football API" value={o.football_api?.used?.toLocaleString() || '0'}
          sub={o.football_api?.limit ? `Limit: ${o.football_api.limit.toLocaleString()}/day` : 'No key set'}
          subColor={o.football_api?.limit && o.football_api.used > o.football_api.limit * 0.8 ? 'amber' : 'green'}
          color="amber"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="User Registrations" subtitle="Last 14 days"
          action={<Link to="/admin/users" className="text-[11px] text-blue-400 hover:text-blue-300">View all</Link>}>
          <BarChart data={(usersStats?.daily_registrations || []).slice(-14)} color="blue" height="h-32" />
          {usersStats?.daily_registrations?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
              <span>Avg: <span className="text-slate-300 font-mono">
                {Math.round(usersStats.daily_registrations.slice(-14).reduce((s, d) => s + d.count, 0) / Math.min(14, usersStats.daily_registrations.length))}/day
              </span></span>
              <span>Total 14d: <span className="text-blue-400 font-mono">
                {usersStats.daily_registrations.slice(-14).reduce((s, d) => s + d.count, 0)}
              </span></span>
            </div>
          )}
        </Card>

        <Card title="Daily Predictions" subtitle="Last 14 days"
          action={<Link to="/admin/predictions" className="text-[11px] text-blue-400 hover:text-blue-300">View all</Link>}>
          <BarChart data={(predStats?.daily_predictions || []).slice(-14)} color="green" height="h-32" />
          {predStats?.daily_predictions?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
              <span>Accuracy: <span className={`font-mono font-semibold ${(o.predictions.accuracy || 0) >= 55 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {o.predictions.accuracy || 0}%
              </span></span>
              <span>Verified: <span className="text-green-400 font-mono">{o.predictions.verified || 0}</span></span>
            </div>
          )}
        </Card>
      </div>

      {/* ── Recent Registrations ── */}
      <Card title="Recent Registrations" subtitle="Today & yesterday details"
        action={
          <button onClick={loadRecentRegistrations} disabled={recentRegsLoading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-medium disabled:opacity-50 transition-colors">
            {recentRegsLoading ? 'Loading...' : recentRegs ? 'Refresh' : 'Load'}
          </button>
        }>
        {recentRegs ? (
          <div className="space-y-4">
            {[
              { label: 'Today', date: recentRegs.today_date, count: recentRegs.today_count, data: recentRegs.today, color: 'text-green-400' },
              { label: 'Yesterday', date: recentRegs.yesterday_date, count: recentRegs.yesterday_count, data: recentRegs.yesterday, color: 'text-blue-400' },
            ].map(section => (
              <div key={section.label}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold ${section.color}`}>{section.label} ({section.date})</span>
                  <span className="text-xs text-slate-500 font-mono">{section.count} users</span>
                </div>
                {section.data?.length > 0 ? (
                  <DataTable
                    maxHeight="max-h-[200px]"
                    columns={[
                      { key: 'time', label: 'Time', mono: true, className: () => 'text-slate-300' },
                      { key: 'phone', label: 'Contact', render: r => <span className="text-slate-300">{r.phone || r.email || '—'}</span> },
                      { key: 'country', label: 'Country', render: r => r.country ? <span>{countryFlag(r.country)} {r.country}</span> : <span className="text-slate-600">—</span> },
                      { key: 'source', label: 'Source', render: r => r.source ? <Badge color="blue">{r.source}</Badge> : <span className="text-slate-600">—</span> },
                      { key: 'is_premium', label: 'PRO', render: r => r.is_premium ? <Badge color="purple">PRO</Badge> : <span className="text-slate-600">—</span> },
                    ]}
                    rows={section.data}
                  />
                ) : <Empty text={`No registrations ${section.label.toLowerCase()}`} />}
              </div>
            ))}
          </div>
        ) : <Empty text="Click Load to view recent registrations" />}
      </Card>

      {/* ── Peak Online — 24h ── */}
      {onlineHistory?.hours?.length > 0 && (
        <Card title="Online Users — Last 24h"
          subtitle={<>Peak: <span className="text-cyan-400 font-mono font-semibold">{onlineHistory.peak_users}</span> at <span className="text-slate-300 font-mono">{onlineHistory.peak_hour || '—'}</span> · Now: <span className="text-green-400 font-mono font-semibold">{onlineHistory.current_online}</span></>}>
          <div className="flex items-end gap-[2px] h-24 mb-2">
            {onlineHistory.hours.map((h, i) => {
              const max = onlineHistory.peak_users || 1
              const pct = Math.max((h.unique_users / max) * 100, 3)
              const isPeak = h.unique_users === onlineHistory.peak_users
              return (
                <div key={i}
                  className={`flex-1 rounded-t min-w-[4px] transition-all relative group ${isPeak ? 'bg-cyan-400' : 'bg-cyan-500/40 hover:bg-cyan-400/60'}`}
                  style={{ height: `${pct}%` }}>
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-[9px] text-slate-200 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-mono border border-slate-700">
                    {h.hour}: {h.unique_users} users
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-[2px]">
            {onlineHistory.hours.map((h, i) => (
              <div key={i} className="flex-1 text-center">
                {i % 3 === 0 && <span className="text-[8px] text-slate-500 font-mono">{h.hour}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Bottom row — Countries, Bet Types, Languages ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Top Countries">
          <RankingList
            data={(usersStats?.by_country || []).slice(0, 8).map(c => ({
              label: `${countryFlag(c.country)} ${c.country || 'Unknown'}`,
              value: c.count,
            }))}
            maxItems={8}
            color="blue"
          />
        </Card>

        <Card title="Bet Types Accuracy">
          <RankingList
            data={(predStats?.by_bet_type || []).slice(0, 6).map(b => ({
              label: b.bet_type, value: b.total, accuracy: b.accuracy,
            }))}
            secondaryKey="accuracy"
            color="auto"
            maxItems={6}
          />
        </Card>

        <Card title="Languages">
          {(() => {
            const langs = usersStats?.by_language || []
            const total = langs.reduce((s, x) => s + x.count, 0) || 1
            return langs.length > 0 ? (
              <>
                <StackedBar segments={langs.map((l, i) => ({
                  label: l.language?.toUpperCase() || '??',
                  value: l.count,
                  color: ['#3b82f6', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#22d3ee'][i % 6],
                }))} height="h-4" />
                <div className="space-y-2 mt-4">
                  {langs.map((l, i) => (
                    <div key={l.language} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: ['#3b82f6', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#22d3ee'][i % 6] }} />
                      <span className="text-xs font-mono text-slate-400 uppercase w-6">{l.language || '??'}</span>
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${Math.round(l.count / total * 100)}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono w-14 text-right">{l.count} ({Math.round(l.count / total * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <Empty />
          })()}
        </Card>
      </div>

      {/* ── Retention & Conversion ── */}
      {retention && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Conversion Funnel" subtitle="Last 30 days — Registered → Activated → PRO">
            <FunnelChart steps={[
              { label: 'Registered', value: retention.funnel_30d?.registered || 0, color: 'bg-blue-500/40' },
              { label: 'Activated', value: retention.funnel_30d?.activated || 0, color: 'bg-green-500/40' },
              { label: 'PRO', value: retention.funnel_30d?.converted_pro || 0, color: 'bg-purple-500/40' },
            ]} />
            {retention.overall && (
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800">
                <div>
                  <p className="text-[10px] text-slate-500">Overall Activation</p>
                  <p className="text-lg font-bold text-blue-400">{retention.overall.activation_rate}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Overall Conversion</p>
                  <p className="text-lg font-bold text-purple-400">{retention.overall.conversion_rate}%</p>
                </div>
              </div>
            )}
          </Card>

          <Card title="Weekly Cohorts" subtitle="Retention, activation, and conversion by week">
            <DataTable
              maxHeight="max-h-[300px]"
              columns={[
                { key: 'week', label: 'Week', mono: true, className: () => 'text-slate-300' },
                { key: 'registered', label: 'Reg.', align: 'right', mono: true },
                { key: 'made_prediction', label: 'Activated', align: 'right', render: r => (
                  <span>{r.made_prediction} {r.activation_pct > 0 && <span className="text-blue-400">({r.activation_pct}%)</span>}</span>
                )},
                { key: 'returned_week1', label: 'Retained', align: 'right', render: r => (
                  <span>{r.returned_week1} {r.retention_pct > 0 && (
                    <span className={r.retention_pct >= 30 ? 'text-green-400' : r.retention_pct >= 15 ? 'text-amber-400' : 'text-red-400'}>({r.retention_pct}%)</span>
                  )}</span>
                )},
                { key: 'converted_pro', label: 'PRO', align: 'right', render: r => (
                  <span>{r.converted_pro} {r.conversion_pct > 0 && <span className="text-purple-400">({r.conversion_pct}%)</span>}</span>
                )},
              ]}
              rows={retention.cohorts || []}
            />
          </Card>
        </div>
      )}

      {/* ── Quick links ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/admin/users', label: 'Manage Users', desc: 'View & search users', badge: `${o.users.total || 0}` },
          { to: '/admin/predictions', label: 'Analytics', desc: 'Bet types & leagues', badge: `${o.predictions.accuracy || 0}%` },
          { to: '/admin/chats', label: 'Chats', desc: 'Support & AI conversations' },
          { to: '/admin/ml', label: 'ML Pipeline', desc: 'Model training & features' },
        ].map(item => (
          <Link key={item.to} to={item.to}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors group">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium group-hover:text-blue-400 transition-colors">{item.label}</p>
              {item.badge && <span className="text-[10px] text-slate-500 font-mono">{item.badge}</span>}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
