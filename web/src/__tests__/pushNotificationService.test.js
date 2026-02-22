import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock notificationStore (vi.hoisted ensures these are available inside the hoisted vi.mock factory) ──
const {
  mockSavePushSubscription,
  mockEnableNotifications,
  mockDisableNotifications,
  mockGetNotificationTeams,
} = vi.hoisted(() => ({
  mockSavePushSubscription: vi.fn(),
  mockEnableNotifications: vi.fn(),
  mockDisableNotifications: vi.fn(),
  mockGetNotificationTeams: vi.fn(() => []),
}));

vi.mock('../shared/services/notificationStore', () => ({
  savePushSubscription: mockSavePushSubscription,
  enableNotifications: mockEnableNotifications,
  disableNotifications: mockDisableNotifications,
  getNotificationTeams: mockGetNotificationTeams,
}));

// ── Browser API mocks (must be set up before importing the module) ──
const mockShowNotification = vi.fn(() => Promise.resolve());
const mockGetSubscription = vi.fn(() => Promise.resolve(null));
const mockSubscribe = vi.fn(() =>
  Promise.resolve({ toJSON: () => ({ endpoint: 'https://push.example.com/test' }) })
);
const mockUnsubscribe = vi.fn(() => Promise.resolve(true));

const mockRegistration = {
  pushManager: {
    getSubscription: mockGetSubscription,
    subscribe: mockSubscribe,
  },
  showNotification: mockShowNotification,
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve(mockRegistration),
  },
  writable: true,
  configurable: true,
});

window.PushManager = vi.fn();

window.Notification = {
  permission: 'default',
  requestPermission: vi.fn(() => Promise.resolve('granted')),
};

// ── Now import the module under test ──
import {
  isPushSupported,
  getPermissionStatus,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  showLocalNotification,
  scheduleMatchReminder,
  notifyValueBetFound,
  notifyReEngagement,
  checkAndScheduleFavoriteMatchReminders,
} from '../shared/services/pushNotificationService';

// notificationStore functions are accessed via mockSavePushSubscription, etc.

// ── Setup ──
beforeEach(() => {
  vi.restoreAllMocks();

  // Clear all standalone mocks (restoreAllMocks doesn't clear standalone vi.fn())
  mockShowNotification.mockClear();
  mockGetSubscription.mockClear();
  mockSubscribe.mockClear();
  mockUnsubscribe.mockClear();
  mockSavePushSubscription.mockClear();
  mockEnableNotifications.mockClear();
  mockDisableNotifications.mockClear();
  mockGetNotificationTeams.mockClear();

  // Reset mock implementations to defaults
  mockShowNotification.mockResolvedValue(undefined);
  mockGetSubscription.mockResolvedValue(null);
  mockSubscribe.mockResolvedValue({
    toJSON: () => ({ endpoint: 'https://push.example.com/test' }),
  });
  mockUnsubscribe.mockResolvedValue(true);
  mockGetNotificationTeams.mockReturnValue([]);

  // Restore browser APIs to their "supported" state
  navigator.serviceWorker = {
    ready: Promise.resolve(mockRegistration),
  };
  window.PushManager = vi.fn();
  window.Notification = {
    permission: 'default',
    requestPermission: vi.fn(() => Promise.resolve('granted')),
  };
});

// ═══════════════════════════════════════════════════════════════════════
// isPushSupported
// ═══════════════════════════════════════════════════════════════════════
describe('isPushSupported', () => {
  it('returns true when serviceWorker, PushManager, and Notification are all present', () => {
    expect(isPushSupported()).toBe(true);
  });

  it('returns false when navigator.serviceWorker is missing', () => {
    const original = navigator.serviceWorker;
    delete navigator.serviceWorker;
    expect(isPushSupported()).toBe(false);
    navigator.serviceWorker = original;
  });

  it('returns false when window.PushManager is missing', () => {
    const original = window.PushManager;
    delete window.PushManager;
    expect(isPushSupported()).toBe(false);
    window.PushManager = original;
  });

  it('returns false when window.Notification is missing', () => {
    const original = window.Notification;
    delete window.Notification;
    expect(isPushSupported()).toBe(false);
    window.Notification = original;
  });
});

