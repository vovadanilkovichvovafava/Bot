// AI Bet Analyst - Main App
const BET_NAMES = { 'П1': 'Home Win', 'П2': 'Away Win', 'Х': 'Draw', 'ТБ2.5': 'Over 2.5', 'ТМ2.5': 'Under 2.5', 'BTTS': 'Both Teams Score', '1X': 'Home/Draw', 'X2': 'Away/Draw', '12': 'No Draw' };

const app = {
  user: null,
  loaded: {},

  async init() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    router.init();
    // Check auth
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
    switch (page) {
      case 'home': await this.loadHome(); break;
      case 'matches': await this.loadMatches(); break;
      case 'ai': await this.loadAI(); break;
      case 'bets': await this.loadBets(); break;
      case 'profile': this.loadProfile(); break;
    }
  },

  // ===== HOME PAGE =====
  async loadHome() {
    const c = document.getElementById('home-matches');
    c.innerHTML = '<div class="loader">Loading matches...</div>';
    const matches = await api.getTodayMatches();
    if (!matches || matches.length === 0) {
      const upcoming = await api.getUpcomingMatches(3);
      this.renderMatchList(c, upcoming || [], 'No matches found');
    } else {
      this.renderMatchList(c, matches, 'No matches today');
    }
  },

  // ===== MATCHES PAGE =====
  async loadMatches() {
    const tab = document.querySelector('#matches-tabs .tab-item.active')?.dataset.tab || 'today';
    await this.loadMatchTab(tab);
  },

  switchMatchTab(el) {
    document.querySelectorAll('#matches-tabs .tab-item').forEach((t) => t.classList.remove('active'));
    el.classList.add('active');
    this.loadMatchTab(el.dataset.tab);
  },

  async loadMatchTab(tab) {
    const c = document.getElementById('matches-content');
    c.innerHTML = '<div class="loader">Loading...</div>';
    let data;
    if (tab === 'today') data = await api.getTodayMatches();
    else if (tab === 'tomorrow') data = await api.getTomorrowMatches();
    else if (tab === 'upcoming') data = await api.getUpcomingMatches(7);
    this.renderMatchList(c, data || [], 'No matches available');
  },

  // ===== AI PAGE =====
  async loadAI() {
    if (!api.isLoggedIn()) { this.showLogin(); return; }
    const c = document.getElementById('ai-content');
    c.innerHTML = '<div class="loader">Loading AI insights...</div>';
    const hist = await api.getPredictionHistory(10);
    if (hist && hist.length > 0) {
      c.innerHTML = hist.map((p) => this.renderPredictionCard(p)).join('');
    } else {
      c.innerHTML = `<div class="empty">
        <span class="material-symbols-outlined" style="font-size:48px;color:var(--green);opacity:0.5">psychology</span>
        <p style="color:var(--text-muted);margin-top:12px">No AI predictions yet</p>
        <p style="color:var(--text-muted);font-size:12px;margin-top:4px">Go to a match and tap "Get AI Prediction"</p>
      </div>`;
    }
  },

  // ===== BETS PAGE =====
  async loadBets() {
    if (!api.isLoggedIn()) { this.showLogin(); return; }
    const c = document.getElementById('bets-content');
    c.innerHTML = '<div class="loader">Loading history...</div>';
    const hist = await api.getPredictionHistory(20);
    if (hist && hist.length > 0) {
      c.innerHTML = hist.map((p) => `
        <div class="card bet-card">
          <div class="bet-match">${esc(p.home_team)} vs ${esc(p.away_team)}</div>
          <div class="bet-meta">
            <span class="badge-sm">${esc(p.league || '')}</span>
            <span class="bet-date">${fmtDate(p.created_at)}</span>
          </div>
          <div class="bet-row">
            <div class="bet-type">${BET_NAMES[p.bet_type] || p.bet_name || p.bet_type}</div>
            <div class="bet-conf ${confClass(p.confidence)}">${Math.round(p.confidence)}%</div>
            <div class="bet-odds">${p.odds?.toFixed(2) || '-'}</div>
          </div>
        </div>
      `).join('');
    } else {
      c.innerHTML = `<div class="empty">
        <span class="material-symbols-outlined" style="font-size:48px;color:var(--green);opacity:0.5">receipt_long</span>
        <p style="color:var(--text-muted);margin-top:12px">No betting history yet</p>
      </div>`;
    }
  },

  // ===== PROFILE PAGE =====
  loadProfile() {
    const c = document.getElementById('profile-content');
    if (!api.isLoggedIn() || !this.user) {
      c.innerHTML = `<div class="empty">
        <span class="material-symbols-outlined" style="font-size:48px;color:var(--green);opacity:0.5">person</span>
        <p style="color:var(--text-muted);margin-top:12px">Log in to see your profile</p>
      </div>`;
      return;
    }
    const u = this.user;
    const acc = u.total_predictions > 0 ? Math.round((u.correct_predictions / u.total_predictions) * 100) : 0;
    c.innerHTML = `
      <div class="card-glow profile-header">
        <div class="profile-avatar">${(u.username || u.email)[0].toUpperCase()}</div>
        <div class="profile-info">
          <div class="profile-name">${esc(u.username || 'User')}</div>
          <div class="profile-email">${esc(u.email)}</div>
        </div>
        ${u.is_premium ? '<div class="badge-pro">PRO</div>' : ''}
      </div>

      <div class="section-label">STATS</div>
      <div class="stats-grid">
        <div class="card stat-box"><div class="stat-val" style="color:var(--green)">${u.total_predictions}</div><div class="stat-lbl">Predictions</div></div>
        <div class="card stat-box"><div class="stat-val" style="color:var(--cyan)">${u.correct_predictions}</div><div class="stat-lbl">Correct</div></div>
        <div class="card stat-box"><div class="stat-val" style="color:var(--gold)">${acc}%</div><div class="stat-lbl">Accuracy</div></div>
      </div>

      <div class="section-label">SETTINGS</div>
      <div class="settings-group">
        <div class="si"><span class="material-symbols-outlined si-ic">trending_down</span><span class="si-lb">Min Odds</span><span class="si-val">${u.min_odds}</span></div>
        <div class="si"><span class="material-symbols-outlined si-ic">trending_up</span><span class="si-lb">Max Odds</span><span class="si-val">${u.max_odds}</span></div>
        <div class="si"><span class="material-symbols-outlined si-ic">warning</span><span class="si-lb">Risk Level</span><span class="si-val">${u.risk_level?.toUpperCase()}</span></div>
      </div>

      ${!u.is_premium ? `
      <div class="premium-cta" style="margin-top:20px">
        <span class="material-symbols-outlined" style="font-size:24px;color:#000">star</span>
        <div><div style="font-weight:700;color:#000">Upgrade to PRO</div><div style="font-size:12px;color:rgba(0,0,0,0.7)">Unlimited predictions</div></div>
        <span class="material-symbols-outlined" style="color:#000;margin-left:auto">chevron_right</span>
      </div>` : ''}

      <button class="btn btn-outline" style="margin-top:20px" onclick="app.doLogout()">
        <span class="material-symbols-outlined">logout</span> Sign Out
      </button>
    `;
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
    content.innerHTML = '<div class="loader">Loading match...</div>';

    const match = await api.getMatch(matchId);
    if (!match) { content.innerHTML = '<p style="color:var(--text-muted)">Failed to load match</p>'; return; }

    const h2h = match.head_to_head;
    content.innerHTML = `
      <div class="detail-header">
        <div class="detail-team">
          <div class="team-shield">${match.home_team.logo ? `<img src="${match.home_team.logo}" alt="" onerror="this.style.display='none'">` : ''}<span class="material-symbols-outlined">shield</span></div>
          <div class="team-name-sm">${esc(match.home_team.name)}</div>
        </div>
        <div class="detail-vs">
          <div class="detail-score">${match.status === 'finished' ? `${match.home_score ?? '-'} - ${match.away_score ?? '-'}` : 'VS'}</div>
          <div class="detail-league">${esc(match.league)}</div>
          <div class="detail-time">${fmtDate(match.match_date)}</div>
        </div>
        <div class="detail-team">
          <div class="team-shield">${match.away_team.logo ? `<img src="${match.away_team.logo}" alt="" onerror="this.style.display='none'">` : ''}<span class="material-symbols-outlined">shield</span></div>
          <div class="team-name-sm">${esc(match.away_team.name)}</div>
        </div>
      </div>

      ${h2h ? `
      <div class="section-label">HEAD TO HEAD</div>
      <div class="card h2h-card">
        <div class="h2h-row"><span>Total Matches</span><span style="font-weight:700">${h2h.total_matches}</span></div>
        <div class="h2h-row"><span>${esc(match.home_team.name)} Wins</span><span style="font-weight:700;color:var(--green)">${h2h.home_wins}</span></div>
        <div class="h2h-row"><span>Draws</span><span style="font-weight:700;color:var(--gold)">${h2h.draws}</span></div>
        <div class="h2h-row"><span>${esc(match.away_team.name)} Wins</span><span style="font-weight:700;color:var(--red)">${h2h.away_wins}</span></div>
      </div>` : ''}

      <div class="section-label">AI PREDICTION</div>
      <div id="detail-prediction">
        <button class="btn btn-primary" onclick="app.getMatchPrediction(${matchId})">
          <span class="material-symbols-outlined">psychology</span> Get AI Prediction
        </button>
      </div>
    `;
  },

  async getMatchPrediction(matchId) {
    const c = document.getElementById('detail-prediction');
    c.innerHTML = '<div class="loader">AI analyzing...</div>';
    const pred = await api.getPrediction(matchId);
    if (!pred) { c.innerHTML = '<p style="color:var(--red)">Failed to get prediction. Please log in.</p>'; return; }
    c.innerHTML = `
      <div class="card-glow ai-pred-card">
        <div class="ai-label">AI PICK</div>
        <div class="ai-bet">${BET_NAMES[pred.bet_type] || pred.bet_name || pred.bet_type}</div>
        <div class="ai-conf ${confClass(pred.confidence)}">${Math.round(pred.confidence)}%</div>
        <div class="ai-conf-label">PROBABILITY</div>
        ${pred.odds ? `<div class="ai-odds">Odds: ${pred.odds.toFixed(2)}</div>` : ''}
        ${pred.reasoning ? `<div class="ai-reasoning">${esc(pred.reasoning)}</div>` : ''}
      </div>
    `;
  },

  closeDetail() {
    document.getElementById('match-detail-overlay').classList.remove('show');
  },

  // ===== RENDERERS =====
  renderMatchList(container, matches, emptyMsg) {
    if (!matches || matches.length === 0) {
      container.innerHTML = `<div class="empty"><span class="material-symbols-outlined" style="font-size:48px;color:var(--green);opacity:0.5">sports_soccer</span><p style="color:var(--text-muted);margin-top:12px">${emptyMsg}</p></div>`;
      return;
    }
    container.innerHTML = matches.map((m) => `
      <div class="card match-card" onclick="app.showMatchDetail(${m.id})">
        <div class="mc-league">
          <span class="badge-sm">${esc(m.league)}</span>
          <span class="mc-time">${fmtDate(m.match_date)}</span>
        </div>
        <div class="mc-body">
          <div class="mc-teams">
            <div class="mc-team">
              <div class="mc-team-logo">${m.home_team.logo ? `<img src="${m.home_team.logo}" alt="" onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>shield</span>'">` : '<span class="material-symbols-outlined">shield</span>'}</div>
              <span class="mc-team-name">${esc(m.home_team.name)}</span>
            </div>
            <div class="mc-vs">${m.status === 'finished' ? `<span class="mc-score">${m.home_score ?? 0} - ${m.away_score ?? 0}</span>` : '<span class="mc-vs-text">VS</span>'}</div>
            <div class="mc-team">
              <div class="mc-team-logo">${m.away_team.logo ? `<img src="${m.away_team.logo}" alt="" onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>shield</span>'">` : '<span class="material-symbols-outlined">shield</span>'}</div>
              <span class="mc-team-name">${esc(m.away_team.name)}</span>
            </div>
          </div>
          <div class="mc-action">
            <span class="material-symbols-outlined" style="color:var(--green)">chevron_right</span>
          </div>
        </div>
      </div>
    `).join('');
  },

  renderPredictionCard(p) {
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
        ${p.odds ? `<div class="ai-card-odds">Odds: ${p.odds.toFixed(2)}</div>` : ''}
        ${p.reasoning ? `<div class="ai-card-reason">${esc(p.reasoning)}</div>` : ''}
      </div>
    `;
  },
};

// Helpers
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function confClass(v) { if (v >= 75) return 'conf-high'; if (v >= 60) return 'conf-med'; return 'conf-low'; }
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  const diff = (dt - now) / 86400000;
  if (diff < 0 && diff > -1) return 'Today ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff >= 0 && diff < 1) return 'Today ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff >= 1 && diff < 2) return 'Tomorrow ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Auth form handlers
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
      document.getElementById('reg-error').textContent = 'Registration failed. Email may exist.';
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
