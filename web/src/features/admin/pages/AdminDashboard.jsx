import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { adminApi } from '../api'

function StatCard({ label, value, sub, color = 'blue', icon }) {
  const colors = {
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/20',
    green: 'from-green-600/20 to-green-600/5 border-green-500/20',
    purple: 'from-purple-600/20 to-purple-600/5 border-purple-500/20',
    amber: 'from-amber-600/20 to-amber-600/5 border-amber-500/20',
    cyan: 'from-cyan-600/20 to-cyan-600/5 border-cyan-500/20',
    rose: 'from-rose-600/20 to-rose-600/5 border-rose-500/20',
  }
  const textColors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
    rose: 'text-rose-400',
  }

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <span className={textColors[color]}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function MiniBar({ data, maxVal }) {
  if (!data.length) return null
  const max = maxVal || Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-px h-12">
      {data.slice(-14).map((d, i) => (
        <div
          key={i}
          className="flex-1 bg-blue-500/40 rounded-t-sm min-w-[3px] transition-all hover:bg-blue-400/60"
          style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
          title={`${d.date}: ${d.count}`}
        />
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { admin } = useAdminAuth()
  const [overview, setOverview] = useState(null)
  const [usersStats, setUsersStats] = useState(null)
  const [predStats, setPredStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminApi.getOverview().catch(() => null),
      adminApi.getUsersStats().catch(() => null),
      adminApi.getPredictionsStats().catch(() => null),
    ]).then(([ov, us, ps]) => {
      setOverview(ov)
      setUsersStats(us)
      setPredStats(ps)
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

  const o = overview || { users: {}, predictions: {}, ai_chats_today: 0, support_sessions: 0 }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back, <span className="text-slate-300">{admin?.name}</span>
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Total Users"
          value={o.users.total?.toLocaleString() || '0'}
          sub={`+${o.users.new_today || 0} today`}
          color="blue"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>}
        />
        <StatCard
          label="New This Week"
          value={o.users.new_week?.toLocaleString() || '0'}
          color="cyan"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"/></svg>}
        />
        <StatCard
          label="PRO Users"
          value={o.users.pro?.toLocaleString() || '0'}
          color="purple"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>}
        />
        <StatCard
          label="Predictions"
          value={o.predictions.total?.toLocaleString() || '0'}
          sub={`${o.predictions.accuracy || 0}% accuracy`}
          color="green"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z"/></svg>}
        />
        <StatCard
          label="AI Chats Today"
          value={o.ai_chats_today?.toLocaleString() || '0'}
          color="amber"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/></svg>}
        />
        <StatCard
          label="Support Sessions"
          value={o.support_sessions?.toLocaleString() || '0'}
          color="rose"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.712 4.33a9.027 9.027 0 011.652 1.306c.51.51.944 1.064 1.306 1.652M16.712 4.33l-3.448 4.138m3.448-4.138a9.014 9.014 0 00-9.424 0M19.67 7.288l-4.138 3.448m4.138-3.448a9.014 9.014 0 010 9.424m-4.138-5.976a3.736 3.736 0 00-.88-1.388 3.737 3.737 0 00-1.388-.88m2.268 2.268a3.765 3.765 0 010 2.528m-2.268-4.796l-3.448 4.138m3.448-4.138a3.736 3.736 0 00-5.528 0m2.28 4.138L7.288 19.67m0 0a9.024 9.024 0 01-1.652-1.306 9.027 9.027 0 01-1.306-1.652m4.138-3.448a3.765 3.765 0 010 2.528M4.33 16.712a9.014 9.014 0 010-9.424m4.138 5.976a3.765 3.765 0 01-2.528 0"/></svg>}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Registration trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">User Registrations</h3>
              <p className="text-[11px] text-slate-500">Last 14 days</p>
            </div>
            <Link to="/admin/users" className="text-[11px] text-blue-400 hover:text-blue-300">View all</Link>
          </div>
          <MiniBar data={usersStats?.daily_registrations || []} />
          {usersStats?.daily_registrations?.length > 0 && (
            <div className="flex justify-between mt-2 text-[10px] text-slate-600">
              <span>{usersStats.daily_registrations[Math.max(0, usersStats.daily_registrations.length - 14)]?.date}</span>
              <span>{usersStats.daily_registrations[usersStats.daily_registrations.length - 1]?.date}</span>
            </div>
          )}
        </div>

        {/* Predictions trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Daily Predictions</h3>
              <p className="text-[11px] text-slate-500">Last 14 days</p>
            </div>
            <Link to="/admin/predictions" className="text-[11px] text-blue-400 hover:text-blue-300">View all</Link>
          </div>
          <MiniBar data={predStats?.daily_predictions || []} />
          {predStats?.daily_predictions?.length > 0 && (
            <div className="flex justify-between mt-2 text-[10px] text-slate-600">
              <span>{predStats.daily_predictions[Math.max(0, predStats.daily_predictions.length - 14)]?.date}</span>
              <span>{predStats.daily_predictions[predStats.daily_predictions.length - 1]?.date}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top countries */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Top Countries</h3>
          <div className="space-y-2">
            {(usersStats?.by_country || []).slice(0, 6).map((c, i) => (
              <div key={c.country} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                  <span className="text-sm">{c.country || 'Unknown'}</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">{c.count}</span>
              </div>
            ))}
            {(!usersStats?.by_country?.length) && (
              <p className="text-xs text-slate-600 text-center py-4">No data</p>
            )}
          </div>
        </div>

        {/* Top bet types */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Bet Types Accuracy</h3>
          <div className="space-y-2.5">
            {(predStats?.by_bet_type || []).slice(0, 6).map(b => (
              <div key={b.bet_type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300 truncate max-w-[140px]">{b.bet_type}</span>
                  <span className="text-xs font-mono text-slate-400">{b.accuracy}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      b.accuracy >= 60 ? 'bg-green-500' : b.accuracy >= 45 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(b.accuracy, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {(!predStats?.by_bet_type?.length) && (
              <p className="text-xs text-slate-600 text-center py-4">No data</p>
            )}
          </div>
        </div>

        {/* Languages */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Languages</h3>
          <div className="space-y-2">
            {(usersStats?.by_language || []).map(l => {
              const total = (usersStats?.by_language || []).reduce((s, x) => s + x.count, 0) || 1
              const pct = Math.round(l.count / total * 100)
              return (
                <div key={l.language} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 w-6 uppercase">{l.language || '??'}</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-500 w-10 text-right">{pct}%</span>
                </div>
              )
            })}
            {(!usersStats?.by_language?.length) && (
              <p className="text-xs text-slate-600 text-center py-4">No data</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/admin/users', label: 'Manage Users', desc: 'View & search users' },
          { to: '/admin/predictions', label: 'Analytics', desc: 'Bet types & leagues' },
          { to: '/admin/support', label: 'Support Chat', desc: 'Read conversations' },
          { to: '/admin/team', label: 'Team', desc: 'Manage admin access' },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors group"
          >
            <p className="text-sm font-medium group-hover:text-blue-400 transition-colors">{item.label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
