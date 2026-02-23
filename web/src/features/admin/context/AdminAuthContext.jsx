import { createContext, useContext, useState, useEffect } from 'react'
import { adminApi, setTokens, clearTokens } from '../api'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      adminApi.me()
        .then(data => setAdmin(data))
        .catch(() => { clearTokens(); setAdmin(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const data = await adminApi.login(email, password)
    setTokens(data.access_token, data.refresh_token)
    setAdmin(data.admin)
    return data
  }

  const register = async (inviteCode, email, password, name) => {
    const data = await adminApi.register(inviteCode, email, password, name)
    setTokens(data.access_token, data.refresh_token)
    setAdmin(data.admin)
    return data
  }

  const logout = () => {
    clearTokens()
    setAdmin(null)
  }

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, register, logout, isAuthenticated: !!admin }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be inside AdminAuthProvider')
  return ctx
}
