import { useState, useEffect } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import { adminApi } from '../api'

export default function AdminTeam() {
  const { admin } = useAdminAuth()
  const [team, setTeam] = useState([])
  const [invites, setInvites] = useState([])
  const [newInvite, setNewInvite] = useState(null)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminApi.getTeam().catch(() => []),
      adminApi.getInvites().catch(() => []),
    ]).then(([t, inv]) => {
      setTeam(t)
      setInvites(inv)
      setLoading(false)
    })
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

  const copyInviteLink = (code) => {
    const url = `${window.location.origin}/admin/registration?code=${code}`
    navigator.clipboard.writeText(url).catch(() => {})
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Team</h1>
        <p className="text-sm text-slate-500 mt-1">Manage admin access and invite codes</p>
      </div>

      {/* Team members */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold">Members ({team.length})</h3>
        </div>
        <div className="divide-y divide-slate-800/50">
          {team.map(a => (
            <div key={a.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                  {a.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    a.role === 'owner' ? 'bg-amber-500/20 text-amber-400' :
                    a.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {a.role}
                  </span>
                  {!a.is_active && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded ml-1.5">
                      inactive
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-600 whitespace-nowrap">
                  {a.last_login ? `Last: ${new Date(a.last_login).toLocaleDateString()}` : 'Never logged in'}
                </p>
              </div>
            </div>
          ))}
          {team.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-600">No team members</p>
          )}
        </div>
      </div>

      {/* Invite codes */}
      {(admin?.role === 'owner' || admin?.role === 'admin') && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Invite Codes</h3>
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

          {/* New invite highlight */}
          {newInvite && (
            <div className="mx-5 mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <p className="text-xs text-green-400 mb-2">New invite created! Share this link:</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm text-green-300 select-all flex-1 truncate">
                  {window.location.origin}/admin/registration?code={newInvite.code}
                </p>
                <button
                  onClick={() => copyInviteLink(newInvite.code)}
                  className="text-xs bg-green-600/20 text-green-400 px-2.5 py-1.5 rounded-lg hover:bg-green-600/30 transition-colors whitespace-nowrap"
                >
                  Copy
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Role: {newInvite.role} &middot; Expires: {new Date(newInvite.expires_at).toLocaleString()}
              </p>
            </div>
          )}

          <div className="divide-y divide-slate-800/50">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <p className="font-mono text-xs text-slate-300">{inv.code}</p>
                  <span className="text-[10px] text-slate-600">
                    {inv.role} &middot; exp {new Date(inv.expires_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    inv.used_by_id ? 'bg-slate-700 text-slate-500' :
                    inv.is_valid ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {inv.used_by_id ? 'used' : inv.is_valid ? 'active' : 'expired'}
                  </span>
                  {!inv.used_by_id && inv.is_valid && (
                    <button
                      onClick={() => copyInviteLink(inv.code)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      copy link
                    </button>
                  )}
                </div>
              </div>
            ))}
            {invites.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-600">No invites yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
