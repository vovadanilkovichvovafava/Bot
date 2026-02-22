import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// ── Mock visualViewport at MODULE SCOPE ────────────────────────────
const mockViewport = {
  height: 800,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

Object.defineProperty(window, 'visualViewport', {
  value: mockViewport,
  writable: true,
  configurable: true,
});

import useKeyboardScroll from '../shared/hooks/useKeyboardScroll';

// ── Tests ──────────────────────────────────────────────────────────
describe('useKeyboardScroll', () => {
  beforeEach(() => {
    mockViewport.addEventListener.mockClear();
    mockViewport.removeEventListener.mockClear();
  });

  // 1. Returns a ref object
  it('returns a ref object', () => {
    const { result } = renderHook(() => useKeyboardScroll());

    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('current');
  });

  // 2. Does not throw when no form element is attached to the ref
  it('does not throw when no form element is present', () => {
    expect(() => {
      renderHook(() => useKeyboardScroll());
    }).not.toThrow();
  });
});
