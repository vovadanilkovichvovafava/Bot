const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY || '';

// In-memory cache to save API requests (100/day free plan)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// Normalize team name for fuzzy matching between APIs
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
  // Check first significant word match (e.g. "Arsenal" in "Arsenal London")
  const aWords = a.match(/[a-z]{3,}/g) || [];
  const bWords = b.match(/[a-z]{3,}/g) || [];
  return aWords.some(w => bWords.includes(w));
}

class FootballApiService {
  async request(endpoint, params = {}) {
    if (!API_KEY) return [];

    const cacheKey = endpoint + JSON.stringify(params);
    const cached = getCached(cacheKey);
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
    setCache(cacheKey, result);
    return result;
  }

  // --- Fixture Lookup (maps our backend match to API-Football fixture) ---

  async findFixture(homeTeam, awayTeam, date) {
    // date = 'YYYY-MM-DD'
    const cacheKey = `find_${homeTeam}_${awayTeam}_${date}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const fixtures = await this.getFixturesByDate(date);
    const match = fixtures.find(f =>
      teamMatch(f.teams.home.name, homeTeam) &&
      teamMatch(f.teams.away.name, awayTeam)
    );

    if (match) setCache(cacheKey, match);
    return match || null;
  }

  // Load all enriched data for a match in minimal API calls
  async getMatchEnrichedData(homeTeam, awayTeam, date) {
    const fixture = await this.findFixture(homeTeam, awayTeam, date);
    if (!fixture) return null;

    const fixtureId = fixture.fixture.id;
    const homeId = fixture.teams.home.id;
    const awayId = fixture.teams.away.id;

    // Parallel fetch: prediction + odds + stats + events + lineups + injuries
    const [prediction, odds, stats, events, lineups, injuries] = await Promise.allSettled([
      this.getPrediction(fixtureId),
      this.getOdds(fixtureId),
      this.getFixtureStatistics(fixtureId),
      this.getFixtureEvents(fixtureId),
      this.getFixtureLineups(fixtureId),
      this.getInjuries(fixtureId),
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
    };
  }

  // Get all fixtures+odds for a date (for match cards) - single API call
  async getFixturesWithOddsForDate(date) {
    const cacheKey = `fixtures_odds_${date}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const fixtures = await this.getFixturesByDate(date);

    // Build lookup map by normalized team names
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

    setCache(cacheKey, { fixtures, map });
    return { fixtures, map };
  }

  // --- Fixtures ---

  async getFixturesByDate(date) {
    return this.request('/fixtures', { date });
  }

  async getLiveFixtures() {
    return this.request('/fixtures', { live: 'all' });
  }

  async getFixture(fixtureId) {
    const res = await this.request('/fixtures', { id: fixtureId });
    return res[0] || null;
  }

  async getFixturesByTeam(teamId, season, last = 5) {
    return this.request('/fixtures', { team: teamId, season, last });
  }

  // --- Statistics ---

  async getFixtureStatistics(fixtureId) {
    return this.request('/fixtures/statistics', { fixture: fixtureId });
  }

  async getFixtureEvents(fixtureId) {
    return this.request('/fixtures/events', { fixture: fixtureId });
  }

  async getFixtureLineups(fixtureId) {
    return this.request('/fixtures/lineups', { fixture: fixtureId });
  }

  // --- Head to Head ---

  async getHeadToHead(team1Id, team2Id, last = 10) {
    return this.request('/fixtures/headtohead', {
      h2h: `${team1Id}-${team2Id}`,
      last,
    });
  }

  // --- Predictions ---

  async getPrediction(fixtureId) {
    const res = await this.request('/predictions', { fixture: fixtureId });
    return res[0] || null;
  }

  // --- Odds ---

  async getOdds(fixtureId) {
    return this.request('/odds', { fixture: fixtureId });
  }

  async getLiveOdds(fixtureId) {
    return this.request('/odds/live', { fixture: fixtureId });
  }

  // --- Teams ---

  async getTeam(teamId) {
    const res = await this.request('/teams', { id: teamId });
    return res[0] || null;
  }

  async getTeamStatistics(teamId, season, leagueId) {
    return this.request('/teams/statistics', {
      team: teamId,
      season,
      league: leagueId,
    });
  }

  // --- Standings ---

  async getStandings(leagueId, season) {
    const res = await this.request('/standings', { league: leagueId, season });
    return res[0]?.league?.standings?.[0] || [];
  }

  // --- Players ---

  async getTopScorers(leagueId, season) {
    return this.request('/players/topscorers', { league: leagueId, season });
  }

  // --- Injuries ---

  async getInjuries(fixtureId) {
    return this.request('/injuries', { fixture: fixtureId });
  }

  // --- Leagues ---

  async getLeagues(country) {
    const params = country ? { country } : {};
    return this.request('/leagues', params);
  }

  async getLeagueById(leagueId) {
    const res = await this.request('/leagues', { id: leagueId });
    return res[0] || null;
  }

  // --- Search ---

  async searchTeam(name) {
    return this.request('/teams', { search: name });
  }

  async searchLeague(name) {
    return this.request('/leagues', { search: name });
  }
}

export const footballApi = new FootballApiService();
export default footballApi;
