/**
 * Football API Service
 *
 * All calls go through our backend proxy for server-side caching and to keep
 * the API-Football key server-side. The key is intentionally NOT exposed to the
 * browser; when the backend is unavailable, football data degrades gracefully.
 */

import { ENV } from '../../../shared/config/env';

const BACKEND_BASE = ENV.API_URL;

// Local cache for fallback mode (when backend is down)
const localCache = new Map();
const LOCAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getLocalCache(key) {
  const entry = localCache.get(key);
  if (entry && Date.now() - entry.ts < LOCAL_CACHE_TTL) return entry.data;
  return null;
}

function setLocalCache(key, data) {
  localCache.set(key, { data, ts: Date.now() });
}

// Transliterate accented/special characters to ASCII equivalents
// Handles characters that NFD decomposition doesn't cover (ø, ł, đ, ß, etc.)
function transliterate(str) {
  const manual = { 'ø': 'o', 'Ø': 'O', 'ł': 'l', 'Ł': 'L', 'đ': 'd', 'Đ': 'D', 'ß': 'ss', 'æ': 'ae', 'Æ': 'AE', 'œ': 'oe', 'Œ': 'OE', 'ı': 'i', 'İ': 'I', 'ð': 'd', 'Ð': 'D', 'þ': 'th', 'Þ': 'Th' };
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // é→e, ü→u, ñ→n, etc.
    .replace(/[øØłŁđĐßæÆœŒıİðÐþÞ]/g, ch => manual[ch] || ch); // ø→o, ß→ss, etc.
}

