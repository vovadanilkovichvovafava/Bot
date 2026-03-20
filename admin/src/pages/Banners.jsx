import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Banners() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getBannerClicks()
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
    return <p className="text-dark-400 text-sm py-10 text-center">Failed to load banner analytics</p>
  }

  const maxClicks = Math.max(...(data.by_banner || []).map(b => b.clicks), 1)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Banner Analytics</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">Total clicks</p>
          <p className="text-2xl font-bold mt-1">{data.total_clicks ?? 0}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">Today</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">{data.total_today ?? 0}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-xs text-dark-400">Unique banners</p>
          <p className="text-2xl font-bold mt-1 text-purple-400">{(data.by_banner || []).length}</p>
        </div>
      </div>

      {/* Clicks by banner (all time) */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
        <h2 className="text-sm font-medium mb-4">Clicks by banner (all time)</h2>
        {(data.by_banner || []).length === 0 ? (
          <p className="text-dark-500 text-xs text-center py-4">No clicks recorded yet</p>
        ) : (
          <div className="space-y-3">
            {data.by_banner.map(b => (
              <div key={b.banner}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono">{b.banner}</span>
                  <span className="text-xs text-dark-400">
                    {b.clicks} clicks / {b.unique_users} users
                  </span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.round(b.clicks / maxClicks * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* This week breakdown */}
      {(data.week_by_banner || []).length > 0 && (
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <h2 className="text-sm font-medium mb-3">Last 7 days</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700 text-dark-400 text-xs">
                  <th className="text-left px-3 py-2 font-medium">Banner</th>
                  <th className="text-right px-3 py-2 font-medium">Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {data.week_by_banner.map(b => (
                  <tr key={b.banner} className="hover:bg-dark-700/50 transition-colors">
                    <td className="px-3 py-2 font-mono text-xs">{b.banner}</td>
                    <td className="px-3 py-2 text-right text-xs font-medium">{b.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily trend (last 30 days) */}
      {(data.daily || []).length > 0 && (
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <h2 className="text-sm font-medium mb-3">Daily clicks (30 days)</h2>
          <div className="flex items-end gap-1 h-32">
            {(() => { const maxDaily = Math.max(...data.daily.map(x => x.clicks), 1); return data.daily.map(d => {
              const h = Math.max(Math.round(d.clicks / maxDaily * 100), 2)
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className="w-full bg-blue-500/70 rounded-t hover:bg-blue-400 transition-colors"
                    style={{ height: `${h}%` }}
                  />
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-dark-900 border border-dark-600 rounded px-2 py-1 text-[10px] whitespace-nowrap z-10">
                    {d.date}: {d.clicks}
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
    </div>
  )
}
