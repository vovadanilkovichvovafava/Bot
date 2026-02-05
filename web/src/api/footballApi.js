const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY || '';

class FootballApiService {
  async request(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${API_FOOTBALL_BASE}${endpoint}${query ? '?' + query : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-apisports-key': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`API-Football HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.response || [];
  }

  // --- Fixtures ---

  async getFixturesByDate(date) {
    // date format: YYYY-MM-DD
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
    const res = await this.request('/teams/statistics', {
      team: teamId,
      season,
      league: leagueId,
    });
    return res;
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
