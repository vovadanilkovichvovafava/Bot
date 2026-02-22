/**
 * Tests for AdvertiserContext — AdvertiserProvider + useAdvertiser hook
 * Covers: default advertiser, cached countryCode, detectCountry fallback chain,
 *         setCountry, trackClick, useAdvertiser outside provider
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement } from 'react';

// ── localStorage mock (module scope, before imports) ──
const localStorageMock = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: vi.fn((key) => localStorageMock[key] ?? null),
    setItem: vi.fn((key, val) => { localStorageMock[key] = String(val); }),
    removeItem: vi.fn((key) => { delete localStorageMock[key]; }),
    clear: vi.fn(() => { Object.keys(localStorageMock).forEach((k) => delete localStorageMock[k]); }),
  },
  writable: true,
  configurable: true,
});

// ── Mock advertisers config ──
// NOTE: vi.mock factory is hoisted above const declarations,
// so values must be inlined in the factory. We define matching
// constants below for assertions in tests.
vi.mock('../shared/config/advertisers', () => {
  const _DEFAULT = {
    name: 'partner',
    bonus: 'Bonus up to 1500',
    currency: 'EUR',
    locale: 'en',
  };
  const _IT = {
    name: 'partner',
    bonus: 'Bonus fino a 1.500',
    currency: 'EUR',
    locale: 'it',
  };
  return {
    getAdvertiser: vi.fn((code) => {
      if (code === 'IT') return _IT;
      return _DEFAULT;
    }),
    DEFAULT_ADVERTISER: _DEFAULT,
  };
});

// Matching constants for test assertions
const MOCK_DEFAULT_ADVERTISER = {
  name: 'partner',
  bonus: 'Bonus up to 1500',
  currency: 'EUR',
  locale: 'en',
};

const MOCK_IT_ADVERTISER = {
  name: 'partner',
  bonus: 'Bonus fino a 1.500',
  currency: 'EUR',
  locale: 'it',
};

import { AdvertiserProvider, useAdvertiser } from '../shared/context/AdvertiserContext';
import { getAdvertiser } from '../shared/config/advertisers';

// ── Helpers ──
function wrapper({ children }) {
  return createElement(AdvertiserProvider, null, children);
}

describe('AdvertiserContext', () => {
  let originalFetch;

  beforeEach(() => {
    // Clear localStorage
    Object.keys(localStorageMock).forEach((k) => delete localStorageMock[k]);
    localStorage.getItem.mockImplementation((key) => localStorageMock[key] ?? null);
    localStorage.setItem.mockImplementation((key, val) => { localStorageMock[key] = String(val); });
    localStorage.removeItem.mockImplementation((key) => { delete localStorageMock[key]; });

    vi.clearAllMocks();
    originalFetch = globalThis.fetch;
    // Default: all GeoIP services fail
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────
  // useAdvertiser outside provider
  // ──────────────────────────────────────────
  describe('useAdvertiser outside provider', () => {
    it('throws an error when used outside AdvertiserProvider', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useAdvertiser());
      }).toThrow('useAdvertiser must be used within AdvertiserProvider');
      spy.mockRestore();
    });
  });

  // ──────────────────────────────────────────
  // Default state
  // ──────────────────────────────────────────
  describe('default state', () => {
    it('returns DEFAULT_ADVERTISER when no country code is cached', async () => {
      const { result } = renderHook(() => useAdvertiser(), { wrapper });

      // Wait for any async effects to settle
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.advertiser).toEqual(MOCK_DEFAULT_ADVERTISER);
    });

    it('countryCode is null when nothing cached', async () => {
      const { result } = renderHook(() => useAdvertiser(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.countryCode).toBeNull();
    });
  });

  // ──────────────────────────────────────────
  // Cached countryCode
  // ──────────────────────────────────────────
  describe('cached countryCode', () => {
    it('uses cached countryCode from localStorage on mount', async () => {
      localStorageMock['countryCode'] = 'IT';

      const { result } = renderHook(() => useAdvertiser(), { wrapper });

      // When countryCode is cached, loading starts as false
      await waitFor(() => {
        expect(result.current.countryCode).toBe('IT');
      });

      expect(getAdvertiser).toHaveBeenCalledWith('IT');
      expect(result.current.advertiser).toEqual(MOCK_IT_ADVERTISER);
      // Should not call fetch since we have a cached code
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('uses cached advertiser JSON from localStorage', async () => {
      const cachedAdv = { name: 'cached', bonus: 'test', currency: 'USD', locale: 'xx' };
      localStorageMock['advertiser'] = JSON.stringify(cachedAdv);
      localStorageMock['countryCode'] = 'IT';

      const { result } = renderHook(() => useAdvertiser(), { wrapper });

      await waitFor(() => {
        expect(result.current.countryCode).toBe('IT');
      });

      // After useEffect runs, advertiser gets overwritten by getAdvertiser(countryCode)
      expect(result.current.advertiser).toEqual(MOCK_IT_ADVERTISER);
    });
  });

  // ──────────────────────────────────────────
  // detectCountry — GeoIP fallback chain
  // ──────────────────────────────────────────
  describe('detectCountry', () => {
    it('uses the first successful GeoIP service', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ country_code: 'IT' }),
      });

      const { result } = renderHook(() => useAdvertiser(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.countryCode).toBe('IT');
      expect(result.current.advertiser).toEqual(MOCK_IT_ADVERTISER);
      expect(localStorageMock['countryCode']).toBe('IT');
    });

    it('falls through to second service when first fails', async () => {
      globalThis.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('First service down'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ countryCode: 'IT' }),
        });

      // Suppress console.warn from the fallback
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useAdvertiser(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.countryCode).toBe('IT');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      warnSpy.mockRestore();
    });

    it('falls through to third service when first two fail', async () => {
      globalThis.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Service 1 down'))
        .mockRejectedValueOnce(new Error('Service 2 down'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ country_code: 'IT' }),
        });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useAdvertiser(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.countryCode).toBe('IT');
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
      warnSpy.mockRestore();
    });

    it('uses DEFAULT_ADVERTISER when all GeoIP services fail', async () => {
      globalThis.fetch = vi.fn(() => Promise.reject(new Error('All down')));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useAdvertiser(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.advertiser).toEqual(MOCK_DEFAULT_ADVERTISER);
      expect(result.current.countryCode).toBeNull();
      warnSpy.mockRestore();
    });

    it('skips service that returns non-ok response', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false }) // First: non-ok
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ countryCode: 'IT' }),
        });

      const { result } = renderHook(() => useAdvertiser(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.countryCode).toBe('IT');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });

  // ──────────────────────────────────────────
  // setCountry
  // ──────────────────────────────────────────
  describe('setCountry', () => {
    it('updates countryCode and advertiser', async () => {
      const { result } = renderHook(() => useAdvertiser(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setCountry('IT');
      });

      expect(result.current.countryCode).toBe('IT');
      expect(result.current.advertiser).toEqual(MOCK_IT_ADVERTISER);
      expect(localStorageMock['countryCode']).toBe('IT');
      expect(JSON.parse(localStorageMock['advertiser'])).toEqual(MOCK_IT_ADVERTISER);
    });
  });

  // ──────────────────────────────────────────
  // trackClick
  // ──────────────────────────────────────────
  describe('trackClick', () => {
    it('stores lastClickId in localStorage with userId and timestamp', async () => {
      const { result } = renderHook(() => useAdvertiser(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const before = Date.now();

      act(() => {
        result.current.trackClick('user123', 'banner');
      });

      expect(localStorageMock['lastClickId']).toBeDefined();
      const clickId = localStorageMock['lastClickId'];
      expect(clickId).toMatch(/^user123_\d+$/);

      // Verify the timestamp part is reasonable
      const timestamp = parseInt(clickId.split('_')[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
    });

    it('works with default source parameter', async () => {
      const { result } = renderHook(() => useAdvertiser(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.trackClick('user456');
      });

      expect(localStorageMock['lastClickId']).toMatch(/^user456_\d+$/);
    });
  });
});
