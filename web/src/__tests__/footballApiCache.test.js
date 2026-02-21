/**
 * Test: footballApi client-side cache for backendRequest.
 * Second call should return cached data without hitting fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Simulate the cache logic from footballApi.js
const localCache = new Map();
const LOCAL_CACHE_TTL = 5 * 60 * 1000;

function getLocalCache(key) {
  const entry = localCache.get(key);
  if (entry && Date.now() - entry.ts < LOCAL_CACHE_TTL) return entry.data;
  if (entry) localCache.delete(key);
  return null;
}

function setLocalCache(key, data) {
  localCache.set(key, { data, ts: Date.now() });
}

// Simulate backendRequest with cache
async function backendRequestWithCache(endpoint, fetchFn) {
  const cacheKey = `backend:${endpoint}`;
  const cached = getLocalCache(cacheKey);
  if (cached) return cached;

  const data = await fetchFn(endpoint);
  setLocalCache(cacheKey, data);
  return data;
}

describe('footballApi client cache', () => {
  beforeEach(() => {
    localCache.clear();
  });

  it('should return cached data on second call without fetching', async () => {
    const fetchFn = vi.fn(() => Promise.resolve([{ id: 1, name: 'Match A' }]));

    const result1 = await backendRequestWithCache('/fixtures/date/2024-01-01', fetchFn);
    const result2 = await backendRequestWithCache('/fixtures/date/2024-01-01', fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(1); // Only one fetch!
    expect(result1).toEqual([{ id: 1, name: 'Match A' }]);
    expect(result2).toEqual([{ id: 1, name: 'Match A' }]);
  });

  it('should fetch again for different endpoints', async () => {
    const fetchFn = vi.fn((ep) => Promise.resolve({ endpoint: ep }));

    await backendRequestWithCache('/fixtures/date/2024-01-01', fetchFn);
    await backendRequestWithCache('/fixtures/date/2024-01-02', fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('should expire cache after TTL', async () => {
    const fetchFn = vi.fn(() => Promise.resolve({ data: 'fresh' }));
    const originalNow = Date.now;

    // First call
    await backendRequestWithCache('/fixtures/live', fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Advance time past TTL
    vi.spyOn(Date, 'now').mockReturnValue(originalNow() + LOCAL_CACHE_TTL + 1000);

    // Second call — should fetch again
    await backendRequestWithCache('/fixtures/live', fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    vi.restoreAllMocks();
  });

  it('should not cache if fetch fails', async () => {
    const fetchFn = vi.fn(() => Promise.reject(new Error('Network error')));

    await expect(backendRequestWithCache('/fixtures/live', fetchFn)).rejects.toThrow('Network error');

    // Cache should be empty
    expect(localCache.size).toBe(0);
  });
});
