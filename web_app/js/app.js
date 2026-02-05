// AI Bet Analyst - Main App
const BET_NAMES = { 'П1': 'Home Win', 'П2': 'Away Win', 'Х': 'Draw', 'ТБ2.5': 'Over 2.5', 'ТМ2.5': 'Under 2.5', 'BTTS': 'Both Teams Score', '1X': 'Home/Draw', 'X2': 'Away/Draw', '12': 'No Draw' };

// ===== LOCAL PREDICTION STORAGE =====
const predStorage = {
  KEY: 'ai_predictions',
  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
    catch { return []; }
  },
  save(pred) {
    const all = this.getAll();
    all.unshift({ ...pred, saved_at: new Date().toISOString() });
    if (all.length > 50) all.length = 50;
    localStorage.setItem(this.KEY, JSON.stringify(all));
  },
  clear() { localStorage.removeItem(this.KEY); }
};

// ===== CHAT STORAGE =====
const chatStorage = {
  KEY: 'ai_chat_history',
  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
    catch { return []; }
  },
  add(msg) {
    const all = this.getAll();
    all.push(msg);
    if (all.length > 100) all.splice(0, all.length - 100);
    localStorage.setItem(this.KEY, JSON.stringify(all));
  },
  clear() { localStorage.removeItem(this.KEY); }
};

