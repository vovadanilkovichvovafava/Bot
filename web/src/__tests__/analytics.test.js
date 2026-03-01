import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be set up BEFORE the dynamic import of the analytics module
// because SESSION_ID is created at module‑load time.
// ---------------------------------------------------------------------------

// Stable fake localStorage store
let store = {};
const localStorageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = String(val); }),
  removeItem: vi.fn((key) => { delete store[key]; }),
  clear: vi.fn(() => { store = {}; }),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Mock fetch globally
const fetchMock = vi.fn(() => Promise.resolve({ ok: true }));
globalThis.fetch = fetchMock;

// Mock window.location.pathname
delete window.location;
window.location = { pathname: '/test-page' };

// Mock document.referrer
Object.defineProperty(document, 'referrer', { value: 'https://google.com', writable: true });

// ---------------------------------------------------------------------------
// Helper: base64url‑encode a JWT payload (no signature verification in module)
// ---------------------------------------------------------------------------
function fakeJwt(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

// ---------------------------------------------------------------------------
// We dynamically import the module so the mocks above are in place when
// SESSION_ID is initialised.
// ---------------------------------------------------------------------------
let track;

beforeEach(async () => {
  // Reset stores & mocks before every test
  store = {};
  fetchMock.mockClear();
  fetchMock.mockResolvedValue({ ok: true });
  window.location.pathname = '/test-page';

  // Re‑import with a cache‑busting query so each test gets a fresh module
  // (SESSION_ID is regenerated each time).
  vi.resetModules();
  const mod = await import('../shared/services/analytics');
  track = mod.track;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('analytics — track()', () => {
  it('sends a POST request to the analytics endpoint', async () => {
    store['access_token'] = fakeJwt({ user_id: '42' });
    store['countryCode'] = 'US';

    track('page_view', { extra: 1 });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/analytics/event');
    expect(opts.method).toBe('POST');
  });

  it('includes the correct event name in the body', async () => {
    await track('button_click');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.event).toBe('button_click');
  });

  it('includes window.location.pathname as page', async () => {
    window.location.pathname = '/dashboard';

    await track('nav');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.page).toBe('/dashboard');
  });

  it('extracts public_id from JWT as user_id', async () => {
    store['access_token'] = fakeJwt({ user_id: 99, public_id: 'usr_a7f3k9x2m5p8' });

    await track('login');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.user_id).toBe('usr_a7f3k9x2m5p8');
  });

  it('returns null user_id when JWT has no public_id', async () => {
    store['access_token'] = fakeJwt({ user_id: 99 });

    await track('login');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.user_id).toBeNull();
  });

  it('handles missing access_token gracefully (user_id is null/undefined)', async () => {
    // No access_token in store
    await track('anonymous_event');

    // Should still send the request without throwing
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    // user_id may be null, undefined, or absent — just should not throw
    expect(body.event).toBe('anonymous_event');
  });

  it('reads country from localStorage countryCode', async () => {
    store['countryCode'] = 'NG';

    await track('geo');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.country).toBe('NG');
  });

  it('includes document.referrer in the body', async () => {
    await track('referral');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.referrer).toBe('https://google.com');
  });

  it('includes a session_id that starts with "s_"', async () => {
    await track('session_test');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.session_id).toBeDefined();
    expect(body.session_id).toMatch(/^s_/);
  });

  it('passes metadata through to the body', async () => {
    const meta = { button: 'cta', variant: 'blue' };

    await track('click', meta);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.metadata).toEqual(meta);
  });

  it('never throws when fetch rejects', () => {
    fetchMock.mockRejectedValueOnce(new Error('Network down'));

    // track() is fire-and-forget — should not throw synchronously
    expect(() => track('failing_event')).not.toThrow();
  });

  it('never throws when fetch returns a non‑ok response', () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    expect(() => track('server_error_event')).not.toThrow();
  });
});
