import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// localStorage mock — MUST be at module level before describe
// jsdom throws SecurityError if you try to mock it inside tests
// ============================================================
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

// Global fetch mock
globalThis.fetch = vi.fn();

// ============================================================
// Helper: dynamically import a fresh BookmakerApi singleton
// Because bookmakerApi.js exports a singleton created at import
// time, we must reset modules for each test to get a clean one.
// ============================================================
async function loadApi() {
  vi.resetModules();
  const mod = await import('../features/betting/api/bookmakerApi');
  return { api: mod.default, BookmakerApi: mod.BookmakerApi, BKPROXY_URL: mod.BKPROXY_URL };
}

// Helper: build a fake Response for fetch mock
function mockFetchResponse(body, { ok = true, status = 200 } = {}) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

// ============================================================
// Tests
// ============================================================
describe('BookmakerApi', () => {
  beforeEach(() => {
    store = {};
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    globalThis.fetch.mockReset();
  });

  // ----------------------------------------------------------
  // 1. Constructor
  // ----------------------------------------------------------
  describe('constructor', () => {
    it('reads sessionId from localStorage on instantiation', async () => {
      store['bk_session_id'] = 'saved-session-123';
      const { api } = await loadApi();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('bk_session_id');
      expect(api.sessionId).toBe('saved-session-123');
    });

    it('sets sessionId to null when localStorage has no value', async () => {
      const { api } = await loadApi();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('bk_session_id');
      expect(api.sessionId).toBeNull();
    });

    it('sets baseUrl from BKPROXY_URL', async () => {
      const { api, BKPROXY_URL } = await loadApi();
      expect(api.baseUrl).toBe(BKPROXY_URL);
    });
  });

  // ----------------------------------------------------------
  // 2. request() — headers
  // ----------------------------------------------------------
  describe('request() headers', () => {
    it('adds Content-Type application/json header', async () => {
      globalThis.fetch.mockImplementation(() => mockFetchResponse({ ok: true }));
      const { api } = await loadApi();

      await api.request('/api/test');

      const [, fetchOptions] = globalThis.fetch.mock.calls[0];
      expect(fetchOptions.headers['Content-Type']).toBe('application/json');
    });

    it('adds X-Session-Id header when sessionId exists', async () => {
      store['bk_session_id'] = 'my-session';
      globalThis.fetch.mockImplementation(() => mockFetchResponse({ ok: true }));
      const { api } = await loadApi();

      await api.request('/api/test');

      const [, fetchOptions] = globalThis.fetch.mock.calls[0];
      expect(fetchOptions.headers['X-Session-Id']).toBe('my-session');
    });

    it('does not include X-Session-Id header when no session', async () => {
      globalThis.fetch.mockImplementation(() => mockFetchResponse({ ok: true }));
      const { api } = await loadApi();

      await api.request('/api/test');

      const [, fetchOptions] = globalThis.fetch.mock.calls[0];
      expect(fetchOptions.headers['X-Session-Id']).toBeUndefined();
    });

    it('merges custom headers with defaults', async () => {
      globalThis.fetch.mockImplementation(() => mockFetchResponse({ ok: true }));
      const { api } = await loadApi();

      await api.request('/api/test', {
        headers: { 'X-Custom': 'value' },
      });

      const [, fetchOptions] = globalThis.fetch.mock.calls[0];
      expect(fetchOptions.headers['Content-Type']).toBe('application/json');
      expect(fetchOptions.headers['X-Custom']).toBe('value');
    });

    it('allows overriding Content-Type via custom headers', async () => {
      globalThis.fetch.mockImplementation(() => mockFetchResponse({ ok: true }));
      const { api } = await loadApi();

      await api.request('/api/test', {
        headers: { 'Content-Type': 'text/plain' },
      });

      const [, fetchOptions] = globalThis.fetch.mock.calls[0];
      expect(fetchOptions.headers['Content-Type']).toBe('text/plain');
    });
  });

  // ----------------------------------------------------------
  // 3. request() — session saving from response
  // ----------------------------------------------------------
  describe('request() session from response', () => {
    it('saves sessionId from response data when present', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ sessionId: 'new-session-456', data: 'ok' }),
      );
      const { api } = await loadApi();

      await api.request('/api/test');

      expect(api.sessionId).toBe('new-session-456');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('bk_session_id', 'new-session-456');
    });

    it('does not overwrite session when response has no sessionId', async () => {
      store['bk_session_id'] = 'existing-session';
      globalThis.fetch.mockImplementation(() => mockFetchResponse({ data: 'ok' }));
      const { api } = await loadApi();

      await api.request('/api/test');

      expect(api.sessionId).toBe('existing-session');
      // setItem should not have been called after the initial constructor load
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // 4. request() — error handling
  // ----------------------------------------------------------
  describe('request() error handling', () => {
    it('throws Error with data.error message on non-ok response', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ error: 'Invalid credentials' }, { ok: false, status: 401 }),
      );
      const { api } = await loadApi();

      await expect(api.request('/api/test')).rejects.toThrow('Invalid credentials');
    });

    it('throws Error with data.message when data.error is absent', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ message: 'Not found' }, { ok: false, status: 404 }),
      );
      const { api } = await loadApi();

      await expect(api.request('/api/test')).rejects.toThrow('Not found');
    });

    it('throws generic "Request failed" when no error/message in data', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({}, { ok: false, status: 500 }),
      );
      const { api } = await loadApi();

      await expect(api.request('/api/test')).rejects.toThrow('Request failed');
    });

    it('still saves sessionId even when response is not ok', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse(
          { sessionId: 'error-session', error: 'Bad request' },
          { ok: false, status: 400 },
        ),
      );
      const { api } = await loadApi();

      await expect(api.request('/api/test')).rejects.toThrow('Bad request');
      // sessionId should still have been saved before the throw
      expect(api.sessionId).toBe('error-session');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('bk_session_id', 'error-session');
    });
  });

  // ----------------------------------------------------------
  // 5. setSession()
  // ----------------------------------------------------------
  describe('setSession()', () => {
    it('saves sessionId to instance and localStorage', async () => {
      const { api } = await loadApi();

      api.setSession('abc-123');

      expect(api.sessionId).toBe('abc-123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('bk_session_id', 'abc-123');
    });
  });

  // ----------------------------------------------------------
  // 6. clearSession()
  // ----------------------------------------------------------
  describe('clearSession()', () => {
    it('sets sessionId to null and removes from localStorage', async () => {
      store['bk_session_id'] = 'will-be-cleared';
      const { api } = await loadApi();

      api.clearSession();

      expect(api.sessionId).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bk_session_id');
    });
  });

  // ----------------------------------------------------------
  // 7. hasSession()
  // ----------------------------------------------------------
  describe('hasSession()', () => {
    it('returns true when sessionId is set', async () => {
      store['bk_session_id'] = 'existing';
      const { api } = await loadApi();

      expect(api.hasSession()).toBe(true);
    });

    it('returns false when sessionId is null', async () => {
      const { api } = await loadApi();

      expect(api.hasSession()).toBe(false);
    });

    it('returns false after clearSession()', async () => {
      store['bk_session_id'] = 'will-clear';
      const { api } = await loadApi();

      api.clearSession();

      expect(api.hasSession()).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 8. login()
  // ----------------------------------------------------------
  describe('login()', () => {
    it('calls /api/auth/login with POST method', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ sessionId: 'login-session', user: { id: 1 } }),
      );
      const { api } = await loadApi();

      await api.login('user@test.com', 'password123');

      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/auth/login');
      expect(options.method).toBe('POST');
    });

    it('sends login and password in request body', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ sessionId: 's1' }),
      );
      const { api } = await loadApi();

      await api.login('user@test.com', 'pass123');

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.login).toBe('user@test.com');
      expect(body.password).toBe('pass123');
    });

    it('does not include captchaResponseV4 when not provided', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ sessionId: 's1' }),
      );
      const { api } = await loadApi();

      await api.login('user@test.com', 'pass123');

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.captchaResponseV4).toBeUndefined();
    });

    // 9. login() with captchaResponse
    it('includes captchaResponseV4 when captchaResponse is provided', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ sessionId: 's1' }),
      );
      const { api } = await loadApi();
      const captcha = { lot_number: '123', captcha_output: 'abc', pass_token: 'tok', gen_time: '1' };

      await api.login('user@test.com', 'pass123', captcha);

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.captchaResponseV4).toEqual(captcha);
    });

    it('returns the response data from the server', async () => {
      const responseData = { sessionId: 'login-session', user: { id: 1, name: 'Test' } };
      globalThis.fetch.mockImplementation(() => mockFetchResponse(responseData));
      const { api } = await loadApi();

      const result = await api.login('user@test.com', 'pass');

      expect(result).toEqual(responseData);
    });
  });

  // ----------------------------------------------------------
  // 10. register()
  // ----------------------------------------------------------
  describe('register()', () => {
    it('calls /api/auth/register with POST method', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ sessionId: 'reg-session' }),
      );
      const { api } = await loadApi();

      await api.register({ email: 'new@test.com', password: 'pw', currency: 'USD' });

      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/auth/register');
      expect(options.method).toBe('POST');
    });

    it('sends registration params in request body', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ sessionId: 'reg-session' }),
      );
      const { api } = await loadApi();
      const params = {
        email: 'new@test.com',
        password: 'secret',
        currency: 'EUR',
        captchaResponseV4: { lot_number: '1' },
      };

      await api.register(params);

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body).toEqual(params);
    });

    it('returns the response data', async () => {
      const responseData = { sessionId: 'reg-session', user: { id: 2 } };
      globalThis.fetch.mockImplementation(() => mockFetchResponse(responseData));
      const { api } = await loadApi();

      const result = await api.register({ email: 'test@x.com', password: 'p', currency: 'USD' });

      expect(result).toEqual(responseData);
    });
  });

  // ----------------------------------------------------------
  // 11. logout()
  // ----------------------------------------------------------
  describe('logout()', () => {
    it('calls /api/auth/logout with POST method', async () => {
      store['bk_session_id'] = 'active-session';
      globalThis.fetch.mockImplementation(() => mockFetchResponse({}));
      const { api } = await loadApi();

      await api.logout();

      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/auth/logout');
      expect(options.method).toBe('POST');
    });

    it('clears session after successful logout', async () => {
      store['bk_session_id'] = 'active-session';
      globalThis.fetch.mockImplementation(() => mockFetchResponse({}));
      const { api } = await loadApi();

      await api.logout();

      expect(api.sessionId).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bk_session_id');
    });

    it('clears session even when the request fails (finally block)', async () => {
      store['bk_session_id'] = 'active-session';
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ error: 'Server error' }, { ok: false, status: 500 }),
      );
      const { api } = await loadApi();

      // request() throws on non-ok, and try/finally re-throws after clearing session
      await expect(api.logout()).rejects.toThrow('Server error');

      // But session should still be cleared via finally
      expect(api.sessionId).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bk_session_id');
    });

    it('clears session even when fetch itself rejects', async () => {
      store['bk_session_id'] = 'active-session';
      globalThis.fetch.mockImplementation(() => Promise.reject(new Error('Network error')));
      const { api } = await loadApi();

      // logout catches the error in try/finally, but the error still propagates
      // Actually, looking at the code: try { await this.request(...) } finally { this.clearSession() }
      // The error WILL propagate to the caller since there's no catch
      await expect(api.logout()).rejects.toThrow('Network error');

      // But session should still be cleared via finally
      expect(api.sessionId).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bk_session_id');
    });
  });

  // ----------------------------------------------------------
  // 12. getUser() and getBalance()
  // ----------------------------------------------------------
  describe('getUser()', () => {
    it('calls /api/user with GET (default method)', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ id: 1, name: 'Test User' }),
      );
      const { api } = await loadApi();

      const result = await api.getUser();

      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/user');
      expect(options.method).toBeUndefined(); // default GET, no explicit method
      expect(result).toEqual({ id: 1, name: 'Test User' });
    });
  });

  describe('getBalance()', () => {
    it('calls /api/balance with GET (default method)', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ balance: 100.50, currency: 'EUR' }),
      );
      const { api } = await loadApi();

      const result = await api.getBalance();

      const [url] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/balance');
      expect(result).toEqual({ balance: 100.50, currency: 'EUR' });
    });
  });

  // ----------------------------------------------------------
  // 13. placeBet()
  // ----------------------------------------------------------
  describe('placeBet()', () => {
    it('calls /api/bets/place with POST method', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ betId: 'bet-1', status: 'placed' }),
      );
      const { api } = await loadApi();

      await api.placeBet({ oddId: 'odd-123', amount: 10 });

      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/bets/place');
      expect(options.method).toBe('POST');
    });

    it('formats coupons array with oddId, amount, and currencyCode', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ betId: 'bet-1' }),
      );
      const { api } = await loadApi();

      await api.placeBet({ oddId: 'odd-123', amount: 50, currencyCode: 'USD' });

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.coupons).toEqual([
        { oddId: 'odd-123', amount: 50, currencyCode: 'USD' },
      ]);
    });

    it('uses EUR as default currencyCode', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ betId: 'bet-1' }),
      );
      const { api } = await loadApi();

      await api.placeBet({ oddId: 'odd-456', amount: 25 });

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.coupons[0].currencyCode).toBe('EUR');
    });

    it('wraps single bet in a coupons array of length 1', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ betId: 'bet-1' }),
      );
      const { api } = await loadApi();

      await api.placeBet({ oddId: 'odd-789', amount: 5 });

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.coupons).toHaveLength(1);
    });
  });

  // ----------------------------------------------------------
  // 14. placeBets()
  // ----------------------------------------------------------
  describe('placeBets()', () => {
    it('calls /api/bets/place with POST and passes coupons array', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ betIds: ['b1', 'b2'] }),
      );
      const { api } = await loadApi();
      const coupons = [
        { oddId: 'odd-1', amount: 10, currencyCode: 'EUR' },
        { oddId: 'odd-2', amount: 20, currencyCode: 'USD' },
      ];

      await api.placeBets(coupons);

      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/bets/place');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.coupons).toEqual(coupons);
    });

    it('sends empty coupons array when called with empty array', async () => {
      globalThis.fetch.mockImplementation(() => mockFetchResponse({}));
      const { api } = await loadApi();

      await api.placeBets([]);

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.coupons).toEqual([]);
    });
  });

  // ----------------------------------------------------------
  // getBetHistory()
  // ----------------------------------------------------------
  describe('getBetHistory()', () => {
    it('calls /api/bets/history with POST', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ bets: [] }),
      );
      const { api } = await loadApi();

      await api.getBetHistory({ status: 'settled' });

      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/bets/history');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body).toEqual({ status: 'settled' });
    });

    it('sends empty object when no params provided', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ bets: [] }),
      );
      const { api } = await loadApi();

      await api.getBetHistory();

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body).toEqual({});
    });
  });

  // ----------------------------------------------------------
  // getBetDetail()
  // ----------------------------------------------------------
  describe('getBetDetail()', () => {
    it('calls /api/bets/detail with POST and betId', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ betId: 'bet-99', odds: 2.5 }),
      );
      const { api } = await loadApi();

      await api.getBetDetail('bet-99');

      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/bets/detail');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.betId).toBe('bet-99');
    });
  });

  // ----------------------------------------------------------
  // cashoutBet()
  // ----------------------------------------------------------
  describe('cashoutBet()', () => {
    it('calls /api/bets/cashout with POST and betId', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ success: true }),
      );
      const { api } = await loadApi();

      await api.cashoutBet('bet-42');

      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/bets/cashout');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.betId).toBe('bet-42');
    });
  });

  // ----------------------------------------------------------
  // 15. getMatch()
  // ----------------------------------------------------------
  describe('getMatch()', () => {
    it('calls /api/matches/{matchId} with correct URL', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ matchId: 'm-100', teams: ['A', 'B'] }),
      );
      const { api } = await loadApi();

      const result = await api.getMatch('m-100');

      const [url] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/matches/m-100');
      expect(result.matchId).toBe('m-100');
    });

    it('uses GET method (no explicit method set)', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ matchId: 'm-1' }),
      );
      const { api } = await loadApi();

      await api.getMatch('m-1');

      const [, options] = globalThis.fetch.mock.calls[0];
      expect(options.method).toBeUndefined();
    });
  });

  // ----------------------------------------------------------
  // getMatches()
  // ----------------------------------------------------------
  describe('getMatches()', () => {
    it('calls /api/matches with POST and filters', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ matches: [] }),
      );
      const { api } = await loadApi();
      const filters = { sport: 'football', live: true };

      await api.getMatches(filters);

      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/matches');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body).toEqual(filters);
    });

    it('sends empty object when no filters provided', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ matches: [] }),
      );
      const { api } = await loadApi();

      await api.getMatches();

      const [, options] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body).toEqual({});
    });
  });

  // ----------------------------------------------------------
  // 16. searchMatches()
  // ----------------------------------------------------------
  describe('searchMatches()', () => {
    it('calls /api/matches/search with query parameter', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ matches: [{ id: 1 }] }),
      );
      const { api } = await loadApi();

      await api.searchMatches('Real Madrid');

      const [url] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/matches/search?q=Real%20Madrid');
    });

    it('encodes special characters in query', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ matches: [] }),
      );
      const { api } = await loadApi();

      await api.searchMatches('team A & team B');

      const [url] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/matches/search?q=team%20A%20%26%20team%20B');
    });

    it('uses GET method (no explicit method set)', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ matches: [] }),
      );
      const { api } = await loadApi();

      await api.searchMatches('test');

      const [, options] = globalThis.fetch.mock.calls[0];
      expect(options.method).toBeUndefined();
    });
  });

  // ----------------------------------------------------------
  // getCaptchaConfig()
  // ----------------------------------------------------------
  describe('getCaptchaConfig()', () => {
    it('calls /api/captcha/config', async () => {
      globalThis.fetch.mockImplementation(() =>
        mockFetchResponse({ captchaId: 'gee-123', productId: 'p1' }),
      );
      const { api } = await loadApi();

      const result = await api.getCaptchaConfig();

      const [url] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/api/captcha/config');
      expect(result.captchaId).toBe('gee-123');
    });
  });

  // ----------------------------------------------------------
  // URL construction
  // ----------------------------------------------------------
  describe('URL construction', () => {
    it('prepends baseUrl to all endpoints', async () => {
      globalThis.fetch.mockImplementation(() => mockFetchResponse({}));
      const { api, BKPROXY_URL } = await loadApi();

      await api.request('/api/anything');

      const [url] = globalThis.fetch.mock.calls[0];
      expect(url).toBe(`${BKPROXY_URL}/api/anything`);
    });
  });

  // ----------------------------------------------------------
  // request() — passes through additional fetch options
  // ----------------------------------------------------------
  describe('request() fetch options passthrough', () => {
    it('passes method and body from options to fetch', async () => {
      globalThis.fetch.mockImplementation(() => mockFetchResponse({}));
      const { api } = await loadApi();

      await api.request('/api/test', {
        method: 'PUT',
        body: JSON.stringify({ key: 'value' }),
      });

      const [, options] = globalThis.fetch.mock.calls[0];
      expect(options.method).toBe('PUT');
      expect(JSON.parse(options.body)).toEqual({ key: 'value' });
    });
  });
});
