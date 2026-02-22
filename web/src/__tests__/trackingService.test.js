import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── sessionStorage mock (must be set up BEFORE importing the module) ──
let sessionStore = {};
const sessionStorageMock = {
  getItem: vi.fn((key) => sessionStore[key] ?? null),
  setItem: vi.fn((key, val) => { sessionStore[key] = String(val); }),
  removeItem: vi.fn((key) => { delete sessionStore[key]; }),
  clear: vi.fn(() => { sessionStore = {}; }),
  get length() { return Object.keys(sessionStore).length; },
  key: vi.fn((i) => Object.keys(sessionStore)[i] ?? null),
};
Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});

// ── Now import the module under test ──
import { saveTrackingParams, getTrackingLink } from '../features/betting/services/trackingService';

// ── Helpers ──
const SAVE_URL = 'https://postbackapi-production.up.railway.app/api/tracking/save';
const OFFER_BASE_URL = 'https://siteofficialred.com/KnSQ1M';

function setLocation(search = '', pathname = '/register') {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { search, pathname },
  });
}

function setSessionParam(key, value) {
  sessionStore[`tracking_${key}`] = String(value);
}

// ── Setup ──
beforeEach(() => {
  vi.restoreAllMocks();
  sessionStore = {};
  sessionStorageMock.getItem.mockImplementation((key) => sessionStore[key] ?? null);
  setLocation('');
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
});

