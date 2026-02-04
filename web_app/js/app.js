// AI Bet Analyst - Main App
const BET_NAMES = { 'П1': 'Home Win', 'П2': 'Away Win', 'Х': 'Draw', 'ТБ2.5': 'Over 2.5', 'ТМ2.5': 'Under 2.5', 'BTTS': 'Both Teams Score', '1X': 'Home/Draw', 'X2': 'Away/Draw', '12': 'No Draw' };

const app = {
  user: null,
  loaded: {},

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
    c.innerHTML = '<div class="loader"><div class="spinner"></div>Loading matches...</div>';
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
    c.innerHTML = '<div class="loader"><div class="spinner"></div>Loading...</div>';
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
    c.innerHTML = '<div class="loader"><div class="spinner"></div>Loading AI insights...</div>';
    const hist = await api.getPredictionHistory(10);
    if (hist && hist.length > 0) {
      c.innerHTML = hist.map((p) => this.renderPredictionCard(p)).join('');
    } else {
      c.innerHTML = `<div class="empty">
        <div class="empty-icon"><span class="material-symbols-outlined">psychology</span></div>
        <p class="empty-title">No AI predictions yet</p>
        <p class="empty-sub">Open a match and tap "Get AI Analysis" to generate predictions</p>
      </div>`;
    }
  },

  // ===== BETS PAGE =====
  async loadBets() {
    if (!api.isLoggedIn()) { this.showLogin(); return; }
    const c = document.getElementById('bets-content');
    c.innerHTML = '<div class="loader"><div class="spinner"></div>Loading history...</div>';
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
        <div class="empty-icon"><span class="material-symbols-outlined">receipt_long</span></div>
        <p class="empty-title">No betting history yet</p>
        <p class="empty-sub">Your AI predictions will appear here</p>
      </div>`;
    }
  },

  // ===== PROFILE PAGE =====
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

      <div class="section-label">STATISTICS</div>
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
    content.innerHTML = '<div class="loader"><div class="spinner"></div>Loading match details...</div>';

    const match = await api.getMatch(matchId);
    if (!match) {
      content.innerHTML = '<div class="empty"><p class="empty-title">Failed to load match</p></div>';
      return;
    }

    const h2h = match.head_to_head;
    const homeLogoHTML = match.home_team.logo
      ? `<img src="${match.home_team.logo}" alt="${esc(match.home_team.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const awayLogoHTML = match.away_team.logo
      ? `<img src="${match.away_team.logo}" alt="${esc(match.away_team.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';

    content.innerHTML = `
      <!-- Match Header - FIFA style -->
      <div class="match-hero">
        <div class="hero-team">
          <div class="hero-shield">
            ${homeLogoHTML}
            <div class="shield-fallback" style="${match.home_team.logo ? 'display:none' : ''}">
              <span class="material-symbols-outlined">shield</span>
            </div>
          </div>
          <div class="hero-team-name">${esc(match.home_team.name)}</div>
        </div>

        <div class="hero-center">
          ${match.status === 'finished'
            ? `<div class="hero-score">${match.home_score ?? 0} - ${match.away_score ?? 0}</div>`
            : `<div class="hero-vs">VS</div>`
          }
          <div class="hero-league">${esc(match.league)}</div>
          <div class="hero-date">${fmtDateFull(match.match_date)}</div>
        </div>

        <div class="hero-team">
          <div class="hero-shield">
            ${awayLogoHTML}
            <div class="shield-fallback" style="${match.away_team.logo ? 'display:none' : ''}">
              <span class="material-symbols-outlined">shield</span>
            </div>
          </div>
          <div class="hero-team-name">${esc(match.away_team.name)}</div>
        </div>
      </div>

      <!-- H2H Section -->
      ${h2h && h2h.total_matches > 0 ? `
      <div class="section-label">HEAD TO HEAD</div>
      <div class="card-glow h2h-section">
        <div class="h2h-row">
          <span class="h2h-label">Total Matches</span>
          <span class="h2h-value">${h2h.total_matches}</span>
        </div>
        <div class="h2h-row">
          <span class="h2h-label">${esc(match.home_team.name)} Wins</span>
          <span class="h2h-value h2h-green">${h2h.home_wins}</span>
        </div>
        <div class="h2h-row">
          <span class="h2h-label">Draws</span>
          <span class="h2h-value h2h-gold">${h2h.draws}</span>
        </div>
        <div class="h2h-row">
          <span class="h2h-label">${esc(match.away_team.name)} Wins</span>
          <span class="h2h-value h2h-cyan">${h2h.away_wins}</span>
        </div>

        <!-- H2H Bar Chart -->
        <div class="h2h-bar">
          <div class="h2h-bar-home" style="width:${h2h.total_matches > 0 ? (h2h.home_wins / h2h.total_matches * 100) : 33}%"></div>
          <div class="h2h-bar-draw" style="width:${h2h.total_matches > 0 ? (h2h.draws / h2h.total_matches * 100) : 34}%"></div>
          <div class="h2h-bar-away" style="width:${h2h.total_matches > 0 ? (h2h.away_wins / h2h.total_matches * 100) : 33}%"></div>
        </div>
        <div class="h2h-bar-labels">
          <span style="color:var(--green)">${h2h.total_matches > 0 ? Math.round(h2h.home_wins / h2h.total_matches * 100) : 0}%</span>
          <span style="color:var(--gold)">${h2h.total_matches > 0 ? Math.round(h2h.draws / h2h.total_matches * 100) : 0}%</span>
          <span style="color:var(--cyan)">${h2h.total_matches > 0 ? Math.round(h2h.away_wins / h2h.total_matches * 100) : 0}%</span>
        </div>
      </div>` : ''}

      <!-- AI Prediction Section -->
      <div class="section-label">AI PREDICTION</div>
      <div id="detail-prediction">
        ${api.isLoggedIn()
          ? `<button class="btn btn-ai" onclick="app.getMatchPrediction(${matchId})">
               <span class="material-symbols-outlined">psychology</span>
               Get AI Analysis
             </button>`
          : `<div class="card" style="text-align:center;padding:20px">
               <p style="color:var(--text-sec);margin-bottom:12px">Sign in to access AI predictions</p>
               <button class="btn btn-primary" style="max-width:200px;margin:0 auto" onclick="app.showLogin()">Sign In</button>
             </div>`
        }
      </div>
    `;
  },

  async getMatchPrediction(matchId) {
    const c = document.getElementById('detail-prediction');
    c.innerHTML = '<div class="loader"><div class="spinner"></div>AI analyzing match data...</div>';

    const pred = await api.getPrediction(matchId);
    if (!pred) {
      c.innerHTML = `<div class="card" style="text-align:center;padding:20px">
        <p style="color:var(--red)">Failed to get prediction</p>
        <button class="btn btn-outline" style="margin-top:10px;max-width:200px;margin:10px auto 0" onclick="app.getMatchPrediction(${matchId})">Retry</button>
      </div>`;
      return;
    }

    const betName = BET_NAMES[pred.bet_type] || pred.bet_name || pred.bet_type;
    const confCls = confClass(pred.confidence);
    const factors = pred.factors || {};

    c.innerHTML = `
      <div class="card-glow ai-prediction-card">
        <div class="ai-pick-label">AI PICK</div>
        <div class="ai-pick-bet">${betName}</div>
        <div class="ai-pick-conf ${confCls}">${Math.round(pred.confidence)}%</div>
        <div class="ai-pick-prob-label">PROBABILITY</div>
        ${pred.odds ? `<div class="ai-pick-odds">Odds: ${pred.odds.toFixed(2)}</div>` : ''}
      </div>

      ${factors.home_strength ? `
      <div class="card factor-card">
        <div class="factor-title">ANALYSIS BREAKDOWN</div>
        <div class="factor-row">
          <span class="factor-label">Home Team Strength</span>
          <div class="factor-bar"><div class="factor-fill" style="width:${factors.home_strength}%;background:var(--green)"></div></div>
          <span class="factor-pct">${factors.home_strength}%</span>
        </div>
        <div class="factor-row">
          <span class="factor-label">Away Team Strength</span>
          <div class="factor-bar"><div class="factor-fill" style="width:${factors.away_strength}%;background:var(--cyan)"></div></div>
          <span class="factor-pct">${factors.away_strength}%</span>
        </div>
        <div class="factor-row">
          <span class="factor-label">Draw Probability</span>
          <div class="factor-bar"><div class="factor-fill" style="width:${factors.draw_chance}%;background:var(--gold)"></div></div>
          <span class="factor-pct">${factors.draw_chance}%</span>
        </div>
        <div class="factor-row">
          <span class="factor-label">Goals Potential</span>
          <div class="factor-bar"><div class="factor-fill" style="width:${factors.goals_potential}%;background:var(--orange)"></div></div>
          <span class="factor-pct">${factors.goals_potential}%</span>
        </div>
        ${factors.data_points > 0 ? `<div class="factor-data">Based on ${factors.data_points} historical matches</div>` : ''}
      </div>` : ''}

      ${pred.reasoning ? `
      <div class="card reasoning-card">
        <div class="reasoning-title">
          <span class="material-symbols-outlined" style="font-size:16px;color:var(--green)">auto_awesome</span>
          AI REASONING
        </div>
        <div class="reasoning-text">${esc(pred.reasoning)}</div>
      </div>` : ''}

      <button class="btn btn-outline" style="margin-top:12px" onclick="app.getMatchPrediction(${matchId})">
        <span class="material-symbols-outlined">refresh</span> New Analysis
      </button>
    `;
  },

  closeDetail() {
    document.getElementById('match-detail-overlay').classList.remove('show');
  },

  // ===== RENDERERS =====
  renderMatchList(container, matches, emptyMsg) {
    if (!matches || matches.length === 0) {
      container.innerHTML = `<div class="empty">
        <div class="empty-icon"><span class="material-symbols-outlined">sports_soccer</span></div>
        <p class="empty-title">${emptyMsg}</p>
      </div>`;
      return;
    }

    // Group matches by league
    const grouped = {};
    matches.forEach((m) => {
      const league = m.league || 'Other';
      if (!grouped[league]) grouped[league] = [];
      grouped[league].push(m);
    });

    let html = '';
    for (const [league, leagueMatches] of Object.entries(grouped)) {
      html += `<div class="league-group">
        <div class="league-group-header">
          <span class="league-group-name">${esc(league)}</span>
          <span class="league-group-count">${leagueMatches.length} matches</span>
        </div>`;

      leagueMatches.forEach((m) => {
        const homeLogoHTML = m.home_team.logo
          ? `<img src="${m.home_team.logo}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : '';
        const awayLogoHTML = m.away_team.logo
          ? `<img src="${m.away_team.logo}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : '';

        html += `
          <div class="fifa-card" onclick="app.showMatchDetail(${m.id})">
            <div class="fifa-time">${fmtTime(m.match_date)}</div>
            <div class="fifa-body">
              <div class="fifa-team">
                <div class="fifa-logo">
                  ${homeLogoHTML}
                  <div class="fifa-logo-fallback" style="${m.home_team.logo ? 'display:none' : ''}">
                    <span class="material-symbols-outlined">shield</span>
                  </div>
                </div>
                <span class="fifa-name">${esc(m.home_team.name)}</span>
              </div>

              <div class="fifa-center">
                ${m.status === 'finished'
                  ? `<span class="fifa-score">${m.home_score ?? 0} - ${m.away_score ?? 0}</span>`
                  : `<span class="fifa-vs">VS</span>`
                }
              </div>

              <div class="fifa-team fifa-team-right">
                <div class="fifa-logo">
                  ${awayLogoHTML}
                  <div class="fifa-logo-fallback" style="${m.away_team.logo ? 'display:none' : ''}">
                    <span class="material-symbols-outlined">shield</span>
                  </div>
                </div>
                <span class="fifa-name">${esc(m.away_team.name)}</span>
              </div>
            </div>
            <div class="fifa-footer">
              <span class="material-symbols-outlined" style="font-size:14px;color:var(--green)">psychology</span>
              <span class="fifa-analyze">AI Analysis</span>
              <span class="material-symbols-outlined" style="font-size:16px;color:var(--text-muted)">chevron_right</span>
            </div>
          </div>`;
      });
      html += '</div>';
    }
    container.innerHTML = html;
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

function fmtTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  const diff = (dt - now) / 86400000;
  if (diff < 0 && diff > -1) return 'Today ' + fmtTime(d);
  if (diff >= 0 && diff < 1) return 'Today ' + fmtTime(d);
  if (diff >= 1 && diff < 2) return 'Tomorrow ' + fmtTime(d);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + fmtTime(d);
}

function fmtDateFull(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + fmtTime(d);
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
