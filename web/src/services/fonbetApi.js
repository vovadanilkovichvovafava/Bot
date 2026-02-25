/**
 * FonbetApi — Frontend service for Fonbet line data.
 *
 * Работает через наш Python backend (который проксирует через итальянский прокси).
 * НЕ ходит напрямую к Fonbet — всё через /api/v1/fonbet/*.
 *
 * Что даёт:
 * - Все футбольные матчи с реальными коэффициентами Fonbet
 * - Deeplinks на конкретный матч на сайте Fonbet
 * - Matching по командам (API-Football fixture → Fonbet event)
 * - Serie A / Top leagues фильтры
 * - Value bets (Fonbet odds vs API-Football odds)
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://pwa-production-20b5.up.railway.app';

class FonbetApi {
  constructor() {
    this.baseUrl = `${API_BASE}/api/v1/fonbet`;
    this.cache = new Map();
    this.CACHE_TTL = 120_000; // 2 min client-side cache
  }

  // === Internal ===

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  _getCached(key) {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.ts < this.CACHE_TTL) return entry.data;
    this.cache.delete(key);
    return null;
  }

  _setCache(key, data) {
    this.cache.set(key, { data, ts: Date.now() });
    // Limit cache size
    if (this.cache.size > 50) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
  }

  // === Football Events ===

  /**
   * Все футбольные события с коэффициентами.
   * @param {string} lang - en, it, de, pl
   * @returns {Promise<{events: Array, total: number}>}
   */
  async getFootballEvents(lang = 'en') {
    const cacheKey = `football_${lang}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const data = await this.request(`/football?lang=${lang}`);
    this._setCache(cacheKey, data);
    return data;
  }

  /**
   * Матчи из топ-лиг (Serie A, PL, Bundesliga, La Liga, Ligue 1, CL, EL).
   * Идеально для Schedina del Giorno / Daily Pick.
   */
  async getTopLeaguesEvents(lang = 'en') {
    const cacheKey = `top_${lang}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const data = await this.request(`/top-leagues?lang=${lang}`);
    this._setCache(cacheKey, data);
    return data;
  }

  /**
   * Только Serie A (итальянский рынок, 78% юзеров).
   */
  async getSerieAEvents() {
    const cacheKey = 'serie_a';
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const data = await this.request('/serie-a');
    this._setCache(cacheKey, data);
    return data;
  }

  /**
   * Детали одного события (все рынки, все коэффициенты).
   * @param {number} eventId - Fonbet event ID
   */
  async getEventDetail(eventId, lang = 'en') {
    return this.request(`/event/${eventId}?lang=${lang}`);
  }

  // === Match Lookup ===

  /**
   * Найти событие Fonbet по командам.
   *
   * @param {string} homeTeam - "AC Milan"
   * @param {string} awayTeam - "Inter"
   * @param {string} matchDate - ISO date (optional, improves accuracy)
   * @returns {Promise<Object|null>} Fonbet event with odds + deeplink
   *
   * Use cases:
   * - AI Chat: юзер спрашивает "коэф на Milan vs Inter" → deeplink
   * - Match Detail: показать кнопку "Ставить на Fonbet" с deeplink
   * - Value Finder: сравнить odds API-Football vs Fonbet
   */
  async findMatch(homeTeam, awayTeam, matchDate = null) {
    try {
      const body = {
        home_team: homeTeam,
        away_team: awayTeam,
      };
      if (matchDate) body.match_date = matchDate;

      return await this.request('/find-match', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (err) {
      // 404 = not found, not an error
      if (err.message.includes('404')) return null;
      throw err;
    }
  }

  // === Deeplinks ===

  /**
   * Прямая ссылка на матч на Fonbet.
   * Не требует API вызова — генерируется локально.
   *
   * @param {number} tournamentId - ID турнира в Fonbet (e.g., 11960 = Serie A)
   * @param {number} eventId - ID события
   * @returns {string} "https://fonbet001.com/sports/football/11960/62510832"
   */
  generateDeeplink(tournamentId, eventId, sport = 'football') {
    return `https://fonbet001.com/sports/${sport}/${tournamentId}/${eventId}`;
  }

  /**
   * Ссылка через наш прокси (для показа в iframe/webview).
   */
  generateProxyDeeplink(tournamentId, eventId, sport = 'football') {
    const proxyBase = import.meta.env.VITE_FONBET_PROXY_URL
      || 'https://iframe-proxy-poc-production.up.railway.app';
    return `${proxyBase}/fonbet/sports/${sport}/${tournamentId}/${eventId}`;
  }

  // === Helpers ===

  /**
   * Форматировать коэффициенты для отображения.
   *
   * @param {Object} odds - Raw odds from Fonbet event
   * @returns {Object} Formatted odds for UI
   *
   * Input:  {"1": 2.15, "X": 3.40, "2": 3.25, "over_2.5": 1.85, "btts_yes": 1.72}
   * Output: {
   *   main: [{label: "1", value: 2.15}, {label: "X", value: 3.40}, {label: "2", value: 3.25}],
   *   totals: [{label: "O2.5", value: 1.85}, {label: "U2.5", value: 1.95}],
   *   btts: [{label: "Yes", value: 1.72}, {label: "No", value: 2.10}],
   * }
   */
  formatOdds(odds) {
    if (!odds) return { main: [], totals: [], btts: [] };

    const main = [];
    if (odds['1']) main.push({ label: '1', value: odds['1'] });
    if (odds['X']) main.push({ label: 'X', value: odds['X'] });
    if (odds['2']) main.push({ label: '2', value: odds['2'] });

    const totals = [];
    if (odds['over_2.5']) totals.push({ label: 'O2.5', value: odds['over_2.5'] });
    if (odds['under_2.5']) totals.push({ label: 'U2.5', value: odds['under_2.5'] });

    const btts = [];
    if (odds['btts_yes']) btts.push({ label: 'Yes', value: odds['btts_yes'] });
    if (odds['btts_no']) btts.push({ label: 'No', value: odds['btts_no'] });

    return { main, totals, btts };
  }

  /**
   * Получить "лучшие" odds для schedina (daily accumulator).
   *
   * Фильтрует матчи по:
   * - Только сегодня/завтра
   * - Только из топ-лиг
   * - Минимум odds 1.30 (не слишком низкие)
   * - Максимум odds 3.50 (не слишком рискованные)
   *
   * @returns {Array} Top 5-7 selections for daily schedina
   */
  async getDailySchedina(lang = 'it') {
    const { events } = await this.getTopLeaguesEvents(lang);
    const now = Date.now();
    const tomorrow = now + 48 * 60 * 60 * 1000;

    // Filter: today/tomorrow, has odds
    const candidates = events.filter((ev) => {
      if (!ev.start_timestamp || !ev.odds) return false;
      const evTime = ev.start_timestamp * 1000;
      if (evTime < now || evTime > tomorrow) return false;
      // Must have 1X2 odds
      if (!ev.odds['1'] || !ev.odds['X'] || !ev.odds['2']) return false;
      return true;
    });

    // Pick best selections (favorites with value)
    const selections = candidates
      .map((ev) => {
        const odds = ev.odds;
        // Find the "safest" bet with decent odds
        const options = [
          { type: '1', value: odds['1'] },
          { type: 'X', value: odds['X'] },
          { type: '2', value: odds['2'] },
        ];
        // Prefer home/away wins in range 1.30-2.50
        const best = options
          .filter((o) => o.value >= 1.30 && o.value <= 3.50)
          .sort((a, b) => a.value - b.value)[0];

        if (!best) return null;

        return {
          ...ev,
          selection: best.type,
          selectionOdds: best.value,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.selectionOdds - b.selectionOdds)
      .slice(0, 7); // Max 7 selections

    // Calculate accumulator odds
    const accumulatorOdds = selections.reduce((acc, s) => acc * s.selectionOdds, 1);

    return {
      selections,
      accumulatorOdds: Math.round(accumulatorOdds * 100) / 100,
      count: selections.length,
    };
  }

  /**
   * Clear client-side cache.
   */
  clearCache() {
    this.cache.clear();
  }
}

// Singleton
const fonbetApi = new FonbetApi();
export default fonbetApi;

// Named exports
export { FonbetApi };
