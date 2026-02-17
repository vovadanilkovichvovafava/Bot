const API_BASE = 'https://appbot-production-152e.up.railway.app/api/v1';

class ApiService {
  constructor() {
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

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      try { localStorage.removeItem('refresh_token'); } catch {}
      try {
        const hasAccount = localStorage.getItem('hasAccount') === 'true';
        window.location.href = hasAccount ? '/login' : '/register';
      } catch {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
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

  async login(identifier, password) {
    // identifier can be email or phone number
    const body = { password };
    if (identifier.includes('@')) {
      body.email = identifier;
    } else {
      body.phone = identifier;
    }
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    this.setToken(data.access_token);
    try { localStorage.setItem('refresh_token', data.refresh_token); } catch {}
    return data;
  }

  async register(email, password, username, referralCode = null, phone = null) {
    const body = { email, password, username };
    if (referralCode) body.referral_code = referralCode;
    if (phone) body.phone = phone;
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    this.setToken(data.access_token);
    try { localStorage.setItem('refresh_token', data.refresh_token); } catch {}
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
  async aiChat(message, history = [], matchContext = null) {
    const body = { message, history };
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
  async supportChat(message, history = [], locale = 'en') {
    return this.request('/support/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history, locale }),
    });
  }
}

export const api = new ApiService();
export default api;
