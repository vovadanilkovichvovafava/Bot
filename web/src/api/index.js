const API_BASE = 'https://appbot-production-152e.up.railway.app/api/v1';

class ApiService {
  constructor() {
    this._refreshing = null; // prevent parallel refresh calls
    try {
      this.token = localStorage.getItem('access_token');
    } catch {
      this.token = null;
    }
  }

  setToken(token) {
    this.token = token;
    try {
      if (token) {
        localStorage.setItem('access_token', token);
      } else {
        localStorage.removeItem('access_token');
      }
    } catch {
      // localStorage unavailable (private browsing, etc.)
    }
  }

  getToken() {
    try {
      return this.token || localStorage.getItem('access_token');
    } catch {
      return this.token;
    }
  }

  async _tryRefresh() {
    // Deduplicate: if already refreshing, wait for that result
    if (this._refreshing) return this._refreshing;

    this._refreshing = (async () => {
      try {
        let refreshToken = null;
        try { refreshToken = localStorage.getItem('refresh_token'); } catch {}
        if (!refreshToken) return false;

        // Retry up to 2 times on network errors (Railway restart, etc.)
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await fetch(`${API_BASE}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (res.status === 401 || res.status === 403) return false; // Token truly invalid
            if (!res.ok) {
              // Server error — retry
              if (attempt < 2) {
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                continue;
              }
              return false;
            }

            const data = await res.json();
            this.setToken(data.access_token);
            try { localStorage.setItem('refresh_token', data.refresh_token); } catch {}
            try { localStorage.setItem('hasAccount', 'true'); } catch {}
            return true;
          } catch {
            // Network error — retry
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
              continue;
            }
            return false;
          }
        }
        return false;
      } finally {
        this._refreshing = null;
      }
    })();

    return this._refreshing;
  }

  async request(endpoint, options = {}, _isRetry = false, _attempt = 0) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkError) {
      // Network error (offline, DNS fail, Railway restart) — retry up to 2 times
      if (_attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (_attempt + 1))); // 1s, 2s
        return this.request(endpoint, options, _isRetry, _attempt + 1);
      }
      throw new Error('Network error. Please check your connection.');
    }

    if (response.status === 401) {
      // Don't try to refresh on auth endpoints or if already retrying
      if (!_isRetry && !endpoint.startsWith('/auth/')) {
        const refreshed = await this._tryRefresh();
        if (refreshed) {
          // Retry original request with new token — reset _isRetry so future 401s can also refresh
          return this.request(endpoint, options, true);
        }
      }

      // Refresh failed — clear tokens, let AuthContext handle redirect via React Router
      this.setToken(null);
      try { localStorage.removeItem('refresh_token'); } catch {}
      throw new Error('Unauthorized');
    }

    // Retry on 500/502/503/504 (server errors, Railway restart)
    if (response.status >= 500 && _attempt < 2) {
      await new Promise(r => setTimeout(r, 1000 * (_attempt + 1)));
      return this.request(endpoint, options, _isRetry, _attempt + 1);
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      // Handle detail being string or object
      let errorMessage = `HTTP ${response.status}`;
      if (data.detail) {
        errorMessage = typeof data.detail === 'string'
          ? data.detail
          : JSON.stringify(data.detail);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth
  async checkIp() {
    return this.request('/auth/check-ip');
  }

  async login(phone, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    this.setToken(data.access_token);
    try { localStorage.setItem('refresh_token', data.refresh_token); } catch {}
    try { localStorage.setItem('hasAccount', 'true'); } catch {}
    return data;
  }

  async register(phone, password, referralCode = null) {
    const body = { phone, password };
    if (referralCode) body.referral_code = referralCode;
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    this.setToken(data.access_token);
    try { localStorage.setItem('refresh_token', data.refresh_token); } catch {}
    try { localStorage.setItem('hasAccount', 'true'); } catch {}
    return data;
  }

  logout() {
    this.setToken(null);
    try {
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    } catch {}
  }

  // User
  async getMe() {
    return this.request('/users/me');
  }

  async updateMe(data) {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getReferralStats() {
    return this.request('/users/me/referral');
  }

  async getMyPredictions() {
    return this.request('/users/me/predictions');
  }

  async saveMyPredictions(predictions) {
    return this.request('/users/me/predictions', {
      method: 'PUT',
      body: JSON.stringify({ predictions }),
    });
  }

  // Save a single prediction to the predictions DB table (for ML tracking)
  async savePredictionToDB(prediction) {
    return this.request('/predictions/save', {
      method: 'POST',
      body: JSON.stringify(prediction),
    });
  }

  // Get real ML stats from verified predictions
  async getPredictionStats() {
    return this.request('/predictions/stats');
  }

  // Matches
  async getTodayMatches(league) {
    const params = league ? `?league=${league}` : '';
    return this.request(`/matches/today${params}`);
  }

  async getTomorrowMatches(league) {
    const params = league ? `?league=${league}` : '';
    return this.request(`/matches/tomorrow${params}`);
  }

  async getUpcomingMatches(days = 7, league) {
    let params = `?days=${days}`;
    if (league) params += `&league=${league}`;
    return this.request(`/matches/upcoming${params}`);
  }

  async getMatchDetail(matchId) {
    return this.request(`/matches/${matchId}`);
  }

  async getLeagues() {
    return this.request('/matches/leagues');
  }

  async getStandings(leagueCode) {
    return this.request(`/matches/standings/${leagueCode}`);
  }

  // Predictions
  async createPrediction(matchId) {
    return this.request(`/predictions/${matchId}`, { method: 'POST' });
  }

  async getPredictionHistory(limit = 10) {
    return this.request(`/predictions/history?limit=${limit}`);
  }

  // AI Chat (uses Claude AI via predictions/chat endpoint)
  async aiChat(message, history = [], matchContext = null, locale = 'en') {
    const body = { message, history, locale };
    if (matchContext) body.match_context = matchContext;
    return this.request('/predictions/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // AI Chat limit (degressive system: Day1=3, Day2=2, Day3+=1/day)
  async getChatLimit() {
    return this.request('/predictions/chat/limit');
  }

  // Support Chat (AI-powered, no limits)
  async supportChat(message, history = [], locale = 'en', sessionId = '') {
    return this.request('/support/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history, locale, session_id: sessionId }),
    });
  }

  // Guest Support Chat (no auth required — for login page password reset)
  async guestSupportChat(message, history = [], locale = 'en', sessionId = '') {
    const url = `${API_BASE}/support/guest-chat`;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history, locale, session_id: sessionId }),
        });
        if (res.status >= 500 && attempt < 2) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `HTTP ${res.status}`);
        }
        return res.json();
      } catch (e) {
        if (attempt < 2 && !e.message?.startsWith('HTTP')) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw e;
      }
    }
  }
}

export const api = new ApiService();
export default api;
