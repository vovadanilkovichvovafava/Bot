import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── localStorage mock at MODULE SCOPE ──────────────────────────────
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

import useBkReminderModal from '../features/betting/hooks/useBkReminderModal';

// ── Helpers ────────────────────────────────────────────────────────
const FOUR_HOURS = 4 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function mockFetchResponse(data) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    }),
  );
}

function clearLocalStorageMock() {
  Object.keys(localStorageMock).forEach((k) => delete localStorageMock[k]);
  localStorage.getItem.mockClear();
  localStorage.setItem.mockClear();
  localStorage.removeItem.mockClear();
  localStorage.clear.mockClear();
}

// ── Tests ──────────────────────────────────────────────────────────
describe('useBkReminderModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearLocalStorageMock();
    global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // 1. Returns null when userId is null
  it('returns null when userId is null', async () => {
    const { result } = renderHook(() => useBkReminderModal(null));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.modalVariant).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // 2. Returns null when user is premium
  it('returns null when user is premium', async () => {
    mockFetchResponse({ premium: true, bk_registered: true });

    const { result } = renderHook(() => useBkReminderModal('user-123'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.modalVariant).toBeNull();
  });

  // 3. Returns null when user is NOT bk_registered
  it('returns null when user is not BK registered', async () => {
    mockFetchResponse({ premium: false, bk_registered: false });

    const { result } = renderHook(() => useBkReminderModal('user-123'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.modalVariant).toBeNull();
  });

  // 4. Returns 'congrats' for first-time BK registered user
  it("returns 'congrats' for first-time BK registered user", async () => {
    mockFetchResponse({ premium: false, bk_registered: true });

    const { result } = renderHook(() => useBkReminderModal('user-123'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.modalVariant).toBe('congrats');
  });

  // 5. Returns 'reminder1' after 4h when congrats already seen
  it("returns 'reminder1' after 4h when congrats already seen", async () => {
    // Simulate that congrats was seen and detection happened >4h ago
    const detectedAt = Date.now() - FOUR_HOURS - 1000;
    localStorageMock['bk_reminder_congrats_seen'] = 'true';
    localStorageMock['bk_reg_detected_at'] = String(detectedAt);

    mockFetchResponse({ premium: false, bk_registered: true });

    const { result } = renderHook(() => useBkReminderModal('user-123'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.modalVariant).toBe('reminder1');
  });

  // 6. Returns 'reminder2' after 24h when congrats+reminder1 seen
  it("returns 'reminder2' after 24h when congrats+reminder1 already seen", async () => {
    const detectedAt = Date.now() - TWENTY_FOUR_HOURS - 1000;
    localStorageMock['bk_reminder_congrats_seen'] = 'true';
    localStorageMock['bk_reminder1_seen'] = 'true';
    localStorageMock['bk_reg_detected_at'] = String(detectedAt);

    mockFetchResponse({ premium: false, bk_registered: true });

    const { result } = renderHook(() => useBkReminderModal('user-123'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.modalVariant).toBe('reminder2');
  });

  // 7. Returns null when ALL reminders have been seen
  it('returns null when all reminders have been seen', async () => {
    const detectedAt = Date.now() - TWENTY_FOUR_HOURS - 1000;
    localStorageMock['bk_reminder_congrats_seen'] = 'true';
    localStorageMock['bk_reminder1_seen'] = 'true';
    localStorageMock['bk_reminder2_seen'] = 'true';
    localStorageMock['bk_reg_detected_at'] = String(detectedAt);

    mockFetchResponse({ premium: false, bk_registered: true });

    const { result } = renderHook(() => useBkReminderModal('user-123'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.modalVariant).toBeNull();
  });

  // 8. dismissModal('congrats') sets bk_reminder_congrats_seen
  it("dismissModal sets bk_reminder_congrats_seen when variant is 'congrats'", async () => {
    mockFetchResponse({ premium: false, bk_registered: true });

    const { result } = renderHook(() => useBkReminderModal('user-123'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Should be showing congrats
    expect(result.current.modalVariant).toBe('congrats');

    // Dismiss it
    act(() => {
      result.current.dismissModal();
    });

    expect(result.current.modalVariant).toBeNull();
    expect(localStorageMock['bk_reminder_congrats_seen']).toBe('true');
  });

  // 9. dismissModal('reminder1') sets bk_reminder1_seen
  it("dismissModal sets bk_reminder1_seen when variant is 'reminder1'", async () => {
    const detectedAt = Date.now() - FOUR_HOURS - 1000;
    localStorageMock['bk_reminder_congrats_seen'] = 'true';
    localStorageMock['bk_reg_detected_at'] = String(detectedAt);

    mockFetchResponse({ premium: false, bk_registered: true });

    const { result } = renderHook(() => useBkReminderModal('user-123'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.modalVariant).toBe('reminder1');

    act(() => {
      result.current.dismissModal();
    });

    expect(result.current.modalVariant).toBeNull();
    expect(localStorageMock['bk_reminder1_seen']).toBe('true');
  });
});
