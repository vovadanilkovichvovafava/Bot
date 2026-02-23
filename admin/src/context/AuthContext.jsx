import { createContext, useContext, useState, useEffect } from 'react'
import { api, setTokens, clearTokens } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('admin_token')
    if (token) {
      api.me()
        .then(data => setAdmin(data))
        .catch(() => { clearTokens(); setAdmin(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const data = await api.login(email, password)
    setTokens(data.access_token, data.refresh_token)
    setAdmin(data.admin)
    return data
  }

  const register = async (inviteCode, email, password, name) => {
    const data = await api.register(inviteCode, email, password, name)
    setTokens(data.access_token, data.refresh_token)
    setAdmin(data.admin)
    return data
  }

  const logout = () => {
    clearTokens()
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, register, logout, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
