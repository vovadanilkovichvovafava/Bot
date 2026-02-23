import { useState, useEffect } from 'react'
import { adminApi } from '../api'

function MiniBar({ data }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-[2px] h-16">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 bg-blue-500/40 rounded-t-sm min-w-[2px] hover:bg-blue-400/60 transition-colors"
          style={{ height: `${Math.max((d.count / max) * 100, 3)}%` }}
          title={`${d.date}: ${d.count}`}
        />
      ))}
    </div>
  )
}

export default function AdminUsers() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getUsersStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-slate-500 mt-1">User analytics and recent registrations</p>
      </div>

      {/* Registration chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-1">Registration Trend</h3>
        <p className="text-[11px] text-slate-500 mb-4">Last 30 days</p>
        <MiniBar data={stats?.daily_registrations || []} />
        {stats?.daily_registrations?.length > 0 && (
          <div className="flex justify-between mt-2 text-[10px] text-slate-600">
            <span>{stats.daily_registrations[0]?.date}</span>
            <span>{stats.daily_registrations[stats.daily_registrations.length - 1]?.date}</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Countries */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">By Country</h3>
          <div className="space-y-3">
            {(stats?.by_country || []).map((c, i) => {
              const total = (stats?.by_country || []).reduce((s, x) => s + x.count, 0) || 1
              const pct = Math.round(c.count / total * 100)
              return (
                <div key={c.country}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-600 w-4">{i + 1}</span>
                      <span className="text-sm">{c.country || 'Unknown'}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{c.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden ml-6">
                    <div className="h-full bg-blue-500/50 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Languages */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">By Language</h3>
          <div className="space-y-3">
            {(stats?.by_language || []).map(l => {
              const total = (stats?.by_language || []).reduce((s, x) => s + x.count, 0) || 1
              const pct = Math.round(l.count / total * 100)
              return (
                <div key={l.language}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm uppercase font-mono">{l.language || '??'}</span>
                    <span className="text-xs text-slate-400 font-mono">{l.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500/50 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              Referred users: <span className="text-slate-300 font-mono">{stats?.total_referred || 0}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Recent users */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold">Recent Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs">
                <th className="text-left px-5 py-3 font-medium">User</th>
                <th className="text-left px-3 py-3 font-medium">Country</th>
                <th className="text-left px-3 py-3 font-medium">Lang</th>
                <th className="text-center px-3 py-3 font-medium">PRO</th>
                <th className="text-right px-3 py-3 font-medium">Predictions</th>
                <th className="text-right px-5 py-3 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {(stats?.recent_users || []).map(u => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-mono text-xs text-slate-300">{u.public_id}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{u.phone || u.email}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-400">{u.country || '\u2014'}</td>
                  <td className="px-3 py-3 text-xs text-slate-400 uppercase font-mono">{u.language}</td>
                  <td className="px-3 py-3 text-center">
                    {u.is_premium ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">PRO</span>
                    ) : (
                      <span className="text-[10px] text-slate-600">Free</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-mono text-slate-400">
                    {u.total_predictions}
                    {u.correct_predictions > 0 && (
                      <span className="text-green-500 ml-1">
                        ({Math.round(u.correct_predictions / u.total_predictions * 100)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-[11px] text-slate-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '\u2014'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!stats?.recent_users?.length) && (
            <p className="text-center text-sm text-slate-600 py-8">No users yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
