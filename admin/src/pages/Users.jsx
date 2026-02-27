import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

const FLAG = {
  IT: '\u{1F1EE}\u{1F1F9}', PL: '\u{1F1F5}\u{1F1F1}', DE: '\u{1F1E9}\u{1F1EA}', FR: '\u{1F1EB}\u{1F1F7}',
  ES: '\u{1F1EA}\u{1F1F8}', GB: '\u{1F1EC}\u{1F1E7}', PT: '\u{1F1F5}\u{1F1F9}', UA: '\u{1F1FA}\u{1F1E6}',
  RU: '\u{1F1F7}\u{1F1FA}', BY: '\u{1F1E7}\u{1F1FE}', KZ: '\u{1F1F0}\u{1F1FF}', AT: '\u{1F1E6}\u{1F1F9}',
  CH: '\u{1F1E8}\u{1F1ED}', SE: '\u{1F1F8}\u{1F1EA}', NO: '\u{1F1F3}\u{1F1F4}', DK: '\u{1F1E9}\u{1F1F0}',
  AE: '\u{1F1E6}\u{1F1EA}', IN: '\u{1F1EE}\u{1F1F3}', BR: '\u{1F1E7}\u{1F1F7}',
}

export default function Users() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [domains, setDomains] = useState([])
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [banning, setBanning] = useState(false)
  const [exporting, setExporting] = useState(false)

  const search = useCallback(async (q, status, p, domain) => {
    setLoading(true)
    try {
      const data = await api.searchUsers(q, status || undefined, undefined, p, domain || undefined)
      setUsers(data.users)
      setTotal(data.total)
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => {
    api.getEmailDomains().then(data => setDomains(data.domains || [])).catch(() => {})
  }, [])

  useEffect(() => {
    search(query, statusFilter, page, domainFilter)
  }, [page, statusFilter, domainFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    search(query, statusFilter, 1, domainFilter)
  }

  const openProfile = async (userId) => {
    setProfileLoading(true)
    setProfile(null)
    try {
      const data = await api.getUserProfile(userId)
      setProfile(data)
    } catch (err) {
      alert(err.message)
    }
    setProfileLoading(false)
  }

  const handleTogglePremium = async () => {
    if (!profile) return
    const u = profile.user
    const action = u.is_premium && u.premium_until && new Date(u.premium_until) > new Date()
      ? 'deactivate PRO'
      : 'activate PRO (15 days)'
    if (!confirm(`${action} for ${u.username || u.email}?`)) return

    setToggling(true)
    try {
      const result = await api.togglePremium(u.id)
      // Refresh profile
      const data = await api.getUserProfile(u.id)
      setProfile(data)
      // Refresh list
      search(query, statusFilter, page, domainFilter)
    } catch (err) {
      alert(err.message)
    }
    setToggling(false)
  }

  const handleToggleBan = async () => {
    if (!profile) return
    const u = profile.user
    const action = u.is_banned ? 'unban' : 'ban'
    if (!confirm(`${action} user ${u.username || u.email}?`)) return

    setBanning(true)
    try {
      await api.toggleBan(u.id)
      const data = await api.getUserProfile(u.id)
      setProfile(data)
      search(query, statusFilter, page, domainFilter)
    } catch (err) {
      alert(err.message)
    }
    setBanning(false)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await api.exportUsersCSV(statusFilter || undefined, undefined, domainFilter || undefined)
    } catch (err) {
      alert(err.message)
    }
    setExporting(false)
  }

  const isPro = (u) => u.is_premium && u.premium_until && new Date(u.premium_until) > new Date()
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Users</h1>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by email, phone, username, public_id..."
          className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="pro">PRO</option>
          <option value="free">Free</option>
        </select>
        <select
          value={domainFilter}
          onChange={e => { setDomainFilter(e.target.value); setPage(1) }}
          className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All domains</option>
          {domains.map(d => (
            <option key={d.domain} value={d.domain}>{d.domain} ({d.count})</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Search
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="bg-dark-700 hover:bg-dark-600 text-dark-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-dark-600 disabled:opacity-50"
        >
          {exporting ? '...' : 'CSV'}
        </button>
      </form>

      {/* Results count */}
      <p className="text-xs text-dark-400">{total} users found</p>

      {/* Users table */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-700 text-dark-400 text-xs">
              <th className="text-left px-4 py-3 font-medium">User</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-center px-4 py-3 font-medium">Country</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Predictions</th>
              <th className="text-right px-4 py-3 font-medium">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {loading ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-dark-500">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-dark-500">No users found</td></tr>
            ) : users.map(u => (
              <tr
                key={u.id}
                onClick={() => openProfile(u.id)}
                className="hover:bg-dark-700/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{u.username || `#${u.id}`}</p>
                    <p className="text-[10px] text-dark-500 font-mono">{u.public_id}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-dark-300 text-xs">{u.email}</td>
                <td className="px-4 py-3 text-center">
                  <span title={u.country}>{FLAG[u.country] || u.country || '—'}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {u.is_banned ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400">Banned</span>
                  ) : isPro(u) ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400">PRO</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-dark-600 text-dark-400">Free</span>
                  )}
                </td>
                <td className="text-right px-4 py-3 font-mono text-dark-300">{u.total_predictions}</td>
                <td className="text-right px-4 py-3 text-xs text-dark-400">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-xs rounded bg-dark-800 border border-dark-700 disabled:opacity-30 hover:bg-dark-700"
          >
            Prev
          </button>
          <span className="text-xs text-dark-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-xs rounded bg-dark-800 border border-dark-700 disabled:opacity-30 hover:bg-dark-700"
          >
            Next
          </button>
        </div>
      )}

      {/* User Profile Modal */}
      {(profile || profileLoading) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setProfile(null)}>
          <div
            className="bg-dark-900 rounded-2xl border border-dark-700 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {profileLoading ? (
              <div className="p-8 text-center text-dark-500">Loading profile...</div>
            ) : profile && (
              <>
                {/* Header */}
                <div className="p-5 border-b border-dark-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{profile.user.username || `User #${profile.user.id}`}</h2>
                      <p className="text-xs text-dark-400 font-mono mt-0.5">{profile.user.public_id}</p>
                    </div>
                    <button onClick={() => setProfile(null)} className="text-dark-500 hover:text-dark-300 text-lg">
                      x
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] text-dark-500 uppercase">Email</p>
                      <p className="text-dark-200">{profile.user.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-dark-500 uppercase">Phone</p>
                      <p className="text-dark-200">{profile.user.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-dark-500 uppercase">Country</p>
                      <p className="text-dark-200">{FLAG[profile.user.country] || ''} {profile.user.country || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-dark-500 uppercase">Language</p>
                      <p className="text-dark-200">{profile.user.language}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-dark-500 uppercase">Registered</p>
                      <p className="text-dark-200">{profile.user.created_at ? new Date(profile.user.created_at).toLocaleDateString() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-dark-500 uppercase">Days since reg</p>
                      <p className="text-dark-200">{profile.stats.days_since_registration}</p>
                    </div>
                  </div>

                  {/* PRO Status + Toggle */}
                  <div className={`rounded-xl p-4 border ${isPro(profile.user) ? 'bg-purple-500/10 border-purple-500/30' : 'bg-dark-800 border-dark-700'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {isPro(profile.user) ? 'PRO Active' : 'Free User'}
                        </p>
                        {isPro(profile.user) && profile.user.premium_until && (
                          <p className="text-xs text-dark-400 mt-0.5">
                            Until {new Date(profile.user.premium_until).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleTogglePremium}
                        disabled={toggling}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                          isPro(profile.user)
                            ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30'
                            : 'bg-purple-600 text-white hover:bg-purple-500'
                        }`}
                      >
                        {toggling ? '...' : isPro(profile.user) ? 'Deactivate PRO' : 'Activate PRO'}
                      </button>
                    </div>
                  </div>

                  {/* Ban Status */}
                  <div className={`rounded-xl p-4 border ${profile.user.is_banned ? 'bg-red-500/10 border-red-500/30' : 'bg-dark-800 border-dark-700'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {profile.user.is_banned ? 'Banned' : 'Active'}
                        </p>
                        <p className="text-xs text-dark-400 mt-0.5">
                          {profile.user.is_banned ? 'User cannot login or use the app' : 'User has normal access'}
                        </p>
                      </div>
                      <button
                        onClick={handleToggleBan}
                        disabled={banning}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                          profile.user.is_banned
                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/30'
                            : 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30'
                        }`}
                      >
                        {banning ? '...' : profile.user.is_banned ? 'Unban' : 'Ban User'}
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Predictions', value: profile.stats.total_predictions },
                      { label: 'Accuracy', value: `${profile.stats.accuracy}%` },
                      { label: 'Support', value: profile.stats.support_sessions },
                      { label: 'AI Chats', value: profile.stats.ai_sessions },
                    ].map(s => (
                      <div key={s.label} className="bg-dark-800 rounded-lg p-3 text-center border border-dark-700">
                        <p className="text-lg font-bold">{s.value}</p>
                        <p className="text-[10px] text-dark-500">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent Predictions */}
                  {profile.recent_predictions?.length > 0 && (
                    <div>
                      <p className="text-xs text-dark-400 mb-2">Recent Predictions</p>
                      <div className="space-y-1">
                        {profile.recent_predictions.map(p => (
                          <div key={p.id} className="flex items-center justify-between bg-dark-800 rounded-lg px-3 py-2 text-xs border border-dark-700">
                            <span className="text-dark-200">{p.home_team} vs {p.away_team}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-dark-400">{p.bet_type}</span>
                              {p.is_correct === true && <span className="text-green-400">W</span>}
                              {p.is_correct === false && <span className="text-red-400">L</span>}
                              {p.is_correct === null && <span className="text-dark-500">-</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extra info */}
                  <div className="text-[10px] text-dark-500 space-y-1 pt-2 border-t border-dark-700">
                    <p>Referral code: {profile.user.referral_code || '—'} | Referrals: {profile.stats.referrals_count}</p>
                    <p>Daily requests: {profile.user.daily_requests}/{profile.user.daily_limit} | Bonus: {profile.user.bonus_predictions}</p>
                    <p>IP: {profile.user.registration_ip || '—'}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
