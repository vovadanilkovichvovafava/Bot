/**
 * Test: MatchDetail loads ALL enriched data in a single parallel batch.
 * No two-phase waterfall — standings & H2H load alongside predictions, odds, etc.
 */
import { describe, it, expect, vi } from 'vitest';

// Simulate the merged loadEnrichedDataParallel from MatchDetail.jsx
async function loadEnrichedDataParallel(api, fixtureId, leagueId, season, homeId, awayId) {
  const [prediction, odds, stats, events, lineups, injuries, standings, h2h] = await Promise.allSettled([
    api.getPrediction(fixtureId),
    api.getOdds(fixtureId),
    api.getFixtureStatistics(fixtureId),
    api.getFixtureEvents(fixtureId),
    api.getFixtureLineups(fixtureId),
    api.getInjuries(fixtureId),
    leagueId && season ? api.getStandings(leagueId, season) : Promise.resolve([]),
    homeId && awayId ? api.getHeadToHead(homeId, awayId, 10) : Promise.resolve([]),
  ]);

  return {
    prediction: prediction.status === 'fulfilled' ? prediction.value : null,
    odds: odds.status === 'fulfilled' ? odds.value : [],
    stats: stats.status === 'fulfilled' ? stats.value : [],
    events: events.status === 'fulfilled' ? events.value : [],
    lineups: lineups.status === 'fulfilled' ? lineups.value : [],
    injuries: injuries.status === 'fulfilled' ? injuries.value : [],
    standings: standings.status === 'fulfilled' ? standings.value : [],
    h2hFixtures: h2h.status === 'fulfilled' ? h2h.value : [],
  };
}

describe('MatchDetail parallel loading', () => {
  it('should load all 8 data sources in parallel', async () => {
    const api = {
      getPrediction: vi.fn(() => Promise.resolve({ winner: 'home' })),
      getOdds: vi.fn(() => Promise.resolve([{ odd: 1.5 }])),
      getFixtureStatistics: vi.fn(() => Promise.resolve([{ stat: 'shots' }])),
      getFixtureEvents: vi.fn(() => Promise.resolve([{ event: 'goal' }])),
      getFixtureLineups: vi.fn(() => Promise.resolve([{ lineup: 'A' }])),
      getInjuries: vi.fn(() => Promise.resolve([{ player: 'X' }])),
      getStandings: vi.fn(() => Promise.resolve([{ team: 'TeamA', points: 30 }])),
      getHeadToHead: vi.fn(() => Promise.resolve([{ match: 'h2h1' }])),
    };

    const result = await loadEnrichedDataParallel(api, '123', 39, 2024, 100, 200);

    // All 8 should be called
    expect(api.getPrediction).toHaveBeenCalledWith('123');
    expect(api.getOdds).toHaveBeenCalledWith('123');
    expect(api.getFixtureStatistics).toHaveBeenCalledWith('123');
    expect(api.getFixtureEvents).toHaveBeenCalledWith('123');
    expect(api.getFixtureLineups).toHaveBeenCalledWith('123');
    expect(api.getInjuries).toHaveBeenCalledWith('123');
    expect(api.getStandings).toHaveBeenCalledWith(39, 2024);
    expect(api.getHeadToHead).toHaveBeenCalledWith(100, 200, 10);

    // Result should contain all data
    expect(result.prediction).toEqual({ winner: 'home' });
    expect(result.standings).toEqual([{ team: 'TeamA', points: 30 }]);
    expect(result.h2hFixtures).toEqual([{ match: 'h2h1' }]);
  });

  it('should skip standings when leagueId is missing', async () => {
    const api = {
      getPrediction: vi.fn(() => Promise.resolve(null)),
      getOdds: vi.fn(() => Promise.resolve([])),
      getFixtureStatistics: vi.fn(() => Promise.resolve([])),
      getFixtureEvents: vi.fn(() => Promise.resolve([])),
      getFixtureLineups: vi.fn(() => Promise.resolve([])),
      getInjuries: vi.fn(() => Promise.resolve([])),
      getStandings: vi.fn(() => Promise.resolve([])),
      getHeadToHead: vi.fn(() => Promise.resolve([])),
    };

    const result = await loadEnrichedDataParallel(api, '123', null, null, 100, 200);

    expect(api.getStandings).not.toHaveBeenCalled();
    expect(result.standings).toEqual([]);
  });

  it('should not fail if one request errors', async () => {
    const api = {
      getPrediction: vi.fn(() => Promise.reject(new Error('API error'))),
      getOdds: vi.fn(() => Promise.resolve([{ odd: 1.5 }])),
      getFixtureStatistics: vi.fn(() => Promise.resolve([])),
      getFixtureEvents: vi.fn(() => Promise.resolve([])),
      getFixtureLineups: vi.fn(() => Promise.resolve([])),
      getInjuries: vi.fn(() => Promise.resolve([])),
      getStandings: vi.fn(() => Promise.resolve([])),
      getHeadToHead: vi.fn(() => Promise.resolve([])),
    };

    const result = await loadEnrichedDataParallel(api, '123', 39, 2024, 100, 200);

    // Failed prediction should be null, rest should be fine
    expect(result.prediction).toBeNull();
    expect(result.odds).toEqual([{ odd: 1.5 }]);
  });
});
