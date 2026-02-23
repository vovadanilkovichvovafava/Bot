const API_BASE = 'https://appbot-production-152e.up.railway.app/api/v1/admin'

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
      throw new Error('Session expired')
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const adminApi = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (invite_code, email, password, name) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ invite_code, email, password, name }) }),

  me: () => request('/auth/me'),

  getTeam: () => request('/auth/team'),
  createInvite: (role = 'admin', expires_hours = 72) =>
    request('/auth/invites', { method: 'POST', body: JSON.stringify({ role, expires_hours }) }),
  getInvites: () => request('/auth/invites'),

  // Stats
  getOverview: () => request('/stats/overview'),
  getUsersStats: () => request('/stats/users'),
  getPredictionsStats: () => request('/stats/predictions'),
  getMLStats: () => request('/stats/ml'),
  getSupportStats: () => request('/stats/support'),
}
