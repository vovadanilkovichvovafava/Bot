/**
 * Tests for ThemeContext — ThemeProvider + useTheme hook
 * Covers: system preference default, localStorage saved theme,
 *         toggleTheme, dark class on documentElement, useTheme outside provider
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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

import { ThemeProvider, useTheme } from '../shared/context/ThemeContext';

// ── Helpers ──
function wrapper({ children }) {
  return createElement(ThemeProvider, null, children);
}

describe('ThemeContext', () => {
  let matchMediaSpy;

  beforeEach(() => {
    // Clear localStorage
    Object.keys(localStorageMock).forEach((k) => delete localStorageMock[k]);
    localStorage.getItem.mockImplementation((key) => localStorageMock[key] ?? null);
    localStorage.setItem.mockImplementation((key, val) => { localStorageMock[key] = String(val); });

    // Remove 'dark' class if present
    document.documentElement.classList.remove('dark');

    vi.clearAllMocks();

    // Default matchMedia: light mode (prefers-color-scheme: dark = false)
    matchMediaSpy = vi.fn().mockReturnValue({ matches: false });
    Object.defineProperty(window, 'matchMedia', {
      value: matchMediaSpy,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.classList.remove('dark');
  });

  // ──────────────────────────────────────────
  // useTheme outside provider
  // ──────────────────────────────────────────
  describe('useTheme outside provider', () => {
    it('throws an error when used outside ThemeProvider', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');
      spy.mockRestore();
    });
  });

  // ──────────────────────────────────────────
  // System preference default
  // ──────────────────────────────────────────
  describe('default from system preference', () => {
    it('defaults to light when system prefers light', () => {
      matchMediaSpy.mockReturnValue({ matches: false });

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.isDark).toBe(false);
      expect(matchMediaSpy).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('defaults to dark when system prefers dark', () => {
      matchMediaSpy.mockReturnValue({ matches: true });

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.isDark).toBe(true);
    });
  });

  // ──────────────────────────────────────────
  // Saved theme from localStorage
  // ──────────────────────────────────────────
  describe('saved theme from localStorage', () => {
    it('reads dark theme from localStorage regardless of system preference', () => {
      matchMediaSpy.mockReturnValue({ matches: false }); // system: light
      localStorageMock['app_theme'] = 'dark';

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.isDark).toBe(true);
    });

    it('reads light theme from localStorage regardless of system preference', () => {
      matchMediaSpy.mockReturnValue({ matches: true }); // system: dark
      localStorageMock['app_theme'] = 'light';

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.isDark).toBe(false);
    });
  });

  // ──────────────────────────────────────────
  // toggleTheme
  // ──────────────────────────────────────────
  describe('toggleTheme', () => {
    it('switches from light to dark', () => {
      matchMediaSpy.mockReturnValue({ matches: false });

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.isDark).toBe(false);

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.isDark).toBe(true);
      expect(localStorageMock['app_theme']).toBe('dark');
    });

    it('switches from dark to light', () => {
      localStorageMock['app_theme'] = 'dark';

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.isDark).toBe(true);

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.isDark).toBe(false);
      expect(localStorageMock['app_theme']).toBe('light');
    });

    it('can toggle multiple times', () => {
      matchMediaSpy.mockReturnValue({ matches: false });

      const { result } = renderHook(() => useTheme(), { wrapper });

      // light -> dark
      act(() => { result.current.toggleTheme(); });
      expect(result.current.isDark).toBe(true);

      // dark -> light
      act(() => { result.current.toggleTheme(); });
      expect(result.current.isDark).toBe(false);

      // light -> dark
      act(() => { result.current.toggleTheme(); });
      expect(result.current.isDark).toBe(true);
    });
  });

  // ──────────────────────────────────────────
  // Document class manipulation
  // ──────────────────────────────────────────
  describe('dark class on documentElement', () => {
    it('adds dark class when isDark is true', () => {
      localStorageMock['app_theme'] = 'dark';

      renderHook(() => useTheme(), { wrapper });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class when isDark is false', () => {
      // Start with dark class applied
      document.documentElement.classList.add('dark');
      localStorageMock['app_theme'] = 'light';

      renderHook(() => useTheme(), { wrapper });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('toggles dark class when theme is toggled', () => {
      matchMediaSpy.mockReturnValue({ matches: false });

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(document.documentElement.classList.contains('dark')).toBe(false);

      act(() => {
        result.current.toggleTheme();
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);

      act(() => {
        result.current.toggleTheme();
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  // ──────────────────────────────────────────
  // localStorage persistence
  // ──────────────────────────────────────────
  describe('localStorage persistence', () => {
    it('saves theme to localStorage on mount', () => {
      matchMediaSpy.mockReturnValue({ matches: false });

      renderHook(() => useTheme(), { wrapper });

      // The useEffect saves the theme
      expect(localStorageMock['app_theme']).toBe('light');
    });

    it('saves dark theme to localStorage when system prefers dark', () => {
      matchMediaSpy.mockReturnValue({ matches: true });

      renderHook(() => useTheme(), { wrapper });

      expect(localStorageMock['app_theme']).toBe('dark');
    });
  });
});