const app = {
  user: null,
  loaded: {},
  matchesCache: null,
  activeLeague: null,
  homeSlide: 0,
  homeSlideCount: 0,
  homeSlideTimer: null,
  chatSending: false,

  async init() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    router.init();
    if (api.isLoggedIn()) {
      this.user = await api.getUser();
      if (!this.user) api.logout();
    }
    this.updateAuthUI();
  },

  updateAuthUI() {
    const authOverlay = document.getElementById('auth-overlay');
    if (!api.isLoggedIn()) {
      authOverlay.classList.add('show');
    } else {
      authOverlay.classList.remove('show');
    }
  },

  showLogin() {
    document.getElementById('auth-overlay').classList.add('show');
  },

  async onPageShow(page) {
    // Stop home slider when leaving home
    if (page !== 'home' && this.homeSlideTimer) {
      clearInterval(this.homeSlideTimer);
      this.homeSlideTimer = null;
    }
    switch (page) {
      case 'home': await this.loadHome(); break;
      case 'matches': await this.loadMatches(); break;
      case 'ai': this.loadAI(); break;
      case 'bets': this.loadBets(); break;
      case 'profile': this.loadProfile(); break;
    }
  },

  // ========================================
  // ===== HOME PAGE — SLIDER + FEATURES ====
  // ========================================
  async loadHome() {
    const slider = document.getElementById('home-slider');
    const dots = document.getElementById('home-slider-dots');
    const statsEl = document.getElementById('home-stats');
    const featEl = document.getElementById('home-features');
    const recentEl = document.getElementById('home-recent');
    const proEl = document.getElementById('home-pro');

    // 1) Load slider - top match per league
    slider.innerHTML = '<div class="slide"><div class="loader"><div class="spinner"></div></div></div>';
    dots.innerHTML = '';

    const matches = await api.getUpcomingMatches(7);
    const topMatches = this._pickTopMatches(matches || []);

    if (topMatches.length > 0) {
      this.homeSlide = 0;
      this.homeSlideCount = topMatches.length;
      slider.innerHTML = topMatches.map((m, i) => `
        <div class="slide ${i === 0 ? 'active' : ''}" data-idx="${i}">
          <div class="slide-league">
            <span class="badge-sm">${esc(m.league)}</span>
          </div>
          <div class="slide-match" onclick="app.showMatchDetail(${m.id})">
            <div class="slide-team">
              <div class="slide-logo">${logoImg(m.home_team, 'hero')}</div>
              <div class="slide-team-name">${esc(m.home_team.name)}</div>
            </div>
            <div class="slide-center">
              <div class="slide-vs">VS</div>
              <div class="slide-date">${fmtDate(m.match_date)}</div>
            </div>
            <div class="slide-team">
              <div class="slide-logo">${logoImg(m.away_team, 'hero')}</div>
              <div class="slide-team-name">${esc(m.away_team.name)}</div>
            </div>
          </div>
          <div class="slide-cta" onclick="app.showMatchDetail(${m.id})">
            <span class="material-symbols-outlined" style="font-size:16px">psychology</span>
            Get AI Analysis
          </div>
        </div>
      `).join('');

      dots.innerHTML = topMatches.map((_, i) =>
        `<div class="slider-dot ${i === 0 ? 'active' : ''}" onclick="app.goSlide(${i})"></div>`
      ).join('');

      // Auto-rotate every 8 seconds
      if (this.homeSlideTimer) clearInterval(this.homeSlideTimer);
      if (topMatches.length > 1) {
        this.homeSlideTimer = setInterval(() => this.slideHome(1), 8000);
      }
    } else {
      slider.innerHTML = `<div class="slide active">
        <div class="empty" style="padding:30px 20px">
          <div class="empty-icon"><span class="material-symbols-outlined">sports_soccer</span></div>
          <p class="empty-title">No upcoming matches</p>
        </div>
      </div>`;
    }

    // 2) Quick stats
    if (api.isLoggedIn() && this.user) {
      const localPreds = predStorage.getAll();
      const totalP = Math.max(this.user.total_predictions || 0, localPreds.length);
      const acc = totalP > 0 ? Math.round(((this.user.correct_predictions || 0) / totalP) * 100) : 0;
      statsEl.innerHTML = `
        <div class="section-label">YOUR STATS</div>
        <div class="stats-grid">
          <div class="card stat-box"><div class="stat-val" style="color:var(--green)">${totalP}</div><div class="stat-lbl">Predictions</div></div>
          <div class="card stat-box"><div class="stat-val" style="color:var(--cyan)">${this.user.correct_predictions || 0}</div><div class="stat-lbl">Correct</div></div>
          <div class="card stat-box"><div class="stat-val" style="color:var(--gold)">${acc}%</div><div class="stat-lbl">Accuracy</div></div>
        </div>`;
    } else {
      statsEl.innerHTML = '';
    }

    // 3) Features
    featEl.innerHTML = `
      <div class="feat-card" onclick="router.go('ai')">
        <div class="feat-icon"><span class="material-symbols-outlined">smart_toy</span></div>
        <div class="feat-info">
          <div class="feat-title">AI Chat</div>
          <div class="feat-desc">Claude AI + ML-powered match analysis</div>
        </div>
        <span class="material-symbols-outlined feat-arrow">chevron_right</span>
      </div>
      <div class="feat-card" onclick="router.go('matches')">
        <div class="feat-icon" style="background:linear-gradient(135deg,var(--cyan),#0097A7)"><span class="material-symbols-outlined">sports_soccer</span></div>
        <div class="feat-info">
          <div class="feat-title">Match Analysis</div>
          <div class="feat-desc">H2H stats, real odds & ensemble ML predictions</div>
        </div>
        <span class="material-symbols-outlined feat-arrow">chevron_right</span>
      </div>
      <div class="feat-card" onclick="app.showPro()">
        <div class="feat-icon" style="background:linear-gradient(135deg,var(--gold),var(--orange))"><span class="material-symbols-outlined">star</span></div>
        <div class="feat-info">
          <div class="feat-title">PRO Features</div>
          <div class="feat-desc">Unlimited picks, BTTS, Over/Under & more</div>
        </div>
        <span class="material-symbols-outlined feat-arrow">chevron_right</span>
      </div>
      <div class="feat-card" onclick="router.go('bets')">
        <div class="feat-icon" style="background:linear-gradient(135deg,#7C4DFF,#651FFF)"><span class="material-symbols-outlined">receipt_long</span></div>
        <div class="feat-info">
          <div class="feat-title">Bet Tracker</div>
          <div class="feat-desc">Track predictions & results</div>
        </div>
        <span class="material-symbols-outlined feat-arrow">chevron_right</span>
      </div>
    `;

    // 4) Recent AI picks (last 3)
    const recentPreds = predStorage.getAll().slice(0, 3);
    if (recentPreds.length > 0) {
      recentEl.innerHTML = `<div class="section-label">RECENT AI PICKS</div>` +
        recentPreds.map((p) => this.renderPredictionCard(p)).join('') +
        `<div style="text-align:center;margin-top:4px">
          <span style="font-size:12px;color:var(--green);cursor:pointer;font-weight:600" onclick="router.go('bets')">View all predictions &rarr;</span>
        </div>`;
    } else {
      recentEl.innerHTML = '';
    }

    // 5) PRO banner (if not premium)
    if (!this.user?.is_premium) {
      proEl.innerHTML = `
        <div class="home-pro-banner" onclick="app.showPro()">
          <div class="pro-banner-icon"><span class="material-symbols-outlined" style="font-size:28px;color:#000">star</span></div>
          <div class="pro-banner-text">
            <div style="font-weight:800;font-size:14px;color:#000">Upgrade to PRO</div>
            <div style="font-size:11px;color:rgba(0,0,0,0.6)">Unlimited AI predictions & advanced analysis</div>
          </div>
          <span class="material-symbols-outlined" style="color:#000;font-size:20px">chevron_right</span>
        </div>`;
    } else {
      proEl.innerHTML = '';
    }
  },

  _pickTopMatches(matches) {
    // Pick 1 match per league — the earliest scheduled match
    const seen = {};
    const result = [];
    for (const m of matches) {
      const lg = m.league;
      if (!seen[lg] && m.status !== 'finished') {
        seen[lg] = true;
        result.push(m);
        if (result.length >= 6) break;
      }
    }
    return result;
  },

  slideHome(dir) {
    if (this.homeSlideCount <= 1) return;
    this.homeSlide = (this.homeSlide + dir + this.homeSlideCount) % this.homeSlideCount;
    this.goSlide(this.homeSlide);
  },

  goSlide(idx) {
    this.homeSlide = idx;
    document.querySelectorAll('#home-slider .slide').forEach((s, i) => {
      s.classList.toggle('active', i === idx);
    });
    document.querySelectorAll('#home-slider-dots .slider-dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });
    // Reset auto-timer
    if (this.homeSlideTimer) clearInterval(this.homeSlideTimer);
    if (this.homeSlideCount > 1) {
      this.homeSlideTimer = setInterval(() => this.slideHome(1), 8000);
    }
  },

  // ========================================
  // ===== MATCHES PAGE =====================
  // ========================================
  async loadMatches() {
    const tab = document.querySelector('#matches-tabs .tab-item.active')?.dataset.tab || 'today';
    await this.loadMatchTab(tab);
  },

  switchMatchTab(el) {
    document.querySelectorAll('#matches-tabs .tab-item').forEach((t) => t.classList.remove('active'));
    el.classList.add('active');
    this.activeLeague = null;
    this.loadMatchTab(el.dataset.tab);
  },

  async loadMatchTab(tab) {
    const c = document.getElementById('matches-content');
    c.innerHTML = '<div class="loader"><div class="spinner"></div>Loading...</div>';
    let data;
    if (tab === 'today') data = await api.getTodayMatches();
    else if (tab === 'tomorrow') data = await api.getTomorrowMatches();
    else if (tab === 'upcoming') data = await api.getUpcomingMatches(14);
    this.matchesCache = data || [];
    this.activeLeague = null;
    this.renderMatchesPage(c, this.matchesCache);
  },

  filterByLeague(league) {
    this.activeLeague = this.activeLeague === league ? null : league;
    const c = document.getElementById('matches-content');
    document.querySelectorAll('.league-chip').forEach((ch) => {
      ch.classList.toggle('active', ch.dataset.league === this.activeLeague);
    });
    if (!this.activeLeague) {
      this.renderMatchCards(c, this.matchesCache);
    } else {
      const filtered = this.matchesCache.filter((m) => m.league === this.activeLeague);
      this.renderMatchCards(c, filtered);
    }
  },

  renderMatchesPage(container, matches) {
    if (!matches || matches.length === 0) {
      container.innerHTML = `<div class="empty">
        <div class="empty-icon"><span class="material-symbols-outlined">sports_soccer</span></div>
        <p class="empty-title">No matches available</p>
      </div>`;
      return;
    }
    const leagues = [...new Set(matches.map((m) => m.league))].sort();
    let html = '<div class="league-chips">';
    html += `<div class="league-chip ${!this.activeLeague ? 'active' : ''}" onclick="app.filterByLeague(null)">All</div>`;
    leagues.forEach((lg) => {
      html += `<div class="league-chip ${this.activeLeague === lg ? 'active' : ''}" data-league="${esc(lg)}" onclick="app.filterByLeague('${esc(lg)}')">${shortLeague(lg)}</div>`;
    });
    html += '</div><div id="matches-cards"></div>';
    container.innerHTML = html;
    this.renderMatchCards(document.getElementById('matches-cards'), matches);
  },

  renderMatchCards(container, matches) {
    if (!matches || matches.length === 0) {
      container.innerHTML = `<div class="empty" style="padding:30px 20px"><p class="empty-title">No matches in this league</p></div>`;
      return;
    }
    const grouped = {};
    matches.forEach((m) => {
      const league = m.league || 'Other';
      if (!grouped[league]) grouped[league] = [];
      grouped[league].push(m);
    });
    let html = '';
    for (const [league, lm] of Object.entries(grouped)) {
      html += `<div class="league-group"><div class="league-group-header"><span class="league-group-name">${esc(league)}</span><span class="league-group-count">${lm.length}</span></div>`;
      lm.forEach((m) => { html += this.renderFifaCard(m); });
      html += '</div>';
    }
    container.innerHTML = html;
  },

  // ========================================
  // ===== AI PAGE — CHAT + HISTORY =========
  // ========================================
  loadAI() {
    const c = document.getElementById('ai-content');
    const activeTab = c.querySelector('.tab-item.active')?.dataset.tab;

    c.innerHTML = `
      <div id="ai-tabs" class="tab-bar">
        <div class="tab-item ${activeTab !== 'history' ? 'active' : ''}" data-tab="chat" onclick="app.switchAITab(this)">
          <span class="material-symbols-outlined" style="font-size:16px">smart_toy</span> Chat
        </div>
        <div class="tab-item ${activeTab === 'history' ? 'active' : ''}" data-tab="history" onclick="app.switchAITab(this)">
          <span class="material-symbols-outlined" style="font-size:16px">history</span> History
        </div>
      </div>
      <div id="ai-tab-content"></div>
    `;

    this.switchAITab(c.querySelector('.tab-item.active'));
  },

  switchAITab(el) {
    document.querySelectorAll('#ai-tabs .tab-item').forEach((t) => t.classList.remove('active'));
    el.classList.add('active');
    const tab = el.dataset.tab;
    if (tab === 'chat') this._renderChat();
    else this._renderHistory();
  },

  _renderChat() {
    const c = document.getElementById('ai-tab-content');
    const history = chatStorage.getAll();

    let messagesHtml = '';
    if (history.length === 0) {
      messagesHtml = `
        <div class="chat-welcome">
          <div class="chat-welcome-icon"><span class="material-symbols-outlined">smart_toy</span></div>
          <div class="chat-welcome-title">AI Football Analyst</div>
          <div class="chat-welcome-desc">Powered by Claude AI + ML predictions. Ask me about matches, get analysis, tips, or any football question!</div>
        </div>`;
    } else {
      messagesHtml = history.map((m) => this._renderChatBubble(m)).join('');
    }

    c.innerHTML = `
      <div class="chat-container">
        <div class="chat-messages" id="chat-messages">
          ${messagesHtml}
        </div>
        <div class="chat-suggestions" id="chat-suggestions">
          <div class="chat-sug" onclick="app.sendChatSuggestion('Today\\'s matches')">Today's matches</div>
          <div class="chat-sug" onclick="app.sendChatSuggestion('Give me tips')">Give me tips</div>
          <div class="chat-sug" onclick="app.sendChatSuggestion('PL standings')">PL standings</div>
          <div class="chat-sug" onclick="app.sendChatSuggestion('Upcoming matches')">Upcoming</div>
        </div>
        <div class="chat-input-bar">
          <input type="text" id="chat-input" placeholder="Ask about matches, tips..." autocomplete="off"
                 onkeydown="if(event.key==='Enter')app.sendChat()">
          <button class="chat-send-btn" onclick="app.sendChat()" id="chat-send-btn">
            <span class="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>`;

    // Scroll to bottom
    const msgEl = document.getElementById('chat-messages');
    if (msgEl) msgEl.scrollTop = msgEl.scrollHeight;
  },

  _renderChatBubble(msg) {
    if (msg.role === 'user') {
      return `<div class="chat-bubble chat-user"><div class="chat-text">${esc(msg.text)}</div></div>`;
    }
    // Bot message - render markdown from Claude AI response
    let html = msg.text || '';
    html = esc(html);
    // Markdown rendering: bold, italic, headers, bullets, code
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/^### (.*?)$/gm, '<div style="font-weight:700;font-size:13px;margin:8px 0 4px;color:var(--green)">$1</div>');
    html = html.replace(/^## (.*?)$/gm, '<div style="font-weight:800;font-size:14px;margin:10px 0 4px;color:var(--green)">$1</div>');
    html = html.replace(/^• (.*?)$/gm, '<div style="padding-left:12px">• $1</div>');
    html = html.replace(/^- (.*?)$/gm, '<div style="padding-left:12px">• $1</div>');
    html = html.replace(/`(.*?)`/g, '<code style="background:rgba(0,230,118,0.1);padding:1px 4px;border-radius:3px;font-size:12px">$1</code>');
    html = html.replace(/---/g, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:8px 0">');
    html = html.replace(/\n/g, '<br>');
    return `<div class="chat-bubble chat-bot">
      <div class="chat-bot-avatar"><span class="material-symbols-outlined" style="font-size:16px;color:var(--green)">smart_toy</span></div>
      <div class="chat-text">${html}</div>
    </div>`;
  },

  sendChatSuggestion(text) {
    document.getElementById('chat-input').value = text;
    this.sendChat();
  },

  async sendChat() {
    if (this.chatSending) return;
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    if (!api.isLoggedIn()) {
      this.showLogin();
      return;
    }

    this.chatSending = true;
    input.value = '';

    // Add user message
    chatStorage.add({ role: 'user', text, ts: Date.now() });

    const msgEl = document.getElementById('chat-messages');
    // Remove welcome if present
    const welcome = msgEl.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    msgEl.insertAdjacentHTML('beforeend', this._renderChatBubble({ role: 'user', text }));
    msgEl.insertAdjacentHTML('beforeend', `<div class="chat-bubble chat-bot chat-typing" id="chat-typing">
      <div class="chat-bot-avatar"><span class="material-symbols-outlined" style="font-size:16px;color:var(--green)">smart_toy</span></div>
      <div class="chat-text"><div class="typing-dots"><span></span><span></span><span></span></div></div>
    </div>`);
    msgEl.scrollTop = msgEl.scrollHeight;

    // Hide suggestions while loading
    const sugEl = document.getElementById('chat-suggestions');
    sugEl.style.display = 'none';

    const resp = await api.sendChat(text);

    // Remove typing indicator
    const typing = document.getElementById('chat-typing');
    if (typing) typing.remove();

    if (resp && resp.response) {
      chatStorage.add({ role: 'bot', text: resp.response, ts: Date.now() });
      msgEl.insertAdjacentHTML('beforeend', this._renderChatBubble({ role: 'bot', text: resp.response }));

      // If matches context returned, show match suggestion chips
      if (resp.matches_context && resp.matches_context.length > 0) {
        sugEl.innerHTML = resp.matches_context.slice(0, 4).map((m) => {
          const name = `${m.home_team || m.homeTeam || ''} vs ${m.away_team || m.awayTeam || ''}`;
          return `<div class="chat-sug" onclick="app.sendChatSuggestion('Analyze ${esc(name)}')">${esc(name)}</div>`;
        }).join('');
      }
    } else {
      const errMsg = "Sorry, I couldn't process that. Please try again.";
      chatStorage.add({ role: 'bot', text: errMsg, ts: Date.now() });
      msgEl.insertAdjacentHTML('beforeend', this._renderChatBubble({ role: 'bot', text: errMsg }));
    }

    sugEl.style.display = '';
    msgEl.scrollTop = msgEl.scrollHeight;
    this.chatSending = false;
  },

  clearChat() {
    chatStorage.clear();
    this._renderChat();
  },

  _renderHistory() {
    const c = document.getElementById('ai-tab-content');
    const preds = predStorage.getAll();

    if (preds.length > 0) {
      c.innerHTML = `<div class="pred-count">${preds.length} prediction${preds.length > 1 ? 's' : ''}</div>` +
        preds.map((p) => this.renderPredictionCard(p)).join('');
    } else {
      c.innerHTML = `<div class="empty">
        <div class="empty-icon"><span class="material-symbols-outlined">psychology</span></div>
        <p class="empty-title">No AI predictions yet</p>
        <p class="empty-sub">Open a match and tap "Get AI Analysis"</p>
      </div>`;
    }
  },

  // ========================================
  // ===== BETS PAGE ========================
  // ========================================
  loadBets() {
    const c = document.getElementById('bets-content');
    const preds = predStorage.getAll();

    if (preds.length > 0) {
      c.innerHTML = preds.map((p) => `
        <div class="card bet-card">
          <div class="bet-match">${esc(p.home_team)} vs ${esc(p.away_team)}</div>
          <div class="bet-meta">
            <span class="badge-sm">${esc(p.league || '')}</span>
            <span class="bet-date">${fmtDate(p.saved_at || p.created_at)}</span>
          </div>
          <div class="bet-row">
            <div class="bet-type">${BET_NAMES[p.bet_type] || p.bet_name || p.bet_type}</div>
            <div class="bet-conf ${confClass(p.confidence)}">${Math.round(p.confidence)}%</div>
            <div class="bet-odds">${p.odds ? parseFloat(p.odds).toFixed(2) : '-'}</div>
          </div>
        </div>
      `).join('');
    } else {
      c.innerHTML = `<div class="empty">
        <div class="empty-icon"><span class="material-symbols-outlined">receipt_long</span></div>
        <p class="empty-title">No betting history yet</p>
        <p class="empty-sub">Your AI predictions will appear here</p>
      </div>`;
    }
  },

  // ========================================
  // ===== PROFILE PAGE =====================
  // ========================================
  loadProfile() {
    const c = document.getElementById('profile-content');
    if (!api.isLoggedIn() || !this.user) {
      c.innerHTML = `<div class="empty">
        <div class="empty-icon"><span class="material-symbols-outlined">person</span></div>
        <p class="empty-title">Sign in to view profile</p>
        <button class="btn btn-primary" style="max-width:200px;margin:16px auto 0" onclick="app.showLogin()">Sign In</button>
      </div>`;
      return;
    }
    const u = this.user;
    const localPreds = predStorage.getAll();
    const totalP = Math.max(u.total_predictions || 0, localPreds.length);
    const acc = totalP > 0 ? Math.round(((u.correct_predictions || 0) / totalP) * 100) : 0;
    c.innerHTML = `
      <div class="card-glow profile-header">
        <div class="profile-avatar">${(u.username || u.email)[0].toUpperCase()}</div>
        <div class="profile-info">
          <div class="profile-name">${esc(u.username || 'User')}</div>
          <div class="profile-email">${esc(u.email)}</div>
        </div>
        ${u.is_premium ? '<div class="badge-pro">PRO</div>' : ''}
      </div>

      <div class="section-label">STATISTICS</div>
      <div class="stats-grid">
        <div class="card stat-box"><div class="stat-val" style="color:var(--green)">${totalP}</div><div class="stat-lbl">Predictions</div></div>
        <div class="card stat-box"><div class="stat-val" style="color:var(--cyan)">${u.correct_predictions || 0}</div><div class="stat-lbl">Correct</div></div>
        <div class="card stat-box"><div class="stat-val" style="color:var(--gold)">${acc}%</div><div class="stat-lbl">Accuracy</div></div>
      </div>

      <div class="section-label">SETTINGS</div>
      <div class="settings-group">
        <div class="si" onclick="app.editSetting('min_odds','Min Odds',${u.min_odds})"><span class="material-symbols-outlined si-ic">trending_down</span><span class="si-lb">Min Odds</span><span class="si-val" id="val-min_odds">${u.min_odds}</span><span class="material-symbols-outlined si-chev">chevron_right</span></div>
        <div class="si" onclick="app.editSetting('max_odds','Max Odds',${u.max_odds})"><span class="material-symbols-outlined si-ic">trending_up</span><span class="si-lb">Max Odds</span><span class="si-val" id="val-max_odds">${u.max_odds}</span><span class="material-symbols-outlined si-chev">chevron_right</span></div>
        <div class="si" onclick="app.editRisk()"><span class="material-symbols-outlined si-ic">warning</span><span class="si-lb">Risk Level</span><span class="si-val" id="val-risk">${u.risk_level?.toUpperCase() || 'MEDIUM'}</span><span class="material-symbols-outlined si-chev">chevron_right</span></div>
      </div>

      ${!u.is_premium ? `
      <div class="premium-cta" style="margin-top:20px" onclick="app.showPro()">
        <span class="material-symbols-outlined" style="font-size:24px;color:#000">star</span>
        <div><div style="font-weight:700;color:#000">Upgrade to PRO</div><div style="font-size:12px;color:rgba(0,0,0,0.7)">Unlimited predictions</div></div>
        <span class="material-symbols-outlined" style="color:#000;margin-left:auto">chevron_right</span>
      </div>` : ''}

      <button class="btn btn-outline" style="margin-top:20px" onclick="app.doLogout()">
        <span class="material-symbols-outlined">logout</span> Sign Out
      </button>
    `;
  },

  // ===== SETTINGS EDIT =====
  editSetting(key, label, current) {
    const overlay = document.getElementById('edit-overlay');
    overlay.innerHTML = `
      <div class="edit-box">
        <div class="edit-title">${label}</div>
        <input type="number" id="edit-input" value="${current}" step="0.1" min="1.0" max="10.0">
        <div class="edit-actions">
          <button class="btn btn-outline" style="flex:1" onclick="app.closeEdit()">Cancel</button>
          <button class="btn btn-primary" style="flex:1" onclick="app.saveSetting('${key}')">Save</button>
        </div>
      </div>`;
    overlay.classList.add('show');
  },

  editRisk() {
    const overlay = document.getElementById('edit-overlay');
    const current = this.user?.risk_level || 'medium';
    overlay.innerHTML = `
      <div class="edit-box">
        <div class="edit-title">Risk Level</div>
        <div class="risk-options">
          <div class="risk-opt ${current === 'low' ? 'active' : ''}" data-val="low" onclick="app.selectRisk(this)">
            <span class="material-symbols-outlined" style="color:var(--green)">shield</span>
            <span>Low</span>
          </div>
          <div class="risk-opt ${current === 'medium' ? 'active' : ''}" data-val="medium" onclick="app.selectRisk(this)">
            <span class="material-symbols-outlined" style="color:var(--gold)">balance</span>
            <span>Medium</span>
          </div>
          <div class="risk-opt ${current === 'high' ? 'active' : ''}" data-val="high" onclick="app.selectRisk(this)">
            <span class="material-symbols-outlined" style="color:var(--red)">local_fire_department</span>
            <span>High</span>
          </div>
        </div>
        <div class="edit-actions">
          <button class="btn btn-outline" style="flex:1" onclick="app.closeEdit()">Cancel</button>
          <button class="btn btn-primary" style="flex:1" onclick="app.saveRisk()">Save</button>
        </div>
      </div>`;
    overlay.classList.add('show');
  },

  selectRisk(el) {
    document.querySelectorAll('.risk-opt').forEach((o) => o.classList.remove('active'));
    el.classList.add('active');
  },

  async saveSetting(key) {
    const val = parseFloat(document.getElementById('edit-input').value);
    if (isNaN(val)) return;
    const data = {};
    data[key] = val;
    const result = await api.updateUser(data);
    if (result) {
      this.user[key] = val;
      const valEl = document.getElementById(`val-${key}`);
      if (valEl) valEl.textContent = val;
    }
    this.closeEdit();
  },

  async saveRisk() {
    const active = document.querySelector('.risk-opt.active');
    if (!active) return;
    const val = active.dataset.val;
    const result = await api.updateUser({ risk_level: val });
    if (result) {
      this.user.risk_level = val;
      const valEl = document.getElementById('val-risk');
      if (valEl) valEl.textContent = val.toUpperCase();
    }
    this.closeEdit();
  },

  closeEdit() {
    document.getElementById('edit-overlay').classList.remove('show');
  },

  // ===== PRO MODAL =====
  showPro() {
    document.getElementById('pro-overlay').classList.add('show');
  },
  closePro() {
    document.getElementById('pro-overlay').classList.remove('show');
  },

  async doLogout() {
    api.logout();
    this.user = null;
    this.updateAuthUI();
  },

  // ===== MATCH DETAIL =====
  async showMatchDetail(matchId) {
    const overlay = document.getElementById('match-detail-overlay');
    const content = document.getElementById('match-detail-content');
    overlay.classList.add('show');
    content.innerHTML = '<div class="loader"><div class="spinner"></div>Loading match details...</div>';

    const match = await api.getMatch(matchId);
    if (!match) {
      content.innerHTML = '<div class="empty"><p class="empty-title">Failed to load match</p></div>';
      return;
    }

    // Store match data for AI analysis
    this._currentMatch = match;

    const h2h = match.head_to_head;

    content.innerHTML = `
      <div class="match-hero">
        <div class="hero-team">
          <div class="hero-shield">${logoImg(match.home_team, 'hero')}</div>
          <div class="hero-team-name">${esc(match.home_team.name)}</div>
        </div>
        <div class="hero-center">
          ${match.status === 'finished'
            ? `<div class="hero-score">${match.home_score ?? 0} - ${match.away_score ?? 0}</div>`
            : `<div class="hero-vs">VS</div>`}
          <div class="hero-league">${esc(match.league)}</div>
          <div class="hero-date">${fmtDateFull(match.match_date)}</div>
        </div>
        <div class="hero-team">
          <div class="hero-shield">${logoImg(match.away_team, 'hero')}</div>
          <div class="hero-team-name">${esc(match.away_team.name)}</div>
        </div>
      </div>

      ${h2h && h2h.total_matches > 0 ? `
      <div class="section-label">HEAD TO HEAD</div>
      <div class="card-glow h2h-section">
        <div class="h2h-row"><span class="h2h-label">Total Matches</span><span class="h2h-value">${h2h.total_matches}</span></div>
        <div class="h2h-row"><span class="h2h-label">${esc(match.home_team.name)} Wins</span><span class="h2h-value h2h-green">${h2h.home_wins}</span></div>
        <div class="h2h-row"><span class="h2h-label">Draws</span><span class="h2h-value h2h-gold">${h2h.draws}</span></div>
        <div class="h2h-row"><span class="h2h-label">${esc(match.away_team.name)} Wins</span><span class="h2h-value h2h-cyan">${h2h.away_wins}</span></div>
        <div class="h2h-bar">
          <div class="h2h-bar-home" style="width:${pct(h2h.home_wins, h2h.total_matches)}%"></div>
          <div class="h2h-bar-draw" style="width:${pct(h2h.draws, h2h.total_matches)}%"></div>
          <div class="h2h-bar-away" style="width:${pct(h2h.away_wins, h2h.total_matches)}%"></div>
        </div>
        <div class="h2h-bar-labels">
          <span style="color:var(--green)">${pct(h2h.home_wins, h2h.total_matches)}%</span>
          <span style="color:var(--gold)">${pct(h2h.draws, h2h.total_matches)}%</span>
          <span style="color:var(--cyan)">${pct(h2h.away_wins, h2h.total_matches)}%</span>
        </div>
      </div>` : ''}

      <div class="section-label">AI ANALYSIS</div>
      <div id="detail-prediction">
        ${api.isLoggedIn()
          ? `<button class="btn btn-ai" onclick="app.getMatchPrediction(${matchId})">
               <span class="material-symbols-outlined">psychology</span> Get AI Analysis
             </button>`
          : `<div class="card" style="text-align:center;padding:20px">
               <p style="color:var(--text-sec);margin-bottom:12px">Sign in to access AI predictions</p>
               <button class="btn btn-primary" style="max-width:200px;margin:0 auto" onclick="app.showLogin()">Sign In</button>
             </div>`}
      </div>
    `;
  },

  async getMatchPrediction(matchId) {
    const c = document.getElementById('detail-prediction');
    c.innerHTML = '<div class="loader"><div class="spinner"></div><div style="margin-top:8px;color:var(--green);font-size:13px">Claude AI analyzing match...</div></div>';

    const match = this._currentMatch;
    const homeName = match?.home_team?.name || 'Home';
    const awayName = match?.away_team?.name || 'Away';
    const leagueCode = match?.league_code || match?.competition?.code || '';
    const matchDate = match?.match_date || '';

    // Call real Claude AI via /chat/send with match context
    const matchInfo = {
      match_id: String(matchId),
      home_team: homeName,
      away_team: awayName,
      league_code: leagueCode,
      match_date: matchDate,
    };

    const message = `Analyze the match ${homeName} vs ${awayName}`;
    const resp = await api.sendChat(message, matchInfo);

    if (!resp || !resp.response) {
      c.innerHTML = `<div class="card" style="text-align:center;padding:20px">
        <p style="color:var(--red)">Failed to get AI analysis</p>
        <button class="btn btn-outline" style="margin-top:10px;max-width:200px;margin:10px auto 0" onclick="app.getMatchPrediction(${matchId})">Retry</button>
      </div>`;
      return;
    }

    // Save to local prediction storage
    predStorage.save({
      id: matchId,
      match_id: matchId,
      home_team: homeName,
      away_team: awayName,
      league: match?.league || '',
      analysis: resp.response,
      created_at: new Date().toISOString(),
    });

    // Render Claude AI response with markdown
    let html = esc(resp.response);
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/^### (.*?)$/gm, '<div style="font-weight:700;font-size:13px;margin:8px 0 4px;color:var(--green)">$1</div>');
    html = html.replace(/^## (.*?)$/gm, '<div style="font-weight:800;font-size:14px;margin:10px 0 4px;color:var(--green)">$1</div>');
    html = html.replace(/^• (.*?)$/gm, '<div style="padding-left:12px">• $1</div>');
    html = html.replace(/^- (.*?)$/gm, '<div style="padding-left:12px">• $1</div>');
    html = html.replace(/`(.*?)`/g, '<code style="background:rgba(0,230,118,0.1);padding:1px 4px;border-radius:3px;font-size:12px">$1</code>');
    html = html.replace(/---/g, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:8px 0">');
    html = html.replace(/\n/g, '<br>');

    c.innerHTML = `
      <div class="card-glow ai-prediction-card" style="padding:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <span class="material-symbols-outlined" style="font-size:20px;color:var(--green)">smart_toy</span>
          <span style="font-weight:700;font-size:15px;color:var(--green)">AI Analysis</span>
          <span style="margin-left:auto;font-size:11px;padding:3px 8px;background:rgba(0,230,118,0.15);border-radius:10px;color:var(--green);font-weight:600">Claude AI</span>
        </div>
        <div class="ai-response-text" style="font-size:13px;line-height:1.6;color:var(--text)">${html}</div>
      </div>

      <button class="btn btn-outline" style="margin-top:12px" onclick="app.getMatchPrediction(${matchId})">
        <span class="material-symbols-outlined">refresh</span> New Analysis
      </button>
    `;
  },

  closeDetail() {
    document.getElementById('match-detail-overlay').classList.remove('show');
  },

  // ===== RENDERERS =====
  renderFifaCard(m) {
    return `
      <div class="fifa-card" onclick="app.showMatchDetail(${m.id})">
        <div class="fifa-time">${fmtDate(m.match_date)}</div>
        <div class="fifa-body">
          <div class="fifa-team">
            <div class="fifa-logo">${logoImg(m.home_team, 'card')}</div>
            <span class="fifa-name">${esc(m.home_team.name)}</span>
          </div>
          <div class="fifa-center">
            ${m.status === 'finished'
              ? `<span class="fifa-score">${m.home_score ?? 0} - ${m.away_score ?? 0}</span>`
              : `<span class="fifa-vs">VS</span>`}
          </div>
          <div class="fifa-team fifa-team-right">
            <div class="fifa-logo">${logoImg(m.away_team, 'card')}</div>
            <span class="fifa-name">${esc(m.away_team.name)}</span>
          </div>
        </div>
        <div class="fifa-footer">
          <span class="material-symbols-outlined" style="font-size:14px;color:var(--green)">psychology</span>
          <span class="fifa-analyze">AI Analysis</span>
          <span class="material-symbols-outlined" style="font-size:16px;color:var(--text-muted)">chevron_right</span>
        </div>
      </div>`;
  },

  renderPredictionCard(p) {
    // New Claude AI analysis format
    if (p.analysis) {
      let preview = p.analysis.substring(0, 150).replace(/\*\*/g, '').replace(/\n/g, ' ');
      if (p.analysis.length > 150) preview += '...';
      return `
        <div class="card ai-card">
          <div class="ai-card-header">
            <span class="ai-card-match">${esc(p.home_team)} vs ${esc(p.away_team)}</span>
            <span class="badge-sm" style="background:rgba(0,230,118,0.15);color:var(--green)">Claude AI</span>
          </div>
          <div style="font-size:12px;color:var(--text-sec);line-height:1.5;padding:8px 0">${esc(preview)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${new Date(p.created_at).toLocaleDateString()}</div>
        </div>
      `;
    }
    // Legacy structured prediction format
    return `
      <div class="card ai-card">
        <div class="ai-card-header">
          <span class="ai-card-match">${esc(p.home_team)} vs ${esc(p.away_team)}</span>
          <span class="badge-sm">${esc(p.league || '')}</span>
        </div>
        <div class="ai-card-body">
          <div>
            <div class="ai-card-label">AI PICK</div>
            <div class="ai-card-bet">${BET_NAMES[p.bet_type] || p.bet_name || p.bet_type}</div>
          </div>
          <div class="ai-card-conf ${confClass(p.confidence)}">
            <span class="ai-card-pct">${Math.round(p.confidence)}%</span>
            <span class="ai-card-pct-label">confidence</span>
          </div>
        </div>
        ${p.odds ? `<div class="ai-card-odds">Odds: ${parseFloat(p.odds).toFixed(2)}</div>` : ''}
        ${p.reasoning ? `<div class="ai-card-reason">${esc(p.reasoning)}</div>` : ''}
      </div>
    `;
  },
};

// ===== HELPERS =====
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function confClass(v) { if (v >= 75) return 'conf-high'; if (v >= 60) return 'conf-med'; return 'conf-low'; }
function pct(v, total) { return total > 0 ? Math.round(v / total * 100) : 0; }

function shortLeague(name) {
  const map = { 'Premier League': 'PL', 'Primera Division': 'LaLiga', 'Bundesliga': 'BL', 'Serie A': 'SA', 'Ligue 1': 'L1', 'Champions League': 'UCL', 'Europa League': 'UEL' };
  return map[name] || name.substring(0, 6);
}

function logoImg(team, size) {
  const sz = size === 'hero' ? 56 : 36;
  const fallbackSz = size === 'hero' ? 36 : 24;
  if (team.logo) {
    return `<img src="${team.logo}" alt="" style="width:${sz}px;height:${sz}px;object-fit:contain" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="logo-fallback" style="display:none"><span class="material-symbols-outlined" style="font-size:${fallbackSz}px;color:var(--green);opacity:.6">shield</span></div>`;
  }
  return `<div class="logo-fallback"><span class="material-symbols-outlined" style="font-size:${fallbackSz}px;color:var(--green);opacity:.6">shield</span></div>`;
}

function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  const todayStr = now.toDateString();
  const tmrw = new Date(now); tmrw.setDate(tmrw.getDate() + 1);
  if (dt.toDateString() === todayStr) return 'Today ' + fmtTime(d);
  if (dt.toDateString() === tmrw.toDateString()) return 'Tomorrow ' + fmtTime(d);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + fmtTime(d);
}

function fmtDateFull(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + fmtTime(d);
}

// ===== AUTH =====
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const pass = document.getElementById('auth-pass').value;
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Signing in...';
  api.login(email, pass).then(async (ok) => {
    btn.disabled = false; btn.textContent = 'Sign In';
    if (ok) {
      app.user = await api.getUser();
      app.updateAuthUI();
      router.go('home');
      app.loadHome();
    } else {
      document.getElementById('auth-error').textContent = 'Invalid email or password';
    }
  });
}

function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('reg-email').value;
  const pass = document.getElementById('reg-pass').value;
  const user = document.getElementById('reg-user').value;
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Creating...';
  api.register(email, pass, user).then(async (ok) => {
    btn.disabled = false; btn.textContent = 'Create Account';
    if (ok) {
      app.user = await api.getUser();
      app.updateAuthUI();
      router.go('home');
      app.loadHome();
    } else {
      document.getElementById('reg-error').textContent = 'Registration failed. Email may already exist.';
    }
  });
}

function showRegForm() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
}
function showLoginForm() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('register-form').style.display = 'none';
}
function skipAuth() {
  document.getElementById('auth-overlay').classList.remove('show');
}

// Boot
window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
