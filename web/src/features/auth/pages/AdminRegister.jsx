import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const ADMIN_API = 'https://appbot-production-152e.up.railway.app/api/v1/admin'

export default function AdminRegister() {
  const [searchParams] = useSearchParams()
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') || '')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${ADMIN_API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_code: inviteCode.trim(),
          email,
          password,
          name,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Registration failed')
      }

      const data = await res.json()
      // Save admin tokens
      localStorage.setItem('admin_token', data.access_token)
      localStorage.setItem('admin_refresh_token', data.refresh_token)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-14 h-14 bg-green-600 rounded-2xl mx-auto flex items-center justify-center text-2xl">
            ✓
          </div>
          <h1 className="text-lg font-semibold text-slate-100">Account created</h1>
          <p className="text-sm text-slate-400">
            You are now registered as an admin. The admin dashboard will be available soon.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-xl font-bold text-white">
            OP
          </div>
          <h1 className="text-lg font-semibold text-slate-100">Join the team</h1>
          <p className="text-xs text-slate-500 mt-1">Enter your invite code to register</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Invite Code</label>
          <input
            type="text"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none transition-colors font-mono tracking-wide"
            placeholder="adm_Xk9mP2vR7qW4"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none transition-colors"
            placeholder="John"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none transition-colors"
            placeholder="Min 8 characters"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
