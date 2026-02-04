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

  // Chat — try backend, fallback to local
  async sendChat(message, matchId = null) {
    const body = { message };
    if (matchId) body.match_id = matchId;
    const resp = await this.request('POST', '/chat/', body);
    if (resp) return resp;
    // Fallback: local chat when backend unavailable
    return this._localChat(message);
  },

  _localChat(msg) {
    const t = msg.toLowerCase();
    const w = new Set(t.split(/\s+/));

    // Greeting
    if (['hi','hello','hey','привет','хай'].some(g => w.has(g))) {
      return { reply: "Hey! 👋 I'm your AI Bet Analyst assistant. I can help with:\n\n⚽ Today's & upcoming matches\n💡 Betting tips & analysis\n📊 League standings\n🎯 Match predictions\n\nWhat would you like to know?", suggestions: ["Today's matches","Give me tips","PL standings","Upcoming matches"] };
    }

    // Today
    if (t.includes('today') || t.includes('сегодня')) {
      return { reply: "📅 To see today's matches, go to the **Matches** tab and select **Today**.\n\nI can show you detailed AI analysis for any match — just open it and tap \"Get AI Analysis\"!", suggestions: ["Give me tips","Upcoming matches","PL standings"] };
    }

    // Tomorrow
    if (t.includes('tomorrow') || t.includes('завтра')) {
      return { reply: "📅 Tomorrow's matches are available in the **Matches** tab → **Tomorrow**.\n\nYou can get AI predictions for any upcoming match!", suggestions: ["Today's matches","Tips","Standings"] };
    }

    // Upcoming
    if (t.includes('upcoming') || t.includes('week') || t.includes('ближайш') || t.includes('недел')) {
      return { reply: "📅 Check **Matches** → **Upcoming** for all matches in the next 14 days.\n\nEach match has H2H stats and AI-powered analysis available!", suggestions: ["Today's matches","Tips","PL standings"] };
    }

    // Tips
    if (['tip','tips','совет','советы','ставк','pick','best','лучш'].some(k => t.includes(k))) {
      const tips = [
        "🔥 **Tip #1**: Always check the H2H record before betting. Teams with a dominant H2H history tend to maintain that edge.\n\n💡 **Tip #2**: Under 2.5 goals is often safer in derby matches where teams play cautiously.\n\n🎯 **Tip #3**: Home advantage matters most in leagues like Serie A and Ligue 1.",
        "📊 **Smart Betting Tips**:\n\n1. Don't chase losses — set a daily budget\n2. Value bets > favorites — look for odds that don't match actual probability\n3. BTTS is great for matches between mid-table teams\n4. Use the AI Analysis for each match to see factor breakdowns",
        "🎯 **Today's Strategy**:\n\n• Look for matches where one team has 70%+ H2H win rate\n• Over 2.5 works well in Premier League\n• Double Chance (1X) is the safest bet type\n• Open any match for AI-powered analysis with confidence scores"
      ];
      return { reply: tips[Math.floor(Math.random() * tips.length)] + "\n\n⚠️ Always bet responsibly!", suggestions: ["Today's matches","More tips","Standings"] };
    }

    // Standings
    if (t.includes('standing') || t.includes('table') || t.includes('таблиц') || t.includes('турнир')) {
      return { reply: "📊 League standings are available in the app!\n\nPopular leagues:\n🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League\n🇪🇸 La Liga\n🇩🇪 Bundesliga\n🇮🇹 Serie A\n🇫🇷 Ligue 1\n\nUse the Matches tab to browse by league, and open any match for detailed stats.", suggestions: ["Today's matches","Tips","Upcoming"] };
    }

    // Help
    if (['help','помощь','что умеешь','how','как'].some(k => t.includes(k))) {
      return { reply: "Here's what I can help with:\n\n⚽ **Matches** — Ask about today's, tomorrow's or upcoming matches\n💡 **Tips** — Get betting suggestions and strategies\n📊 **Standings** — League table information\n🎯 **Analysis** — Open any match for AI prediction\n🏆 **Leagues** — PL, LaLiga, Bundesliga, Serie A, Ligue 1\n\nTry: \"Give me tips\" or \"PL standings\"", suggestions: ["Today's matches","Tips","Standings","Upcoming"] };
    }

    // Leagues
    if (['league','лига','premier','laliga','bundesliga','serie','ligue'].some(k => t.includes(k))) {
      return { reply: "🏆 **Available Leagues:**\n\n🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League\n🇪🇸 La Liga\n🇩🇪 Bundesliga\n🇮🇹 Serie A\n🇫🇷 Ligue 1\n🇪🇺 Champions League\n🇪🇺 Europa League\n\nGo to Matches tab and use league filters to browse!", suggestions: ["PL standings","Today's matches","Tips"] };
    }

    // Default
    return { reply: "I'm your AI football assistant! I can help with:\n\n• Match schedules (today/tomorrow/upcoming)\n• Betting tips and strategies\n• League standings\n• AI-powered match analysis\n\nTry asking: \"Give me tips\" or \"Today's matches\"", suggestions: ["Today's matches","Tips","PL standings","Help"] };
  },
};

window.api = api;