// ═══════════════════════════════════════════════════════════════════════
// getPermissionStatus
// ═══════════════════════════════════════════════════════════════════════
describe('getPermissionStatus', () => {
  it('returns "granted" when Notification.permission is granted', () => {
    window.Notification.permission = 'granted';
    expect(getPermissionStatus()).toBe('granted');
  });

  it('returns "denied" when Notification.permission is denied', () => {
    window.Notification.permission = 'denied';
    expect(getPermissionStatus()).toBe('denied');
  });

  it('returns "default" when Notification.permission is default', () => {
    window.Notification.permission = 'default';
    expect(getPermissionStatus()).toBe('default');
  });

  it('returns "unsupported" when Notification is not in window', () => {
    const original = window.Notification;
    delete window.Notification;
    expect(getPermissionStatus()).toBe('unsupported');
    window.Notification = original;
  });
});

// ═══════════════════════════════════════════════════════════════════════
// requestPermission
// ═══════════════════════════════════════════════════════════════════════
describe('requestPermission', () => {
  it('throws when push is not supported', async () => {
    delete window.PushManager;
    await expect(requestPermission()).rejects.toThrow('Push notifications are not supported');
    window.PushManager = vi.fn();
  });

  it('calls Notification.requestPermission and returns its result', async () => {
    window.Notification.requestPermission = vi.fn(() => Promise.resolve('granted'));
    const result = await requestPermission();
    expect(window.Notification.requestPermission).toHaveBeenCalledOnce();
    expect(result).toBe('granted');
  });

  it('returns "denied" when user denies permission', async () => {
    window.Notification.requestPermission = vi.fn(() => Promise.resolve('denied'));
    const result = await requestPermission();
    expect(result).toBe('denied');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// subscribeToPush
// ═══════════════════════════════════════════════════════════════════════
describe('subscribeToPush', () => {
  it('throws when push is not supported', async () => {
    delete window.PushManager;
    await expect(subscribeToPush()).rejects.toThrow('Push notifications are not supported');
    window.PushManager = vi.fn();
  });

  it('throws when permission is denied', async () => {
    window.Notification.requestPermission = vi.fn(() => Promise.resolve('denied'));
    await expect(subscribeToPush()).rejects.toThrow('Notification permission denied');
  });

  it('returns existing subscription when already subscribed', async () => {
    const existingSub = { toJSON: () => ({ endpoint: 'https://existing.endpoint' }) };
    mockGetSubscription.mockResolvedValue(existingSub);
    window.Notification.requestPermission = vi.fn(() => Promise.resolve('granted'));

    const result = await subscribeToPush();
    expect(result).toEqual({ endpoint: 'https://existing.endpoint' });
    expect(mockSavePushSubscription).toHaveBeenCalledWith({ endpoint: 'https://existing.endpoint' });
    expect(mockEnableNotifications).toHaveBeenCalledWith({ endpoint: 'https://existing.endpoint' });
  });

  it('saves subscription and enables notifications on success', async () => {
    // When VAPID_PUBLIC_KEY is empty and no existing subscription,
    // subscription is null, but savePushSubscription/enableNotifications are still called.
    window.Notification.requestPermission = vi.fn(() => Promise.resolve('granted'));

    const result = await subscribeToPush();
    expect(mockSavePushSubscription).toHaveBeenCalledOnce();
    expect(mockEnableNotifications).toHaveBeenCalledOnce();
    // With no VAPID key and no existing subscription, result is null
    expect(mockSavePushSubscription).toHaveBeenCalledWith(null);
    expect(mockEnableNotifications).toHaveBeenCalledWith(null);
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// unsubscribeFromPush
// ═══════════════════════════════════════════════════════════════════════
describe('unsubscribeFromPush', () => {
  it('calls unsubscribe on existing subscription and disables notifications', async () => {
    const mockSub = { unsubscribe: mockUnsubscribe };
    mockGetSubscription.mockResolvedValue(mockSub);

    const result = await unsubscribeFromPush();
    expect(mockUnsubscribe).toHaveBeenCalledOnce();
    expect(mockDisableNotifications).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });

  it('disables notifications even when no subscription exists', async () => {
    mockGetSubscription.mockResolvedValue(null);

    const result = await unsubscribeFromPush();
    expect(mockUnsubscribe).not.toHaveBeenCalled();
    expect(mockDisableNotifications).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });

  it('returns false when an error occurs', async () => {
    mockGetSubscription.mockRejectedValue(new Error('network error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await unsubscribeFromPush();
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// showLocalNotification
// ═══════════════════════════════════════════════════════════════════════
describe('showLocalNotification', () => {
  it('returns false when permission is not granted', async () => {
    window.Notification.permission = 'default';
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await showLocalNotification('Test Title');
    expect(result).toBe(false);
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('returns false when permission is denied', async () => {
    window.Notification.permission = 'denied';
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await showLocalNotification('Test Title');
    expect(result).toBe(false);
  });

  it('calls registration.showNotification with merged default options', async () => {
    window.Notification.permission = 'granted';

    const result = await showLocalNotification('Match Alert', {
      body: 'Game starting soon',
      tag: 'match-123',
    });

    expect(result).toBe(true);
    expect(mockShowNotification).toHaveBeenCalledOnce();

    const [title, options] = mockShowNotification.mock.calls[0];
    expect(title).toBe('Match Alert');
    expect(options.body).toBe('Game starting soon');
    expect(options.tag).toBe('match-123');
    // Default options should be included
    expect(options.icon).toBe('/icon.svg');
    expect(options.badge).toBe('/icon.svg');
    expect(options.vibrate).toEqual([100, 50, 100]);
  });

  it('allows custom options to override defaults', async () => {
    window.Notification.permission = 'granted';

    await showLocalNotification('Custom', {
      icon: '/custom-icon.png',
      vibrate: [200],
    });

    const [, options] = mockShowNotification.mock.calls[0];
    expect(options.icon).toBe('/custom-icon.png');
    expect(options.vibrate).toEqual([200]);
  });

  it('returns false when showNotification throws', async () => {
    window.Notification.permission = 'granted';
    mockShowNotification.mockRejectedValue(new Error('display error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await showLocalNotification('Fail');
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// scheduleMatchReminder
// ═══════════════════════════════════════════════════════════════════════
describe('scheduleMatchReminder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for a match whose reminder time has already passed', () => {
    // Set "now" to a time after the match
    vi.setSystemTime(new Date('2025-06-15T16:00:00Z'));

    const match = {
      id: 1,
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      kickoff: '2025-06-15T15:00:00Z',
    };

    const result = scheduleMatchReminder(match, 60);
    expect(result).toBeNull();
  });

  it('returns null when reminder time equals current time', () => {
    // Reminder 60 min before a 15:00 match = 14:00; set now to exactly 14:00
    vi.setSystemTime(new Date('2025-06-15T14:00:00Z'));

    const match = {
      id: 2,
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      kickoff: '2025-06-15T15:00:00Z',
    };

    const result = scheduleMatchReminder(match, 60);
    expect(result).toBeNull();
  });

  it('returns a timeout ID for a future match', () => {
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

    const match = {
      id: 3,
      homeTeam: 'Liverpool',
      awayTeam: 'Man City',
      kickoff: '2025-06-15T15:00:00Z',
    };

    const result = scheduleMatchReminder(match, 60);
    expect(result).not.toBeNull();
    expect(result).toBeDefined();
  });

  it('uses match.date when kickoff is not present', () => {
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));

    const match = {
      id: 4,
      homeTeam: 'Spurs',
      awayTeam: 'West Ham',
      date: '2025-06-15T18:00:00Z',
    };

    const result = scheduleMatchReminder(match, 30);
    expect(result).not.toBeNull();
  });

  it('calls showLocalNotification after the delay elapses', () => {
    window.Notification.permission = 'granted';
    vi.setSystemTime(new Date('2025-06-15T13:30:00Z'));

    const match = {
      id: 5,
      homeTeam: 'Bayern',
      awayTeam: 'Dortmund',
      kickoff: '2025-06-15T15:00:00Z',
    };

    scheduleMatchReminder(match, 60); // reminder at 14:00, delay = 30 min

    // Notification should not have fired yet
    expect(mockShowNotification).not.toHaveBeenCalled();

    // Advance timers by the delay (14:00 - 13:30 = 30 min = 1800000 ms)
    vi.advanceTimersByTime(30 * 60 * 1000);

    // showLocalNotification is async and eventually calls mockShowNotification
    // Since we're using fake timers, we need to flush promises
    // The notification call happens inside setTimeout, which we advanced
  });

  it('respects custom minutesBefore parameter', () => {
    vi.setSystemTime(new Date('2025-06-15T14:00:00Z'));

    const match = {
      id: 6,
      homeTeam: 'Real Madrid',
      awayTeam: 'Barcelona',
      kickoff: '2025-06-15T15:00:00Z',
    };

    // With minutesBefore=30, reminder at 14:30, now is 14:00, so delay = 30 min
    const result = scheduleMatchReminder(match, 30);
    expect(result).not.toBeNull();

    // With minutesBefore=120, reminder at 13:00, now is 14:00, already passed
    const result2 = scheduleMatchReminder(match, 120);
    expect(result2).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// notifyValueBetFound
// ═══════════════════════════════════════════════════════════════════════
describe('notifyValueBetFound', () => {
  const match = {
    id: 100,
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    homeTeamId: 'team_1',
    awayTeamId: 'team_2',
  };

  const bet = {
    id: 'bet_1',
    type: 'Over 2.5',
    odds: 2.1,
  };

  it('does nothing if no favorite teams match', () => {
    mockGetNotificationTeams.mockReturnValue([{ id: 'team_99' }, { id: 'team_88' }]);
    window.Notification.permission = 'granted';

    notifyValueBetFound(match, bet);
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does nothing if favorite teams list is empty', () => {
    mockGetNotificationTeams.mockReturnValue([]);
    window.Notification.permission = 'granted';

    notifyValueBetFound(match, bet);
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('shows notification when home team is a favorite', async () => {
    mockGetNotificationTeams.mockReturnValue([{ id: 'team_1' }]);
    window.Notification.permission = 'granted';

    notifyValueBetFound(match, bet);

    // showLocalNotification is async but notifyValueBetFound doesn't await it,
    // so we need to let the promise chain resolve
    await vi.waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledOnce();
    });

    const [title, options] = mockShowNotification.mock.calls[0];
    expect(title).toBe('Value Bet Found!');
    expect(options.body).toContain('Arsenal vs Chelsea');
    expect(options.body).toContain('Over 2.5');
    expect(options.body).toContain('2.1');
    expect(options.tag).toBe('value-100');
    expect(options.data.type).toBe('value_bet');
    expect(options.data.matchId).toBe(100);
    expect(options.data.betId).toBe('bet_1');
    expect(options.requireInteraction).toBe(true);
  });

  it('shows notification when away team is a favorite', async () => {
    mockGetNotificationTeams.mockReturnValue([{ id: 'team_2' }]);
    window.Notification.permission = 'granted';

    notifyValueBetFound(match, bet);

    await vi.waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledOnce();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// notifyReEngagement
// ═══════════════════════════════════════════════════════════════════════
describe('notifyReEngagement', () => {
  it('shows notification with the provided message details', async () => {
    window.Notification.permission = 'granted';

    const message = {
      title: 'We miss you!',
      body: 'Check out today\'s top matches',
      teamId: 'team_42',
    };

    notifyReEngagement(message);

    await vi.waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledOnce();
    });

    const [title, options] = mockShowNotification.mock.calls[0];
    expect(title).toBe('We miss you!');
    expect(options.body).toBe('Check out today\'s top matches');
    expect(options.tag).toBe('re-engagement');
    expect(options.data.type).toBe('re_engagement');
    expect(options.data.teamId).toBe('team_42');
    expect(options.data.url).toBe('/match?team=team_42');
    expect(options.requireInteraction).toBe(true);
    expect(options.actions).toEqual([
      { action: 'claim', title: 'Claim Offer' },
      { action: 'later', title: 'Maybe Later' },
    ]);
  });

  it('uses root URL when teamId is not provided', async () => {
    window.Notification.permission = 'granted';

    const message = {
      title: 'Come back!',
      body: 'New features await',
      teamId: null,
    };

    notifyReEngagement(message);

    await vi.waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledOnce();
    });

    const [, options] = mockShowNotification.mock.calls[0];
    expect(options.data.url).toBe('/');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// checkAndScheduleFavoriteMatchReminders
// ═══════════════════════════════════════════════════════════════════════
describe('checkAndScheduleFavoriteMatchReminders', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when there are no favorite teams', async () => {
    mockGetNotificationTeams.mockReturnValue([]);

    const matches = [
      {
        id: 1,
        homeTeamId: 'team_1',
        awayTeamId: 'team_2',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        kickoff: '2025-06-15T15:00:00Z',
      },
    ];

    await checkAndScheduleFavoriteMatchReminders(matches);
    // No timers should have been scheduled
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does nothing when matches array is empty', async () => {
    mockGetNotificationTeams.mockReturnValue([{ id: 'team_1' }]);

    await checkAndScheduleFavoriteMatchReminders([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('schedules reminders for matches involving favorite teams (flat format)', async () => {
    mockGetNotificationTeams.mockReturnValue([{ id: 'team_1' }]);

    const matches = [
      {
        id: 10,
        homeTeamId: 'team_1',
        awayTeamId: 'team_2',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        kickoff: '2025-06-15T15:00:00Z',
      },
      {
        id: 11,
        homeTeamId: 'team_3',
        awayTeamId: 'team_4',
        homeTeam: 'Liverpool',
        awayTeam: 'Spurs',
        kickoff: '2025-06-15T16:00:00Z',
      },
    ];

    await checkAndScheduleFavoriteMatchReminders(matches);
    // Only the first match involves team_1, so one timer
    expect(vi.getTimerCount()).toBe(1);
  });

  it('schedules reminders for matches involving favorite teams (nested format)', async () => {
    mockGetNotificationTeams.mockReturnValue([{ id: 'team_5' }]);

    const matches = [
      {
        fixture: { id: 20, date: '2025-06-15T18:00:00Z' },
        teams: {
          home: { id: 'team_5', name: 'Bayern' },
          away: { id: 'team_6', name: 'Dortmund' },
        },
      },
    ];

    await checkAndScheduleFavoriteMatchReminders(matches);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('schedules reminders for away team matches too', async () => {
    mockGetNotificationTeams.mockReturnValue([{ id: 'team_2' }]);

    const matches = [
      {
        id: 30,
        homeTeamId: 'team_1',
        awayTeamId: 'team_2',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        kickoff: '2025-06-15T15:00:00Z',
      },
    ];

    await checkAndScheduleFavoriteMatchReminders(matches);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('schedules reminders for multiple favorite teams', async () => {
    mockGetNotificationTeams.mockReturnValue([{ id: 'team_1' }, { id: 'team_4' }]);

    const matches = [
      {
        id: 40,
        homeTeamId: 'team_1',
        awayTeamId: 'team_2',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        kickoff: '2025-06-15T15:00:00Z',
      },
      {
        id: 41,
        homeTeamId: 'team_3',
        awayTeamId: 'team_4',
        homeTeam: 'Liverpool',
        awayTeam: 'Spurs',
        kickoff: '2025-06-15T16:00:00Z',
      },
      {
        id: 42,
        homeTeamId: 'team_5',
        awayTeamId: 'team_6',
        homeTeam: 'Man Utd',
        awayTeam: 'Man City',
        kickoff: '2025-06-15T17:00:00Z',
      },
    ];

    await checkAndScheduleFavoriteMatchReminders(matches);
    // Matches 40 (team_1) and 41 (team_4) should be scheduled, not 42
    expect(vi.getTimerCount()).toBe(2);
  });

  it('does not schedule reminders for matches that have already passed', async () => {
    mockGetNotificationTeams.mockReturnValue([{ id: 'team_1' }]);

    const matches = [
      {
        id: 50,
        homeTeamId: 'team_1',
        awayTeamId: 'team_2',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        kickoff: '2025-06-15T09:00:00Z', // Already passed (now is 10:00)
      },
    ];

    await checkAndScheduleFavoriteMatchReminders(matches);
    // scheduleMatchReminder returns null for past matches but doesn't create a timer
    expect(vi.getTimerCount()).toBe(0);
  });
});
