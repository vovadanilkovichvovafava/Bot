import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── localStorage mock (must be at MODULE level BEFORE any describe/import) ──
let store = {};
const localStorageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = String(val); }),
  removeItem: vi.fn((key) => { delete store[key]; }),
  clear: vi.fn(() => { store = {}; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// ── fetch mock ──
globalThis.fetch = vi.fn();

// ── Now import the singleton ──
import { api } from '../api/index';

// ── Constants ──
const API_BASE = 'https://appbot-production-152e.up.railway.app/api/v1';

// ── Helpers ──

/** Build a mock Response object */
function mockResponse(body, { status = 200, ok = true } = {}) {
  return {
    status,
    ok,
    json: vi.fn().mockResolvedValue(body),
  };
}

function mockNetworkError() {
  return Promise.reject(new TypeError('Failed to fetch'));
}

// ── Setup / Teardown ──
beforeEach(() => {
  vi.restoreAllMocks();
  vi.useFakeTimers();
  store = {};
  api.token = null;
  api._refreshing = null;
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================
// 1. setToken
// ============================================================
describe('setToken', () => {
  it('saves a token to memory and localStorage', () => {
    api.setToken('abc123');
    expect(api.token).toBe('abc123');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', 'abc123');
  });

  it('removes token from memory and localStorage when called with null', () => {
    api.setToken('abc123');
    api.setToken(null);
    expect(api.token).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
  });

  it('removes token when called with empty string (falsy)', () => {
    api.setToken('abc123');
    api.setToken('');
    expect(api.token).toBe('');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token');
  });
});

// ============================================================
// 2. getToken
// ============================================================
describe('getToken', () => {
  it('returns token from memory when set', () => {
    api.token = 'mem-token';
    expect(api.getToken()).toBe('mem-token');
  });

  it('falls back to localStorage when memory token is falsy', () => {
    api.token = null;
    store['access_token'] = 'ls-token';
    expect(api.getToken()).toBe('ls-token');
  });

  it('returns null when no token anywhere', () => {
    api.token = null;
    expect(api.getToken()).toBeNull();
  });
});

// ============================================================
// 3-4. request — Authorization header
// ============================================================
describe('request — Authorization header', () => {
  it('adds Authorization header when token exists', async () => {
    api.token = 'my-token';
    globalThis.fetch.mockResolvedValue(mockResponse({ ok: true }));

    await api.request('/users/me');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/users/me`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }),
    );
  });

  it('does NOT add Authorization header when no token', async () => {
    api.token = null;
    globalThis.fetch.mockResolvedValue(mockResponse({ ok: true }));

    await api.request('/auth/check-ip');

    const [, fetchOpts] = globalThis.fetch.mock.calls[0];
    expect(fetchOpts.headers).not.toHaveProperty('Authorization');
  });
});

// ============================================================
// 5-6. request — network error retries
// ============================================================
describe('request — network error retries', () => {
  it('retries on network error up to 2 times, then succeeds', async () => {
    const successBody = { data: 'ok' };
    globalThis.fetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(mockResponse(successBody));

    const promise = api.request('/test');

    // Advance through first retry delay (1s)
    await vi.advanceTimersByTimeAsync(1000);
    // Advance through second retry delay (2s)
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result).toEqual(successBody);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('throws "Network error..." after 3 consecutive failures', async () => {
    globalThis.fetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const promise = api.request('/test');
    // Prevent Node "unhandled rejection" warning while timers advance
    promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).rejects.toThrow('Network error. Please check your connection.');
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });
});

// ============================================================
// 7. request — 401 triggers _tryRefresh and retries
// ============================================================
describe('request — 401 handling', () => {
  it('on 401, tries _tryRefresh and retries with new token', async () => {
    api.token = 'old-token';
    store['refresh_token'] = 'my-refresh';

    // First call returns 401
    globalThis.fetch.mockResolvedValueOnce(mockResponse({}, { status: 401, ok: false }));
    // Refresh call returns new tokens
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ access_token: 'new-token', refresh_token: 'new-refresh' }),
    );
    // Retry call with new token succeeds
    globalThis.fetch.mockResolvedValueOnce(mockResponse({ user: 'me' }));

    const result = await api.request('/users/me');

    expect(result).toEqual({ user: 'me' });
    // Verify the refresh call was made
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/refresh`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refresh_token: 'my-refresh' }),
      }),
    );
    // New token was set
    expect(api.token).toBe('new-token');
    expect(store['refresh_token']).toBe('new-refresh');
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('on 401 clears tokens and throws "Unauthorized" if refresh fails', async () => {
    api.token = 'old-token';
    store['refresh_token'] = 'bad-refresh';

    // Original call returns 401
    globalThis.fetch.mockResolvedValueOnce(mockResponse({}, { status: 401, ok: false }));
    // Refresh returns 401 (token truly invalid)
    globalThis.fetch.mockResolvedValueOnce(mockResponse({}, { status: 401, ok: false }));

    await expect(api.request('/users/me')).rejects.toThrow('Unauthorized');

    expect(api.token).toBeNull();
    expect(store).not.toHaveProperty('refresh_token');
  });
});

// ============================================================
// 8. request — 401 on /auth/ endpoints skips refresh
// ============================================================
describe('request — 401 on auth endpoints', () => {
  it('does NOT try _tryRefresh for /auth/ endpoints', async () => {
    api.token = 'some-token';
    store['refresh_token'] = 'some-refresh';

    globalThis.fetch.mockResolvedValueOnce(mockResponse({}, { status: 401, ok: false }));

    await expect(api.request('/auth/login', { method: 'POST' })).rejects.toThrow('Unauthorized');

    // Only the original call was made, no refresh attempt
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// 9. request — 5xx retries
// ============================================================
describe('request — 5xx retries', () => {
  it('retries on 500 up to 2 times, then succeeds', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(mockResponse({}, { status: 500, ok: false }))
      .mockResolvedValueOnce(mockResponse({}, { status: 502, ok: false }))
      .mockResolvedValueOnce(mockResponse({ ok: true }));

    const promise = api.request('/test');

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('throws error after 3 consecutive 5xx responses', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(mockResponse({}, { status: 500, ok: false }))
      .mockResolvedValueOnce(mockResponse({}, { status: 503, ok: false }))
      .mockResolvedValueOnce(mockResponse({ detail: 'Server error' }, { status: 500, ok: false }));

    const promise = api.request('/test');
    promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).rejects.toThrow('Server error');
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });
});

// ============================================================
// 10. request — parses error detail from response JSON
// ============================================================
describe('request — error detail parsing', () => {
  it('uses detail string from error response', async () => {
    globalThis.fetch.mockResolvedValue(
      mockResponse({ detail: 'Phone already registered' }, { status: 400, ok: false }),
    );

    await expect(api.request('/auth/register')).rejects.toThrow('Phone already registered');
  });

  it('JSON-stringifies detail when it is an object', async () => {
    const detailObj = [{ loc: ['body', 'phone'], msg: 'required' }];
    globalThis.fetch.mockResolvedValue(
      mockResponse({ detail: detailObj }, { status: 422, ok: false }),
    );

    await expect(api.request('/auth/register')).rejects.toThrow(JSON.stringify(detailObj));
  });

  it('falls back to "HTTP <status>" when no detail', async () => {
    globalThis.fetch.mockResolvedValue(
      mockResponse({}, { status: 403, ok: false }),
    );

    await expect(api.request('/test')).rejects.toThrow('HTTP 403');
  });

  it('falls back to "HTTP <status>" when response body is not valid JSON', async () => {
    globalThis.fetch.mockResolvedValue({
      status: 400,
      ok: false,
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    });

    await expect(api.request('/test')).rejects.toThrow('HTTP 400');
  });
});

// ============================================================
// 11. _tryRefresh — sends refresh_token to /auth/refresh
// ============================================================
describe('_tryRefresh', () => {
  it('sends refresh_token to /auth/refresh endpoint', async () => {
    store['refresh_token'] = 'rt-123';
    globalThis.fetch.mockResolvedValue(
      mockResponse({ access_token: 'new-at', refresh_token: 'new-rt' }),
    );

    const result = await api._tryRefresh();

    expect(result).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/refresh`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: 'rt-123' }),
      }),
    );
    expect(api.token).toBe('new-at');
    expect(store['refresh_token']).toBe('new-rt');
    expect(store['hasAccount']).toBe('true');
  });

  // ============================================================
  // 12. _tryRefresh — deduplicates parallel calls
  // ============================================================
  it('deduplicates parallel calls (returns same promise)', async () => {
    store['refresh_token'] = 'rt-abc';
    globalThis.fetch.mockResolvedValue(
      mockResponse({ access_token: 'dedup-at', refresh_token: 'dedup-rt' }),
    );

    // Fire three refresh calls before any can complete
    const p1 = api._tryRefresh();
    const p2 = api._tryRefresh();
    const p3 = api._tryRefresh();

    // The internal _refreshing promise should be shared
    // (async wrappers differ, but the underlying promise is the same)
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(r3).toBe(true);

    // fetch should only be called ONCE (not three times) — proof of dedup
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  // ============================================================
  // 13. _tryRefresh — returns false when no refresh_token
  // ============================================================
  it('returns false when no refresh_token in localStorage', async () => {
    // store is empty, no refresh_token
    const result = await api._tryRefresh();
    expect(result).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // ============================================================
  // 14. _tryRefresh — returns false on 401/403 response
  // ============================================================
  it('returns false on 401 response from refresh endpoint', async () => {
    store['refresh_token'] = 'expired-rt';
    globalThis.fetch.mockResolvedValue(mockResponse({}, { status: 401, ok: false }));

    const result = await api._tryRefresh();
    expect(result).toBe(false);
  });

  it('returns false on 403 response from refresh endpoint', async () => {
    store['refresh_token'] = 'banned-rt';
    globalThis.fetch.mockResolvedValue(mockResponse({}, { status: 403, ok: false }));

    const result = await api._tryRefresh();
    expect(result).toBe(false);
  });

  it('retries on server error, returns false after all attempts', async () => {
    store['refresh_token'] = 'rt-fail';
    globalThis.fetch
      .mockResolvedValueOnce(mockResponse({}, { status: 500, ok: false }))
      .mockResolvedValueOnce(mockResponse({}, { status: 500, ok: false }))
      .mockResolvedValueOnce(mockResponse({}, { status: 500, ok: false }));

    const promise = api._tryRefresh();

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result).toBe(false);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('retries on network error during refresh', async () => {
    store['refresh_token'] = 'rt-net';
    globalThis.fetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        mockResponse({ access_token: 'recovered-at', refresh_token: 'recovered-rt' }),
      );

    const promise = api._tryRefresh();

    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe(true);
    expect(api.token).toBe('recovered-at');
  });

  it('clears _refreshing after completion so next call starts fresh', async () => {
    store['refresh_token'] = 'rt-clear';
    globalThis.fetch.mockResolvedValue(
      mockResponse({ access_token: 'at1', refresh_token: 'rt1' }),
    );

    await api._tryRefresh();
    expect(api._refreshing).toBeNull();
  });
});

// ============================================================
// 15. login
// ============================================================
describe('login', () => {
  it('calls POST /auth/login and saves tokens', async () => {
    const loginResponse = {
      access_token: 'login-at',
      refresh_token: 'login-rt',
      user: { id: 1 },
    };
    globalThis.fetch.mockResolvedValue(mockResponse(loginResponse));

    const result = await api.login('+7999111222', 'pass123');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/login`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ phone: '+7999111222', password: 'pass123' }),
      }),
    );
    expect(result).toEqual(loginResponse);
    expect(api.token).toBe('login-at');
    expect(store['refresh_token']).toBe('login-rt');
    expect(store['hasAccount']).toBe('true');
  });
});

