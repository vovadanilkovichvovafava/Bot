/**
 * BookmakerApi - Service for 1Win integration via bkproxy
 * Uses existing bkproxy-production.up.railway.app
 */

const BKPROXY_URL = import.meta.env.VITE_BKPROXY_URL || 'https://bkproxy-production.up.railway.app';

class BookmakerApi {
  constructor() {
    this.baseUrl = BKPROXY_URL;
    this.sessionId = localStorage.getItem('bk_session_id') || null;
  }

  // Helper for making requests
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add session ID if available
    if (this.sessionId) {
      headers['X-Session-Id'] = this.sessionId;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    // Check for new session ID in response
    if (data.sessionId) {
      this.setSession(data.sessionId);
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  }

  // Session management
  setSession(sessionId) {
    this.sessionId = sessionId;
    localStorage.setItem('bk_session_id', sessionId);
  }

  clearSession() {
    this.sessionId = null;
    localStorage.removeItem('bk_session_id');
  }

  hasSession() {
    return !!this.sessionId;
  }

  // ==================== AUTH ====================

  /**
   * Login to bookmaker account
   * @param {string} login - Phone or email
   * @param {string} password
   * @param {object} captchaResponse - Optional Geetest captcha response
   */
  async login(login, password, captchaResponse = null) {
    const body = { login, password };

    if (captchaResponse) {
      body.captchaResponseV4 = captchaResponse;
    }

    const result = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return result;
  }

  /**
   * Register new bookmaker account
   * @param {object} params - Registration params
   * @param {string} params.email - Email (optional)
   * @param {string} params.phone - Phone (optional, but email or phone required)
   * @param {string} params.password - Password
   * @param {string} params.currency - Currency code (USD, EUR, etc.)
   * @param {object} params.captchaResponseV4 - Optional Geetest captcha
   */
  async register(params) {
    const result = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    return result;
  }

  /**
   * Logout from bookmaker
   */
  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.clearSession();
    }
  }

  // ==================== USER ====================

  /**
   * Get current user profile
   */
  async getUser() {
    return this.request('/api/user');
  }

  /**
   * Get user balance
   */
  async getBalance() {
    return this.request('/api/balance');
  }

  // ==================== BETTING ====================

  /**
   * Place a bet
   * @param {object} params - Bet parameters
   * @param {string} params.oddId - Odd ID from match
   * @param {number} params.amount - Bet amount
   * @param {string} params.currencyCode - Currency code
   */
  async placeBet({ oddId, amount, currencyCode = 'EUR' }) {
    return this.request('/api/bets/place', {
      method: 'POST',
      body: JSON.stringify({
        coupons: [{
          oddId,
          amount,
          currencyCode,
        }],
      }),
    });
  }

  /**
   * Place multiple bets (express/accumulator)
   * @param {Array} coupons - Array of { oddId, amount, currencyCode }
   */
  async placeBets(coupons) {
    return this.request('/api/bets/place', {
      method: 'POST',
      body: JSON.stringify({ coupons }),
    });
  }

  /**
   * Get betting history
   * @param {object} params - Filter params
   */
  async getBetHistory(params = {}) {
    return this.request('/api/bets/history', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get bet details
   * @param {string} betId - Bet ID
   */
  async getBetDetail(betId) {
    return this.request('/api/bets/detail', {
      method: 'POST',
      body: JSON.stringify({ betId }),
    });
  }

  /**
   * Cash out a bet
   * @param {string} betId - Bet ID to cash out
   */
  async cashoutBet(betId) {
    return this.request('/api/bets/cashout', {
      method: 'POST',
      body: JSON.stringify({ betId }),
    });
  }

  // ==================== MATCHES ====================

  /**
   * Get matches/events
   * @param {object} filters - Match filters
   */
  async getMatches(filters = {}) {
    return this.request('/api/matches', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  }

  /**
   * Get single match details with odds
   * @param {string} matchId - Match ID
   */
  async getMatch(matchId) {
    return this.request(`/api/matches/${matchId}`);
  }

  /**
   * Search matches
   * @param {string} query - Search query
   */
  async searchMatches(query) {
    return this.request(`/api/matches/search?q=${encodeURIComponent(query)}`);
  }

  // ==================== CAPTCHA ====================

  /**
   * Get Geetest captcha config
   * Used when captcha is required for auth
   */
  async getCaptchaConfig() {
    return this.request('/api/captcha/config');
  }
}

// Singleton instance
const bookmakerApi = new BookmakerApi();
export default bookmakerApi;

// Named exports for convenience
export { BookmakerApi, BKPROXY_URL };
