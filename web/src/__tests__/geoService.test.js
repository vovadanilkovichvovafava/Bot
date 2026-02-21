import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geoService } from '../services/geoService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GEO_SERVER_URL =
  import.meta.env.VITE_GEO_SERVER_URL || 'http://localhost:3001';

function mockFetchOnce(data, ok = true) {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(data),
    }),
  );
}

function mockFetchReject(error = new Error('Network error')) {
  globalThis.fetch = vi.fn(() => Promise.reject(error));
}

// ---------------------------------------------------------------------------
// Reset between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  geoService.clearCache();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// getGeoInfo
// ---------------------------------------------------------------------------
describe('geoService.getGeoInfo()', () => {
  it('fetches geo info from the correct URL', async () => {
    const geoData = { country: 'NG', isBlocked: false, bookmakerAvailable: true };
    mockFetchOnce(geoData);

    const result = await geoService.getGeoInfo();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${GEO_SERVER_URL}/api/geo`,
    );
    expect(result).toEqual(geoData);
  });

  it('caches the result — second call does not fetch again', async () => {
    const geoData = { country: 'KE', isBlocked: false, bookmakerAvailable: true };
    mockFetchOnce(geoData);

    const first = await geoService.getGeoInfo();
    const second = await geoService.getGeoInfo();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('returns fallback on network error', async () => {
    mockFetchReject();

    const result = await geoService.getGeoInfo();

    expect(result).toEqual({
      country: 'UNKNOWN',
      isBlocked: false,
      bookmakerAvailable: true,
    });
  });
});

// ---------------------------------------------------------------------------
// isBlocked
// ---------------------------------------------------------------------------
describe('geoService.isBlocked()', () => {
  it('returns false when geo info says not blocked', async () => {
    mockFetchOnce({ country: 'US', isBlocked: false, bookmakerAvailable: true });

    const blocked = await geoService.isBlocked();

    expect(blocked).toBe(false);
  });

  it('returns true when geo info says blocked', async () => {
    mockFetchOnce({ country: 'XX', isBlocked: true, bookmakerAvailable: false });

    const blocked = await geoService.isBlocked();

    expect(blocked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getBookmakerLink
// ---------------------------------------------------------------------------
describe('geoService.getBookmakerLink()', () => {
  it('fetches the bookmaker link with userId and campaign params', async () => {
    const linkData = { success: true, link: 'https://1xbet.com/promo/123', isBlocked: false };
    mockFetchOnce(linkData);

    const result = await geoService.getBookmakerLink('user123', 'summer');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/bookmaker/link'),
    );
    const calledUrl = globalThis.fetch.mock.calls[0][0];
    expect(calledUrl).toContain('userId=user123');
    expect(calledUrl).toContain('campaign=summer');
    expect(result).toEqual(linkData);
  });

  it('returns fallback object on error', async () => {
    mockFetchReject();

    const result = await geoService.getBookmakerLink('user1', 'camp');

    expect(result.success).toBe(false);
    expect(result.link).toBe('https://1xbet.com');
    expect(result.isBlocked).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// generateClickId
// ---------------------------------------------------------------------------
describe('geoService.generateClickId()', () => {
  it('fetches a click id with userId and source params', async () => {
    const clickData = { clickId: 'click_abc123' };
    mockFetchOnce(clickData);

    const result = await geoService.generateClickId('u42', 'homepage');

    const calledUrl = globalThis.fetch.mock.calls[0][0];
    expect(calledUrl).toContain('/api/click');
    expect(calledUrl).toContain('userId=u42');
    expect(calledUrl).toContain('source=homepage');
    expect(result).toEqual(clickData);
  });

  it('returns null on error', async () => {
    mockFetchReject();

    const result = await geoService.generateClickId('u1', 'src');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkPremium
// ---------------------------------------------------------------------------
describe('geoService.checkPremium()', () => {
  it('fetches premium status for a user', async () => {
    const premiumData = { isPremium: true, expiresAt: '2026-12-31' };
    mockFetchOnce(premiumData);

    const result = await geoService.checkPremium('user77');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/premium/check/user77'),
    );
    expect(result).toEqual(premiumData);
  });

  it('returns { isPremium: false } on error', async () => {
    mockFetchReject();

    const result = await geoService.checkPremium('user77');

    expect(result).toEqual({ isPremium: false });
  });
});

// ---------------------------------------------------------------------------
// clearCache
// ---------------------------------------------------------------------------
describe('geoService.clearCache()', () => {
  it('clears cached geo info so the next call fetches again', async () => {
    const first = { country: 'NG', isBlocked: false, bookmakerAvailable: true };
    mockFetchOnce(first);
    await geoService.getGeoInfo();

    geoService.clearCache();

    const second = { country: 'KE', isBlocked: true, bookmakerAvailable: false };
    mockFetchOnce(second);
    const result = await geoService.getGeoInfo();

    expect(result).toEqual(second);
  });
});
