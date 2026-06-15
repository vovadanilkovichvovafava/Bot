import { useState, useEffect, useMemo, useRef } from 'react';
import { adminApi } from '../api';

const SOURCE_COLORS = [
  '#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
];

function getColor(i) { return SOURCE_COLORS[i % SOURCE_COLORS.length]; }

export default function AdminTraffic() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visits, setVisits] = useState([]);
  const [replaySession, setReplaySession] = useState(null);

  useEffect(() => {
    adminApi.getTrafficStats()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => adminApi.getRecentVisits(50, 0)
      .then(r => { if (alive) setVisits(r.visits || []); })
      .catch(() => {});
    load();
    const iv = setInterval(load, 20000); // refresh sessions list
    return () => { alive = false; clearInterval(iv); };
  }, []);

  // Build stacked chart data
  const chartData = useMemo(() => {
    if (!data?.daily_by_source) return null;
    const sources = [...new Set(data.daily_by_source.map(d => d.source))];
    const dates = [...new Set(data.daily_by_source.map(d => d.date))].sort();
    const map = {};
    for (const row of data.daily_by_source) {
      if (!map[row.date]) map[row.date] = {};
      map[row.date][row.source] = row.count;
    }
    return { sources, dates, map };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const maxDaily = chartData
    ? Math.max(...chartData.dates.map(d =>
        chartData.sources.reduce((sum, s) => sum + (chartData.map[d]?.[s] || 0), 0)
      ), 1)
    : 1;

  const sourceIdx = (src) => data.by_source.findIndex(s => s.source === src);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Traffic Sources</h1>
        <p className="text-sm text-slate-400 mt-1">Registrations, conversions and retention by traffic source</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.by_source.map((s, i) => (
          <div key={s.source} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(i) }} />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{s.source}</span>
            </div>
            <p className="text-2xl font-bold">{s.total}</p>
            <p className="text-xs text-slate-500 mt-1">{s.percent}% of total</p>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <section>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Source Comparison</h2>
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs">
                <th className="text-left px-4 py-3 font-medium">Source</th>
                <th className="text-right px-4 py-3 font-medium">Users</th>
                <th className="text-right px-4 py-3 font-medium">PRO</th>
                <th className="text-right px-4 py-3 font-medium">Conv %</th>
                <th className="text-right px-4 py-3 font-medium">Activated</th>
                <th className="text-right px-4 py-3 font-medium">Act %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.by_source.map((s, i) => (
                <tr key={s.source} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(i) }} />
                      <span className="font-medium">{s.source}</span>
                    </div>
                  </td>
                  <td className="text-right px-4 py-3 font-mono">{s.total}</td>
                  <td className="text-right px-4 py-3 font-mono">{s.pro}</td>
                  <td className="text-right px-4 py-3">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      s.conversion_pct >= 5 ? 'bg-green-500/20 text-green-400' :
                      s.conversion_pct >= 2 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {s.conversion_pct}%
                    </span>
                  </td>
                  <td className="text-right px-4 py-3 font-mono">{s.activated}</td>
                  <td className="text-right px-4 py-3">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      s.activation_pct >= 30 ? 'bg-green-500/20 text-green-400' :
                      s.activation_pct >= 15 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {s.activation_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Daily Chart */}
      {chartData && chartData.dates.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Daily Registrations by Source (30 days)</h2>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4">
              {chartData.sources.map((src, i) => (
                <div key={src} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: getColor(sourceIdx(src) >= 0 ? sourceIdx(src) : i) }} />
                  <span className="text-xs text-slate-300">{src}</span>
                </div>
              ))}
            </div>

            {/* Stacked bars */}
            <div className="flex items-end gap-[2px] h-44">
              {chartData.dates.map(date => {
                const dayTotal = chartData.sources.reduce((sum, s) => sum + (chartData.map[date]?.[s] || 0), 0);
                return (
                  <div key={date} className="flex-1 flex flex-col justify-end h-full group relative">
                    {chartData.sources.map((src, i) => {
                      const val = chartData.map[date]?.[src] || 0;
                      if (val === 0) return null;
                      const h = (val / maxDaily) * 100;
                      const ci = sourceIdx(src) >= 0 ? sourceIdx(src) : i;
                      return (
                        <div
                          key={src}
                          className="opacity-80 hover:opacity-100 transition-opacity min-h-[2px]"
                          style={{ height: `${h}%`, backgroundColor: getColor(ci) }}
                        />
                      );
                    })}
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg">
                        <p className="font-medium text-slate-200 mb-1">{date}</p>
                        {chartData.sources.map((src, i) => {
                          const val = chartData.map[date]?.[src] || 0;
                          if (val === 0) return null;
                          const ci = sourceIdx(src) >= 0 ? sourceIdx(src) : i;
                          return (
                            <div key={src} className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded" style={{ backgroundColor: getColor(ci) }} />
                              <span className="text-slate-400">{src}:</span>
                              <span className="font-mono text-slate-200">{val}</span>
                            </div>
                          );
                        })}
                        <div className="border-t border-slate-700 mt-1 pt-1 text-slate-300">
                          Total: <span className="font-mono">{dayTotal}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* X-axis */}
            <div className="flex gap-[2px] mt-1">
              {chartData.dates.map((date, i) => (
                <div key={date} className="flex-1 text-center">
                  {i % 5 === 0 && <span className="text-[9px] text-slate-500">{date.slice(5)}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Retention by Source */}
      {data.retention_by_source?.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Week-1 Retention by Source</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.retention_by_source.map((r, i) => {
              const ci = sourceIdx(r.source) >= 0 ? sourceIdx(r.source) : i;
              return (
                <div key={r.source} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(ci) }} />
                    <span className="text-xs font-medium text-slate-400 uppercase">{r.source}</span>
                  </div>
                  <p className="text-2xl font-bold">{r.retention_pct}%</p>
                  <p className="text-xs text-slate-500 mt-1">{r.returned}/{r.registered} returned</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* New This Week / Month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">New This Week</h2>
          <div className="bg-slate-900 rounded-xl border border-slate-800 divide-y divide-slate-800">
            {(data.new_week || []).map((r, i) => {
              const ci = sourceIdx(r.source) >= 0 ? sourceIdx(r.source) : i;
              const maxW = Math.max(...(data.new_week || []).map(w => w.count), 1);
              return (
                <div key={r.source} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(ci) }} />
                      <span className="text-sm font-medium">{r.source}</span>
                    </div>
                    <span className="text-sm font-mono">{r.count}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${(r.count / maxW) * 100}%`, backgroundColor: getColor(ci) }}
                    />
                  </div>
                </div>
              );
            })}
            {(data.new_week || []).length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No registrations this week</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">New This Month</h2>
          <div className="bg-slate-900 rounded-xl border border-slate-800 divide-y divide-slate-800">
            {(data.new_month || []).map((r, i) => {
              const ci = sourceIdx(r.source) >= 0 ? sourceIdx(r.source) : i;
              const maxM = Math.max(...(data.new_month || []).map(w => w.count), 1);
              return (
                <div key={r.source} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(ci) }} />
                      <span className="text-sm font-medium">{r.source}</span>
                    </div>
                    <span className="text-sm font-mono">{r.count}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${(r.count / maxM) * 100}%`, backgroundColor: getColor(ci) }}
                    />
                  </div>
                </div>
              );
            })}
            {(data.new_month || []).length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No registrations this month</p>
            )}
          </div>
        </section>
      </div>

      {/* UTM Source Breakdown */}
      {data.by_utm_source?.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">By UTM Source (Ad Platform)</h2>
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="text-left px-4 py-3 font-medium">UTM Source</th>
                  <th className="text-right px-4 py-3 font-medium">Users</th>
                  <th className="text-right px-4 py-3 font-medium">PRO</th>
                  <th className="text-right px-4 py-3 font-medium">Conv %</th>
                  <th className="text-right px-4 py-3 font-medium">Activated</th>
                  <th className="text-right px-4 py-3 font-medium">Act %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.by_utm_source.map((s, i) => (
                  <tr key={s.source} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(i) }} />
                        <span className="font-medium">{s.source}</span>
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 font-mono">{s.total}</td>
                    <td className="text-right px-4 py-3 font-mono">{s.pro}</td>
                    <td className="text-right px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        s.conversion_pct >= 5 ? 'bg-green-500/20 text-green-400' :
                        s.conversion_pct >= 2 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-700 text-slate-300'
                      }`}>{s.conversion_pct}%</span>
                    </td>
                    <td className="text-right px-4 py-3 font-mono">{s.activated}</td>
                    <td className="text-right px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        s.activation_pct >= 30 ? 'bg-green-500/20 text-green-400' :
                        s.activation_pct >= 15 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-700 text-slate-300'
                      }`}>{s.activation_pct}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* UTM Campaign Breakdown */}
      {data.by_utm_campaign?.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">By UTM Campaign</h2>
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="text-left px-4 py-3 font-medium">Campaign</th>
                  <th className="text-left px-4 py-3 font-medium">Source</th>
                  <th className="text-right px-4 py-3 font-medium">Users</th>
                  <th className="text-right px-4 py-3 font-medium">PRO</th>
                  <th className="text-right px-4 py-3 font-medium">Conv %</th>
                  <th className="text-right px-4 py-3 font-medium">Activated</th>
                  <th className="text-right px-4 py-3 font-medium">Act %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.by_utm_campaign.map((c, i) => (
                  <tr key={`${c.campaign}-${c.source}`} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-xs max-w-[200px] truncate">{c.campaign}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{c.source}</td>
                    <td className="text-right px-4 py-3 font-mono">{c.total}</td>
                    <td className="text-right px-4 py-3 font-mono">{c.pro}</td>
                    <td className="text-right px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        c.conversion_pct >= 5 ? 'bg-green-500/20 text-green-400' :
                        c.conversion_pct >= 2 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-700 text-slate-300'
                      }`}>{c.conversion_pct}%</span>
                    </td>
                    <td className="text-right px-4 py-3 font-mono">{c.activated}</td>
                    <td className="text-right px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        c.activation_pct >= 30 ? 'bg-green-500/20 text-green-400' :
                        c.activation_pct >= 15 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-700 text-slate-300'
                      }`}>{c.activation_pct}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Country breakdown */}
      {data.by_source_country?.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Top Countries by Source</h2>
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="text-left px-4 py-3 font-medium">Source</th>
                  <th className="text-left px-4 py-3 font-medium">Country</th>
                  <th className="text-right px-4 py-3 font-medium">Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.by_source_country.map((r, idx) => {
                  const ci = sourceIdx(r.source) >= 0 ? sourceIdx(r.source) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(ci) }} />
                          <span className="text-xs">{r.source}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs">{r.country || 'Unknown'}</td>
                      <td className="text-right px-4 py-2.5 font-mono text-xs">{r.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Visitor sessions + session replay ── */}
      <section className="mt-6 bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Visitor sessions</h2>
          <span className="text-xs text-slate-500">{visits.length} recent · ▶ = replay available</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-300">
            <thead className="text-xs text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Pages</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Last page</th>
                <th className="px-3 py-2 text-center">Replay</th>
              </tr>
            </thead>
            <tbody>
              {visits.map(v => (
                <tr key={v.session_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-2 text-xs whitespace-nowrap">
                    {v.is_live && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 align-middle animate-pulse" />}
                    {fmtTime(v.last_activity || v.visit_time)}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-slate-400">{v.user_id ? v.user_id.slice(0, 12) : '—'}</td>
                  <td className="px-3 py-2 text-xs">{v.country || '—'}</td>
                  <td className="px-3 py-2 text-xs">{v.page_views}</td>
                  <td className="px-3 py-2 text-xs">{fmtDur(v.duration_sec)}</td>
                  <td className="px-3 py-2 text-xs text-slate-400 max-w-[180px] truncate">{v.last_page || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    {v.has_replay
                      ? <button onClick={() => setReplaySession(v.session_id)} className="text-xs font-semibold text-blue-400 hover:text-blue-300">▶ Play</button>
                      : <span className="text-xs text-slate-600">—</span>}
                  </td>
                </tr>
              ))}
              {visits.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500 text-sm">No sessions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {replaySession && <ReplayModal sessionId={replaySession} onClose={() => setReplaySession(null)} />}
    </div>
  );
}

function fmtTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
}

function fmtDur(sec) {
  if (!sec || sec < 1) return '—';
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

// ── Session Replay modal (rrweb-player, lazy-loaded) ──
function ReplayModal({ sessionId, onClose }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    adminApi.getSessionReplay(sessionId)
      .then(d => { if (d.events?.length) setEvents(d.events); else setError('No replay events recorded'); })
      .catch(e => setError(e.message || 'No replay data for this session'));
  }, [sessionId]);

  useEffect(() => {
    if (!events?.length || !containerRef.current) return;
    let destroyed = false;
    Promise.all([import('rrweb-player'), import('rrweb-player/dist/style.css')])
      .then(([mod]) => {
        if (destroyed) return;
        const RRWebPlayer = mod.default || mod;
        playerRef.current = new RRWebPlayer({
          target: containerRef.current,
          props: { events, width: 410, height: 680, autoPlay: true, showController: true, speedOption: [1, 1.5, 2, 4] },
        });
      })
      .catch(() => setError('Failed to load replay player'));
    return () => {
      destroyed = true;
      if (playerRef.current) { try { playerRef.current.$destroy?.(); } catch { /* ignore */ } playerRef.current = null; }
    };
  }, [events]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-6 pb-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[440px] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-white">Session Replay</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{sessionId?.slice(0, 16)}…</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg px-2">✕</button>
        </div>
        <div className="p-3 min-h-[300px] flex items-center justify-center">
          {error
            ? <p className="text-sm text-slate-400">{error}</p>
            : !events
              ? <p className="text-sm text-slate-500 animate-pulse">Loading replay…</p>
              : <div ref={containerRef} />}
        </div>
      </div>
    </div>
  );
}
