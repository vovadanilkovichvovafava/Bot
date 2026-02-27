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

export default function Dashboard() {
  const { admin } = useAuth()
  const [team, setTeam] = useState([])
  const [invites, setInvites] = useState([])
  const [newInvite, setNewInvite] = useState(null)
  const [creating, setCreating] = useState(false)
  const [overview, setOverview] = useState(null)
  const [traffic, setTraffic] = useState(null)

  useEffect(() => {
    api.getTeam().then(setTeam).catch(() => {})
    api.getInvites().then(setInvites).catch(() => {})
    api.getOverview().then(setOverview).catch(() => {})
    api.getTrafficStats().then(setTraffic).catch(() => {})
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

  const stats = [
    { label: 'Users', value: u.total ?? '—', sub: `+${u.new_today ?? 0} today`, color: 'blue' },
    { label: 'Online', value: u.online ?? '—', sub: `+${u.new_week ?? 0} this week`, color: 'green' },
    { label: 'PRO', value: u.pro ?? '—', sub: `+${u.pro_new_today ?? 0} today`, color: 'purple' },
    { label: 'AI chats', value: overview?.ai_chats_today ?? '—', sub: `${overview?.ai_chats_yesterday ?? 0} yesterday`, color: 'amber' },
  ]

  const colorMap = { blue: 'text-blue-400', green: 'text-green-400', purple: 'text-purple-400', amber: 'text-amber-400' }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold">Welcome, {admin?.name}</h1>
        <p className="text-sm text-dark-400 mt-1">
          Role: <span className="text-blue-400">{admin?.role}</span>
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <p className="text-xs text-dark-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${colorMap[s.color] || 'text-dark-100'}`}>{s.value}</p>
            <p className="text-[10px] text-dark-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Predictions Stats */}
      {p.total != null && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <p className="text-xs text-dark-400">Predictions</p>
            <p className="text-2xl font-bold mt-1">{p.total}</p>
            <p className="text-[10px] text-dark-500 mt-1">+{p.today ?? 0} today</p>
          </div>
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <p className="text-xs text-dark-400">Verified</p>
            <p className="text-2xl font-bold mt-1">{p.verified}</p>
            <p className="text-[10px] text-dark-500 mt-1">{p.correct ?? 0} correct</p>
          </div>
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <p className="text-xs text-dark-400">Accuracy</p>
            <p className={`text-2xl font-bold mt-1 ${p.accuracy >= 60 ? 'text-green-400' : p.accuracy >= 45 ? 'text-amber-400' : 'text-dark-100'}`}>
              {p.accuracy}%
            </p>
            <p className="text-[10px] text-dark-500 mt-1">{p.yesterday ?? 0} preds yesterday</p>
          </div>
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <p className="text-xs text-dark-400">Support</p>
            <p className="text-2xl font-bold mt-1">{overview?.support_sessions_today ?? 0}</p>
            <p className="text-[10px] text-dark-500 mt-1">{overview?.support_sessions ?? 0} total sessions</p>
          </div>
        </div>
      )}

      {/* Football API usage */}
      {overview?.football_api && overview.football_api.limit > 0 && (
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-dark-400">API-Football usage today</p>
            <p className="text-xs font-mono text-dark-300">{overview.football_api.used} / {overview.football_api.limit}</p>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                overview.football_api.used / overview.football_api.limit > 0.8 ? 'bg-red-500' :
                overview.football_api.used / overview.football_api.limit > 0.5 ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(overview.football_api.used / overview.football_api.limit * 100, 100)}%` }}
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