// ═══════════════════════════════════════════════════════════════════════
// saveTrackingParams
// ═══════════════════════════════════════════════════════════════════════
describe('saveTrackingParams', () => {
  it('returns early and does not fetch when userId is falsy', async () => {
    setLocation('?external_id=ext123');
    await saveTrackingParams(null);
    await saveTrackingParams(undefined);
    await saveTrackingParams('');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns early and does not fetch when no tracking params are found', async () => {
    setLocation('');
    await saveTrackingParams('user_42');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('collects params from URL search string and POSTs them', async () => {
    setLocation('?external_id=ext1&fbclid=fb99&utm_source=google&sub_id_1=s1');
    await saveTrackingParams('user_1');

    expect(fetch).toHaveBeenCalledOnce();
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe(SAVE_URL);

    const body = JSON.parse(opts.body);
    expect(body.user_id).toBe('user_1');
    expect(body.external_id).toBe('ext1');
    expect(body.fbclid).toBe('fb99');
    expect(body.utm_source).toBe('google');
    expect(body.sub_ids.sub_id_1).toBe('s1');
  });

  it('collects params from sessionStorage when URL params are absent', async () => {
    setLocation('');
    setSessionParam('external_id', 'sess_ext');
    setSessionParam('utm_campaign', 'spring_sale');
    setSessionParam('sub_id_3', 'val3');

    await saveTrackingParams('user_2');

    expect(fetch).toHaveBeenCalledOnce();
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.user_id).toBe('user_2');
    expect(body.external_id).toBe('sess_ext');
    expect(body.utm_campaign).toBe('spring_sale');
    expect(body.sub_ids.sub_id_3).toBe('val3');
  });

  it('gives URL params priority over sessionStorage', async () => {
    setLocation('?utm_source=url_src');
    setSessionParam('utm_source', 'session_src');
    setSessionParam('utm_medium', 'session_med');

    await saveTrackingParams('user_3');

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.utm_source).toBe('url_src');
    // sessionStorage value still used when URL param is absent
    expect(body.utm_medium).toBe('session_med');
  });

  it('sends the request as a POST with JSON content-type', async () => {
    setLocation('?external_id=e1');
    await saveTrackingParams('user_4');

    const opts = fetch.mock.calls[0][1];
    expect(opts.method).toBe('POST');
    expect(opts.headers?.['Content-Type'] || opts.headers?.get?.('Content-Type'))
      .toContain('application/json');
  });

  it('collects all utm_* variations', async () => {
    setLocation(
      '?utm_source=src&utm_medium=med&utm_campaign=camp&utm_content=cont&utm_term=trm',
    );
    await saveTrackingParams('user_5');

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.utm_source).toBe('src');
    expect(body.utm_medium).toBe('med');
    expect(body.utm_campaign).toBe('camp');
    expect(body.utm_content).toBe('cont');
    expect(body.utm_term).toBe('trm');
  });

  it('collects sub_id_1 through sub_id_15', async () => {
    const params = Array.from({ length: 15 }, (_, i) => `sub_id_${i + 1}=v${i + 1}`).join('&');
    setLocation(`?${params}`);
    await saveTrackingParams('user_6');

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    for (let i = 1; i <= 15; i++) {
      expect(body.sub_ids[`sub_id_${i}`]).toBe(`v${i}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// getTrackingLink
// ═══════════════════════════════════════════════════════════════════════
describe('getTrackingLink', () => {
  it('returns null when userId is falsy', () => {
    expect(getTrackingLink(null)).toBeNull();
    expect(getTrackingLink(undefined)).toBeNull();
    expect(getTrackingLink('')).toBeNull();
  });

  it('builds a URL with external_id and sub_id_10 set to userId', () => {
    setLocation('');
    const link = getTrackingLink('user_7');
    const url = new URL(link);
    expect(url.origin + url.pathname).toBe(OFFER_BASE_URL);
    expect(url.searchParams.get('external_id')).toBe('user_7');
    expect(url.searchParams.get('sub_id_10')).toBe('user_7');
  });

  it('sets sub_id_11 to the banner argument when provided', () => {
    setLocation('');
    const link = getTrackingLink('user_8', 'promo_banner');
    const url = new URL(link);
    expect(url.searchParams.get('sub_id_11')).toBe('promo_banner');
  });

  it('copies sub_id values from URL/sessionStorage EXCEPT reserved 8, 10, 11', () => {
    setLocation('?sub_id_1=a&sub_id_8=should_skip&sub_id_10=skip10&sub_id_11=skip11&sub_id_5=e');
    const link = getTrackingLink('user_9', 'my_banner');
    const url = new URL(link);

    expect(url.searchParams.get('sub_id_1')).toBe('a');
    expect(url.searchParams.get('sub_id_5')).toBe('e');
    // Reserved slots must NOT be overwritten by incoming params
    expect(url.searchParams.get('sub_id_10')).toBe('user_9');
    expect(url.searchParams.get('sub_id_11')).toBe('my_banner');
  });

  it('places the original cloaker external_id into sub_id_8', () => {
    setLocation('?external_id=cloaker_ext');
    const link = getTrackingLink('user_10');
    const url = new URL(link);
    expect(url.searchParams.get('sub_id_8')).toBe('cloaker_ext');
    // external_id on the final link should be the userId, not the cloaker one
    expect(url.searchParams.get('external_id')).toBe('user_10');
  });

  it('places fbclid into both sub_id_16 and fbclid param', () => {
    setLocation('?fbclid=fb_click_42');
    const link = getTrackingLink('user_11');
    const url = new URL(link);
    expect(url.searchParams.get('sub_id_16')).toBe('fb_click_42');
    expect(url.searchParams.get('fbclid')).toBe('fb_click_42');
  });

  it('copies utm_* params onto the generated link', () => {
    setLocation('?utm_source=fb&utm_medium=cpc&utm_campaign=summer');
    const link = getTrackingLink('user_12');
    const url = new URL(link);
    expect(url.searchParams.get('utm_source')).toBe('fb');
    expect(url.searchParams.get('utm_medium')).toBe('cpc');
    expect(url.searchParams.get('utm_campaign')).toBe('summer');
  });

  it('returns a fallback URL on error', () => {
    // Force an error by making location.search a value that throws
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        get search() { throw new Error('boom'); },
        pathname: '/register',
      },
    });

    const link = getTrackingLink('user_err');
    expect(link).toBe(`${OFFER_BASE_URL}?external_id=user_err`);
  });
});