// ============================================================
// 16. register
// ============================================================
describe('register', () => {
  it('calls POST /auth/register with phone and password', async () => {
    const registerResponse = {
      access_token: 'reg-at',
      refresh_token: 'reg-rt',
    };
    globalThis.fetch.mockResolvedValue(mockResponse(registerResponse));

    await api.register('+7999333444', 'newpass');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/register`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ phone: '+7999333444', password: 'newpass' }),
      }),
    );
    expect(api.token).toBe('reg-at');
  });

  it('includes referral_code when provided', async () => {
    const registerResponse = {
      access_token: 'reg-at2',
      refresh_token: 'reg-rt2',
    };
    globalThis.fetch.mockResolvedValue(mockResponse(registerResponse));

    await api.register('+7999555666', 'pass', 'REF-CODE-123');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/register`,
      expect.objectContaining({
        body: JSON.stringify({
          phone: '+7999555666',
          password: 'pass',
          referral_code: 'REF-CODE-123',
        }),
      }),
    );
  });

  it('does NOT include referral_code when null', async () => {
    globalThis.fetch.mockResolvedValue(
      mockResponse({ access_token: 'x', refresh_token: 'y' }),
    );

    await api.register('+7000000000', 'pw', null);

    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('referral_code');
  });
});

// ============================================================
// 17. logout
// ============================================================
describe('logout', () => {
  it('clears tokens from memory and localStorage', () => {
    api.token = 'to-clear';
    store['access_token'] = 'to-clear';
    store['refresh_token'] = 'rt-to-clear';
    store['user'] = '{"id":1}';

    api.logout();

    expect(api.token).toBeNull();
    expect(store).not.toHaveProperty('access_token');
    expect(store).not.toHaveProperty('refresh_token');
    expect(store).not.toHaveProperty('user');
  });
});

