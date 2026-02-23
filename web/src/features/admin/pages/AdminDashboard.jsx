import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { adminApi } from '../api'

const COUNTRY_CODES = {
  'Italy': 'IT', 'Germany': 'DE', 'Spain': 'ES', 'France': 'FR', 'United Kingdom': 'GB',
  'UK': 'GB', 'USA': 'US', 'United States': 'US', 'Brazil': 'BR', 'Portugal': 'PT',
  'Netherlands': 'NL', 'Belgium': 'BE', 'Turkey': 'TR', 'Poland': 'PL', 'Argentina': 'AR',
  'Mexico': 'MX', 'Russia': 'RU', 'Ukraine': 'UA', 'Romania': 'RO', 'Greece': 'GR',
  'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK', 'Finland': 'FI', 'Austria': 'AT',
  'Switzerland': 'CH', 'Croatia': 'HR', 'Serbia': 'RS', 'Czech Republic': 'CZ', 'Hungary': 'HU',
  'Japan': 'JP', 'South Korea': 'KR', 'India': 'IN', 'Australia': 'AU', 'Canada': 'CA',
  'Colombia': 'CO', 'Chile': 'CL', 'Peru': 'PE', 'Nigeria': 'NG', 'Egypt': 'EG',
  'South Africa': 'ZA', 'Morocco': 'MA', 'Kenya': 'KE', 'Ghana': 'GH', 'Israel': 'IL',
  'Saudi Arabia': 'SA', 'China': 'CN', 'Indonesia': 'ID', 'Thailand': 'TH', 'Vietnam': 'VN',
  'Ireland': 'IE', 'Scotland': 'GB', 'Wales': 'GB', 'Bulgaria': 'BG', 'Slovakia': 'SK',
}
function countryFlag(name) {
  const code = COUNTRY_CODES[name]
  if (!code) return ''
  return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}

function StatCard({ label, value, sub, subColor, color = 'blue', icon }) {
  const colors = {
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/20',
    green: 'from-green-600/20 to-green-600/5 border-green-500/20',
    purple: 'from-purple-600/20 to-purple-600/5 border-purple-500/20',
    amber: 'from-amber-600/20 to-amber-600/5 border-amber-500/20',
    cyan: 'from-cyan-600/20 to-cyan-600/5 border-cyan-500/20',
    rose: 'from-rose-600/20 to-rose-600/5 border-rose-500/20',
  }
  const textColors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
    rose: 'text-rose-400',
  }
  const subClr = subColor === 'green' ? 'text-emerald-400' : subColor === 'amber' ? 'text-amber-400' : 'text-slate-500'

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <span className={textColors[color]}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      {sub && <p className={`text-[11px] mt-1 ${subClr}`}>{sub}</p>}
    </div>
  )
}

