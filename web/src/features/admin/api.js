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
  searchUsers: (q = '', status = '', country = '', sort = 'created_at', page = 1, domain = '') =>
    request(`/stats/users/search?q=${encodeURIComponent(q)}&status=${status}&country=${country}&sort=${sort}&page=${page}&domain=${encodeURIComponent(domain)}`),
  getEmailDomains: () => request('/stats/users/email-domains'),
  getUserProfile: (userId) => request(`/stats/users/${userId}/profile`),
  getDeeplinkSplit: () => request('/stats/users/deeplink-split'),
  getRecentRegistrations: () => request('/stats/users/recent-registrations'),
  getRetentionStats: () => request('/stats/retention'),
  getPredictionsStats: () => request('/stats/predictions'),
  getWcPredictionStats: (until) => request(`/stats/predictions/world-cup${until ? `?until=${encodeURIComponent(until)}` : ''}`),
  getMLStats: () => request('/stats/ml'),
  triggerTraining: () => request('/stats/ml/train', { method: 'POST' }),
  getSupportStats: () => request('/stats/support'),

  // Postback logs
  getPostbackLogs: (q = '', source, event, page = 1) => {
    const params = new URLSearchParams({ page })
    if (q) params.set('q', q)
    if (source) params.set('source', source)
    if (event) params.set('event', event)
    return request(`/stats/postback-logs?${params}`)
  },

  // Chats
  getSupportSessions: (limit = 30, offset = 0, q = '', locale = '') =>
    request(`/stats/chats/support-sessions?limit=${limit}&offset=${offset}&q=${encodeURIComponent(q)}&locale=${locale}`),
  getSupportSessionMessages: (sessionId) =>
    request(`/stats/chats/support-sessions/${sessionId}`),
  replyToSupport: (sessionId, message) =>
    request(`/stats/chats/support-sessions/${sessionId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  getAIChatSessions: (limit = 30, offset = 0, q = '', locale = '') =>
    request(`/stats/chats/ai-sessions?limit=${limit}&offset=${offset}&q=${encodeURIComponent(q)}&locale=${locale}`),
  getAIChatSessionMessages: (sessionId) =>
    request(`/stats/chats/ai-sessions/${sessionId}`),
  replyToAIChat: (sessionId, message) =>
    request(`/stats/chats/ai-sessions/${sessionId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  translateMessages: (messages) =>
    request('/stats/chats/translate', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),
  // Session takeover (auto/manual mode)
  getSessionMode: (sessionId) =>
    request(`/stats/chats/sessions/${sessionId}/mode`),
  toggleTakeover: (sessionId, isTakeover, sourceType = 'support') =>
    request(`/stats/chats/sessions/${sessionId}/takeover`, {
      method: 'POST',
      body: JSON.stringify({ is_takeover: isTakeover, source_type: sourceType }),
    }),
  getChatInsights: () => request('/stats/chats/insights'),

  // PRO Analytics
  getProAnalytics: () => request('/stats/pro'),

  // Traffic Sources
  getTrafficStats: () => request('/stats/traffic'),
  getRecentVisits: (limit = 50, offset = 0) => request(`/stats/recent-visits?limit=${limit}&offset=${offset}`),
  getSessionReplay: (sessionId) => request(`/stats/replay/${sessionId}`),

  // A/B Funnels
  getFunnelStats: () => request('/stats/users/funnel-stats'),
}
