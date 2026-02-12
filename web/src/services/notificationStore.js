/**
 * Notification Settings Store
 *
 * Manages user notification preferences:
 * - Favorite teams for match alerts
 * - Push notification subscription
 * - Modal display tracking (first visit, reminders)
 * - Last activity timestamp for re-engagement
 */

const STORAGE_KEY = 'pva_notifications';
const ACTIVITY_KEY = 'pva_last_activity';
const MODAL_SHOWN_KEY = 'pva_notification_modal_shown';
const REMINDER_KEY = 'pva_notification_reminder';

// Default settings
const DEFAULT_SETTINGS = {
  enabled: false,
  pushSubscription: null,
  favoriteTeams: [], // { id, name, logo }
  matchReminders: true, // 1 hour before match
  specialOffers: true, // "value bet" alerts
  reEngagement: true, // comeback notifications
  subscribedAt: null,
};

/**
 * Get all notification settings
 */
export function getNotificationSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to parse notification settings:', e);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save notification settings
 */
export function saveNotificationSettings(settings) {
  try {
    const current = getNotificationSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save notification settings:', e);
    return getNotificationSettings();
  }
}

/**
 * Add a team to notification favorites
 */
export function addNotificationTeam(team) {
  const settings = getNotificationSettings();
  if (!settings.favoriteTeams.find(t => t.id === team.id)) {
    settings.favoriteTeams.push({
      id: team.id,
      name: team.name,
      logo: team.logo,
      addedAt: new Date().toISOString(),
    });
    saveNotificationSettings(settings);
  }
  return settings.favoriteTeams;
}

/**
 * Remove a team from notification favorites
 */
export function removeNotificationTeam(teamId) {
  const settings = getNotificationSettings();
  settings.favoriteTeams = settings.favoriteTeams.filter(t => t.id !== teamId);
  saveNotificationSettings(settings);
  return settings.favoriteTeams;
}

/**
 * Get notification favorite teams
 */
export function getNotificationTeams() {
  return getNotificationSettings().favoriteTeams;
}

/**
 * Check if notifications are enabled
 */
export function isNotificationsEnabled() {
  return getNotificationSettings().enabled;
}

/**
 * Enable notifications
 */
export function enableNotifications(subscription = null) {
  return saveNotificationSettings({
    enabled: true,
    pushSubscription: subscription,
    subscribedAt: new Date().toISOString(),
  });
}

/**
 * Disable notifications
 */
export function disableNotifications() {
  return saveNotificationSettings({
    enabled: false,
    pushSubscription: null,
  });
}

/**
 * Save push subscription
 */
export function savePushSubscription(subscription) {
  return saveNotificationSettings({
    pushSubscription: subscription,
  });
}

/**
 * Get push subscription
 */
export function getPushSubscription() {
  return getNotificationSettings().pushSubscription;
}

// ============================================
// Modal Display Tracking
// ============================================

/**
 * Check if notification modal was shown (first visit)
 */
export function wasModalShown() {
  return localStorage.getItem(MODAL_SHOWN_KEY) === 'true';
}

/**
 * Mark modal as shown
 */
export function markModalShown() {
  localStorage.setItem(MODAL_SHOWN_KEY, 'true');
}

/**
 * Get reminder info
 */
export function getReminderInfo() {
  try {
    const data = localStorage.getItem(REMINDER_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { count: 0, lastShown: null };
}

/**
 * Mark reminder as shown
 */
export function markReminderShown() {
  const info = getReminderInfo();
  localStorage.setItem(REMINDER_KEY, JSON.stringify({
    count: info.count + 1,
    lastShown: new Date().toISOString(),
  }));
}

/**
 * Check if should show reminder
 * Shows reminder after 3 days if notifications not set up
 * Max 3 reminders
 */
export function shouldShowReminder() {
  const settings = getNotificationSettings();

  // Already enabled - no need for reminder
  if (settings.enabled && settings.favoriteTeams.length > 0) {
    return false;
  }

  const info = getReminderInfo();

  // Max 3 reminders
  if (info.count >= 3) return false;

  // No reminder shown yet and modal was shown at least once
  if (!info.lastShown && wasModalShown()) {
    // Check if 3 days passed since first modal
    return true;
  }

  // Check if 3 days passed since last reminder
  if (info.lastShown) {
    const daysSince = (Date.now() - new Date(info.lastShown).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 3;
  }

  return false;
}

// ============================================
// Activity Tracking (for re-engagement)
// ============================================

/**
 * Update last activity timestamp
 */
export function updateActivity() {
  localStorage.setItem(ACTIVITY_KEY, new Date().toISOString());
}

/**
 * Get last activity date
 */
export function getLastActivity() {
  const stored = localStorage.getItem(ACTIVITY_KEY);
  return stored ? new Date(stored) : null;
}

/**
 * Check if user is inactive (3+ weeks)
 */
export function isUserInactive(weeks = 3) {
  const lastActivity = getLastActivity();
  if (!lastActivity) return false;

  const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceActivity >= weeks * 7;
}

/**
 * Get inactivity days
 */
export function getInactivityDays() {
  const lastActivity = getLastActivity();
  if (!lastActivity) return 0;

  return Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================
// Re-engagement Data
// ============================================

/**
 * Generate re-engagement message based on favorite teams
 */
export function getReEngagementMessage() {
  const settings = getNotificationSettings();
  const teams = settings.favoriteTeams;

  if (teams.length === 0) {
    return {
      title: 'We miss you!',
      body: 'Come back and discover today\'s best betting opportunities!',
      type: 'general',
    };
  }

  // Pick random favorite team
  const team = teams[Math.floor(Math.random() * teams.length)];

  return {
    title: `${team.name} is playing soon!`,
    body: 'Get a FREE BET on your favorite team. Only for returning users!',
    type: 'freebet',
    teamId: team.id,
    teamName: team.name,
    teamLogo: team.logo,
  };
}

export default {
  getNotificationSettings,
  saveNotificationSettings,
  addNotificationTeam,
  removeNotificationTeam,
  getNotificationTeams,
  isNotificationsEnabled,
  enableNotifications,
  disableNotifications,
  savePushSubscription,
  getPushSubscription,
  wasModalShown,
  markModalShown,
  getReminderInfo,
  markReminderShown,
  shouldShowReminder,
  updateActivity,
  getLastActivity,
  isUserInactive,
  getInactivityDays,
  getReEngagementMessage,
};