function BarChart({ data, color = 'blue' }) {
  if (!data.length) return null
  const items = data.slice(-14)
  const max = Math.max(...items.map(d => d.count), 1)
  // Y-axis: 4 ticks
  const yTicks = [max, Math.round(max * 0.66), Math.round(max * 0.33), 0]
  const barColor = color === 'green' ? 'bg-emerald-500/50 hover:bg-emerald-400/70' : 'bg-blue-500/50 hover:bg-blue-400/70'

  return (
    <div className="flex gap-0">
      {/* Y axis */}
      <div className="flex flex-col justify-between h-32 pr-2 shrink-0">
        {yTicks.map((v, i) => (
          <span key={i} className="text-[9px] text-slate-500 font-mono leading-none text-right min-w-[24px]">{v}</span>
        ))}
      </div>
      {/* Chart area */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-end gap-[3px] h-32 border-l border-b border-slate-700/50 pl-1 pb-1">
          {items.map((d, i) => (
            <div
              key={i}
              className={`flex-1 ${barColor} rounded-t min-w-[6px] transition-all relative group`}
              style={{ height: `${Math.max((d.count / max) * 100, 3)}%` }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-[9px] text-slate-200 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-mono">
                {d.count}
              </div>
            </div>
          ))}
        </div>
        {/* X axis */}
        <div className="flex justify-between mt-1.5 pl-1">
          {items.map((d, i) => {
            // Show label for first, last, and every ~3rd bar
            const show = i === 0 || i === items.length - 1 || i % 3 === 0
            const label = d.date ? d.date.slice(5) : '' // "MM-DD"
            return (
              <span key={i} className="flex-1 text-center text-[8px] text-slate-500 font-mono">
                {show ? label : ''}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { admin } = useAdminAuth()
  const [overview, setOverview] = useState(null)
  const [usersStats, setUsersStats] = useState(null)
  const [predStats, setPredStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminApi.getOverview().catch(() => null),
      adminApi.getUsersStats().catch(() => null),
      adminApi.getPredictionsStats().catch(() => null),
    ]).then(([ov, us, ps]) => {
      setOverview(ov)
      setUsersStats(us)
      setPredStats(ps)
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

  const o = overview || { users: {}, predictions: {}, ai_chats_today: 0, support_sessions: 0 }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back, <span className="text-slate-300">{admin?.name}</span>
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Total Users"
          value={o.users.total?.toLocaleString() || '0'}
          sub={`+${o.users.new_today || 0} today`}
          subColor={o.users.new_today > 0 ? 'green' : undefined}
          color="blue"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>}
        />
        <StatCard
          label="New This Week"
          value={o.users.new_week?.toLocaleString() || '0'}
          sub={`+${o.users.new_today || 0} today`}
          subColor={o.users.new_today > 0 ? 'green' : undefined}
          color="cyan"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"/></svg>}
        />
        <StatCard
          label="PRO Users"
          value={o.users.pro?.toLocaleString() || '0'}
          sub={o.users.pro_new_today > 0 ? `+${o.users.pro_new_today} today` : 'No new today'}
          subColor={o.users.pro_new_today > 0 ? 'green' : undefined}
          color="purple"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>}
        />
        <StatCard
          label="Predictions"
          value={o.predictions.total?.toLocaleString() || '0'}
          sub={`+${o.predictions.today || 0} today · ${o.predictions.accuracy || 0}% acc`}
          subColor={o.predictions.today > 0 ? 'green' : undefined}
          color="green"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z"/></svg>}
        />
        <StatCard
          label="AI Chats Today"
          value={o.ai_chats_today?.toLocaleString() || '0'}
          sub={o.ai_chats_yesterday > 0 ? `${o.ai_chats_yesterday} yesterday` : 'No chats yesterday'}
          subColor={o.ai_chats_today > (o.ai_chats_yesterday || 0) ? 'green' : 'amber'}
          color="amber"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/></svg>}
        />
        <StatCard
          label="Support Sessions"
          value={o.support_sessions?.toLocaleString() || '0'}
          sub={o.support_sessions_today > 0 ? `+${o.support_sessions_today} today` : 'None today'}
          subColor={o.support_sessions_today > 0 ? 'amber' : undefined}
          color="rose"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.712 4.33a9.027 9.027 0 011.652 1.306c.51.51.944 1.064 1.306 1.652M16.712 4.33l-3.448 4.138m3.448-4.138a9.014 9.014 0 00-9.424 0M19.67 7.288l-4.138 3.448m4.138-3.448a9.014 9.014 0 010 9.424m-4.138-5.976a3.736 3.736 0 00-.88-1.388 3.737 3.737 0 00-1.388-.88m2.268 2.268a3.765 3.765 0 010 2.528m-2.268-4.796l-3.448 4.138m3.448-4.138a3.736 3.736 0 00-5.528 0m2.28 4.138L7.288 19.67m0 0a9.024 9.024 0 01-1.652-1.306 9.027 9.027 0 01-1.306-1.652m4.138-3.448a3.765 3.765 0 010 2.528M4.33 16.712a9.014 9.014 0 010-9.424m4.138 5.976a3.765 3.765 0 01-2.528 0"/></svg>}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Registration trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">User Registrations</h3>
              <p className="text-[11px] text-slate-500">Last 14 days</p>
            </div>
            <Link to="/admin/users" className="text-[11px] text-blue-400 hover:text-blue-300">View all</Link>
          </div>
          <BarChart data={usersStats?.daily_registrations || []} color="blue" />
        </div>

        {/* Predictions trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Daily Predictions</h3>
              <p className="text-[11px] text-slate-500">Last 14 days</p>
            </div>
            <Link to="/admin/predictions" className="text-[11px] text-blue-400 hover:text-blue-300">View all</Link>
          </div>
          <BarChart data={predStats?.daily_predictions || []} color="green" />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top countries */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Top Countries</h3>
          <div className="space-y-2.5">
            {(() => {
              const countries = (usersStats?.by_country || []).slice(0, 6)
              const maxCount = countries[0]?.count || 1
              return countries.map((c, i) => (
                <div key={c.country}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                      <span className="text-sm">{countryFlag(c.country)} {c.country || 'Unknown'}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{c.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden ml-6">
                    <div
                      className="h-full bg-blue-500/50 rounded-full transition-all"
                      style={{ width: `${Math.round((c.count / maxCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            })()}
            {(!usersStats?.by_country?.length) && (
              <p className="text-xs text-slate-600 text-center py-4">No data</p>
            )}
          </div>
        </div>

        {/* Top bet types */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Bet Types Accuracy</h3>
          <div className="space-y-2.5">
            {(predStats?.by_bet_type || []).slice(0, 6).map(b => (
              <div key={b.bet_type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300 truncate max-w-[120px]">{b.bet_type}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-600">({b.total})</span>
                    <span className={`text-xs font-mono font-semibold ${
                      b.accuracy >= 60 ? 'text-green-400' : b.accuracy >= 45 ? 'text-amber-400' : 'text-red-400'
                    }`}>{b.accuracy}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      b.accuracy >= 60 ? 'bg-green-500' : b.accuracy >= 45 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(b.accuracy, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {(!predStats?.by_bet_type?.length) && (
              <p className="text-xs text-slate-600 text-center py-4">No data</p>
            )}
          </div>
        </div>

        {/* Languages */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Languages</h3>
          <div className="space-y-2">
            {(usersStats?.by_language || []).map(l => {
              const total = (usersStats?.by_language || []).reduce((s, x) => s + x.count, 0) || 1
              const pct = Math.round(l.count / total * 100)
              return (
                <div key={l.language} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 w-6 uppercase">{l.language || '??'}</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-500 w-10 text-right">{pct}%</span>
                </div>
              )
            })}
            {(!usersStats?.by_language?.length) && (
              <p className="text-xs text-slate-600 text-center py-4">No data</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/admin/users', label: 'Manage Users', desc: 'View & search users' },
          { to: '/admin/predictions', label: 'Analytics', desc: 'Bet types & leagues' },
          { to: '/admin/support', label: 'Support Chat', desc: 'Read conversations' },
          { to: '/admin/team', label: 'Team', desc: 'Manage admin access' },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors group"
          >
            <p className="text-sm font-medium group-hover:text-blue-400 transition-colors">{item.label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
