/**
 * Football API Service
 *
 * Calls go through our backend proxy for server-side caching.
 * This saves API requests by sharing cache between all users.
 *
 * Fallback to direct API-Football calls if backend is unavailable.
 */

const BACKEND_BASE = import.meta.env.VITE_API_URL || 'https://appbot-production-152e.up.railway.app/api/v1';
const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY || '';

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

// Normalize team name for fuzzy matching
function normalize(name) {
  return (name || '')
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
    try {
      const response = await fetch(`${BACKEND_BASE}/football${endpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Backend HTTP ${response.status}`);
      }

      return await response.json();
    } catch (e) {
      console.warn(`Backend request failed: ${e.message}, falling back to direct API`);
      this.useBackend = false;
      // Reset backend availability after 30 seconds
      setTimeout(() => { this.useBackend = true; }, 30000);
      throw e;
    }
  }

  // === Direct API-Football Requests (fallback) ===

  async directRequest(endpoint, params = {}) {
    if (!API_KEY) return [];

    const cacheKey = endpoint + JSON.stringify(params);
    const cached = getLocalCache(cacheKey);
    if (cached) return cached;

    const query = new URLSearchParams(params).toString();
    const url = `${API_FOOTBALL_BASE}${endpoint}${query ? '?' + query : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'x-apisports-key': API_KEY },
    });

    if (!response.ok) {
      throw new Error(`API-Football HTTP ${response.status}`);
    }

    const data = await response.json();
    const result = data.response || [];
    setLocalCache(cacheKey, result);
    return result;
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
        return await this.backendRequest('/football/smart-bet');
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
    // Live odds only from direct API
    return this.directRequest('/odds/live', { fixture: fixtureId });
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
      })).filter(t => t.id && t.name);
    } catch (e) {
      console.error('Team search failed:', e);
      return [];
    }
  }

  async getTeamStatistics(teamId, season, leagueId) {
    // Complex query - direct API
    return this.directRequest('/teams/statistics', {
      team: teamId,
      season,
      league: leagueId,
    });
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
    return this.directRequest('/players/topscorers', { league: leagueId, season });
  }

  // === Leagues ===

  async getLeagues(country) {
    const params = country ? { country } : {};
    return this.directRequest('/leagues', params);
  }

  async getLeagueById(leagueId) {
    const res = await this.directRequest('/leagues', { id: leagueId });
    return res[0] || null;
  }

  async searchLeague(name) {
    return this.directRequest('/leagues', { search: name });
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
