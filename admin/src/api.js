const API_BASE = import.meta.env.VITE_API_BASE || 'https://appbot-production-152e.up.railway.app/api/v1/admin'

function getToken() {
  try { return localStorage.getItem('admin_token') } catch { return null }
}

function getRefreshToken() {
  try { return localStorage.getItem('admin_refresh_token') } catch { return null }
}

export function setTokens(access, refresh) {
  localStorage.setItem('admin_token', access)
  localStorage.setItem('admin_refresh_token', refresh)
}

export function clearTokens() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_refresh_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  // Auto-refresh on 401
  if (res.status === 401 && getRefreshToken()) {
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: getRefreshToken() }),
    })
    if (refreshRes.ok) {
      const data = await refreshRes.json()
      setTokens(data.access_token, data.refresh_token)
      headers['Authorization'] = `Bearer ${data.access_token}`
      res = await fetch(`${API_BASE}${path}`, { ...options, headers })
    } else {
      clearTokens()
      window.location.href = '/login'
      throw new Error('Session expired')
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// ── Auth ────────────────────────────
export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (invite_code, email, password, name) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ invite_code, email, password, name }) }),

  me: () => request('/auth/me'),

  // ── Team ────────────────────────────
  getTeam: () => request('/auth/team'),
  createInvite: (role = 'admin', expires_hours = 72) =>
    request('/auth/invites', { method: 'POST', body: JSON.stringify({ role, expires_hours }) }),
  getInvites: () => request('/auth/invites'),

  // ── Stats ────────────────────────────
  getOverview: () => request('/stats/overview'),
  getTrafficStats: () => request('/stats/traffic'),

  // ── Users ────────────────────────────
  searchUsers: (q = '', status, country, page = 1) => {
    const params = new URLSearchParams({ q, page })
    if (status) params.set('status', status)
    if (country) params.set('country', country)
    return request(`/stats/users/search?${params}`)
  },
  getUserProfile: (userId) => request(`/stats/users/${userId}/profile`),
  togglePremium: (userId, days = 15) =>
    request(`/stats/users/${userId}/toggle-premium`, {
      method: 'POST',
      body: JSON.stringify(days),
    }),
  toggleBan: (userId) =>
    request(`/stats/users/${userId}/toggle-ban`, { method: 'POST' }),
  exportUsersCSV: async (status, country) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (country) params.set('country', country)
    const token = getToken()
    const res = await fetch(`${API_BASE}/stats/users/export-csv?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Export failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = res.headers.get('content-disposition')?.split('filename=')[1] || 'users.csv'
    a.click()
    URL.revokeObjectURL(url)
  },

  // ── Postback Logs ────────────────────
  getPostbackLogs: (q = '', source, event, page = 1) => {
    const params = new URLSearchParams({ q, page })
    if (source) params.set('source', source)
    if (event) params.set('event', event)
    return request(`/stats/postback-logs?${params}`)
  },

  // ── Banner Clicks ────────────────────
  getBannerClicks: () => request('/stats/banner-clicks'),
}
