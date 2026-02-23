import { useState, useEffect } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import { adminApi } from '../api'

export default function AdminDashboard() {
  const { admin } = useAdminAuth()
  const [team, setTeam] = useState([])
  const [invites, setInvites] = useState([])
  const [newInvite, setNewInvite] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    adminApi.getTeam().then(setTeam).catch(() => {})
    adminApi.getInvites().then(setInvites).catch(() => {})
  }, [])

  const handleCreateInvite = async (role) => {
    setCreating(true)
    try {
      const inv = await adminApi.createInvite(role, 72)
      setNewInvite(inv)
      adminApi.getInvites().then(setInvites).catch(() => {})
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
        <p className="text-sm text-slate-400 mt-1">
          Role: <span className="text-blue-400">{admin?.role}</span>
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Users', value: '\u2014', color: 'blue' },
          { label: 'Today active', value: '\u2014', color: 'green' },
          { label: 'PRO users', value: '\u2014', color: 'purple' },
          { label: 'AI chats today', value: '\u2014', color: 'amber' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className="text-2xl font-bold mt-1 text-slate-100">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Team */}
      <section>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Team</h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700">
          {team.map(a => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-slate-500">{a.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  a.role === 'owner' ? 'bg-amber-500/20 text-amber-400' :
                  a.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-slate-600 text-slate-300'
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
            <p className="px-4 py-6 text-center text-sm text-slate-500">Loading...</p>
          )}
        </div>
      </section>

      {/* Invites */}
      {(admin?.role === 'owner' || admin?.role === 'admin') && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300">Invite Codes</h2>
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
                className="text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                + Viewer
              </button>
            </div>
          </div>

          {newInvite && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-3">
              <p className="text-xs text-green-400 mb-1">New invite created! Share this code:</p>
              <p className="font-mono text-lg text-green-300 select-all">{newInvite.code}</p>
              <p className="text-xs text-slate-400 mt-2">
                Role: {newInvite.role} &middot; Expires: {new Date(newInvite.expires_at).toLocaleString()}
              </p>
            </div>
          )}

          <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-mono text-xs text-slate-200">{inv.code}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {inv.role} &middot; expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  inv.used_by_id ? 'bg-slate-600 text-slate-400' :
                  inv.is_valid ? 'bg-green-500/20 text-green-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {inv.used_by_id ? 'used' : inv.is_valid ? 'active' : 'expired'}
                </span>
              </div>
            ))}
            {invites.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No invites yet</p>
            )}
          </div>
        </section>
      )}

      {/* Coming soon */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {['User Chats', 'Match Analytics', 'User Management', 'ML Performance'].map(title => (
          <div key={title} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-xs text-slate-600 mt-1">Coming soon</p>
          </div>
        ))}
      </section>
    </div>
  )
}