// Normalize team name for fuzzy matching
function normalize(name) {
  return transliterate(name || '')
    .toLowerCase()
    .replace(/\bfc\b|\bcf\b|\bafc\b|\bsc\b|\bac\b|\bssc\b|\bsv\b|\bcd\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function teamMatch(apiName, ourName) {
  const a = normalize(apiName);
  const b = normalize(ourName);
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const aWords = a.match(/[a-z]{3,}/g) || [];
  const bWords = b.match(/[a-z]{3,}/g) || [];
  return aWords.some(w => bWords.includes(w));
}

class FootballApiService {
  constructor() {
    this.useBackend = true; // Try backend first
  }

  // === Backend Proxy Requests ===

  async backendRequest(endpoint) {
    // Skip cache for live endpoints — always fetch fresh data
    const isLive = endpoint.includes('/live');
    const cacheKey = `backend:${endpoint}`;
    if (!isLive) {
      const cached = getLocalCache(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await fetch(`${BACKEND_BASE}/football${endpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        // Only disable backend for server errors (5xx), not client errors (4xx)
        if (response.status >= 500) {
          this.useBackend = false;
          setTimeout(() => { this.useBackend = true; }, 30000);
        }
        throw new Error(`Backend HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!isLive) setLocalCache(cacheKey, data);
      return data;
    } catch (e) {
      // Network errors (fetch failed entirely) — disable backend
      if (!e.message?.startsWith('Backend HTTP')) {
        console.warn(`Backend network error: ${e.message}, falling back to direct API`);
        this.useBackend = false;
        setTimeout(() => { this.useBackend = true; }, 30000);
      }
      throw e;
    }
  }

  // === Direct API-Football Requests (disabled) ===

  // Direct browser → API-Football calls are intentionally disabled so the API
  // key is never shipped to the client. All data flows through the backend
  // proxy; if the backend is down we degrade gracefully by returning no data.
  async directRequest() {
    return [];
  }

  // === Unified Request Method ===

  async request(backendEndpoint, directEndpoint, directParams = {}) {
    // Try backend first (has server-side shared cache)
    if (this.useBackend) {
      try {
        return await this.backendRequest(backendEndpoint);
      } catch {
        // Fall through to direct request
      }
    }

    // Fallback to direct API-Football call
    return await this.directRequest(directEndpoint, directParams);
  }

  // === Fixtures ===

  async getTodayFixtures() {
    const today = new Date().toISOString().split('T')[0];
    return this.getFixturesByDate(today);
  }

  async getFixturesByDate(date) {
    return this.request(`/fixtures/date/${date}`, '/fixtures', { date });
  }

  async getLiveFixtures() {
    return this.request('/fixtures/live', '/fixtures', { live: 'all' });
  }

  async getSmartBet() {
    // Only available via backend (AI-powered)
    try {
      if (this.useBackend) {
        return await this.backendRequest('/smart-bet');
      }
    } catch {}
    return { found: false };
  }

  async getLeagueFixtures(leagueId, nextCount = 20) {
    // Get upcoming fixtures for a specific league
    try {
      if (this.useBackend) {
        return await this.backendRequest(`/fixtures/league/${leagueId}?next_count=${nextCount}`);
      }
    } catch {}
    return this.directRequest('/fixtures', { league: leagueId, next: nextCount });
  }

  async getFixturesByTeam(teamId, season, nextCount = 10) {
    // Get upcoming/recent fixtures for a specific team
    try {
      if (this.useBackend) {
        return await this.backendRequest(`/fixtures/team/${teamId}?season=${season}&next=${nextCount}`);
      }
    } catch {}
    return this.directRequest('/fixtures', { team: teamId, season, next: nextCount });
  }

  async getFixture(fixtureId) {
    try {
      if (this.useBackend) {
        return await this.backendRequest(`/fixtures/${fixtureId}`);
      }
    } catch {}

    const res = await this.directRequest('/fixtures', { id: fixtureId });
    return res[0] || null;
  }

  // === Find Fixture by Team Names ===

  async findFixture(homeTeam, awayTeam, date) {
    const cacheKey = `find_${homeTeam}_${awayTeam}_${date}`;
    const cached = getLocalCache(cacheKey);
    if (cached) return cached;

    const fixtures = await this.getFixturesByDate(date);
    const match = fixtures.find(f =>
      teamMatch(f.teams?.home?.name, homeTeam) &&
      teamMatch(f.teams?.away?.name, awayTeam)
    );

    if (match) setLocalCache(cacheKey, match);
    return match || null;
  }

  // === Enriched Data (all in one call through backend) ===

  async getMatchEnrichedData(homeTeam, awayTeam, date) {
    const fixture = await this.findFixture(homeTeam, awayTeam, date);
    if (!fixture) return null;

    const fixtureId = fixture.fixture.id;

    const homeId = fixture.teams.home.id;
    const awayId = fixture.teams.away.id;

    // Try to get all enriched data from backend in one call
    if (this.useBackend) {
      try {
        const [enriched, h2h] = await Promise.allSettled([
          this.backendRequest(`/fixtures/${fixtureId}/enriched`),
          this.getHeadToHead(homeId, awayId, 10),
        ]);
        const enrichedData = enriched.status === 'fulfilled' ? enriched.value : {};
        return {
          fixture: enrichedData.fixture || fixture,
          fixtureId,
          homeId,
          awayId,
          prediction: enrichedData.prediction,
          odds: enrichedData.odds || [],
          stats: enrichedData.statistics || [],
          events: enrichedData.events || [],
          lineups: enrichedData.lineups || [],
          injuries: enrichedData.injuries || [],
          h2h: h2h.status === 'fulfilled' ? h2h.value : [],
        };
      } catch {}
    }

    // Fallback: parallel fetch from API-Football directly
    const [prediction, odds, stats, events, lineups, injuries, h2h] = await Promise.allSettled([
      this.getPrediction(fixtureId),
      this.getOdds(fixtureId),
      this.getFixtureStatistics(fixtureId),
      this.getFixtureEvents(fixtureId),
      this.getFixtureLineups(fixtureId),
      this.getInjuries(fixtureId),
      this.getHeadToHead(homeId, awayId, 10),
    ]);

    return {
      fixture,
      fixtureId,
      homeId,
      awayId,
      prediction: prediction.status === 'fulfilled' ? prediction.value : null,
      odds: odds.status === 'fulfilled' ? odds.value : [],
      stats: stats.status === 'fulfilled' ? stats.value : [],
      events: events.status === 'fulfilled' ? events.value : [],
      lineups: lineups.status === 'fulfilled' ? lineups.value : [],
      injuries: injuries.status === 'fulfilled' ? injuries.value : [],
      h2h: h2h.status === 'fulfilled' ? h2h.value : [],
    };
  }

  // === Statistics ===

  async getFixtureStatistics(fixtureId) {
    return this.request(`/fixtures/${fixtureId}/statistics`, '/fixtures/statistics', { fixture: fixtureId });
  }

  async getFixtureEvents(fixtureId) {
    return this.request(`/fixtures/${fixtureId}/events`, '/fixtures/events', { fixture: fixtureId });
  }

  async getFixtureLineups(fixtureId) {
    return this.request(`/fixtures/${fixtureId}/lineups`, '/fixtures/lineups', { fixture: fixtureId });
  }

  // === Predictions & Odds ===

  async getPrediction(fixtureId) {
    try {
      if (this.useBackend) {
        return await this.backendRequest(`/fixtures/${fixtureId}/prediction`);
      }
    } catch {}

    const res = await this.directRequest('/predictions', { fixture: fixtureId });
    return res[0] || null;
  }

  async getOdds(fixtureId) {
    return this.request(`/fixtures/${fixtureId}/odds`, '/odds', { fixture: fixtureId });
  }

  async getLiveOdds(fixtureId) {
    try {
      return await this.backendRequest(`/fixtures/${fixtureId}/odds/live`);
    } catch {
      return [];
    }
  }

  // Batch 1X2 odds for a whole date → { [fixtureId]: { home, draw, away } }
  // Backend-only (server paginates + caches). Returns {} on any failure so
  // callers fall back to synthetic odds without breaking.
  async getOddsMapForDate(date) {
    try {
      const data = await this.backendRequest(`/odds/date/${date}`);
      return data && typeof data === 'object' ? data : {};
    } catch {
      return {};
    }
  }

  // === Teams ===

  async getTeam(teamId) {
    try {
      if (this.useBackend) {
        return await this.backendRequest(`/teams/${teamId}`);
      }
    } catch {}

    const res = await this.directRequest('/teams', { id: teamId });
    return res[0] || null;
  }

  async getSquad(teamId) {
    // Returns array like [{ team, players: [...] }]
    try {
      if (this.useBackend) {
        return await this.backendRequest(`/teams/${teamId}/squad`);
      }
    } catch {}

    return this.directRequest('/players/squads', { team: teamId });
  }

  async searchTeam(name) {
    try {
      if (this.useBackend) {
        return await this.backendRequest(`/teams/search?name=${encodeURIComponent(name)}`);
      }
    } catch {}

    return this.directRequest('/teams', { search: name });
  }

  async searchTeams(query) {
    try {
      const results = await this.searchTeam(query);
      // Extract team data from the API response
      return (results || []).map(item => ({
        id: item.team?.id || item.id,
        name: item.team?.name || item.name,
        logo: item.team?.logo || item.logo,
        country: item.team?.country || item.country,
        national: item.team?.national ?? item.national ?? false,
      })).filter(t => t.id && t.name);
    } catch (e) {
      console.error('Team search failed:', e);
      return [];
    }
  }

  // Resolve a country/team name to its SENIOR national team (excludes youth/women
  // sides, which API search otherwise returns first for some countries).
  async resolveNationalTeam(name) {
    if (!name) return null;
    const youth = /\bU-?\d{2}\b|\bW\b|women|olympic|futsal|amateur|beach/i;
    const results = await this.searchTeams(name);
    const seniors = results.filter(t => t.national && !youth.test(t.name || ''));
    const norm = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '');
    return (
      seniors.find(t => norm(t.name) === norm(name)) ||
      seniors[0] ||
      results[0] ||
      null
    );
  }

  async getTeamStatistics(teamId, season, leagueId) {
    try {
      return await this.backendRequest(`/teams/${teamId}/statistics?season=${season}&league=${leagueId}`);
    } catch {
      return null;
    }
  }

  // === Injuries ===

  async getInjuries(fixtureId) {
    return this.request(`/fixtures/${fixtureId}/injuries`, '/injuries', { fixture: fixtureId });
  }

  // === Standings ===

  async getStandings(leagueId, season) {
    try {
      if (this.useBackend) {
        const res = await this.backendRequest(`/standings/${leagueId}/${season}`);
        return res[0]?.league?.standings?.[0] || [];
      }
    } catch {}

    const res = await this.directRequest('/standings', { league: leagueId, season });
    return res[0]?.league?.standings?.[0] || [];
  }

  // Returns ALL standings groups (array of group tables) — for tournaments like the World Cup with 12 groups
  async getAllStandings(leagueId, season) {
    try {
      if (this.useBackend) {
        const res = await this.backendRequest(`/standings/${leagueId}/${season}`);
        return res[0]?.league?.standings || [];
      }
    } catch {}

    const res = await this.directRequest('/standings', { league: leagueId, season });
    return res[0]?.league?.standings || [];
  }

  // Returns ALL fixtures for a league+season (group stage + knockouts) — for tournament brackets
  async getTournamentFixtures(leagueId, season) {
    try {
      if (this.useBackend) {
        return await this.backendRequest(`/fixtures/league/${leagueId}/season/${season}`);
      }
    } catch {}

    return this.directRequest('/fixtures', { league: leagueId, season });
  }

  // === Head to Head ===

  async getHeadToHead(team1Id, team2Id, last = 10) {
    try {
      if (this.useBackend) {
        return await this.backendRequest(`/h2h/${team1Id}/${team2Id}?last=${last}`);
      }
    } catch {}

    return this.directRequest('/fixtures/headtohead', {
      h2h: `${team1Id}-${team2Id}`,
      last,
    });
  }

  // === Players ===

  async getTopScorers(leagueId, season) {
    try {
      return await this.backendRequest(`/players/topscorers/${leagueId}/${season}`);
    } catch {
      return [];
    }
  }

  // === Leagues ===

  async getLeagues(country) {
    try {
      const qs = country ? `?country=${encodeURIComponent(country)}` : '';
      return await this.backendRequest(`/leagues${qs}`);
    } catch {
      return [];
    }
  }

  async getLeagueById(leagueId) {
    try {
      const res = await this.backendRequest(`/leagues?id=${leagueId}`);
      return res[0] || null;
    } catch {
      return null;
    }
  }

  async searchLeague(name) {
    try {
      return await this.backendRequest(`/leagues?search=${encodeURIComponent(name)}`);
    } catch {
      return [];
    }
  }

  // === Fixtures with Odds (optimized) ===

  async getFixturesWithOddsForDate(date) {
    const cacheKey = `fixtures_odds_${date}`;
    const cached = getLocalCache(cacheKey);
    if (cached) return cached;

    const fixtures = await this.getFixturesByDate(date);

    const map = {};
    for (const f of fixtures) {
      const key = normalize(f.teams.home.name) + '_' + normalize(f.teams.away.name);
      map[key] = {
        fixtureId: f.fixture.id,
        status: f.fixture.status.short,
        homeGoals: f.goals.home,
        awayGoals: f.goals.away,
        homeLogo: f.teams.home.logo,
        awayLogo: f.teams.away.logo,
      };
    }

    const result = { fixtures, map };
    setLocalCache(cacheKey, result);
    return result;
  }
}

export const footballApi = new FootballApiService();
export default footballApi;
