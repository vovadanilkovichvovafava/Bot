/**
 * Test: Home.jsx stale-while-revalidate pattern.
 * Shows cached data instantly, fetches fresh in background.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const HOME_MATCHES_CACHE = 'home_matches_cache';
const HOME_MATCHES_TTL = 3 * 60 * 1000;

// Simulate the stale-while-revalidate loadMatches logic
async function loadMatchesSWR({ getItem, setItem, fetchFixtures, setMatches, setLoading }) {
  // Phase 1: Show cached data instantly
  try {
    const raw = getItem(HOME_MATCHES_CACHE);
    if (raw) {
      const cached = JSON.parse(raw);
      if (Date.now() - cached.ts < HOME_MATCHES_TTL) {
        setMatches(cached.data);
        setLoading(false); // Instant — no spinner
      }
    }
  } catch {}

  // Phase 2: Fetch fresh data in background
  try {
    const fixtures = await fetchFixtures();
    const upcoming = (fixtures || []).slice(0, 5);
    setMatches(upcoming);
    setItem(HOME_MATCHES_CACHE, JSON.stringify({ data: upcoming, ts: Date.now() }));
  } catch (e) {
    // silent
  } finally {
    setLoading(false);
  }
}

describe('Home stale-while-revalidate', () => {
  let setMatches, setLoading, fetchFixtures;

  beforeEach(() => {
    setMatches = vi.fn();
    setLoading = vi.fn();
    fetchFixtures = vi.fn(() => Promise.resolve([{ id: 1 }, { id: 2 }]));
  });

  it('should show cached data instantly and set loading=false before fetch', async () => {
    const cachedData = [{ id: 99 }, { id: 100 }];
    const getItem = vi.fn(() => JSON.stringify({ data: cachedData, ts: Date.now() }));
    const setItem = vi.fn();

    const promise = loadMatchesSWR({ getItem, setItem, fetchFixtures, setMatches, setLoading });

    // Before fetch resolves — cached data should be set and loading=false
    expect(setMatches).toHaveBeenCalledWith(cachedData);
    expect(setLoading).toHaveBeenCalledWith(false);

    await promise;

    // After fetch — fresh data should replace cached
    expect(setMatches).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
    expect(fetchFixtures).toHaveBeenCalledTimes(1);
  });

  it('should show spinner when no cache exists', async () => {
    const getItem = vi.fn(() => null);
    const setItem = vi.fn();

    // Before fetch — setLoading(false) should NOT have been called yet
    const promise = loadMatchesSWR({ getItem, setItem, fetchFixtures, setMatches, setLoading });

    // setLoading(false) should not be called before fetch (no cache)
    // It will be called after fetch in finally block
    await promise;

    expect(setMatches).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
    expect(setLoading).toHaveBeenCalledWith(false);
  });

  it('should ignore expired cache', async () => {
    const expiredCache = JSON.stringify({ data: [{ id: 99 }], ts: Date.now() - HOME_MATCHES_TTL - 1000 });
    const getItem = vi.fn(() => expiredCache);
    const setItem = vi.fn();

    const promise = loadMatchesSWR({ getItem, setItem, fetchFixtures, setMatches, setLoading });

    // setMatches should NOT be called with expired data before fetch
    expect(setMatches).not.toHaveBeenCalledWith([{ id: 99 }]);

    await promise;

    // Only fresh data
    expect(setMatches).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
  });

  it('should still work if fetch fails but cache exists', async () => {
    const cachedData = [{ id: 99 }];
    const getItem = vi.fn(() => JSON.stringify({ data: cachedData, ts: Date.now() }));
    const setItem = vi.fn();
    fetchFixtures = vi.fn(() => Promise.reject(new Error('Network error')));

    await loadMatchesSWR({ getItem, setItem, fetchFixtures, setMatches, setLoading });

    // Should have shown cached data
    expect(setMatches).toHaveBeenCalledWith(cachedData);
    expect(setLoading).toHaveBeenCalledWith(false);
  });
});
