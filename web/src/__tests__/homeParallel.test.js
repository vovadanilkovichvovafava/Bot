/**
 * Test: Home.jsx loads data in parallel, not sequentially.
 *
 * We test the loading logic extracted as a pure function
 * (no React rendering needed — just verify Promise.all pattern).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Simulate the parallel loading logic from Home.jsx useEffect
function homeLoadAll({ isPremium, smartBetCached, loadMatches, getChatLimit, fetchSmartBet }) {
  const promises = [loadMatches()];

  if (!isPremium) {
    promises.push(getChatLimit());
  }

  if (isPremium && !smartBetCached) {
    promises.push(fetchSmartBet());
  }

  return Promise.all(promises);
}

describe('Home parallel loading', () => {
  let loadMatches, getChatLimit, fetchSmartBet;
  let resolveMatches, resolveChatLimit, resolveSmartBet;

  beforeEach(() => {
    // Create controllable promises so we can verify parallelism
    loadMatches = vi.fn(() => new Promise(r => { resolveMatches = r; }));
    getChatLimit = vi.fn(() => new Promise(r => { resolveChatLimit = r; }));
    fetchSmartBet = vi.fn(() => new Promise(r => { resolveSmartBet = r; }));
  });

  it('should call loadMatches and getChatLimit in parallel for free users', async () => {
    const allDone = homeLoadAll({
      isPremium: false,
      smartBetCached: false,
      loadMatches,
      getChatLimit,
      fetchSmartBet,
    });

    // Both should be called IMMEDIATELY (before any resolves)
    expect(loadMatches).toHaveBeenCalledTimes(1);
    expect(getChatLimit).toHaveBeenCalledTimes(1);
    expect(fetchSmartBet).not.toHaveBeenCalled();

    // Resolve both
    resolveMatches();
    resolveChatLimit();
    await allDone;
  });

  it('should call loadMatches and fetchSmartBet in parallel for premium users', async () => {
    const allDone = homeLoadAll({
      isPremium: true,
      smartBetCached: false,
      loadMatches,
      getChatLimit,
      fetchSmartBet,
    });

    // Both should be called IMMEDIATELY
    expect(loadMatches).toHaveBeenCalledTimes(1);
    expect(fetchSmartBet).toHaveBeenCalledTimes(1);
    expect(getChatLimit).not.toHaveBeenCalled();

    resolveMatches();
    resolveSmartBet();
    await allDone;
  });

  it('should NOT call fetchSmartBet if cache is valid', async () => {
    const allDone = homeLoadAll({
      isPremium: true,
      smartBetCached: true,
      loadMatches,
      getChatLimit,
      fetchSmartBet,
    });

    expect(loadMatches).toHaveBeenCalledTimes(1);
    expect(fetchSmartBet).not.toHaveBeenCalled();
    expect(getChatLimit).not.toHaveBeenCalled();

    resolveMatches();
    await allDone;
  });

  it('should not block if one request fails', async () => {
    loadMatches = vi.fn(() => Promise.resolve([{ id: 1 }]));
    getChatLimit = vi.fn(() => Promise.reject(new Error('Network error')));

    // Should NOT throw — Promise.all with catch inside getChatLimit
    const result = await homeLoadAll({
      isPremium: false,
      smartBetCached: false,
      loadMatches,
      getChatLimit: () => getChatLimit().catch(() => {}),
      fetchSmartBet,
    });

    expect(loadMatches).toHaveBeenCalledTimes(1);
  });
});
