import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await register(inviteCode.trim(), email, password, name)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-xl font-bold text-white">
            OP
          </div>
          <h1 className="text-lg font-semibold text-dark-100">Join the team</h1>
          <p className="text-xs text-dark-500 mt-1">Enter your invite code to register</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs text-dark-400 mb-1.5">Invite Code</label>
          <input
            type="text"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            required
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-sm text-dark-100 focus:border-blue-500 focus:outline-none transition-colors font-mono tracking-wide"
            placeholder="adm_Xk9mP2vR7qW4"
          />
        </div>

        <div>
          <label className="block text-xs text-dark-400 mb-1.5">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-sm text-dark-100 focus:border-blue-500 focus:outline-none transition-colors"
            placeholder="John"
          />
        </div>

        <div>
          <label className="block text-xs text-dark-400 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-sm text-dark-100 focus:border-blue-500 focus:outline-none transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-xs text-dark-400 mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-sm text-dark-100 focus:border-blue-500 focus:outline-none transition-colors"
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

        <p className="text-center text-xs text-dark-500">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
