import { useState, useEffect } from 'react'
import { adminApi } from '../api'

export default function AdminML() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getMLStats()
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

  const activeModel = (stats?.models || []).find(m => m.is_active)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">ML Pipeline</h1>
        <p className="text-sm text-slate-500 mt-1">Model versions, training logs, and performance</p>
      </div>

      {/* Active model highlight */}
      {activeModel && (
        <div className="bg-gradient-to-br from-green-600/10 to-green-600/5 border border-green-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <h3 className="text-sm font-semibold text-green-400">Active Model</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Name</p>
              <p className="text-sm font-mono font-bold mt-0.5">{activeModel.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Type</p>
              <p className="text-sm font-mono mt-0.5">{activeModel.type}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Accuracy</p>
              <p className="text-sm font-mono font-bold mt-0.5 text-green-400">
                {activeModel.accuracy ? `${(activeModel.accuracy * 100).toFixed(1)}%` : '\u2014'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Training Samples</p>
              <p className="text-sm font-mono mt-0.5">{activeModel.training_samples?.toLocaleString() || '\u2014'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Models table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold">Model History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs">
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-3 py-3 font-medium">Type</th>
                <th className="text-center px-3 py-3 font-medium">Version</th>
                <th className="text-right px-3 py-3 font-medium">Accuracy</th>
                <th className="text-right px-3 py-3 font-medium">F1</th>
                <th className="text-right px-3 py-3 font-medium">Samples</th>
                <th className="text-center px-3 py-3 font-medium">Status</th>
                <th className="text-right px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {(stats?.models || []).map(m => (
                <tr key={m.id} className={`hover:bg-slate-800/30 transition-colors ${m.is_active ? 'bg-green-500/5' : ''}`}>
                  <td className="px-5 py-3 font-mono text-xs">{m.name}</td>
                  <td className="px-3 py-3 text-xs text-slate-400">{m.type}</td>
                  <td className="px-3 py-3 text-center text-xs font-mono">v{m.version}</td>
                  <td className="px-3 py-3 text-right text-xs font-mono">
                    {m.accuracy ? `${(m.accuracy * 100).toFixed(1)}%` : '\u2014'}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-mono text-slate-400">
                    {m.f1_score ? m.f1_score.toFixed(3) : '\u2014'}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-mono text-slate-400">
                    {m.training_samples?.toLocaleString() || '\u2014'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {m.is_active ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">active</span>
                    ) : (
                      <span className="text-[10px] text-slate-600">inactive</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-[11px] text-slate-500">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString() : '\u2014'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!stats?.models?.length) && (
            <p className="text-center text-sm text-slate-600 py-8">No models trained yet</p>
          )}
        </div>
      </div>

      {/* Learning log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold">Learning Log</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Recent pipeline events</p>
        </div>
        <div className="divide-y divide-slate-800/50 max-h-[400px] overflow-y-auto">
          {(stats?.learning_log || []).map((l, i) => {
            const colors = {
              train_start: 'bg-blue-500/20 text-blue-400',
              train_complete: 'bg-green-500/20 text-green-400',
              predict: 'bg-purple-500/20 text-purple-400',
              verify: 'bg-amber-500/20 text-amber-400',
              data_collect: 'bg-cyan-500/20 text-cyan-400',
              elo_update: 'bg-rose-500/20 text-rose-400',
            }
            const color = colors[l.event] || 'bg-slate-700 text-slate-400'
            return (
              <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-800/30 transition-colors">
                <span className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap mt-0.5 ${color}`}>
                  {l.event}
                </span>
                <p className="text-xs text-slate-400 flex-1 truncate font-mono">
                  {typeof l.details === 'string' ? l.details : JSON.stringify(l.details)?.slice(0, 120)}
                </p>
                <span className="text-[10px] text-slate-600 whitespace-nowrap">
                  {l.created_at ? new Date(l.created_at).toLocaleString() : ''}
                </span>
              </div>
            )
          })}
          {(!stats?.learning_log?.length) && (
            <p className="text-center text-sm text-slate-600 py-8">No learning events yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
