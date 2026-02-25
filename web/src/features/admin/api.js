import { ENV } from '../../shared/config/env';

const API_BASE = ENV.API_URL + '/admin'

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
  getOnlineHistory: () => request('/stats/online-history'),
  getUsersStats: () => request('/stats/users'),
  searchUsers: (q = '', status = '', country = '', sort = 'created_at', page = 1) =>
    request(`/stats/users/search?q=${encodeURIComponent(q)}&status=${status}&country=${country}&sort=${sort}&page=${page}`),
  getUserProfile: (userId) => request(`/stats/users/${userId}/profile`),
  getRetentionStats: () => request('/stats/retention'),
  getPredictionsStats: () => request('/stats/predictions'),
  getMLStats: () => request('/stats/ml'),
  getSupportStats: () => request('/stats/support'),

  // Chats
  getSupportSessions: (limit = 30, offset = 0, q = '', locale = '') =>
    request(`/stats/chats/support-sessions?limit=${limit}&offset=${offset}&q=${encodeURIComponent(q)}&locale=${locale}`),
  getSupportSessionMessages: (sessionId) =>
    request(`/stats/chats/support-sessions/${sessionId}`),
  getAIChatSessions: (limit = 30, offset = 0, q = '', locale = '') =>
    request(`/stats/chats/ai-sessions?limit=${limit}&offset=${offset}&q=${encodeURIComponent(q)}&locale=${locale}`),
  getAIChatSessionMessages: (sessionId) =>
    request(`/stats/chats/ai-sessions/${sessionId}`),
  translateMessages: (messages) =>
    request('/stats/chats/translate', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),
  getChatInsights: () => request('/stats/chats/insights'),

  // PRO Analytics
  getProAnalytics: () => request('/stats/pro'),

  // Traffic Sources
  getTrafficStats: () => request('/stats/traffic'),
}
