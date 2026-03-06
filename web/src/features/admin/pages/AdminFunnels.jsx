import { useState, useEffect } from 'react';
import { adminApi } from '../api';

const FUNNEL_COLORS = {
  'funnel-1': '#3b82f6',  // blue — degressive + Pro
  'funnel-2': '#22c55e',  // green — all free
  'funnel-3': '#a855f7',  // purple — fixed 7/day
};

const FUNNEL_LABELS = {
  'funnel-1': 'Degressive + Pro',
  'funnel-2': 'All Free (No Pro)',
  'funnel-3': 'Fixed 7/day',
};

const FUNNEL_DESCRIPTIONS = {
  'funnel-1': 'Limits: 3→2→1/day. Upsell to Pro.',
  'funnel-2': 'Everything unlocked. No paywall. Bonus banners.',
  'funnel-3': 'Fixed 7 requests/day. No degradation.',
};

export default function AdminFunnels() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.getFunnelStats()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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

  if (!data?.funnels) return null;

  const funnels = data.funnels;
  const totalUsers = funnels.reduce((sum, f) => sum + f.total_users, 0);
  const maxUsers = Math.max(...funnels.map(f => f.total_users), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">A/B Funnels</h1>
        <p className="text-sm text-slate-400 mt-1">
          Compare engagement, conversion & retention across funnel variants
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {funnels.map(f => {
          const color = FUNNEL_COLORS[f.funnel] || '#64748b';
          const label = FUNNEL_LABELS[f.funnel] || f.funnel;
          const desc = FUNNEL_DESCRIPTIONS[f.funnel] || '';
          const pct = totalUsers > 0 ? ((f.total_users / totalUsers) * 100).toFixed(1) : 0;

          return (
            <div
              key={f.funnel}
              className="bg-slate-900 rounded-xl p-5 border border-slate-800 relative overflow-hidden"
            >
              {/* Color accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />

              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm font-semibold text-slate-200">{label}</span>
              </div>

              <p className="text-3xl font-bold mb-1">{f.total_users.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mb-3">{pct}% of users</p>

              <p className="text-[10px] text-slate-500 leading-relaxed">{desc}</p>
            </div>
          );
        })}
      </div>

      {/* Distribution Bar */}
      <section>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">User Distribution</h2>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex rounded-lg overflow-hidden h-8">
            {funnels.map(f => {
              const pct = totalUsers > 0 ? (f.total_users / totalUsers) * 100 : 0;
              if (pct < 0.5) return null;
              return (
                <div
                  key={f.funnel}
                  className="flex items-center justify-center text-xs font-medium text-white transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: FUNNEL_COLORS[f.funnel] || '#64748b',
                    minWidth: pct > 3 ? undefined : '32px',
                  }}
                >
                  {pct >= 8 && `${pct.toFixed(0)}%`}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3">
            {funnels.map(f => (
              <div key={f.funnel} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: FUNNEL_COLORS[f.funnel] || '#64748b' }} />
                <span className="text-xs text-slate-400">{FUNNEL_LABELS[f.funnel] || f.funnel}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Funnel Comparison</h2>
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs">
                <th className="text-left px-4 py-3 font-medium">Funnel</th>
                <th className="text-right px-4 py-3 font-medium">Users</th>
                <th className="text-right px-4 py-3 font-medium">Active</th>
                <th className="text-right px-4 py-3 font-medium">Activation %</th>
                <th className="text-right px-4 py-3 font-medium">Chat Users</th>
                <th className="text-right px-4 py-3 font-medium">Chat %</th>
                <th className="text-right px-4 py-3 font-medium">PRO</th>
                <th className="text-right px-4 py-3 font-medium">Conv %</th>
                <th className="text-right px-4 py-3 font-medium">Avg Preds</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {funnels.map(f => {
                const color = FUNNEL_COLORS[f.funnel] || '#64748b';
                return (
                  <tr key={f.funnel} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="font-medium">{FUNNEL_LABELS[f.funnel] || f.funnel}</span>
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 font-mono">{f.total_users}</td>
                    <td className="text-right px-4 py-3 font-mono">{f.active_users}</td>
                    <td className="text-right px-4 py-3">
                      <MetricBadge value={f.activation_rate} thresholds={[15, 30]} />
                    </td>
                    <td className="text-right px-4 py-3 font-mono">{f.users_with_chat}</td>
                    <td className="text-right px-4 py-3">
                      <MetricBadge value={f.chat_usage_rate} thresholds={[10, 25]} />
                    </td>
                    <td className="text-right px-4 py-3 font-mono">{f.premium_users}</td>
                    <td className="text-right px-4 py-3">
                      <MetricBadge value={f.conversion_rate} thresholds={[2, 5]} />
                    </td>
                    <td className="text-right px-4 py-3 font-mono">{f.avg_predictions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bar Charts for Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricChart
          title="Activation Rate"
          funnels={funnels}
          metric="activation_rate"
          suffix="%"
        />
        <MetricChart
          title="Chat Usage Rate"
          funnels={funnels}
          metric="chat_usage_rate"
          suffix="%"
        />
        <MetricChart
          title="Conversion Rate (PRO)"
          funnels={funnels}
          metric="conversion_rate"
          suffix="%"
        />
        <MetricChart
          title="Avg Predictions per User"
          funnels={funnels}
          metric="avg_predictions"
          suffix=""
        />
      </div>
    </div>
  );
}


function MetricBadge({ value, thresholds = [2, 5] }) {
  const cls = value >= thresholds[1]
    ? 'bg-green-500/20 text-green-400'
    : value >= thresholds[0]
    ? 'bg-amber-500/20 text-amber-400'
    : 'bg-slate-700 text-slate-300';

  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>
      {value}%
    </span>
  );
}


function MetricChart({ title, funnels, metric, suffix }) {
  const maxVal = Math.max(...funnels.map(f => f[metric] || 0), 1);

  return (
    <section className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">{title}</h3>
      <div className="space-y-3">
        {funnels.map(f => {
          const val = f[metric] || 0;
          const pct = (val / maxVal) * 100;
          const color = FUNNEL_COLORS[f.funnel] || '#64748b';

          return (
            <div key={f.funnel}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-slate-300">{FUNNEL_LABELS[f.funnel] || f.funnel}</span>
                </div>
                <span className="text-sm font-bold text-slate-200">{val}{suffix}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