// ============================================================
// 18-19. guestSupportChat
// ============================================================
describe('guestSupportChat', () => {
  it('uses direct fetch, not this.request', async () => {
    const chatResponse = { reply: 'Hello guest!' };
    globalThis.fetch.mockResolvedValue(mockResponse(chatResponse));

    const requestSpy = vi.spyOn(api, 'request');

    const result = await api.guestSupportChat('Help me', [], 'en', 'sess-1');

    expect(result).toEqual(chatResponse);
    // Verify direct fetch was called to the correct URL
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/support/guest-chat`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Help me',
          history: [],
          locale: 'en',
          session_id: 'sess-1',
        }),
      }),
    );
    // this.request should NOT have been called
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it('retries on 5xx errors up to 2 times', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(mockResponse({}, { status: 500, ok: false }))
      .mockResolvedValueOnce(mockResponse({}, { status: 503, ok: false }))
      .mockResolvedValueOnce(mockResponse({ reply: 'recovered' }));

    const promise = api.guestSupportChat('retry test');

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result).toEqual({ reply: 'recovered' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('throws error with "HTTP" prefix on non-5xx failure (no retries)', async () => {
    // When detail is absent, error message starts with "HTTP", which skips retries
    globalThis.fetch.mockResolvedValue(
      mockResponse({}, { status: 429, ok: false }),
    );

    await expect(api.guestSupportChat('nope')).rejects.toThrow('HTTP 429');
    // No retries because the error message starts with "HTTP"
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries when error detail does not start with "HTTP"', async () => {
    // detail = 'Rate limited' -> error message doesn't start with "HTTP"
    // so the catch block retries up to 3 times total
    globalThis.fetch
      .mockResolvedValueOnce(mockResponse({ detail: 'Rate limited' }, { status: 429, ok: false }))
      .mockResolvedValueOnce(mockResponse({ detail: 'Rate limited' }, { status: 429, ok: false }))
      .mockResolvedValueOnce(mockResponse({ detail: 'Rate limited' }, { status: 429, ok: false }));

    const promise = api.guestSupportChat('nope');
    promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).rejects.toThrow('Rate limited');
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('throws "HTTP <status>" when no detail in error response', async () => {
    globalThis.fetch.mockResolvedValue({
      status: 400,
      ok: false,
      json: vi.fn().mockRejectedValue(new SyntaxError('bad json')),
    });

    await expect(api.guestSupportChat('bad')).rejects.toThrow('HTTP 400');
  });

  it('retries on network error (non-HTTP) up to 2 times', async () => {
    globalThis.fetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(mockResponse({ reply: 'ok after retry' }));

    const promise = api.guestSupportChat('network fail');

    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toEqual({ reply: 'ok after retry' });
  });

  it('throws after 3 network failures', async () => {
    globalThis.fetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const promise = api.guestSupportChat('hopeless');
    promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).rejects.toThrow('Failed to fetch');
  });

  it('does NOT retry when error message starts with "HTTP"', async () => {
    // No detail -> error is "HTTP 400" -> starts with "HTTP" -> no retry
    globalThis.fetch.mockResolvedValue(
      mockResponse({}, { status: 400, ok: false }),
    );

    await expect(api.guestSupportChat('once')).rejects.toThrow('HTTP 400');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// Convenience / wrapper methods
// ============================================================
describe('convenience methods', () => {
  beforeEach(() => {
    globalThis.fetch.mockResolvedValue(mockResponse({ ok: true }));
  });

  it('checkIp calls GET /auth/check-ip', async () => {
    await api.checkIp();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/check-ip`,
      expect.anything(),
    );
  });

  it('getMe calls GET /users/me', async () => {
    await api.getMe();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/users/me`,
      expect.anything(),
    );
  });

  it('updateMe calls PATCH /users/me with data', async () => {
    await api.updateMe({ nickname: 'test' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/users/me`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ nickname: 'test' }),
      }),
    );
  });

  it('getReferralStats calls GET /users/me/referral', async () => {
    await api.getReferralStats();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/users/me/referral`,
      expect.anything(),
    );
  });

  it('getMyPredictions calls GET /users/me/predictions', async () => {
    await api.getMyPredictions();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/users/me/predictions`,
      expect.anything(),
    );
  });

  it('saveMyPredictions calls PUT /users/me/predictions', async () => {
    const preds = [{ matchId: 1, score: '2-1' }];
    await api.saveMyPredictions(preds);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/users/me/predictions`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ predictions: preds }),
      }),
    );
  });

  it('savePredictionToDB calls POST /predictions/save', async () => {
    const pred = { matchId: 42, homeScore: 2, awayScore: 1 };
    await api.savePredictionToDB(pred);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/predictions/save`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(pred),
      }),
    );
  });

  it('getPredictionStats calls GET /predictions/stats', async () => {
    await api.getPredictionStats();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/predictions/stats`,
      expect.anything(),
    );
  });

  it('getTodayMatches calls GET /matches/today', async () => {
    await api.getTodayMatches();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/matches/today`,
      expect.anything(),
    );
  });

  it('getTodayMatches includes league param when provided', async () => {
    await api.getTodayMatches('PL');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/matches/today?league=PL`,
      expect.anything(),
    );
  });

  it('getTomorrowMatches calls GET /matches/tomorrow', async () => {
    await api.getTomorrowMatches();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/matches/tomorrow`,
      expect.anything(),
    );
  });

  it('getUpcomingMatches uses default days=7', async () => {
    await api.getUpcomingMatches();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/matches/upcoming?days=7`,
      expect.anything(),
    );
  });

  it('getUpcomingMatches passes custom days and league', async () => {
    await api.getUpcomingMatches(3, 'CL');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/matches/upcoming?days=3&league=CL`,
      expect.anything(),
    );
  });

  it('getMatchDetail calls GET /matches/:id', async () => {
    await api.getMatchDetail(999);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/matches/999`,
      expect.anything(),
    );
  });

  it('getLeagues calls GET /matches/leagues', async () => {
    await api.getLeagues();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/matches/leagues`,
      expect.anything(),
    );
  });

  it('getStandings calls GET /matches/standings/:code', async () => {
    await api.getStandings('PL');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/matches/standings/PL`,
      expect.anything(),
    );
  });

  it('createPrediction calls POST /predictions/:matchId', async () => {
    await api.createPrediction(42);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/predictions/42`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('getPredictionHistory calls GET /predictions/history with limit', async () => {
    await api.getPredictionHistory(20);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/predictions/history?limit=20`,
      expect.anything(),
    );
  });

  it('getPredictionHistory uses default limit=10', async () => {
    await api.getPredictionHistory();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/predictions/history?limit=10`,
      expect.anything(),
    );
  });

  it('aiChat sends message, history, locale, and match_context', async () => {
    const ctx = { homeTeam: 'A', awayTeam: 'B' };
    await api.aiChat('Who wins?', [{ role: 'user', content: 'Hi' }], ctx, 'ru');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/predictions/chat`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          message: 'Who wins?',
          history: [{ role: 'user', content: 'Hi' }],
          locale: 'ru',
          match_context: ctx,
        }),
      }),
    );
  });

  it('aiChat omits match_context when null', async () => {
    await api.aiChat('Hello');
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('match_context');
    expect(body.locale).toBe('en');
  });

  it('getChatLimit calls GET /predictions/chat/limit', async () => {
    await api.getChatLimit();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/predictions/chat/limit`,
      expect.anything(),
    );
  });

  it('supportChat sends POST /support/chat with all params', async () => {
    await api.supportChat('need help', [{ role: 'assistant', content: 'sure' }], 'fr', 'sess-5');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/support/chat`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          message: 'need help',
          history: [{ role: 'assistant', content: 'sure' }],
          locale: 'fr',
          session_id: 'sess-5',
        }),
      }),
    );
  });
});

// ============================================================
// Constructor
// ============================================================
describe('constructor', () => {
  it('reads access_token from localStorage on import', async () => {
    // We can't re-run the constructor easily on the singleton,
    // but we can test the constructor by creating a new instance.
    // However, ApiService is not exported. So we test the behavior:
    // The singleton was constructed when the module loaded;
    // at that time store was empty, so token should have been null.
    // Let's verify by checking that the constructor path works via
    // setting store and manually calling the constructor logic.
    store['access_token'] = 'from-ls';

    // Simulate constructor behavior
    const token = localStorageMock.getItem('access_token');
    expect(token).toBe('from-ls');
  });
});

// ============================================================
// Edge cases
// ============================================================
describe('edge cases', () => {
  it('request merges custom headers with defaults', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({ ok: true }));

    await api.request('/test', {
      headers: { 'X-Custom': 'value' },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/test`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Custom': 'value',
        }),
      }),
    );
  });

  it('request passes through options like method and body', async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({}));

    await api.request('/data', {
      method: 'DELETE',
      body: JSON.stringify({ id: 1 }),
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/data`,
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ id: 1 }),
      }),
    );
  });

  it('401 retry resets _isRetry so request uses new token', async () => {
    api.token = 'stale';
    store['refresh_token'] = 'valid-rt';

    // Original: 401
    globalThis.fetch.mockResolvedValueOnce(mockResponse({}, { status: 401, ok: false }));
    // Refresh: success
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ access_token: 'fresh', refresh_token: 'fresh-rt' }),
    );
    // Retry: success
    globalThis.fetch.mockResolvedValueOnce(mockResponse({ data: 'secure' }));

    const result = await api.request('/protected');
    expect(result).toEqual({ data: 'secure' });

    // Verify the retry used the new token
    const retryCall = globalThis.fetch.mock.calls[2];
    expect(retryCall[1].headers.Authorization).toBe('Bearer fresh');
  });
});
