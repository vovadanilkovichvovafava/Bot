import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

const SOURCE_COLORS = {
  prescoreai: { bg: 'bg-blue-500', text: 'text-blue-400', light: 'bg-blue-500/20' },
  prescoreai_com: { bg: 'bg-purple-500', text: 'text-purple-400', light: 'bg-purple-500/20' },
  prescore_vip: { bg: 'bg-green-500', text: 'text-green-400', light: 'bg-green-500/20' },
}

function getSourceColor(source) {
  return SOURCE_COLORS[source] || { bg: 'bg-amber-500', text: 'text-amber-400', light: 'bg-amber-500/20' }
}

/* ── Tiny bar chart ─────────────────────────────────────── */
function MiniBarChart({ data, color = 'bg-blue-500', labelKey = 'date', valueKey = 'count' }) {
  if (!data || data.length === 0) return <p className="text-xs text-dark-500 py-8 text-center">No data</p>
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1)
  return (
    <div className="flex items-end gap-[3px] h-36 mt-2">
      {data.slice(-14).map((d, i) => {
        const pct = ((d[valueKey] || 0) / max) * 100
        const label = (d[labelKey] || '').slice(5) // "MM-DD"
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-6 hidden group-hover:block bg-dark-700 text-[10px] text-dark-200 px-1.5 py-0.5 rounded whitespace-nowrap z-10">
              {d[valueKey]}
            </div>
            <div className={`w-full rounded-t ${color} transition-all`} style={{ height: `${Math.max(pct, 2)}%` }} />
            {i % 3 === 0 && <span className="text-[8px] text-dark-500 leading-none">{label}</span>}
          </div>
        )
      })}
    </div>
  )
}

