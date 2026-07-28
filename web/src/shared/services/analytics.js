/**
 * Analytics — тихо пишем события в БД, никуда не отправляем наружу.
 * Потом Claude вытаскивает через SQL когда нужна аналитика.
 */

import { ENV } from '../config/env';

const API_BASE = ENV.API_URL;

// Unique session ID per browser tab
export const SESSION_ID = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function getUserId() {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Use public_id from JWT (e.g. "usr_a7f3k9x2m5p8") instead of constructing from integer user_id
    return payload.public_id || null;
  } catch {
    return null;
  }
}

function getCountry() {
  try {
    return localStorage.getItem('countryCode') || null;
  } catch {
    return null;
  }
}

// Ad-campaign params we want on EVERY event, including anonymous ones.
// App.jsx persistTrackingParams() stashes the whole query string into
// sessionStorage on first landing, but those params only ever reached the DB
// after signup (trackingService.saveTrackingParams runs on user.id). So a
// visitor who bounced before registering was untraceable — we could not tell
// which creative sent him. Attaching them here closes that gap: every
// page_view / register_* row now carries its source.
const TRACKING_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'external_id', 'fbclid', 'partner_click_id', 'offer', 'geo',
];

function getTrackingParams() {
  const out = {};
  try {
    const urlParams = new URLSearchParams(window.location.search);
    // URL wins over sessionStorage — it's the fresher value.
    const pick = (key) => urlParams.get(key) || sessionStorage.getItem(`tracking_${key}`) || null;

    for (const key of TRACKING_KEYS) {
      const val = pick(key);
      if (val) out[key] = String(val).slice(0, 200);
    }
    for (let i = 1; i <= 15; i++) {
      const val = pick(`sub_id_${i}`);
      if (val) out[`sub_id_${i}`] = String(val).slice(0, 200);
    }
  } catch {
    // sessionStorage can throw in private mode — tracking is best-effort
  }
  return out;
}

/**
 * Track an event — fire-and-forget, never blocks UI
 * @param {string} event - Event name (e.g., 'page_view_register')
 * @param {object} meta - Optional metadata
 */
export function track(event, meta = {}) {
  try {
    const body = {
      event,
      page: window.location.pathname,
      user_id: getUserId(),
      session_id: SESSION_ID,
      country: getCountry(),
      referrer: document.referrer || null,
      // Caller metadata first, then campaign params — so an explicit meta key
      // (e.g. an A/B variant) is never silently overwritten by a URL param.
      metadata: { ...getTrackingParams(), ...meta },
    };

    // Fire-and-forget — don't await, don't catch
    fetch(`${API_BASE}/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {}); // Silently ignore errors
  } catch {
    // Never break the app
  }
}

export default { track };
