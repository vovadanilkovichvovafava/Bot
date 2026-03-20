import { useState, useEffect } from 'react'
import { api } from '../api'

const FLAG = {
  IT: '\u{1F1EE}\u{1F1F9}', PL: '\u{1F1F5}\u{1F1F1}', DE: '\u{1F1E9}\u{1F1EA}', FR: '\u{1F1EB}\u{1F1F7}',
  ES: '\u{1F1EA}\u{1F1F8}', GB: '\u{1F1EC}\u{1F1E7}', PT: '\u{1F1F5}\u{1F1F9}', UA: '\u{1F1FA}\u{1F1E6}',
  RU: '\u{1F1F7}\u{1F1FA}', BY: '\u{1F1E7}\u{1F1FE}', KZ: '\u{1F1F0}\u{1F1FF}', AE: '\u{1F1E6}\u{1F1EA}',
  IN: '\u{1F1EE}\u{1F1F3}', BR: '\u{1F1E7}\u{1F1F7}',
}

export default function Finance() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getFinanceStats()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-dark-400 text-sm py-10 text-center">Failed to load finance data</p>
  }

  const o = data.overview
  const f = data.funnel

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Finance</h1>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">Total Revenue</p>
          <p className="text-2xl font-bold mt-1 text-green-400">${o.total_revenue}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">This Month</p>
          <p className="text-2xl font-bold mt-1">${o.revenue_month}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">This Week</p>
          <p className="text-2xl font-bold mt-1">${o.revenue_week}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">Today</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">${o.revenue_today}</p>
        </div>
      </div>

      {/* Deposit + LTV stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">Total Deposits</p>
          <p className="text-xl font-bold mt-1">{o.total_deposits}</p>
          <p className="text-[10px] text-dark-500 mt-1">{o.deposits_today} today</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">Avg Deposit</p>
          <p className="text-xl font-bold mt-1">${o.avg_deposit}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">LTV (per depositor)</p>
          <p className="text-xl font-bold mt-1 text-amber-400">${data.ltv.per_depositor}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">LTV (per user)</p>
          <p className="text-xl font-bold mt-1">${data.ltv.per_user}</p>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
        <h2 className="text-sm font-medium mb-3">Conversion Funnel</h2>
        <div className="space-y-2">
          {[
            { label: 'Registered', value: f.total_users, pct: 100, color: 'bg-blue-500' },
            { label: 'Active (made prediction)', value: f.active_users, pct: f.activation_rate, color: 'bg-cyan-500' },
            { label: 'PRO subscribers', value: f.pro_users, pct: f.pro_rate, color: 'bg-purple-500' },
            { label: 'Deposited', value: f.depositing_users, pct: f.deposit_rate, color: 'bg-green-500' },
          ].map(s => (
            <div key={s.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-dark-300">{s.label}</span>
                <span className="text-xs text-dark-400">{s.value} ({s.pct}%)</span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2">
                <div className={`${s.color} h-2 rounded-full transition-all`} style={{ width: `${Math.max(s.pct, 1)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Revenue by source */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <h2 className="text-sm font-medium mb-3">Revenue by Source</h2>
          {(data.by_source || []).length === 0 ? (
            <p className="text-dark-500 text-xs text-center py-4">No data</p>
          ) : (
            <div className="space-y-2">
              {data.by_source.map(s => (
                <div key={s.source} className="flex items-center justify-between text-xs">
                  <span className="text-dark-300">{s.source}</span>
                  <div className="text-right">
                    <span className="font-medium text-green-400">${s.revenue}</span>
                    <span className="text-dark-500 ml-2">{s.deposits} dep / {s.users} users</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue by country */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <h2 className="text-sm font-medium mb-3">Revenue by Country</h2>
          {(data.by_country || []).length === 0 ? (
            <p className="text-dark-500 text-xs text-center py-4">No data</p>
          ) : (
            <div className="space-y-2">
              {data.by_country.map(c => (
                <div key={c.country} className="flex items-center justify-between text-xs">
                  <span className="text-dark-300">{FLAG[c.country] || ''} {c.country}</span>
                  <div className="text-right">
                    <span className="font-medium text-green-400">${c.revenue}</span>
                    <span className="text-dark-500 ml-2">{c.users} users</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily revenue chart */}
      {(data.daily || []).length > 0 && (
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <h2 className="text-sm font-medium mb-3">Daily Revenue (30 days)</h2>
          <div className="flex items-end gap-1 h-32">
            {(() => { const maxRev = Math.max(...data.daily.map(x => x.revenue), 1); return data.daily.map(d => {
              const h = Math.max(Math.round(d.revenue / maxRev * 100), 2)
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className="w-full bg-green-500/70 rounded-t hover:bg-green-400 transition-colors"
                    style={{ height: `${h}%` }}
                  />
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-dark-900 border border-dark-600 rounded px-2 py-1 text-[10px] whitespace-nowrap z-10">
                    {d.date}: ${d.revenue} ({d.deposits} dep)
                  </div>
                </div>
              )
            }) })()}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-dark-500">{data.daily[0]?.date}</span>
            <span className="text-[10px] text-dark-500">{data.daily[data.daily.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Recent deposits */}
      {(data.recent_deposits || []).length > 0 && (
        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-x-auto">
          <div className="px-4 py-3 border-b border-dark-700">
            <h2 className="text-sm font-medium">Recent Deposits</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700 text-dark-400 text-xs">
                <th className="text-left px-4 py-2 font-medium">Time</th>
                <th className="text-left px-4 py-2 font-medium">User</th>
                <th className="text-center px-4 py-2 font-medium">Country</th>
                <th className="text-right px-4 py-2 font-medium">Amount</th>
                <th className="text-center px-4 py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {data.recent_deposits.map((d, i) => (
                <tr key={i} className="hover:bg-dark-700/50 transition-colors">
                  <td className="px-4 py-2 text-xs text-dark-400 whitespace-nowrap">
                    {d.created_at ? new Date(d.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-xs">{d.username || d.user_id || '—'}</p>
                    {d.user_db_id && <p className="text-[10px] text-dark-500">#{d.user_db_id}</p>}
                  </td>
                  <td className="px-4 py-2 text-center text-xs">
                    {FLAG[d.country] || d.country || '—'}
                  </td>
                  <td className="text-right px-4 py-2 font-mono text-xs text-green-400 font-medium">
                    {d.amount ? `$${d.amount}` : '—'} {d.currency && d.currency !== 'USD' ? d.currency : ''}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-dark-600 text-dark-300">
                      {d.source || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
