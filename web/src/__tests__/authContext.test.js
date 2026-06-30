/**
 * Tests for AuthContext — AuthProvider + useAuth hook
 * Covers: login, register, logout, checkAuth, togglePremium,
 *         connectBookmaker, disconnectBookmaker, useAuth outside provider
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement } from 'react';

// ── localStorage mock (module scope, before any imports that touch it) ──
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

// ── Mock dependencies ──
vi.mock('../shared/api', () => ({
  default: {
    getToken: vi.fn(() => null),
    checkIp: vi.fn(() => Promise.resolve({ exists: false })),
    getMe: vi.fn(() => Promise.resolve({ id: 1, phone: '+123', is_premium: false })),
    login: vi.fn(() => Promise.resolve()),
    register: vi.fn(() => Promise.resolve()),
    logout: vi.fn(),
    _tryRefresh: vi.fn(() => Promise.resolve(false)),
    getChatLimit: vi.fn(() => Promise.resolve({ remaining: 5 })),
  },
}));

vi.mock('../features/predictions/services/predictionStore', () => ({
  loadFromBackend: vi.fn(() => Promise.resolve()),
}));

import { AuthProvider, useAuth } from '../features/auth/context/AuthContext';
import api from '../shared/api';
import { loadFromBackend } from '../features/predictions/services/predictionStore';

// ── Helpers ──
function wrapper({ children }) {
  return createElement(AuthProvider, null, children);
}

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage mock
    Object.keys(localStorageMock).forEach((k) => delete localStorageMock[k]);
    localStorage.getItem.mockImplementation((key) => localStorageMock[key] ?? null);
    localStorage.setItem.mockImplementation((key, val) => { localStorageMock[key] = String(val); });
    localStorage.removeItem.mockImplementation((key) => { delete localStorageMock[key]; });

    // Reset all mocks to default behavior
    vi.clearAllMocks();
    api.getToken.mockReturnValue(null);
    api.checkIp.mockResolvedValue({ exists: false });
    api.getMe.mockResolvedValue({ id: 1, phone: '+123', is_premium: false });
    api.login.mockResolvedValue();
    api.register.mockResolvedValue();
    api._tryRefresh.mockResolvedValue(false);
    loadFromBackend.mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────
  // useAuth outside provider
  // ──────────────────────────────────────────
  describe('useAuth outside provider', () => {
    it('throws an error when used outside AuthProvider', () => {
      // Suppress console.error from React for the expected error
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within AuthProvider');
      spy.mockRestore();
    });
  });

  // ──────────────────────────────────────────
  // Initial state / checkAuth
  // ──────────────────────────────────────────
  describe('checkAuth', () => {
    it('sets loading to false and user to null when no token', async () => {
      api.getToken.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('calls checkIp when no token and sets hasAccount if exists', async () => {
      api.getToken.mockReturnValue(null);
      api.checkIp.mockResolvedValue({ exists: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(api.checkIp).toHaveBeenCalled();
      expect(localStorageMock['hasAccount']).toBe('true');
    });

    it('fetches user data when token exists', async () => {
      api.getToken.mockReturnValue('valid-token');
      const userData = { id: 42, phone: '+999', is_premium: true };
      api.getMe.mockResolvedValue(userData);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(userData);
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorageMock['hasAccount']).toBe('true');
      expect(loadFromBackend).toHaveBeenCalled();
    });

    it('tries refresh when getMe fails with token, and succeeds', async () => {
      api.getToken.mockReturnValue('expired-token');
      const userData = { id: 5, phone: '+555', is_premium: false };

      // First getMe fails, second succeeds after refresh
      api.getMe
        .mockRejectedValueOnce(new Error('Token expired'))
        .mockResolvedValueOnce(userData);
      api._tryRefresh.mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(api._tryRefresh).toHaveBeenCalled();
      expect(result.current.user).toEqual(userData);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('logs out when getMe fails and refresh also fails', async () => {
      api.getToken.mockReturnValue('bad-token');
      api.getMe.mockRejectedValue(new Error('Unauthorized'));
      api._tryRefresh.mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(api.logout).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('logs out when refresh succeeds but second getMe also fails', async () => {
      api.getToken.mockReturnValue('bad-token');
      api.getMe.mockRejectedValue(new Error('Server error'));
      api._tryRefresh.mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(api.logout).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });
  });

  // ──────────────────────────────────────────
  // login
  // ──────────────────────────────────────────
  describe('login', () => {
    it('calls api.login then api.getMe and sets user', async () => {
      // Start with no token so checkAuth finishes quickly
      api.getToken.mockReturnValue(null);
      const userData = { id: 10, phone: '+111', is_premium: false };
      api.getMe.mockResolvedValue(userData);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('+111', 'pass123');
      });

      expect(api.login).toHaveBeenCalledWith('+111', 'pass123');
      expect(api.getMe).toHaveBeenCalled();
      expect(loginResult).toEqual(userData);
      expect(result.current.user).toEqual(userData);
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorageMock['hasAccount']).toBe('true');
      expect(localStorageMock['last_phone']).toBe('+111');
      expect(loadFromBackend).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────
  // register
  // ──────────────────────────────────────────
  describe('register', () => {
    it('calls api.register then api.getMe and sets user', async () => {
      api.getToken.mockReturnValue(null);
      const userData = { id: 20, phone: '+222', is_premium: false };
      api.getMe.mockResolvedValue(userData);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let registerResult;
      await act(async () => {
        registerResult = await result.current.register('+222', 'pass456', 'REF123');
      });

      expect(api.register).toHaveBeenCalledWith('+222', 'pass456', 'REF123');
      expect(api.getMe).toHaveBeenCalled();
      expect(registerResult).toEqual(userData);
      expect(result.current.user).toEqual(userData);
      expect(localStorageMock['hasAccount']).toBe('true');
      expect(localStorageMock['last_phone']).toBe('+222');
    });

    it('passes null referralCode by default', async () => {
      api.getToken.mockReturnValue(null);
      api.getMe.mockResolvedValue({ id: 30, phone: '+333', is_premium: false });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.register('+333', 'pass789');
      });

      // referralCode defaults to null per the source signature
      expect(api.register).toHaveBeenCalledWith('+333', 'pass789', null);
    });
  });

  // ──────────────────────────────────────────
  // logout
  // ──────────────────────────────────────────
  describe('logout', () => {
    it('calls api.logout and clears user', async () => {
      // Start authenticated
      api.getToken.mockReturnValue('token');
      const userData = { id: 1, phone: '+123', is_premium: false };
      api.getMe.mockResolvedValue(userData);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(userData);

      act(() => {
        result.current.logout();
      });

      expect(api.logout).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  // ──────────────────────────────────────────
  // togglePremium
  // ──────────────────────────────────────────
  describe('togglePremium', () => {
    it('flips user.is_premium from false to true', async () => {
      api.getToken.mockReturnValue('token');
      api.getMe.mockResolvedValue({ id: 1, phone: '+123', is_premium: false });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user.is_premium).toBe(false);

      act(() => {
        result.current.togglePremium();
      });

      expect(result.current.user.is_premium).toBe(true);
    });

    it('flips user.is_premium from true to false', async () => {
      api.getToken.mockReturnValue('token');
      api.getMe.mockResolvedValue({ id: 1, phone: '+123', is_premium: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user.is_premium).toBe(true);

      act(() => {
        result.current.togglePremium();
      });

      expect(result.current.user.is_premium).toBe(false);
    });

    it('does nothing when user is null', async () => {
      api.getToken.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      // Should not throw
      act(() => {
        result.current.togglePremium();
      });

      expect(result.current.user).toBeNull();
    });
  });

  // ──────────────────────────────────────────
  // connectBookmaker
  // ──────────────────────────────────────────
  describe('connectBookmaker', () => {
    it('stores credentials in localStorage as JSON and sets bookmakerAccount', async () => {
      api.getToken.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let credentials;
      await act(async () => {
        credentials = await result.current.connectBookmaker('myLogin', 'myPass');
      });

      expect(credentials.login).toBe('myLogin');
      expect(credentials.password).toBe('myPass');
      expect(credentials.connectedAt).toBeDefined();

      // Check localStorage
      const stored = JSON.parse(localStorageMock['bookmaker_credentials']);
      expect(stored.login).toBe('myLogin');
      expect(stored.password).toBe('myPass');

      // Check state
      expect(result.current.bookmakerAccount).not.toBeNull();
      expect(result.current.bookmakerAccount.login).toBe('myLogin');
      expect(result.current.bookmakerBalance).not.toBeNull();
      expect(result.current.bookmakerBalance.currency).toBe('EUR');
    });
  });

  // ──────────────────────────────────────────
  // disconnectBookmaker
  // ──────────────────────────────────────────
  describe('disconnectBookmaker', () => {
    it('removes credentials from localStorage and clears bookmakerAccount', async () => {
      api.getToken.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Connect first
      await act(async () => {
        await result.current.connectBookmaker('user1', 'pass1');
      });

      expect(result.current.bookmakerAccount).not.toBeNull();

      // Disconnect
      act(() => {
        result.current.disconnectBookmaker();
      });

      expect(result.current.bookmakerAccount).toBeNull();
      expect(result.current.bookmakerBalance).toBeNull();
      expect(localStorageMock['bookmaker_credentials']).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────
  // refreshUser
  // ──────────────────────────────────────────
  describe('refreshUser', () => {
    it('fetches fresh user data from api.getMe', async () => {
      api.getToken.mockReturnValue('token');
      api.getMe.mockResolvedValue({ id: 1, phone: '+123', is_premium: false });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updatedUser = { id: 1, phone: '+123', is_premium: true };
      api.getMe.mockResolvedValue(updatedUser);

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user).toEqual(updatedUser);
    });

    it('silently ignores errors', async () => {
      api.getToken.mockReturnValue('token');
      api.getMe
        .mockResolvedValueOnce({ id: 1, phone: '+123', is_premium: false })
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not throw
      await act(async () => {
        await result.current.refreshUser();
      });

      // User remains the original
      expect(result.current.user).toEqual({ id: 1, phone: '+123', is_premium: false });
    });
  });

  // ──────────────────────────────────────────
  // syncBookmakerBalance
  // ──────────────────────────────────────────
  describe('syncBookmakerBalance', () => {
    it('returns null when no bookmaker is connected', async () => {
      api.getToken.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let balance;
      await act(async () => {
        balance = await result.current.syncBookmakerBalance();
      });

      expect(balance).toBeNull();
    });

    it('returns simulated balance when bookmaker is connected', async () => {
      api.getToken.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.connectBookmaker('user', 'pass');
      });

      let balance;
      await act(async () => {
        balance = await result.current.syncBookmakerBalance();
      });

      expect(balance).not.toBeNull();
      expect(balance.currency).toBe('EUR');
      expect(balance.amount).toBe(0);
    });
  });

  // ──────────────────────────────────────────
  // bookmakerAccount initialized from localStorage
  // ──────────────────────────────────────────
  describe('bookmakerAccount initialization', () => {
    it('loads stored credentials from localStorage on mount', async () => {
      const stored = { login: 'storedUser', password: 'storedPass', connectedAt: '2024-01-01' };
      localStorageMock['bookmaker_credentials'] = JSON.stringify(stored);
      api.getToken.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookmakerAccount).toEqual(stored);
    });

    it('handles corrupted localStorage gracefully', async () => {
      localStorageMock['bookmaker_credentials'] = 'not-valid-json';
      api.getToken.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookmakerAccount).toBeNull();
    });
  });
});
