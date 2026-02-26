/**
 * Fonbet API Client — fetches real odds, live scores, deeplinks
 * from our backend (which proxies to Fonbet via iframe-proxy).
 *
 * Frontend → Our Backend (/api/v1/fonbet/*) → iframe-proxy → Fonbet
 *
 * Client-side cache: 120s TTL, max 50 entries.
 */

import { ENV } from '../shared/config/env';

const API_BASE = ENV.API_URL; // e.g. https://pwa-production-20b5.up.railway.app/api/v1

// ---------------------------------------------------------------------------
// Client-side cache
// ---------------------------------------------------------------------------

const CACHE_TTL = 120_000; // 2 minutes
const CACHE_MAX = 50;
const _cache = new Map();

function _getCached(key) {
  const entry = _cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return entry.data;
  }
  if (entry) _cache.delete(key);
  return null;
}

function _setCache(key, data) {
  // Evict oldest if at capacity
  if (_cache.size >= CACHE_MAX) {
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
  _cache.set(key, { data, ts: Date.now() });
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function _request(path, options = {}) {
  const url = `${API_BASE}/fonbet${path}`;

  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.warn(`[FonbetAPI] ${res.status} ${path}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.warn(`[FonbetAPI] Network error ${path}:`, err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API methods
// ---------------------------------------------------------------------------

/**
 * All football events (~3000) with odds and deeplinks.
 * @param {string} lang - Language: en, it, de, pl
 * @returns {Promise<{events: Array, total: number, live_count: number}|null>}
 */
async function getFootballEvents(lang = 'en') {
  const key = `football_${lang}`;
  const cached = _getCached(key);
  if (cached) return cached;

  const data = await _request(`/football?lang=${lang}`);
  if (data) _setCache(key, data);
  return data;
}

/**
 * Top leagues only: Serie A, PL, Bundesliga, La Liga, Ligue 1, CL, EL, Ekstraklasa.
 * @param {string} lang
 * @returns {Promise<{events: Array, total: number, live_count: number}|null>}
 */
async function getTopLeaguesEvents(lang = 'en') {
  const key = `top_${lang}`;
  const cached = _getCached(key);
  if (cached) return cached;

  const data = await _request(`/top-leagues?lang=${lang}`);
  if (data) _setCache(key, data);
  return data;
}

/**
 * Serie A events only.
 * @returns {Promise<{events: Array, total: number, live_count: number}|null>}
 */
async function getSerieAEvents() {
  const key = 'serie_a';
  const cached = _getCached(key);
  if (cached) return cached;

  const data = await _request('/serie-a');
  if (data) _setCache(key, data);
  return data;
}

/**
 * Live football events with scores, timer, periods.
 * @param {string} lang
 * @returns {Promise<{events: Array, total: number, live_count: number}|null>}
 */
async function getLiveEvents(lang = 'en') {
  const key = `live_${lang}`;
  const cached = _getCached(key);
  if (cached) return cached;

  const data = await _request(`/live?lang=${lang}`);
  if (data) _setCache(key, data);
  return data;
}

/**
 * Single event detail with all markets.
 * @param {number} eventId
 * @param {string} lang
 * @returns {Promise<Object|null>}
 */
async function getEventDetail(eventId, lang = 'en') {
  // No client cache for single event (always fresh)
  return await _request(`/event/${eventId}?lang=${lang}`);
}

/**
 * Find Fonbet event by team names. Key method for linking
 * API-Football fixtures → Fonbet deeplinks + real odds.
 *
 * @param {string} homeTeam - e.g. "AC Milan"
 * @param {string} awayTeam - e.g. "Inter"
 * @param {string} [matchDate] - ISO date e.g. "2026-03-01"
 * @returns {Promise<Object|null>} Fonbet event with odds + deeplink, or null
 */
async function findMatch(homeTeam, awayTeam, matchDate = null) {
  const body = {
    home_team: homeTeam,
    away_team: awayTeam,
  };
  if (matchDate) {
    body.match_date = matchDate;
  }

  return await _request('/find-match', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Generate deeplink URL locally (no API call).
 * @param {number} tournamentId - Fonbet sportId (e.g. 11960 for Serie A)
 * @param {number} eventId - Fonbet event ID
 * @returns {string}
 */
function generateDeeplink(tournamentId, eventId) {
  return `https://fonbet001.com/sports/football/${tournamentId}/${eventId}`;
}

/**
 * Generate proxy deeplink URL (for iframe/webview).
 * @param {number} tournamentId
 * @param {number} eventId
 * @returns {string}
 */
function generateProxyDeeplink(tournamentId, eventId) {
  return `https://iframe-proxy-poc-production.up.railway.app/fonbet/sports/football/${tournamentId}/${eventId}`;
}

/**
 * Format raw odds object into grouped structure for UI.
 *
 * @param {Object} odds - Raw odds: {"1": 2.30, "X": 3.40, "2": 3.05, "over_2.5": 1.75, ...}
 * @returns {{main: Array, totals: Array, btts: Array, doubleChance: Array, handicap: Array, halfTime: Array}}
 */
function formatOdds(odds) {
  if (!odds) return { main: [], totals: [], btts: [], doubleChance: [], handicap: [], halfTime: [] };

  const main = [];
  if (odds['1'] != null) main.push({ label: '1', value: odds['1'] });
  if (odds['X'] != null) main.push({ label: 'X', value: odds['X'] });
  if (odds['2'] != null) main.push({ label: '2', value: odds['2'] });

  const totals = [];
  if (odds['over_2.5'] != null) totals.push({ label: 'O2.5', value: odds['over_2.5'] });
  if (odds['under_2.5'] != null) totals.push({ label: 'U2.5', value: odds['under_2.5'] });
  if (odds['over_1.5'] != null) totals.push({ label: 'O1.5', value: odds['over_1.5'] });
  if (odds['under_1.5'] != null) totals.push({ label: 'U1.5', value: odds['under_1.5'] });

  const btts = [];
  if (odds['btts_yes'] != null) btts.push({ label: 'Yes', value: odds['btts_yes'] });
  if (odds['btts_no'] != null) btts.push({ label: 'No', value: odds['btts_no'] });

  const doubleChance = [];
  if (odds['1X'] != null) doubleChance.push({ label: '1X', value: odds['1X'] });
  if (odds['12'] != null) doubleChance.push({ label: '12', value: odds['12'] });
  if (odds['X2'] != null) doubleChance.push({ label: 'X2', value: odds['X2'] });

  const handicap = [];
  if (odds['handicap_1'] != null) handicap.push({ label: 'H1', value: odds['handicap_1'] });
  if (odds['handicap_2'] != null) handicap.push({ label: 'H2', value: odds['handicap_2'] });

  const halfTime = [];
  if (odds['ht_1'] != null) halfTime.push({ label: 'HT 1', value: odds['ht_1'] });
  if (odds['ht_X'] != null) halfTime.push({ label: 'HT X', value: odds['ht_X'] });
  if (odds['ht_2'] != null) halfTime.push({ label: 'HT 2', value: odds['ht_2'] });

  return { main, totals, btts, doubleChance, handicap, halfTime };
}

/**
 * Generate "Schedina del Giorno" — daily accumulator from top leagues.
 * Picks 5-7 "safe" selections (odds 1.30-3.50) from today/tomorrow.
 *
 * @param {string} lang
 * @returns {Promise<{selections: Array, accumulatorOdds: number, count: number}|null>}
 */
async function getDailySchedina(lang = 'en') {
  const data = await getTopLeaguesEvents(lang);
  if (!data || !data.events || data.events.length === 0) return null;

  const now = Math.floor(Date.now() / 1000);
  const tomorrow = now + 86400 * 2; // today + 2 days window

  // Filter: pre-match, today/tomorrow, has odds
  const candidates = data.events.filter(ev => {
    if (ev.is_live) return false;
    if (!ev.start_timestamp || ev.start_timestamp < now || ev.start_timestamp > tomorrow) return false;
    if (!ev.odds || !ev.odds['1']) return false;
    return true;
  });

  // Build selections: pick best odds in range 1.30–3.50
  const selections = [];

  for (const ev of candidates) {
    if (selections.length >= 7) break;

    // Find the best selection for this match
    const options = [
      { selection: '1', odds: ev.odds['1'] },
      { selection: 'X', odds: ev.odds['X'] },
      { selection: '2', odds: ev.odds['2'] },
      { selection: 'O2.5', odds: ev.odds['over_2.5'] },
      { selection: 'U2.5', odds: ev.odds['under_2.5'] },
      { selection: 'BTTS Yes', odds: ev.odds['btts_yes'] },
    ].filter(o => o.odds && o.odds >= 1.30 && o.odds <= 3.50);

    if (options.length === 0) continue;

    // Pick the most likely outcome (lowest odds = highest probability)
    options.sort((a, b) => a.odds - b.odds);
    const pick = options[0];

    selections.push({
      team1: ev.team1,
      team2: ev.team2,
      tournament: ev.tournament_name,
      selection: pick.selection,
      selectionOdds: pick.odds,
      deeplink: ev.deeplink,
      start_timestamp: ev.start_timestamp,
    });
  }

  if (selections.length === 0) return null;

  // Calculate accumulator odds
  const accumulatorOdds = parseFloat(
    selections.reduce((acc, s) => acc * s.selectionOdds, 1).toFixed(2)
  );

  return {
    selections,
    accumulatorOdds,
    count: selections.length,
  };
}

/**
 * Clear client-side cache.
 */
function clearCache() {
  _cache.clear();
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const fonbetApi = {
  getFootballEvents,
  getTopLeaguesEvents,
  getSerieAEvents,
  getLiveEvents,
  getEventDetail,
  findMatch,
  generateDeeplink,
  generateProxyDeeplink,
  formatOdds,
  getDailySchedina,
  clearCache,
};

export { fonbetApi as FonbetApi };
export default fonbetApi;
