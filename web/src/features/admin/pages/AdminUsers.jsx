import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../api'

function BarChart({ data, color = 'blue' }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.count), 1)
  const bg = color === 'blue' ? 'bg-blue-500/40' : 'bg-green-500/40'
  const bgHover = color === 'blue' ? 'hover:bg-blue-400/60' : 'hover:bg-green-400/60'

  const ticks = [0, Math.round(max / 3), Math.round((max * 2) / 3), max]
  const step = Math.max(1, Math.floor((data.length - 1) / 4))
  const xLabels = data.reduce((acc, d, i) => {
    if (i === 0 || i === data.length - 1 || i % step === 0) acc.push({ i, label: d.date?.slice(5) })
    return acc
  }, [])

  return (
    <div className="flex">
      <div className="flex flex-col justify-between items-end pr-2 h-24 py-0.5">
        {[...ticks].reverse().map((t, i) => (
          <span key={i} className="text-[9px] text-slate-600 font-mono leading-none">{t}</span>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-end gap-[2px] h-24 border-l border-b border-slate-700/50">
          {data.map((d, i) => (
            <div
              key={i}
              className={`flex-1 ${bg} rounded-t-sm min-w-[2px] ${bgHover} transition-colors`}
              style={{ height: `${Math.max((d.count / max) * 100, 2)}%` }}
              title={`${d.date}: ${d.count}`}
            />
          ))}
        </div>
        <div className="relative h-4 mt-1">
          {xLabels.map(({ i, label }) => (
            <span
              key={i}
              className="absolute text-[9px] text-slate-600 font-mono -translate-x-1/2"
              style={{ left: `${(i / (data.length - 1)) * 100}%` }}
            >{label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

const COUNTRY_FLAGS = {
  PL: '\u{1F1F5}\u{1F1F1}', IT: '\u{1F1EE}\u{1F1F9}', DE: '\u{1F1E9}\u{1F1EA}', ES: '\u{1F1EA}\u{1F1F8}',
  FR: '\u{1F1EB}\u{1F1F7}', GB: '\u{1F1EC}\u{1F1E7}', AT: '\u{1F1E6}\u{1F1F9}', CH: '\u{1F1E8}\u{1F1ED}',
  UA: '\u{1F1FA}\u{1F1E6}', RU: '\u{1F1F7}\u{1F1FA}', BR: '\u{1F1E7}\u{1F1F7}', PT: '\u{1F1F5}\u{1F1F9}',
  IN: '\u{1F1EE}\u{1F1F3}', US: '\u{1F1FA}\u{1F1F8}', NL: '\u{1F1F3}\u{1F1F1}', BE: '\u{1F1E7}\u{1F1EA}',
  RO: '\u{1F1F7}\u{1F1F4}', GR: '\u{1F1EC}\u{1F1F7}', CZ: '\u{1F1E8}\u{1F1FF}', HU: '\u{1F1ED}\u{1F1FA}',
  SE: '\u{1F1F8}\u{1F1EA}', NO: '\u{1F1F3}\u{1F1F4}', DK: '\u{1F1E9}\u{1F1F0}', IE: '\u{1F1EE}\u{1F1EA}',
  ZA: '\u{1F1FF}\u{1F1E6}', AE: '\u{1F1E6}\u{1F1EA}', BY: '\u{1F1E7}\u{1F1FE}', LT: '\u{1F1F1}\u{1F1F9}',
  RS: '\u{1F1F7}\u{1F1F8}',
}

function DailyByCountry({ data }) {
  if (!data.length) return null
  const byDate = {}
  data.forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = []
    byDate[r.date].push({ country: r.country, count: r.count })
  })
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800">
        <h3 className="text-sm font-semibold">Registrations by Country</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">Last 30 days, grouped by day</p>
      </div>
      <div className="divide-y divide-slate-800/50">
        {dates.map(date => {
          const rows = byDate[date]
          const total = rows.reduce((s, r) => s + r.count, 0)
          return (
            <div key={date} className="px-5 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-300">{date}</span>
                <span className="text-xs font-mono text-slate-400">Total: {total}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {rows.map(r => (
                  <span key={r.country} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-xs">
                    <span>{COUNTRY_FLAGS[r.country] || '\u{1F30D}'}</span>
                    <span className="text-slate-300">{r.country}</span>
                    <span className="text-slate-500 font-mono">{r.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function UserProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    adminApi.getUserProfile(userId)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [userId])

  if (!userId) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !profile ? (
          <div className="p-6 text-center text-slate-500">User not found</div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-start justify-between">
              <div>
                <p className="font-mono text-sm text-slate-300">{profile.user.public_id}</p>
                <p className="text-xs text-slate-500 mt-1">{profile.user.email}</p>
                {profile.user.phone && <p className="text-xs text-slate-500">{profile.user.phone}</p>}
              </div>
              <div className="flex items-center gap-2">
                {profile.user.is_premium ? (
                  <span className="text-[10px] px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full font-medium">PRO</span>
                ) : (
                  <span className="text-[10px] px-2 py-1 bg-slate-800 text-slate-400 rounded-full">Free</span>
                )}
                <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg ml-2">&times;</button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6">
              {[
                { label: 'Predictions', value: profile.stats.total_predictions },
                { label: 'Accuracy', value: `${profile.stats.accuracy}%`, color: profile.stats.accuracy >= 50 ? 'text-green-400' : 'text-amber-400' },
                { label: 'Support Chats', value: profile.stats.support_sessions },
                { label: 'AI Chats', value: profile.stats.ai_sessions },
                { label: 'Referrals', value: profile.stats.referrals_count },
                { label: 'Days Active', value: profile.stats.days_since_registration },
                { label: 'Daily Limit', value: `${profile.user.daily_requests}/${profile.user.daily_limit}` },
                { label: 'Bonus Preds', value: profile.user.bonus_predictions },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-[10px] text-slate-500">{s.label}</p>
                  <p className={`text-lg font-bold mt-0.5 ${s.color || 'text-slate-200'}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* User details */}
            <div className="px-6 pb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {[
                ['Country', profile.user.country || '\u2014'],
                ['Language', profile.user.language?.toUpperCase() || '\u2014'],
                ['Risk Level', profile.user.risk_level || '\u2014'],
                ['Odds Range', `${profile.user.min_odds}\u2013${profile.user.max_odds}`],
                ['Referral Code', profile.user.referral_code || '\u2014'],
                ['Ref Bonus', `${profile.user.referral_bonus_requests} requests`],
                ['Registered', profile.user.created_at ? new Date(profile.user.created_at).toLocaleString() : '\u2014'],
                ['PRO Until', profile.user.premium_until ? new Date(profile.user.premium_until).toLocaleDateString() : '\u2014'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-300 font-mono">{v}</span>
                </div>
              ))}
            </div>

            {/* Recent predictions */}
            {profile.recent_predictions?.length > 0 && (
              <div className="px-6 pb-6">
                <h4 className="text-xs font-semibold text-slate-400 mb-3">Recent Predictions</h4>
                <div className="space-y-2">
                  {profile.recent_predictions.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs text-slate-300">{p.home_team} vs {p.away_team}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{p.bet_type} {p.league ? `\u00b7 ${p.league}` : ''}</p>
                      </div>
                      <div className="text-right">
                        {p.is_correct === true && <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">WIN</span>}
                        {p.is_correct === false && <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">LOSS</span>}
                        {p.is_correct === null && <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">Pending</span>}
                        <p className="text-[10px] text-slate-600 mt-0.5">{p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('analytics') // analytics | search

  // Search state
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [page, setPage] = useState(1)

  // Profile modal
  const [profileUserId, setProfileUserId] = useState(null)

  useEffect(() => {
    adminApi.getUsersStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const doSearch = useCallback((p = 1) => {
    setSearchLoading(true)
    setPage(p)
    adminApi.searchUsers(query, statusFilter, countryFilter, sortBy, p)
      .then(setSearchResults)
      .catch(() => setSearchResults(null))
      .finally(() => setSearchLoading(false))
  }, [query, statusFilter, countryFilter, sortBy])

  // Load initial search results when switching to search tab
  useEffect(() => {
    if (tab === 'search' && !searchResults) doSearch(1)
  }, [tab]) // eslint-disable-line

  const totalPages = searchResults ? Math.ceil(searchResults.total / searchResults.per_page) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-slate-500 mt-1">User analytics, search, and profiles</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-lg w-fit border border-slate-800">
        {[
          { id: 'analytics', label: 'Analytics' },
          { id: 'search', label: 'Search & Browse' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'analytics' && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-1">Registration Trend</h3>
            <p className="text-[11px] text-slate-500 mb-4">Last 30 days</p>
            <BarChart data={stats?.daily_registrations || []} color="blue" />
          </div>

          <DailyByCountry data={stats?.daily_by_country || []} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">By Country</h3>
              <div className="space-y-3">
                {(stats?.by_country || []).map((c, i) => {
                  const total = (stats?.by_country || []).reduce((s, x) => s + x.count, 0) || 1
                  const pct = Math.round(c.count / total * 100)
                  return (
                    <div key={c.country}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-600 w-4">{i + 1}</span>
                          <span className="text-sm">{COUNTRY_FLAGS[c.country] || ''} {c.country || 'Unknown'}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{c.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden ml-6">
                        <div className="h-full bg-blue-500/50 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">By Language</h3>
              <div className="space-y-3">
                {(stats?.by_language || []).map(l => {
                  const total = (stats?.by_language || []).reduce((s, x) => s + x.count, 0) || 1
                  const pct = Math.round(l.count / total * 100)
                  return (
                    <div key={l.language}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm uppercase font-mono">{l.language || '??'}</span>
                        <span className="text-xs text-slate-400 font-mono">{l.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500/50 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800">
                <p className="text-xs text-slate-500">
                  Referred users: <span className="text-slate-300 font-mono">{stats?.total_referred || 0}</span>
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'search' && (
        <>
          {/* Search bar + filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] text-slate-500 uppercase mb-1 block">Search</label>
                <input
                  type="text"
                  placeholder="Phone, email, public_id, username..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch(1)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase mb-1 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
                >
                  <option value="">All</option>
                  <option value="pro">PRO</option>
                  <option value="free">Free</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase mb-1 block">Country</label>
                <select
                  value={countryFilter}
                  onChange={e => setCountryFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
                >
                  <option value="">All</option>
                  {(stats?.by_country || []).map(c => (
                    <option key={c.country} value={c.country}>{c.country}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase mb-1 block">Sort</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
                >
                  <option value="created_at">Newest</option>
                  <option value="total_predictions">Most Predictions</option>
                </select>
              </div>
              <button
                onClick={() => doSearch(1)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >Search</button>
            </div>
          </div>

          {/* Results table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {searchResults ? `${searchResults.total} users found` : 'Users'}
              </h3>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => doSearch(page - 1)}
                    disabled={page <= 1}
                    className="text-xs px-2 py-1 bg-slate-800 rounded disabled:opacity-30 hover:bg-slate-700"
                  >&larr;</button>
                  <span className="text-xs text-slate-400">{page} / {totalPages}</span>
                  <button
                    onClick={() => doSearch(page + 1)}
                    disabled={page >= totalPages}
                    className="text-xs px-2 py-1 bg-slate-800 rounded disabled:opacity-30 hover:bg-slate-700"
                  >&rarr;</button>
                </div>
              )}
            </div>
            {searchLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-xs">
                      <th className="text-left px-5 py-3 font-medium">User</th>
                      <th className="text-left px-3 py-3 font-medium">Country</th>
                      <th className="text-left px-3 py-3 font-medium">Lang</th>
                      <th className="text-center px-3 py-3 font-medium">Status</th>
                      <th className="text-right px-3 py-3 font-medium">Predictions</th>
                      <th className="text-right px-5 py-3 font-medium">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {(searchResults?.users || []).map(u => (
                      <tr
                        key={u.id}
                        onClick={() => setProfileUserId(u.id)}
                        className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3">
                          <p className="font-mono text-xs text-slate-300">{u.public_id}</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">{u.phone || u.email}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-400">
                          {COUNTRY_FLAGS[u.country] || ''} {u.country || '\u2014'}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-400 uppercase font-mono">{u.language}</td>
                        <td className="px-3 py-3 text-center">
                          {u.is_premium ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">PRO</span>
                          ) : (
                            <span className="text-[10px] text-slate-600">Free</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-slate-400">
                          {u.total_predictions}
                          {u.correct_predictions > 0 && u.total_predictions > 0 && (
                            <span className="text-green-500 ml-1">
                              ({Math.round(u.correct_predictions / u.total_predictions * 100)}%)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-[11px] text-slate-500">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '\u2014'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!searchResults?.users?.length) && (
                  <p className="text-center text-sm text-slate-600 py-8">
                    {searchResults ? 'No users match your search' : 'No users yet'}
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Profile modal */}
      <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />
    </div>
  )
}
