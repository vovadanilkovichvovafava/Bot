import { useState, useEffect } from 'react'
import { adminApi } from '../api'

function FeatureImportanceChart({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.importance))

  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={d.feature} className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 w-4 text-right shrink-0">{i + 1}</span>
          <span className="text-[11px] text-slate-300 w-40 truncate shrink-0 font-mono" title={d.feature}>
            {d.feature}
          </span>
          <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500/60 to-cyan-500/60 rounded transition-all"
              style={{ width: `${Math.max((d.importance / max) * 100, 1)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono w-12 text-right shrink-0">
            {(d.importance * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

function ModelComparisonChart({ models }) {
  // Only show models with accuracy data
  const valid = models.filter(m => m.accuracy != null).slice(0, 10).reverse()
  if (!valid.length) return null
  const maxAcc = Math.max(...valid.map(m => m.accuracy), 0.01)

  return (
    <div>
      <div className="flex items-end gap-1.5 h-36 border-l border-b border-slate-700/50 pl-1 pb-1">
        {valid.map((m, i) => {
          const pct = (m.accuracy / maxAcc) * 100
          return (
            <div key={m.id} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
              <span className="text-[8px] text-slate-500 font-mono">{(m.accuracy * 100).toFixed(0)}%</span>
              <div className="w-full relative group">
                <div
                  className={`w-full rounded-t transition-all ${m.is_active ? 'bg-green-500/60' : 'bg-slate-600/40'}`}
                  style={{ height: `${Math.max(pct, 3)}%`, minHeight: '4px' }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-[8px] text-slate-200 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {m.name} v{m.version}
                  {m.f1_score != null && ` F1:${m.f1_score.toFixed(2)}`}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex mt-1 pl-1">
        {valid.map(m => (
          <span key={m.id} className="flex-1 text-center text-[7px] text-slate-600 font-mono truncate">
            v{m.version}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-green-500/60" />
          <span className="text-[10px] text-slate-500">Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-slate-600/40" />
          <span className="text-[10px] text-slate-500">Previous</span>
        </div>
      </div>
    </div>
  )
}

export default function AdminML() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [training, setTraining] = useState(false)
  const [trainResult, setTrainResult] = useState(null)

  const reload = () => {
    adminApi.getMLStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  const startTraining = async () => {
    setTraining(true)
    setTrainResult(null)
    try {
      const result = await adminApi.triggerTraining()
      if (result.status === 'error') {
        setTrainResult({ ok: false, message: result.message || 'Training failed' })
        setTraining(false)
        return
      }
      setTrainResult({ ok: true, message: result.message || 'Training started' })
      // Auto-poll for results every 8s for 2 minutes
      let polls = 0
      const interval = setInterval(() => {
        polls++
        reload()
        if (polls >= 15) clearInterval(interval)
      }, 8000)
      setTimeout(() => { setTraining(false); clearInterval(interval) }, 8000)
    } catch (e) {
      setTrainResult({ ok: false, message: e.message || 'Training failed' })
      setTraining(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const activeModel = (stats?.models || []).find(m => m.is_active)
  const td = stats?.training_data || {}
  const ps = stats?.pipeline_status || {}

  // Helper: format relative time
  const timeAgo = (isoStr) => {
    if (!isoStr) return 'never'
    const diff = Date.now() - new Date(isoStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">ML Pipeline</h1>
        <p className="text-sm text-slate-500 mt-1">Model versions, training data, feature importance, and performance</p>
      </div>

      {/* Pipeline Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2 h-2 rounded-full ${ps.has_active_model ? 'bg-green-400 animate-pulse' : ps.training_possible ? 'bg-yellow-400 animate-pulse' : 'bg-slate-600'}`} />
          <h3 className="text-sm font-semibold">Pipeline Status</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded ${ps.has_active_model ? 'bg-green-500/20 text-green-400' : ps.training_possible ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'}`}>
            {ps.has_active_model ? 'Active' : ps.training_possible ? 'Ready to train' : 'Collecting data'}
          </span>
        </div>

        {/* Steps indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Data Collection', ok: ps.data_ready, detail: ps.last_events?.data_collect ? timeAgo(ps.last_events.data_collect) : 'waiting' },
            { label: 'Results Verified', ok: ps.has_verified, detail: td.verified_matches ? `${td.verified_matches} matches` : 'waiting' },
            { label: 'Feature Enrichment', ok: ps.has_enriched, detail: ps.pending_enrichment > 0 ? `${ps.pending_enrichment} pending` : td.enriched_matches ? `${td.enriched_matches} ready` : 'waiting' },
            { label: 'Model Training', ok: ps.has_active_model, detail: ps.last_events?.train_complete ? timeAgo(ps.last_events.train_complete) : td.enriched_matches >= 50 ? 'scheduled' : `need ${50 - (td.enriched_matches || 0)} more` },
            { label: 'Predictions Active', ok: ps.has_active_model, detail: ps.has_active_model ? 'online' : 'waiting for model' },
          ].map((step, i) => (
            <div key={step.label} className={`rounded-lg p-3 border ${step.ok ? 'border-green-500/20 bg-green-500/5' : 'border-slate-700 bg-slate-800/30'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-xs ${step.ok ? 'text-green-400' : 'text-slate-500'}`}>
                  {step.ok ? '\u2713' : '\u25CB'}
                </span>
                <span className="text-[10px] text-slate-400">{step.label}</span>
              </div>
              <p className={`text-xs font-mono ${step.ok ? 'text-green-300' : 'text-slate-500'}`}>{step.detail}</p>
            </div>
          ))}
        </div>

        {/* Unverified info */}
        {ps.unverified_matches > 0 && (
          <p className="text-[10px] text-slate-500 mt-3">
            {ps.unverified_matches} match{ps.unverified_matches !== 1 ? 'es' : ''} awaiting final results (scheduled/live)
          </p>
        )}

        {/* Train button */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-800">
          <button
            onClick={startTraining}
            disabled={training || !ps.training_possible}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {training ? 'Starting...' : 'Train Now'}
          </button>
          <button
            onClick={reload}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg font-medium transition-colors"
          >
            Refresh
          </button>
          {trainResult && (
            <span className={`text-xs ${trainResult.ok ? 'text-green-400' : 'text-red-400'}`}>
              {trainResult.message}
            </span>
          )}
        </div>
      </div>

      {/* Active model highlight */}
      {activeModel && (
        <div className="bg-gradient-to-br from-green-600/10 to-green-600/5 border border-green-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <h3 className="text-sm font-semibold text-green-400">Active Model</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
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
              <p className="text-[10px] text-slate-500 uppercase">F1 Score</p>
              <p className="text-sm font-mono mt-0.5">
                {activeModel.f1_score ? activeModel.f1_score.toFixed(3) : '\u2014'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Training Samples</p>
              <p className="text-sm font-mono mt-0.5">{activeModel.training_samples?.toLocaleString() || '\u2014'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Training Time</p>
              <p className="text-sm font-mono mt-0.5">
                {activeModel.training_duration_sec ? `${activeModel.training_duration_sec.toFixed(0)}s` : '\u2014'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Training Data Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Matches', value: td.total_matches?.toLocaleString() || '0', color: 'text-slate-100', sub: null },
          { label: 'Awaiting Results', value: ps.unverified_matches?.toLocaleString() || '0', color: 'text-amber-400', sub: 'scheduled/live' },
          { label: 'Verified', value: td.verified_matches?.toLocaleString() || '0', color: 'text-blue-400', sub: 'with final score' },
          { label: 'Enriched', value: td.enriched_matches?.toLocaleString() || '0', color: 'text-green-400', sub: ps.pending_enrichment > 0 ? `${ps.pending_enrichment} pending` : 'Elo + features' },
          { label: 'Ready for Training', value: td.enriched_matches?.toLocaleString() || '0', color: 'text-purple-400', sub: td.enriched_matches >= 50 ? 'min. 50 reached' : `need ${50 - (td.enriched_matches || 0)} more` },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-[10px] text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            {s.sub && <p className="text-[10px] text-slate-600 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Feature Importance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-1">Feature Importance</h3>
          <p className="text-[11px] text-slate-500 mb-4">Top features from active model</p>
          {stats?.feature_importance ? (
            <FeatureImportanceChart data={stats.feature_importance} />
          ) : (
            <p className="text-xs text-slate-600 text-center py-8">No feature importance data available yet</p>
          )}
        </div>

        {/* Model Comparison */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-1">Model Accuracy History</h3>
          <p className="text-[11px] text-slate-500 mb-4">Accuracy across model versions</p>
          <ModelComparisonChart models={stats?.models || []} />
          {!stats?.models?.filter(m => m.accuracy != null).length && (
            <p className="text-xs text-slate-600 text-center py-8">No trained models yet</p>
          )}
        </div>
      </div>

      {/* Training data by league */}
      {td.by_league?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Training Data by League</h3>
          <div className="space-y-2.5">
            {td.by_league.map((l, i) => {
              const maxCount = td.by_league[0]?.count || 1
              return (
                <div key={l.league}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-600 w-4">{i + 1}</span>
                      <span className="text-xs text-slate-300">{l.league}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{l.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden ml-6">
                    <div className="h-full bg-cyan-500/50 rounded-full" style={{ width: `${(l.count / maxCount) * 100}%` }} />
                  </div>
                </div>
              )
            })}
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
                <th className="text-right px-3 py-3 font-medium">Brier</th>
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
                    {m.brier_score ? m.brier_score.toFixed(3) : '\u2014'}
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
              train_error: 'bg-red-500/20 text-red-400',
              predict: 'bg-purple-500/20 text-purple-400',
              verify: 'bg-amber-500/20 text-amber-400',
              data_collect: 'bg-cyan-500/20 text-cyan-400',
              elo_update: 'bg-rose-500/20 text-rose-400',
            }
            const color = colors[l.event] || 'bg-slate-700 text-slate-400'

            // Parse details for better display
            let parsed = null
            try {
              parsed = typeof l.details === 'string' ? JSON.parse(l.details) : l.details
            } catch { /* ignore */ }

            // Format data_collect events nicely
            const formatDetails = () => {
              if (!parsed) return typeof l.details === 'string' ? l.details : JSON.stringify(l.details)?.slice(0, 120)

              if (l.event === 'data_collect') {
                const parts = []
                if (parsed.date) parts.push(parsed.date)
                // Support both old format (collected) and new format (new/updated)
                if (parsed.new !== undefined) {
                  parts.push(`+${parsed.new} new`)
                  if (parsed.updated > 0) parts.push(`${parsed.updated} verified`)
                  if (parsed.unchanged > 0) parts.push(`${parsed.unchanged} unchanged`)
                } else if (parsed.collected !== undefined) {
                  parts.push(`+${parsed.collected} new`)
                }
                const total = parsed.total || parsed.total_available
                if (total) parts.push(`/ ${total} total`)
                return parts.join(' \u00b7 ')
              }

              if (l.event === 'train_complete') {
                const parts = []
                if (parsed.model) parts.push(parsed.model)
                if (parsed.accuracy) parts.push(`acc: ${(parsed.accuracy * 100).toFixed(1)}%`)
                if (parsed.samples) parts.push(`${parsed.samples} samples`)
                if (parsed.duration) parts.push(`${parsed.duration}s`)
                return parts.join(' \u00b7 ') || JSON.stringify(parsed).slice(0, 120)
              }

              if (l.event === 'train_error') {
                return parsed.error || JSON.stringify(parsed).slice(0, 200)
              }

              if (l.event === 'elo_update') {
                const parts = []
                if (parsed.matches) parts.push(`${parsed.matches} matches`)
                if (parsed.teams) parts.push(`${parsed.teams} teams`)
                return parts.join(' \u00b7 ') || JSON.stringify(parsed).slice(0, 120)
              }

              return JSON.stringify(parsed).slice(0, 120)
            }

            // Color indicator for data_collect: green if something happened, dim if nothing
            const isActiveCollect = l.event === 'data_collect' && parsed &&
              ((parsed.new > 0) || (parsed.updated > 0) || (parsed.collected > 0))

            return (
              <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-800/30 transition-colors">
                <span className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap mt-0.5 ${color}`}>
                  {l.event}
                </span>
                <p className={`text-xs flex-1 truncate font-mono ${isActiveCollect ? 'text-cyan-300' : l.event === 'data_collect' && !isActiveCollect ? 'text-slate-500' : 'text-slate-400'}`}>
                  {formatDetails()}
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
