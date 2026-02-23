import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function Dashboard() {
  const { admin } = useAuth()
  const [team, setTeam] = useState([])
  const [invites, setInvites] = useState([])
  const [newInvite, setNewInvite] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api.getTeam().then(setTeam).catch(() => {})
    api.getInvites().then(setInvites).catch(() => {})
  }, [])

  const handleCreateInvite = async (role) => {
    setCreating(true)
    try {
      const inv = await api.createInvite(role, 72)
      setNewInvite(inv)
      // Refresh list
      api.getInvites().then(setInvites).catch(() => {})
    } catch (err) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold">Welcome, {admin?.name}</h1>
        <p className="text-sm text-dark-400 mt-1">
          Role: <span className="text-blue-400">{admin?.role}</span>
        </p>
      </div>

      {/* Quick stats placeholder */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Users', value: '—', color: 'blue' },
          { label: 'Today active', value: '—', color: 'green' },
          { label: 'PRO users', value: '—', color: 'purple' },
          { label: 'AI chats today', value: '—', color: 'amber' },
        ].map(s => (
          <div key={s.label} className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <p className="text-xs text-dark-400">{s.label}</p>
            <p className="text-2xl font-bold mt-1 text-dark-100">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Team */}
      <section>
        <h2 className="text-sm font-semibold text-dark-300 mb-3">Team</h2>
        <div className="bg-dark-800 rounded-xl border border-dark-700 divide-y divide-dark-700">
          {team.map(a => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-dark-500">{a.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  a.role === 'owner' ? 'bg-amber-500/20 text-amber-400' :
                  a.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-dark-600 text-dark-300'
                }`}>
                  {a.role}
                </span>
                {!a.is_active && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                    inactive
                  </span>
                )}
              </div>
            </div>
          ))}
          {team.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-dark-500">Loading...</p>
          )}
        </div>
      </section>

      {/* Invites */}
      {(admin?.role === 'owner' || admin?.role === 'admin') && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-dark-300">Invite Codes</h2>
            <div className="flex gap-2">
              {admin?.role === 'owner' && (
                <button
                  onClick={() => handleCreateInvite('admin')}
                  disabled={creating}
                  className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Admin
                </button>
              )}
              <button
                onClick={() => handleCreateInvite('viewer')}
                disabled={creating}
                className="text-xs bg-dark-700 hover:bg-dark-600 disabled:opacity-50 text-dark-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                + Viewer
              </button>
            </div>
          </div>

          {/* Newly created invite — highlight */}
          {newInvite && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-3">
              <p className="text-xs text-green-400 mb-1">New invite created! Share this code:</p>
              <p className="font-mono text-lg text-green-300 select-all">{newInvite.code}</p>
              <p className="text-xs text-dark-400 mt-2">
                Role: {newInvite.role} &middot; Expires: {new Date(newInvite.expires_at).toLocaleString()}
              </p>
            </div>
          )}

          <div className="bg-dark-800 rounded-xl border border-dark-700 divide-y divide-dark-700">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-mono text-xs text-dark-200">{inv.code}</p>
                  <p className="text-[10px] text-dark-500 mt-0.5">
                    {inv.role} &middot; expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  inv.used_by_id ? 'bg-dark-600 text-dark-400' :
                  inv.is_valid ? 'bg-green-500/20 text-green-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {inv.used_by_id ? 'used' : inv.is_valid ? 'active' : 'expired'}
                </span>
              </div>
            ))}
            {invites.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-dark-500">No invites yet</p>
            )}
          </div>
        </section>
      )}

      {/* Coming soon placeholders */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {['User Chats', 'Match Analytics', 'User Management', 'ML Performance'].map(title => (
          <div key={title} className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6 text-center">
            <p className="text-sm text-dark-500">{title}</p>
            <p className="text-xs text-dark-600 mt-1">Coming soon</p>
          </div>
        ))}
      </section>
    </div>
  )
}
