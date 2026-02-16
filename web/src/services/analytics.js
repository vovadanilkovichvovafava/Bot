/**
 * Analytics — тихо пишем события в БД, никуда не отправляем наружу.
 * Потом Claude вытаскивает через SQL когда нужна аналитика.
 */

const API_BASE = 'https://appbot-production-152e.up.railway.app/api/v1';

// Unique session ID per browser tab
const SESSION_ID = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function getUserId() {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.user_id ? `usr_${payload.user_id}` : null;
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
      metadata: meta,
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
