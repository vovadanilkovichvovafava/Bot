// API Integration for AI Bet Analyst PWA
const API_BASE = 'https://appbot-production-152e.up.railway.app/api/v1';

const api = {
  token: localStorage.getItem('token') || null,

  setToken(t) {
    this.token = t;
    if (t) localStorage.setItem('token', t);
    else localStorage.removeItem('token');
  },

  async request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (this.token) opts.headers['Authorization'] = `Bearer ${this.token}`;
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${path}`, opts);
      if (res.status === 401) {
        this.setToken(null);
        if (window.app) window.app.showLogin();
        return null;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      console.error(`API ${method} ${path}:`, e.message);
      return null;
    }
  },

  // Auth
  async login(email, password) {
    const data = await this.request('POST', '/auth/login', { email, password });
    if (data?.access_token) {
      this.setToken(data.access_token);
      return true;
    }
    return false;
  },

  async register(email, password, username) {
    const data = await this.request('POST', '/auth/register', { email, password, username });
    if (data?.access_token) {
      this.setToken(data.access_token);
      return true;
    }
    return false;
  },

  logout() {
    this.setToken(null);
  },

  isLoggedIn() {
    return !!this.token;
  },

  // User
  async getUser() {
    return await this.request('GET', '/users/me');
  },

  async updateUser(data) {
    return await this.request('PATCH', '/users/me', data);
  },

  // Matches
  async getTodayMatches(league) {
    const q = league ? `?league=${league}` : '';
    return await this.request('GET', `/matches/today${q}`);
  },

  async getTomorrowMatches(league) {
    const q = league ? `?league=${league}` : '';
    return await this.request('GET', `/matches/tomorrow${q}`);
  },

  async getUpcomingMatches(days = 7, league) {
    let q = `?days=${days}`;
    if (league) q += `&league=${league}`;
    return await this.request('GET', `/matches/upcoming${q}`);
  },

  async getMatch(id) {
    return await this.request('GET', `/matches/${id}`);
  },

  async getLeagues() {
    return await this.request('GET', '/matches/leagues');
  },

  async getStandings(leagueCode) {
    return await this.request('GET', `/matches/standings/${leagueCode}`);
  },

  // Predictions
  async getPrediction(matchId) {
    return await this.request('POST', `/predictions/${matchId}`);
  },

  async getPredictionHistory(limit = 20) {
    return await this.request('GET', `/predictions/history?limit=${limit}`);
  },

  // Chat
  async sendChat(message, matchId = null) {
    const body = { message };
    if (matchId) body.match_id = matchId;
    return await this.request('POST', '/chat/', body);
  },
};

window.api = api;
