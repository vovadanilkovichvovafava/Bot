/**
 * Push Notification Service
 *
 * Handles Web Push API integration:
 * - Permission requests
 * - Subscription management
 * - Local notification scheduling
 *
 * Note: For full push notification support, a backend server is needed
 * to send notifications when the app is closed. This service provides
 * the client-side foundation.
 */

import {
  savePushSubscription,
  enableNotifications,
  disableNotifications,
  getNotificationTeams,
} from './notificationStore';

// VAPID public key - should be moved to env in production
// This is a placeholder - generate your own keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Check if push notifications are supported
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
}

/**
 * Request notification permission
 */
export async function requestPermission() {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported');
  }

  // Request permission first
  const permission = await requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  // Get service worker registration
  const registration = await navigator.serviceWorker.ready;

  // Check if already subscribed
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription && VAPID_PUBLIC_KEY) {
    // Subscribe to push
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    } catch (e) {
      console.warn('Push subscription failed:', e);
      // Continue without push - we can still use local notifications
    }
  }

  // Save subscription to store
  const subscriptionJson = subscription ? subscription.toJSON() : null;
  savePushSubscription(subscriptionJson);
  enableNotifications(subscriptionJson);

  // TODO: Send subscription to backend server
  // await sendSubscriptionToServer(subscriptionJson);

  return subscriptionJson;
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    disableNotifications();

    // TODO: Remove subscription from backend server
    // await removeSubscriptionFromServer(subscriptionJson);

    return true;
  } catch (e) {
    console.error('Failed to unsubscribe:', e);
    return false;
  }
}

/**
 * Show a local notification (when app is in foreground)
 */
export async function showLocalNotification(title, options = {}) {
  if (getPermissionStatus() !== 'granted') {
    console.warn('Notification permission not granted');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      ...options,
    });

    return true;
  } catch (e) {
    console.error('Failed to show notification:', e);
    return false;
  }
}

/**
 * Schedule a match reminder notification
 * Note: This uses setTimeout which only works while the app is open.
 * For reliable scheduled notifications, use backend push.
 */
export function scheduleMatchReminder(match, minutesBefore = 60) {
  const matchTime = new Date(match.kickoff || match.date).getTime();
  const reminderTime = matchTime - minutesBefore * 60 * 1000;
  const now = Date.now();

  if (reminderTime <= now) {
    // Match already started or reminder time passed
    return null;
  }

  const delay = reminderTime - now;

  // Store timeout ID for potential cancellation
  const timeoutId = setTimeout(() => {
    showLocalNotification(
      `${match.homeTeam} vs ${match.awayTeam}`,
      {
        body: `Match starts in ${minutesBefore} minutes! Check out the best odds.`,
        tag: `match-${match.id}`,
        data: {
          type: 'match_reminder',
          matchId: match.id,
          url: `/match/${match.id}`,
        },
        actions: [
          { action: 'view', title: 'View Match' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      }
    );
  }, delay);

  return timeoutId;
}

/**
 * Send a "value bet found" notification
 */
export function notifyValueBetFound(match, bet) {
  const teams = getNotificationTeams();
  const isFavorite = teams.some(
    t => t.id === match.homeTeamId || t.id === match.awayTeamId
  );

  if (!isFavorite) return;

  showLocalNotification(
    'Value Bet Found!',
    {
      body: `${match.homeTeam} vs ${match.awayTeam}: ${bet.type} @ ${bet.odds}. This could be the winner!`,
      tag: `value-${match.id}`,
      data: {
        type: 'value_bet',
        matchId: match.id,
        betId: bet.id,
        url: `/match/${match.id}`,
      },
      requireInteraction: true,
    }
  );
}

/**
 * Send a re-engagement notification
 */
export function notifyReEngagement(message) {
  showLocalNotification(message.title, {
    body: message.body,
    tag: 're-engagement',
    data: {
      type: 're_engagement',
      teamId: message.teamId,
      url: message.teamId ? `/match?team=${message.teamId}` : '/',
    },
    requireInteraction: true,
    actions: [
      { action: 'claim', title: 'Claim Offer' },
      { action: 'later', title: 'Maybe Later' },
    ],
  });
}

/**
 * Check and schedule notifications for favorite teams' upcoming matches
 */
export async function checkAndScheduleFavoriteMatchReminders(matches) {
  const teams = getNotificationTeams();
  if (teams.length === 0) return;

  const teamIds = new Set(teams.map(t => t.id));

  for (const match of matches) {
    const homeId = match.teams?.home?.id || match.homeTeamId;
    const awayId = match.teams?.away?.id || match.awayTeamId;

    if (teamIds.has(homeId) || teamIds.has(awayId)) {
      scheduleMatchReminder({
        id: match.fixture?.id || match.id,
        homeTeam: match.teams?.home?.name || match.homeTeam,
        awayTeam: match.teams?.away?.name || match.awayTeam,
        kickoff: match.fixture?.date || match.kickoff,
      });
    }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default {
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
};