/* ── Online history chart (hourly) ─────────────────────── */
function OnlineChart({ data }) {
  if (!data || data.length === 0) return <p className="text-xs text-dark-500 py-8 text-center">No data</p>
  const max = Math.max(...data.map(d => d.unique_users || 0), 1)
  return (
    <div className="flex items-end gap-[2px] h-32 mt-2">
      {data.map((d, i) => {
        const pct = ((d.unique_users || 0) / max) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-6 hidden group-hover:block bg-dark-700 text-[10px] text-dark-200 px-1.5 py-0.5 rounded whitespace-nowrap z-10">
              {d.unique_users} users
            </div>
            <div className="w-full rounded-t bg-cyan-500 transition-all" style={{ height: `${Math.max(pct, 2)}%` }} />
            {i % 4 === 0 && <span className="text-[8px] text-dark-500 leading-none">{d.hour}</span>}
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const { admin } = useAuth()
  const [team, setTeam] = useState([])
  const [invites, setInvites] = useState([])
  const [newInvite, setNewInvite] = useState(null)
  const [creating, setCreating] = useState(false)
  const [overview, setOverview] = useState(null)
  const [overviewError, setOverviewError] = useState(null)
  const [traffic, setTraffic] = useState(null)
  const [usersStats, setUsersStats] = useState(null)
  const [onlineHistory, setOnlineHistory] = useState(null)
  const [predsStats, setPredsStats] = useState(null)

  useEffect(() => {
    api.getTeam().then(setTeam).catch(() => {})
    api.getInvites().then(setInvites).catch(() => {})
    api.getOverview()
      .then(data => { setOverview(data); setOverviewError(null) })
      .catch(err => { setOverviewError(err.message); console.error('Overview failed:', err) })
    api.getTrafficStats().then(setTraffic).catch(() => {})
    api.getUsersStats().then(setUsersStats).catch(() => {})
    api.getOnlineHistory().then(setOnlineHistory).catch(() => {})
    api.getPredictionsStats().then(setPredsStats).catch(() => {})
  }, [])

  const handleCreateInvite = async (role) => {
    setCreating(true)
    try {
      const inv = await api.createInvite(role, 72)
      setNewInvite(inv)
      api.getInvites().then(setInvites).catch(() => {})
    } catch (err) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  const u = overview?.users || {}
  const p = overview?.predictions || {}
  const fApi = overview?.football_api || {}

  const stats = [
    {
      label: 'Total Users', value: u.total ?? 0,
      sub: `+${u.new_today ?? 0} today`,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 015 17.128c0-2.493 1.834-4.615 4.347-5.138a6.5 6.5 0 015.306 0" /></svg>,
      gradient: 'from-blue-500/20 to-blue-600/10', iconColor: 'text-blue-400',
    },
    {
      label: 'PRO Users', value: u.pro ?? 0,
      sub: u.pro_new_today ? `+${u.pro_new_today} today` : 'No new today',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
      gradient: 'from-purple-500/20 to-purple-600/10', iconColor: 'text-purple-400',
    },
    {
      label: 'Online Users', value: u.online ?? 0,
      sub: 'Active last 15 min',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" /></svg>,
      gradient: 'from-green-500/20 to-green-600/10', iconColor: 'text-green-400',
    },
    {
      label: 'Predictions', value: p.total ?? 0,
      sub: `+${p.today ?? 0} today · ${p.accuracy ?? 0}% acc`,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>,
      gradient: 'from-amber-500/20 to-amber-600/10', iconColor: 'text-amber-400',
      badge: p.today > 0 ? p.today : null,
    },
    {
      label: 'Support Sessions', value: overview?.support_sessions_today ?? 0,
      sub: overview?.support_sessions ? `${overview.support_sessions} total` : 'None today',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
      gradient: 'from-teal-500/20 to-teal-600/10', iconColor: 'text-teal-400',
    },
    {
      label: 'Football API', value: fApi.used ?? 0,
      sub: fApi.limit > 0 ? `${fApi.used}/${fApi.limit} requests` : 'No key set',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
      gradient: 'from-rose-500/20 to-rose-600/10', iconColor: 'text-rose-400',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-dark-400 mt-1">Welcome back, {admin?.name}</p>
      </div>

      {/* Error banner */}
      {overviewError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <p className="text-xs text-red-400">Overview API error: {overviewError}</p>
        </div>
      )}

      {/* 6 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.gradient} rounded-xl p-4 border border-dark-700 relative overflow-hidden`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-dark-400 font-medium">{s.label}</p>
              <span className={s.iconColor}>{s.icon}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-[10px] text-dark-500 mt-1">{s.sub}</p>
            {s.badge && (
              <span className="absolute top-3 right-8 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {s.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Registrations */}
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold">User Registrations</h3>
              <p className="text-[10px] text-dark-500">Last 14 days</p>
            </div>
            <a href="/users" className="text-xs text-blue-400 hover:underline">View all</a>
          </div>
          <MiniBarChart
            data={usersStats?.daily_registrations}
            color="bg-blue-500"
          />
        </div>

        {/* Daily Predictions */}
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold">Daily Predictions</h3>
              <p className="text-[10px] text-dark-500">Last 14 days</p>
            </div>
            <a href="/" className="text-xs text-blue-400 hover:underline">Details</a>
          </div>
          <MiniBarChart
            data={predsStats?.daily_predictions}
            color="bg-emerald-500"
          />
        </div>
      </div>

      {/* Online Users — Last 24h */}
      {onlineHistory && (
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold">Online Users — Last 24h</h3>
              <p className="text-[10px] text-dark-500">
                Peak: <span className="text-blue-400 font-medium">{onlineHistory.peak_users}</span>
                {onlineHistory.peak_hour && <> at {onlineHistory.peak_hour}</>}
                {' · '}Now: <span className="text-green-400 font-medium">{onlineHistory.current_online}</span>
              </p>
            </div>
          </div>
          <OnlineChart data={onlineHistory.hours} />
        </div>
      )}

      {/* Football API usage bar */}
      {fApi.limit > 0 && (
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-dark-400">API-Football usage today</p>
            <p className="text-xs font-mono text-dark-300">{fApi.used} / {fApi.limit}</p>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                fApi.used / fApi.limit > 0.8 ? 'bg-red-500' :
                fApi.used / fApi.limit > 0.5 ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(fApi.used / fApi.limit * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Traffic Sources Quick View */}
      {traffic?.by_source && traffic.by_source.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-dark-300 mb-3">Traffic Sources</h2>
          <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700 text-dark-400 text-xs">
                  <th className="text-left px-4 py-3 font-medium">Source</th>
                  <th className="text-right px-4 py-3 font-medium">Users</th>
                  <th className="text-right px-4 py-3 font-medium">PRO</th>
                  <th className="text-right px-4 py-3 font-medium">Conv %</th>
                  <th className="text-right px-4 py-3 font-medium">Activated</th>
                  <th className="text-right px-4 py-3 font-medium">Act %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {traffic.by_source.map(s => {
                  const c = getSourceColor(s.source)
                  return (
                    <tr key={s.source} className="hover:bg-dark-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${c.bg}`} />
                          <span className="font-medium">{s.source}</span>
                          <span className="text-[10px] text-dark-500">{s.percent}%</span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 font-mono">{s.total}</td>
                      <td className="text-right px-4 py-3 font-mono">{s.pro}</td>
                      <td className="text-right px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          s.conversion_pct >= 5 ? 'bg-green-500/20 text-green-400' :
                          s.conversion_pct >= 2 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-dark-600 text-dark-300'
                        }`}>
                          {s.conversion_pct}%
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 font-mono">{s.activated}</td>
                      <td className="text-right px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          s.activation_pct >= 30 ? 'bg-green-500/20 text-green-400' :
                          s.activation_pct >= 15 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-dark-600 text-dark-300'
                        }`}>
                          {s.activation_pct}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* New this week by source */}
          {traffic.new_week && traffic.new_week.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {traffic.new_week.map(r => {
                const c = getSourceColor(r.source)
                return (
                  <div key={r.source} className="bg-dark-800 rounded-xl p-3 border border-dark-700">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${c.bg}`} />
                      <span className="text-[10px] text-dark-400 uppercase tracking-wide">{r.source}</span>
                    </div>
                    <p className="text-lg font-bold">+{r.count}</p>
                    <p className="text-[10px] text-dark-500">this week</p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Team */}
      <section>
        <h2 className="text-sm font-semibold text-dark-300 mb-3">Team</h2>
        <div className="bg-dark-800 rounded-xl border border-dark-700 divide-y divide-dark-700">
          {team.map(a => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-dark-500">{a.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  a.role === 'owner' ? 'bg-amber-500/20 text-amber-400' :
                  a.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-dark-600 text-dark-300'
                }`}>
                  {a.role}
                </span>
                {!a.is_active && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                    inactive
                  </span>
                )}
              </div>
            </div>
          ))}
          {team.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-dark-500">Loading...</p>
          )}
        </div>
      </section>

      {/* Invites */}
      {(admin?.role === 'owner' || admin?.role === 'admin') && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-dark-300">Invite Codes</h2>
            <div className="flex gap-2">
              {admin?.role === 'owner' && (
                <button
                  onClick={() => handleCreateInvite('admin')}
                  disabled={creating}
                  className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Admin
                </button>
              )}
              <button
                onClick={() => handleCreateInvite('viewer')}
                disabled={creating}
                className="text-xs bg-dark-700 hover:bg-dark-600 disabled:opacity-50 text-dark-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                + Viewer
              </button>
            </div>
          </div>

          {newInvite && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-3">
              <p className="text-xs text-green-400 mb-1">New invite created! Share this code:</p>
              <p className="font-mono text-lg text-green-300 select-all">{newInvite.code}</p>
              <p className="text-xs text-dark-400 mt-2">
                Role: {newInvite.role} &middot; Expires: {new Date(newInvite.expires_at).toLocaleString()}
              </p>
            </div>
          )}

          <div className="bg-dark-800 rounded-xl border border-dark-700 divide-y divide-dark-700">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-mono text-xs text-dark-200">{inv.code}</p>
                  <p className="text-[10px] text-dark-500 mt-0.5">
                    {inv.role} &middot; expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  inv.used_by_id ? 'bg-dark-600 text-dark-400' :
                  inv.is_valid ? 'bg-green-500/20 text-green-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {inv.used_by_id ? 'used' : inv.is_valid ? 'active' : 'expired'}
                </span>
              </div>
            ))}
            {invites.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-dark-500">No invites yet</p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
