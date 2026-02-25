import { useState, useEffect } from 'react';
import { adminApi } from '../api';

// ── Tiny bar chart component ──

function BarChart({ data, xKey, yKey, color = '#3b82f6', height = 180 }) {
  if (!data?.length) return <div className="text-slate-500 text-sm text-center py-8">No data</div>;
  const max = Math.max(...data.map(d => d[yKey] || 0), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div
            className="w-full rounded-t transition-all"
            style={{
              height: `${Math.max((d[yKey] || 0) / max * (height - 24), 2)}px`,
              backgroundColor: color,
              opacity: 0.8,
            }}
            title={`${d[xKey]}: ${d[yKey]}`}
          />
          {data.length <= 15 && (
            <span className="text-[9px] text-slate-500 truncate w-full text-center">{d[xKey]}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Comparison bar chart (PRO vs Free) ──

function ComparisonChart({ engagement }) {
  if (!engagement) return null;
  const metrics = [
    { label: 'AI Sessions', pro: engagement.pro.avg_ai_sessions, free: engagement.free.avg_ai_sessions },
    { label: 'Support Sessions', pro: engagement.pro.avg_support_sessions, free: engagement.free.avg_support_sessions },
    { label: 'Predictions', pro: engagement.pro.avg_predictions, free: engagement.free.avg_predictions },
  ];
  const max = Math.max(...metrics.flatMap(m => [m.pro, m.free]), 1);
  return (
    <div className="space-y-3">
      {metrics.map(m => (
        <div key={m.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400">{m.label}</span>
            <span className="text-slate-500">PRO: {m.pro} / Free: {m.free}</span>
          </div>
          <div className="flex gap-1 h-5">
            <div className="bg-blue-500/80 rounded-r" style={{ width: `${(m.pro / max) * 100}%` }}>
              <span className="text-[9px] text-white px-1 leading-5">{m.pro}</span>
            </div>
            <div className="bg-slate-600/60 rounded-r" style={{ width: `${(m.free / max) * 100}%` }}>
              <span className="text-[9px] text-slate-300 px-1 leading-5">{m.free}</span>
            </div>
          </div>
        </div>
      ))}
      <div className="flex gap-4 mt-2 text-[10px]">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded" /> PRO (avg/user)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-600 rounded" /> Free (avg/user)</span>
      </div>
    </div>
  );
}

// ── Stat card ──

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
    green: 'from-green-500/10 to-green-600/5 border-green-500/20',
    yellow: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20',
    red: 'from-red-500/10 to-red-600/5 border-red-500/20',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main page ──

export default function AdminPro() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // overview, users, churn

  useEffect(() => {
    adminApi.getProAnalytics()
      .then(setData)
      .catch(e => console.error('PRO analytics load failed:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-slate-400 py-20">Failed to load PRO analytics</div>;
  }

  const o = data.overview;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">PRO Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Active PRO" value={o.active_pro} sub={`${o.pro_percent}% of ${o.total_users}`} color="blue" />
        <StatCard label="New PRO (week)" value={o.new_pro_week} color="green" />
        <StatCard label="New PRO (month)" value={o.new_pro_month} color="green" />
        <StatCard label="Churned (month)" value={o.churned_month} color="red" />
        <StatCard label="At Risk" value={data.at_risk?.length || 0} sub="Expiring < 7d" color="yellow" />
        <StatCard label="Avg Days as PRO" value={o.avg_pro_days} color="purple" />
        <StatCard label="PRO Countries" value={data.pro_by_country?.length || 0} color="blue" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 rounded-lg p-1 w-fit">
        {['overview', 'users', 'churn'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'overview' ? 'Overview' : t === 'users' ? `PRO Users (${data.pro_users?.length || 0})` : `Churn (${data.churned?.length || 0})`}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab data={data} />}
      {tab === 'users' && <ProUsersTab users={data.pro_users} />}
      {tab === 'churn' && <ChurnTab churned={data.churned} atRisk={data.at_risk} />}
    </div>
  );
}

// ── Overview Tab ──

function OverviewTab({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* PRO Growth Chart */}
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="font-semibold text-sm mb-4">PRO Growth (12 weeks)</h3>
          <BarChart data={data.growth_weekly} xKey="week" yKey="pro_count" color="#3b82f6" />
        </div>

        {/* PRO vs Free Engagement */}
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="font-semibold text-sm mb-4">PRO vs Free (avg per user)</h3>
          <ComparisonChart engagement={data.engagement} />
        </div>
      </div>

      {/* Daily Activity */}
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
        <h3 className="font-semibold text-sm mb-4">Daily Active PRO Users (30 days)</h3>
        <BarChart data={data.daily_activity} xKey="date" yKey="active_pro" color="#22c55e" height={140} />
      </div>

      {/* PRO by Country */}
      {data.pro_by_country?.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="font-semibold text-sm mb-3">PRO by Country</h3>
          <div className="flex flex-wrap gap-2">
            {data.pro_by_country.map(c => (
              <span key={c.country} className="px-3 py-1.5 bg-slate-800 rounded-lg text-sm">
                <span className="text-slate-400">{c.country}</span>
                <span className="ml-2 font-semibold text-blue-400">{c.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PRO Users Tab ──

function ProUsersTab({ users }) {
  const [sort, setSort] = useState('last_active');
  const [search, setSearch] = useState('');

  const filtered = (users || []).filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.email || '').toLowerCase().includes(q) ||
           (u.phone || '').includes(q) ||
           (u.public_id || '').toLowerCase().includes(q) ||
           (u.country || '').toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'last_active') return a.last_active_hours_ago - b.last_active_hours_ago;
    if (sort === 'predictions') return (b.total_predictions || 0) - (a.total_predictions || 0);
    if (sort === 'ai_sessions') return (b.ai_sessions || 0) - (a.ai_sessions || 0);
    if (sort === 'days_remaining') return (a.days_remaining || 0) - (b.days_remaining || 0);
    if (sort === 'accuracy') return (b.accuracy || 0) - (a.accuracy || 0);
    return 0;
  });

  const fmtActive = (hours) => {
    if (hours < 1) return 'Online';
    if (hours < 24) return `${Math.round(hours)}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by email, phone, ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="last_active">Sort: Last Active</option>
          <option value="predictions">Sort: Predictions</option>
          <option value="ai_sessions">Sort: AI Sessions</option>
          <option value="days_remaining">Sort: Expiring Soon</option>
          <option value="accuracy">Sort: Accuracy</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs">
              <th className="text-left py-2 px-2">User</th>
              <th className="text-left py-2 px-2">Country</th>
              <th className="text-right py-2 px-2">Predictions</th>
              <th className="text-right py-2 px-2">Accuracy</th>
              <th className="text-right py-2 px-2">AI Sess.</th>
              <th className="text-right py-2 px-2">Support</th>
              <th className="text-right py-2 px-2">Days PRO</th>
              <th className="text-right py-2 px-2">Remaining</th>
              <th className="text-right py-2 px-2">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(u => (
              <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-2 px-2">
                  <div className="font-medium text-xs">{u.email || u.phone || u.public_id}</div>
                  <div className="text-[10px] text-slate-500">{u.public_id}</div>
                </td>
                <td className="py-2 px-2 text-slate-400">{u.country || '-'}</td>
                <td className="py-2 px-2 text-right font-mono">{u.total_predictions}</td>
                <td className="py-2 px-2 text-right">
                  <span className={u.accuracy >= 60 ? 'text-green-400' : u.accuracy >= 40 ? 'text-yellow-400' : 'text-slate-400'}>
                    {u.accuracy}%
                  </span>
                </td>
                <td className="py-2 px-2 text-right font-mono">{u.ai_sessions}</td>
                <td className="py-2 px-2 text-right font-mono">{u.support_sessions}</td>
                <td className="py-2 px-2 text-right text-slate-400">{u.days_as_pro}d</td>
                <td className="py-2 px-2 text-right">
                  <span className={u.days_remaining <= 3 ? 'text-red-400 font-semibold' : u.days_remaining <= 7 ? 'text-yellow-400' : 'text-green-400'}>
                    {u.days_remaining}d
                  </span>
                </td>
                <td className="py-2 px-2 text-right">
                  <span className={u.last_active_hours_ago < 1 ? 'text-green-400' : u.last_active_hours_ago < 24 ? 'text-slate-300' : 'text-slate-500'}>
                    {fmtActive(u.last_active_hours_ago)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="text-center text-slate-500 py-8 text-sm">No PRO users found</div>
        )}
      </div>
    </div>
  );
}

// ── Churn Tab ──

function ChurnTab({ churned, atRisk }) {
  return (
    <div className="space-y-6">
      {/* At Risk */}
      {atRisk?.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-5 border border-yellow-500/20">
          <h3 className="font-semibold text-sm mb-3 text-yellow-400">At Risk — Expiring in 7 days ({atRisk.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="text-left py-2 px-2">User</th>
                  <th className="text-right py-2 px-2">Days Left</th>
                  <th className="text-right py-2 px-2">Predictions</th>
                  <th className="text-right py-2 px-2">AI Sessions</th>
                  <th className="text-right py-2 px-2">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map(u => (
                  <tr key={u.id} className="border-b border-slate-800/50">
                    <td className="py-2 px-2">
                      <span className="text-xs">{u.email || u.phone || u.public_id}</span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className="text-red-400 font-bold">{u.days_remaining}d</span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono">{u.total_predictions}</td>
                    <td className="py-2 px-2 text-right font-mono">{u.ai_sessions}</td>
                    <td className="py-2 px-2 text-right text-slate-400">
                      {u.last_active_hours_ago < 24 ? `${Math.round(u.last_active_hours_ago)}h` : `${Math.round(u.last_active_hours_ago / 24)}d`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Churned */}
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
        <h3 className="font-semibold text-sm mb-3 text-red-400">Churned — Expired in Last 30 Days ({churned?.length || 0})</h3>
        {(!churned || churned.length === 0) ? (
          <div className="text-center text-slate-500 py-8 text-sm">No churned users</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="text-left py-2 px-2">User</th>
                  <th className="text-left py-2 px-2">Country</th>
                  <th className="text-right py-2 px-2">Expired</th>
                  <th className="text-right py-2 px-2">Days Ago</th>
                  <th className="text-right py-2 px-2">Predictions</th>
                  <th className="text-right py-2 px-2">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {churned.map(u => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 px-2">
                      <span className="text-xs">{u.email || u.phone || u.public_id}</span>
                    </td>
                    <td className="py-2 px-2 text-slate-400">{u.country || '-'}</td>
                    <td className="py-2 px-2 text-right text-xs text-slate-400">
                      {u.expired_at ? new Date(u.expired_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-2 px-2 text-right text-red-400">{u.days_since_expiry}d</td>
                    <td className="py-2 px-2 text-right font-mono">{u.total_predictions}</td>
                    <td className="py-2 px-2 text-right text-slate-400">
                      {u.last_active_hours_ago < 24 ? `${Math.round(u.last_active_hours_ago)}h` : `${Math.round(u.last_active_hours_ago / 24)}d`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
