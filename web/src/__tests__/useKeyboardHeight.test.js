import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mock visualViewport at MODULE SCOPE ────────────────────────────
let resizeListeners = [];
let scrollListeners = [];

const mockViewport = {
  height: 800,
  addEventListener: vi.fn((event, cb) => {
    if (event === 'resize') resizeListeners.push(cb);
    if (event === 'scroll') scrollListeners.push(cb);
  }),
  removeEventListener: vi.fn((event, cb) => {
    if (event === 'resize') resizeListeners = resizeListeners.filter((l) => l !== cb);
    if (event === 'scroll') scrollListeners = scrollListeners.filter((l) => l !== cb);
  }),
};

Object.defineProperty(window, 'visualViewport', {
  value: mockViewport,
  writable: true,
  configurable: true,
});
Object.defineProperty(window, 'innerHeight', {
  value: 800,
  writable: true,
  configurable: true,
});

import useKeyboardHeight from '../shared/hooks/useKeyboardHeight';

// ── Helpers ────────────────────────────────────────────────────────
function fireViewportResize() {
  resizeListeners.forEach((cb) => cb());
}

// ── Tests ──────────────────────────────────────────────────────────
describe('useKeyboardHeight', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resizeListeners = [];
    scrollListeners = [];
    mockViewport.height = 800;
    mockViewport.addEventListener.mockClear();
    mockViewport.removeEventListener.mockClear();
    window.innerHeight = 800;
    // Reset CSS custom properties
    document.documentElement.style.removeProperty('--viewport-height');
    document.documentElement.style.removeProperty('--keyboard-height');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. Returns initial values from visualViewport.height
  it('returns initial values from visualViewport.height', () => {
    const { result } = renderHook(() => useKeyboardHeight());

    expect(result.current.viewportHeight).toBe(800);
    expect(result.current.keyboardHeight).toBe(0);
    expect(result.current.keyboardOpen).toBe(false);
  });

  // 2. Returns keyboardOpen=false when no keyboard
  it('returns keyboardOpen=false when no keyboard is visible', () => {
    const { result } = renderHook(() => useKeyboardHeight());

    expect(result.current.keyboardOpen).toBe(false);
    expect(result.current.keyboardHeight).toBe(0);
  });

  // 3. Updates keyboardOpen=true when viewport shrinks (keyboard opens)
  it('sets keyboardOpen=true when viewport shrinks significantly', () => {
    const { result } = renderHook(() => useKeyboardHeight());

    // Simulate keyboard opening: viewport shrinks to 500px (keyboard = 300px, >15% of 800)
    act(() => {
      mockViewport.height = 500;
      fireViewportResize();
    });

    expect(result.current.keyboardOpen).toBe(true);
    expect(result.current.viewportHeight).toBe(500);
    expect(result.current.keyboardHeight).toBe(300);
  });

  // 4. Sets CSS custom properties on documentElement
  it('sets CSS custom properties --viewport-height and --keyboard-height', () => {
    renderHook(() => useKeyboardHeight());

    expect(document.documentElement.style.getPropertyValue('--viewport-height')).toBe('800px');
    expect(document.documentElement.style.getPropertyValue('--keyboard-height')).toBe('0px');

    // Simulate keyboard opening
    act(() => {
      mockViewport.height = 500;
      fireViewportResize();
    });

    expect(document.documentElement.style.getPropertyValue('--viewport-height')).toBe('500px');
    expect(document.documentElement.style.getPropertyValue('--keyboard-height')).toBe('300px');
  });

  // 5. Handles missing visualViewport gracefully
  it('handles missing visualViewport gracefully', () => {
    const originalVV = window.visualViewport;
    window.visualViewport = null;

    const { result } = renderHook(() => useKeyboardHeight());

    // Should fall back to window.innerHeight and not throw
    expect(result.current.viewportHeight).toBe(800);
    expect(result.current.keyboardOpen).toBe(false);
    expect(result.current.keyboardHeight).toBe(0);

    // Restore
    window.visualViewport = originalVV;
  });
});
