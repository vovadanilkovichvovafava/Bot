/**
 * Tests for BottomNavContext — BottomNavProvider + useBottomNav hook
 * Covers: initial visibility, hideBottomNav, showBottomNav, counter-based
 *         multiple hides, showBottomNav floor at 0, fallback outside provider
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';

import { BottomNavProvider, useBottomNav } from '../shared/context/BottomNavContext';

// ── Helpers ──
function wrapper({ children }) {
  return createElement(BottomNavProvider, null, children);
}

describe('BottomNavContext', () => {
  // ──────────────────────────────────────────
  // useBottomNav outside provider (fallback)
  // ──────────────────────────────────────────
  describe('useBottomNav outside provider', () => {
    it('returns fallback with visible: true and noop functions', () => {
      const { result } = renderHook(() => useBottomNav());

      expect(result.current.visible).toBe(true);
      expect(typeof result.current.hideBottomNav).toBe('function');
      expect(typeof result.current.showBottomNav).toBe('function');

      // noop functions should not throw
      act(() => {
        result.current.hideBottomNav();
        result.current.showBottomNav();
      });

      // visible should remain true since these are noops
      expect(result.current.visible).toBe(true);
    });
  });

  // ──────────────────────────────────────────
  // Initial state
  // ──────────────────────────────────────────
  describe('initial state', () => {
    it('starts with visible = true (hideCount = 0)', () => {
      const { result } = renderHook(() => useBottomNav(), { wrapper });

      expect(result.current.visible).toBe(true);
    });
  });

  // ──────────────────────────────────────────
  // hideBottomNav
  // ──────────────────────────────────────────
  describe('hideBottomNav', () => {
    it('hides the bottom nav (visible becomes false)', () => {
      const { result } = renderHook(() => useBottomNav(), { wrapper });

      act(() => {
        result.current.hideBottomNav();
      });

      expect(result.current.visible).toBe(false);
    });
  });

  // ──────────────────────────────────────────
  // showBottomNav
  // ──────────────────────────────────────────
  describe('showBottomNav', () => {
    it('shows the bottom nav after a single hide', () => {
      const { result } = renderHook(() => useBottomNav(), { wrapper });

      act(() => {
        result.current.hideBottomNav();
      });

      expect(result.current.visible).toBe(false);

      act(() => {
        result.current.showBottomNav();
      });

      expect(result.current.visible).toBe(true);
    });
  });

  // ──────────────────────────────────────────
  // Counter-based behavior
  // ──────────────────────────────────────────
  describe('counter-based multiple hides', () => {
    it('multiple hides require equal number of shows to become visible', () => {
      const { result } = renderHook(() => useBottomNav(), { wrapper });

      // Hide twice
      act(() => {
        result.current.hideBottomNav();
      });
      act(() => {
        result.current.hideBottomNav();
      });

      expect(result.current.visible).toBe(false);

      // One show — still hidden (hideCount = 1)
      act(() => {
        result.current.showBottomNav();
      });

      expect(result.current.visible).toBe(false);

      // Second show — now visible (hideCount = 0)
      act(() => {
        result.current.showBottomNav();
      });

      expect(result.current.visible).toBe(true);
    });

    it('three hides require three shows', () => {
      const { result } = renderHook(() => useBottomNav(), { wrapper });

      act(() => {
        result.current.hideBottomNav();
        result.current.hideBottomNav();
        result.current.hideBottomNav();
      });

      expect(result.current.visible).toBe(false);

      act(() => {
        result.current.showBottomNav();
      });
      expect(result.current.visible).toBe(false);

      act(() => {
        result.current.showBottomNav();
      });
      expect(result.current.visible).toBe(false);

      act(() => {
        result.current.showBottomNav();
      });
      expect(result.current.visible).toBe(true);
    });
  });

  // ──────────────────────────────────────────
  // showBottomNav floor at 0
  // ──────────────────────────────────────────
  describe('showBottomNav cannot go below 0', () => {
    it('calling showBottomNav when already visible does not go negative', () => {
      const { result } = renderHook(() => useBottomNav(), { wrapper });

      // Already visible (hideCount = 0)
      expect(result.current.visible).toBe(true);

      // Show without any prior hide — should stay at 0, not go negative
      act(() => {
        result.current.showBottomNav();
      });

      expect(result.current.visible).toBe(true);

      // Calling again should still be fine
      act(() => {
        result.current.showBottomNav();
      });

      expect(result.current.visible).toBe(true);

      // Now a single hide should hide it (hideCount goes to 1, not -1 + 1 = 0)
      act(() => {
        result.current.hideBottomNav();
      });

      expect(result.current.visible).toBe(false);
    });

    it('excessive shows after hide still floor at 0', () => {
      const { result } = renderHook(() => useBottomNav(), { wrapper });

      // Hide once
      act(() => {
        result.current.hideBottomNav();
      });
      expect(result.current.visible).toBe(false);

      // Show three times (only first actually changes from 1 to 0, rest floor at 0)
      act(() => {
        result.current.showBottomNav();
        result.current.showBottomNav();
        result.current.showBottomNav();
      });

      expect(result.current.visible).toBe(true);

      // A single hide should now hide it (counter goes from 0 to 1)
      act(() => {
        result.current.hideBottomNav();
      });

      expect(result.current.visible).toBe(false);
    });
  });

  // ──────────────────────────────────────────
  // Interleaved hide/show
  // ──────────────────────────────────────────
  describe('interleaved hide/show', () => {
    it('handles alternating hide and show correctly', () => {
      const { result } = renderHook(() => useBottomNav(), { wrapper });

      act(() => { result.current.hideBottomNav(); });
      expect(result.current.visible).toBe(false);

      act(() => { result.current.showBottomNav(); });
      expect(result.current.visible).toBe(true);

      act(() => { result.current.hideBottomNav(); });
      expect(result.current.visible).toBe(false);

      act(() => { result.current.showBottomNav(); });
      expect(result.current.visible).toBe(true);
    });
  });
});
