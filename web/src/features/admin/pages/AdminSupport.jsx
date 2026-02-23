import { useState, useEffect } from 'react'
import { adminApi } from '../api'

export default function AdminSupport() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getSupportStats()
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
        <h1 className="text-xl font-semibold">Support</h1>
        <p className="text-sm text-slate-500 mt-1">Chat analytics and session history</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Messages', value: stats?.total_messages?.toLocaleString() || '0' },
          { label: 'Sessions', value: stats?.total_sessions?.toLocaleString() || '0' },
          { label: 'Unique Users', value: stats?.unique_users?.toLocaleString() || '0' },
          { label: 'Today', value: stats?.today_messages?.toLocaleString() || '0' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold mt-1 text-slate-100">{s.value}</p>
          </div>
        ))}
      </div>

      {/* By locale */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Messages by Language</h3>
          <div className="space-y-3">
            {(stats?.by_locale || []).map(l => {
              const total = (stats?.by_locale || []).reduce((s, x) => s + x.count, 0) || 1
              const pct = Math.round(l.count / total * 100)
              return (
                <div key={l.locale}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm uppercase font-mono">{l.locale || '??'}</span>
                    <span className="text-xs text-slate-400 font-mono">{l.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500/50 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {(!stats?.by_locale?.length) && (
              <p className="text-xs text-slate-600 text-center py-4">No data</p>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <span className="text-xs text-slate-400">Avg messages / session</span>
              <span className="text-sm font-mono font-bold text-slate-200">
                {stats?.total_sessions
                  ? Math.round(stats.total_messages / stats.total_sessions * 10) / 10
                  : 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <span className="text-xs text-slate-400">Avg sessions / user</span>
              <span className="text-sm font-mono font-bold text-slate-200">
                {stats?.unique_users
                  ? Math.round(stats.total_sessions / stats.unique_users * 10) / 10
                  : 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <span className="text-xs text-slate-400">Support adoption</span>
              <span className="text-sm font-mono font-bold text-slate-200">
                {stats?.unique_users || 0} users
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold">Recent Sessions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs">
                <th className="text-left px-5 py-3 font-medium">Session</th>
                <th className="text-left px-3 py-3 font-medium">User ID</th>
                <th className="text-center px-3 py-3 font-medium">Locale</th>
                <th className="text-center px-3 py-3 font-medium">PRO</th>
                <th className="text-right px-3 py-3 font-medium">Messages</th>
                <th className="text-right px-5 py-3 font-medium">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {(stats?.recent_sessions || []).map(s => (
                <tr key={s.session_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-mono text-[11px] text-slate-400 truncate max-w-[140px]">{s.session_id}</p>
                  </td>
                  <td className="px-3 py-3 text-xs font-mono text-slate-400">{s.user_id}</td>
                  <td className="px-3 py-3 text-center text-xs uppercase font-mono text-slate-400">{s.locale}</td>
                  <td className="px-3 py-3 text-center">
                    {s.was_pro ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">PRO</span>
                    ) : (
                      <span className="text-[10px] text-slate-600">Free</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-mono text-slate-300">{s.messages}</td>
                  <td className="px-5 py-3 text-right text-[11px] text-slate-500">
                    {s.started ? new Date(s.started).toLocaleString() : '\u2014'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!stats?.recent_sessions?.length) && (
            <p className="text-center text-sm text-slate-600 py-8">No support sessions yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
