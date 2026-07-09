import { useState, useEffect, useMemo } from 'react';
import { adminApi } from '../api';

const SOURCE_COLORS = [
  '#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
];

function getColor(i) { return SOURCE_COLORS[i % SOURCE_COLORS.length]; }

/* Which in-app banners the depositing users clicked (banner → deposit). */
function BannerAttribution() {
  const [banners, setBanners] = useState(null);

  useEffect(() => {
    adminApi.getBannerAttribution()
      .then((d) => setBanners(d?.banners || []))
      .catch(() => setBanners([]));
  }, []);

  if (!banners) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-300 mb-1">Атрибуция по баннерам (клик → депозит)</h2>
      <p className="text-xs text-slate-500 mb-3">Какие внутренние баннеры кликали юзеры, которые потом задепали.</p>
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 text-xs">
              <th className="text-left px-4 py-3 font-medium">Баннер</th>
              <th className="text-right px-3 py-3 font-medium">Клики</th>
              <th className="text-right px-3 py-3 font-medium">Юзеров</th>
              <th className="text-right px-3 py-3 font-medium">Задепали</th>
              <th className="text-right px-4 py-3 font-medium">Конв. в деп</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {banners.map((b) => (
              <tr key={b.banner} className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 font-mono text-xs text-slate-300">{b.banner}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-400">{b.clicks}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-400">{b.users}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-emerald-400">{b.depositors}</td>
                <td className={`px-4 py-2.5 text-right font-mono text-xs font-bold ${b.deposit_rate >= 5 ? 'text-emerald-400' : b.deposit_rate >= 1 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {b.deposit_rate}%
                </td>
              </tr>
            ))}
            {!banners.length && (
              <tr><td colSpan="5" className="px-4 py-6 text-center text-slate-600 text-xs">Нет данных по баннерам</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AdminTraffic() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.getTrafficStats()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
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

      <BannerAttribution />

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
    </div>
  );
}
