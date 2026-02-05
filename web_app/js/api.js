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

  async getAILimits() {
    return await this.request('GET', '/users/me/ai-limits');
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

  // Chat (Claude AI + ML predictions)
  async sendChat(message, matchInfo = null) {
    // Build chat history from local storage for context
    const stored = JSON.parse(localStorage.getItem('ai_chat_history') || '[]');
    const history = stored.slice(-10).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    const body = {
      message,
      history,
      preferences: this._getUserPrefs(),
    };
    if (matchInfo) body.match_info = matchInfo;

    const resp = await this.request('POST', '/chat/send', body);
    if (resp) return resp;

    // Local fallback when backend unavailable
    return this._localChat(message);
  },

  _getUserPrefs() {
    try {
      const u = window.app?.user;
      if (u) {
        return {
          min_odds: u.min_odds || 1.5,
          max_odds: u.max_odds || 3.0,
          risk_level: u.risk_level || 'medium'
        };
      }
    } catch (e) {}
    return { min_odds: 1.5, max_odds: 3.0, risk_level: 'medium' };
  },

  _localChat(message) {
    const msg = message.toLowerCase();
    let reply = '';

    if (msg.match(/^(hi|hello|hey|привет|здравствуй)/)) {
      reply = "Hello! I'm your AI Football Analyst. Ask me about today's matches, tips, standings, or any football question!";
    } else if (msg.includes('today') || msg.includes('сегодня')) {
      reply = "Let me check today's matches for you. Go to the **Matches** tab to see all scheduled games and get AI analysis for each one!";
    } else if (msg.includes('tomorrow') || msg.includes('завтра')) {
      reply = "Check the **Matches** tab and switch to 'Tomorrow' to see upcoming games!";
    } else if (msg.includes('tip') || msg.includes('совет') || msg.includes('pick')) {
      reply = "For AI-powered tips, open any match from the **Matches** tab and tap **Get AI Analysis**. The AI will analyze H2H data, form, and odds to give you a prediction.";
    } else if (msg.includes('standing') || msg.includes('table') || msg.includes('таблиц')) {
      reply = "League standings are available through the matches section. I can analyze any league for you!";
    } else if (msg.includes('help') || msg.includes('помощь')) {
      reply = "Here's what I can help with:\n\n**Match Analysis** — Ask about any specific match\n**Tips** — Get AI-powered betting recommendations\n**Standings** — League tables and stats\n**General** — Any football question!";
    } else {
      reply = "I'm currently running in offline mode. When connected to the server, I use **Claude AI** with **ML predictions** to give you detailed match analysis. For now, check the **Matches** tab for available games!";
    }

    return { response: reply, matches_context: null };
  },

  // Chat status
  async getChatStatus() {
    return await this.request('GET', '/chat/status');
  },

  // ML Predictions
  async getMLPrediction(matchId, homeTeam, awayTeam, leagueCode, matchDate) {
    return await this.request('POST', '/ml/predict', {
      match_id: matchId,
      home_team: homeTeam,
      away_team: awayTeam,
      league_code: leagueCode,
      match_date: matchDate
    });
  },

  async getMLStatus() {
    return await this.request('GET', '/ml/status');
  },

  // Social
  async getLeaderboard(period = 'weekly', limit = 20) {
    return await this.request('GET', `/social/leaderboard?period=${period}&limit=${limit}`);
  },

  async getSocialFeed(limit = 20) {
    return await this.request('GET', `/social/feed?limit=${limit}`);
  },
};

window.api = api;
