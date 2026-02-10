const API_BASE = 'https://appbot-production-152e.up.railway.app/api/v1';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('access_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('access_token');
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
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
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
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
  }

  async register(email, password, username) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    });
    this.setToken(data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
  }

  logout() {
    this.setToken(null);
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
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
}

export const api = new ApiService();
export default api;
