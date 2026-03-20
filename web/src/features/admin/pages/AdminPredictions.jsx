import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import {
  StatCard, Card, BarChart, AreaChart, DonutChart, HeatmapRow,
  RankingList, DataTable, Badge, StackedBar, Empty,
} from '../components/AdminCharts'

export default function AdminPredictions() {
  const [stats, setStats] = useState(null)
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminApi.getPredictionsStats().catch(e => {
        console.error('[AdminPredictions] Failed to fetch prediction stats:', e)
        return null
      }),
      adminApi.getOverview().catch(e => {
        console.error('[AdminPredictions] Failed to fetch overview:', e)
        return null
      }),
    ]).then(([ps, ov]) => {
      setStats(ps)
      setOverview(ov)
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

  const p = overview?.predictions || {}
  const sb = stats?.status_breakdown || {}
  const totalVerified = (sb.correct || 0) + (sb.incorrect || 0)
  const pendingPct = p.total > 0 ? Math.round((sb.pending || 0) / p.total * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Predictions Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Comprehensive performance breakdown and trends</p>
      </div>

      {/* ── Top KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total" value={p.total?.toLocaleString() || '0'} color="blue"
          sub={`${totalVerified} verified`}
          sparkData={stats?.daily_predictions}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z"/></svg>}
        />
        <StatCard label="Accuracy" value={`${p.accuracy || 0}%`}
          color={p.accuracy >= 55 ? 'green' : p.accuracy >= 45 ? 'amber' : 'rose'}
          sub={`${sb.correct || 0} correct / ${totalVerified || 0} verified`}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <StatCard label="Correct" value={sb.correct?.toLocaleString() || '0'} color="green"
          sub={totalVerified > 0 ? `${Math.round(sb.correct / totalVerified * 100)}% win rate` : '—'}
          subColor="green"
        />
        <StatCard label="Incorrect" value={sb.incorrect?.toLocaleString() || '0'} color="rose"
          sub={totalVerified > 0 ? `${Math.round(sb.incorrect / totalVerified * 100)}% loss rate` : '—'}
          subColor="red"
        />
        <StatCard label="Pending" value={sb.pending?.toLocaleString() || '0'} color="slate"
          sub={`${pendingPct}% awaiting result`}
        />
        <StatCard label="Today" value={p.today?.toLocaleString() || '0'} color="cyan"
          sub={`Yesterday: ${p.yesterday || 0}`}
          sparkData={stats?.daily_predictions?.slice(-7)}
        />
      </div>

      {/* ── Status donut + Day-of-week heatmap ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Prediction Status" subtitle="Overall outcome breakdown">
          <DonutChart data={[
            { label: 'Correct', value: sb.correct || 0, color: '#34d399' },
            { label: 'Incorrect', value: sb.incorrect || 0, color: '#f87171' },
            { label: 'Pending', value: sb.pending || 0, color: '#64748b' },
          ]} />
          {totalVerified > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 mb-1">Verification Rate</p>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${Math.round(totalVerified / (p.total || 1) * 100)}%` }} />
                  </div>
                </div>
                <span className="text-xs font-mono text-blue-400">{Math.round(totalVerified / (p.total || 1) * 100)}%</span>
              </div>
            </div>
          )}
        </Card>

        <Card title="By Day of Week" subtitle="Volume & accuracy per weekday">
          <HeatmapRow data={stats?.by_day_of_week || []} />
          {stats?.by_day_of_week?.some(d => d.total > 0) && (
            <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-3">
              {(() => {
                const days = stats.by_day_of_week.filter(d => d.total > 0)
                const best = days.reduce((a, b) => (b.accuracy > a.accuracy ? b : a), days[0])
                const busiest = days.reduce((a, b) => (b.total > a.total ? b : a), days[0])
                return (
                  <>
                    <div>
                      <p className="text-[10px] text-slate-500">Best accuracy</p>
                      <p className="text-sm font-semibold text-emerald-400">{best?.day} ({best?.accuracy}%)</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Most active</p>
                      <p className="text-sm font-semibold text-blue-400">{busiest?.day} ({busiest?.total} preds)</p>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </Card>
      </div>

      {/* ── Daily Volume + Daily Accuracy ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Daily Predictions Volume" subtitle="Last 30 days">
          <BarChart data={stats?.daily_predictions || []} color="green" height="h-36" showGrid />
          {stats?.daily_predictions?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                Avg: <span className="text-slate-300 font-mono">{Math.round(stats.daily_predictions.reduce((s, d) => s + d.count, 0) / stats.daily_predictions.length)}/day</span>
              </span>
              <span className="text-[10px] text-slate-500">
                Peak: <span className="text-emerald-400 font-mono">{Math.max(...stats.daily_predictions.map(d => d.count))}</span>
              </span>
            </div>
          )}
        </Card>

        <Card title="Daily Accuracy Trend" subtitle="Last 30 days (verified only)">
          <AreaChart
            data={(stats?.daily_accuracy || []).filter(d => d.verified > 0)}
            color="cyan"
            height="h-36"
            valueKey="accuracy"
            suffix="%"
          />
          {stats?.daily_accuracy?.filter(d => d.verified > 0).length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
              {(() => {
                const days = stats.daily_accuracy.filter(d => d.verified > 0)
                const avg = Math.round(days.reduce((s, d) => s + d.accuracy, 0) / days.length)
                const trend = days.length >= 7
                  ? Math.round(days.slice(-7).reduce((s, d) => s + d.accuracy, 0) / 7 - days.slice(0, 7).reduce((s, d) => s + d.accuracy, 0) / Math.min(7, days.length))
                  : null
                return (
                  <>
                    <span className="text-[10px] text-slate-500">
                      Avg: <span className={`font-mono ${avg >= 55 ? 'text-emerald-400' : 'text-amber-400'}`}>{avg}%</span>
                    </span>
                    {trend !== null && (
                      <span className={`text-[10px] font-mono ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% 7d trend
                      </span>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </Card>
      </div>

      {/* ── Weekly Accuracy Trend ── */}
      <Card title="Weekly Accuracy Trend" subtitle="Last 12 weeks">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AreaChart
              data={stats?.weekly_accuracy || []}
              color="green"
              height="h-44"
              valueKey="accuracy"
              labelKey="week"
              suffix="%"
              formatLabel={w => w?.slice(5)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-medium mb-3">Weekly Details</p>
            {(stats?.weekly_accuracy || []).slice(-6).reverse().map((w, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400 font-mono">{w.week?.slice(5)}</span>
                <span className="text-slate-500">{w.total} preds</span>
                <span className="text-slate-500">{w.verified} ver.</span>
                <span className={`font-bold font-mono ${
                  w.accuracy >= 60 ? 'text-emerald-400' : w.accuracy >= 45 ? 'text-amber-400' : 'text-red-400'
                }`}>{w.accuracy}%</span>
              </div>
            ))}
            {!stats?.weekly_accuracy?.length && <Empty />}
          </div>
        </div>
      </Card>

      {/* ── Confidence Distribution ── */}
      <Card title="Confidence Distribution" subtitle="Predictions grouped by confidence level">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChart
            data={stats?.confidence_dist || []}
            color="purple"
            height="h-36"
            valueKey="total"
            labelKey="bucket"
            formatLabel={v => v}
            showGrid
          />
          <div className="space-y-3">
            {(stats?.confidence_dist || []).map((b, i) => {
              const maxTotal = Math.max(...(stats?.confidence_dist || []).map(x => x.total), 1)
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 font-mono w-14">{b.bucket}%</span>
                  <div className="flex-1 h-6 bg-slate-800 rounded-md overflow-hidden relative">
                    <div className="h-full bg-purple-500/40 rounded-md transition-all"
                      style={{ width: `${Math.min((b.total / maxTotal) * 100, 100)}%` }} />
                    <span className="absolute inset-0 flex items-center px-2 text-[10px] text-slate-300 font-mono">
                      {b.total} total &middot; {b.verified} ver. &middot;
                      <span className={`ml-1 font-bold ${
                        b.accuracy >= 60 ? 'text-emerald-400' : b.accuracy >= 45 ? 'text-amber-400' : b.accuracy > 0 ? 'text-red-400' : 'text-slate-500'
                      }`}>{b.accuracy}% acc</span>
                    </span>
                  </div>
                </div>
              )
            })}
            {!stats?.confidence_dist?.length && <Empty />}
          </div>
        </div>
        {/* Insight: optimal confidence range */}
        {stats?.confidence_dist?.length > 0 && (() => {
          const best = [...(stats.confidence_dist || [])].filter(b => b.verified > 2).sort((a, b) => b.accuracy - a.accuracy)[0]
          return best ? (
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
              <Badge color="purple">Insight</Badge>
              <span className="text-xs text-slate-400">
                Best accuracy at <span className="text-purple-400 font-mono font-semibold">{best.bucket}%</span> confidence
                ({best.accuracy}% accuracy from {best.verified} verified)
              </span>
            </div>
          ) : null
        })()}
      </Card>

      {/* ── By Bet Type + By League ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="By Bet Type" subtitle="Top 10 bet types by volume">
          <RankingList
            data={(stats?.by_bet_type || []).map(b => ({ label: b.bet_type, value: b.total, accuracy: b.accuracy, correct: b.correct }))}
            labelKey="label"
            valueKey="value"
            secondaryKey="accuracy"
            color="auto"
            formatValue={v => `${v} preds`}
          />
          {!stats?.by_bet_type?.length && <Empty text="No prediction data yet" />}
        </Card>

        <Card title="By League" subtitle="Top 10 leagues by volume">
          <RankingList
            data={(stats?.by_league || []).map(l => ({ label: l.league, value: l.total, accuracy: l.accuracy, correct: l.correct }))}
            labelKey="label"
            valueKey="value"
            secondaryKey="accuracy"
            color="auto"
            formatValue={v => `${v} preds`}
          />
          {!stats?.by_league?.length && <Empty text="No league data yet" />}
        </Card>
      </div>

      {/* ── By Source ── */}
      {stats?.by_source?.length > 0 && (
        <Card title="By Source" subtitle="Where predictions originated">
          <div className="mb-4">
            <StackedBar segments={stats.by_source.map((s, i) => ({
              label: s.source === 'ai_chat' ? 'AI Chat' : s.source === 'api' ? 'API' : s.source === 'bot' ? 'Bot' : 'Unknown',
              value: s.total,
              color: ['#22d3ee', '#3b82f6', '#a78bfa', '#64748b'][i] || '#64748b',
            }))} height="h-4" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.by_source.map((s, i) => (
              <div key={s.source} className="bg-slate-800/50 rounded-lg p-4 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  {s.source === 'ai_chat' ? 'AI Chat' : s.source === 'api' ? 'API' : s.source === 'bot' ? 'Bot' : 'Unknown'}
                </p>
                <p className="text-xl font-bold text-slate-100">{s.total.toLocaleString()}</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-500">{s.verified} verified</span>
                  <span className={`text-xs font-bold font-mono ${
                    s.accuracy >= 60 ? 'text-emerald-400' : s.accuracy >= 45 ? 'text-amber-400' : s.accuracy > 0 ? 'text-red-400' : 'text-slate-500'
                  }`}>{s.accuracy}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── ROI Analytics ── */}
      {stats?.roi?.length > 0 && (
        <Card title="ROI Analytics" subtitle="Return on investment by period">
          <DataTable
            columns={[
              { key: 'period', label: 'Period', render: r => (
                <span><Badge color={r.period === 'daily' ? 'blue' : r.period === 'weekly' ? 'green' : 'purple'}>{r.period}</Badge> <span className="text-slate-400 ml-1">{r.start}</span></span>
              )},
              { key: 'predictions', label: 'Predictions', align: 'right', mono: true },
              { key: 'accuracy', label: 'Accuracy', align: 'right', mono: true, render: r => (
                <span className={r.accuracy >= 50 ? 'text-emerald-400' : 'text-amber-400'}>{r.accuracy}%</span>
              )},
              { key: 'roi', label: 'ROI', align: 'right', mono: true, render: r => (
                <span className={`font-bold ${r.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {r.roi >= 0 ? '+' : ''}{r.roi}%
                </span>
              )},
            ]}
            rows={stats.roi}
          />
        </Card>
      )}
    </div>
  )
}
