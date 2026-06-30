/**
 * Runtime configuration — reads from window.__APP_CONFIG__ (injected at container start)
 * with fallback to import.meta.env.VITE_* (for local dev with Vite).
 */
const rc = window.__APP_CONFIG__ || {};

export const ENV = {
  API_URL:            rc.API_URL            || import.meta.env.VITE_API_URL            || '/api/v1',
  GEO_SERVER_URL:     rc.GEO_SERVER_URL     || import.meta.env.VITE_GEO_SERVER_URL     || '/geo',
  TRACKING_API:       rc.TRACKING_API       || import.meta.env.VITE_TRACKING_API       || '/geo',
  OFFER_URL:          rc.OFFER_URL          || import.meta.env.VITE_OFFER_URL          || '',
  OFFER_URL_F2:       rc.OFFER_URL_F2       || import.meta.env.VITE_OFFER_URL_F2       || '',
  OFFER_URL_GOOGLE:   rc.OFFER_URL_GOOGLE   || import.meta.env.VITE_OFFER_URL_GOOGLE   || '',
  // Geo-split offers: Argentina / Portugal (+Brazil). Empty → fall back to OFFER_URL.
  OFFER_URL_AR:       rc.OFFER_URL_AR       || import.meta.env.VITE_OFFER_URL_AR       || '',
  OFFER_URL_PT:       rc.OFFER_URL_PT       || import.meta.env.VITE_OFFER_URL_PT       || '',
  BKPROXY_URL:        rc.BKPROXY_URL        || import.meta.env.VITE_BKPROXY_URL        || '/geo',
  VAPID_PUBLIC_KEY:   rc.VAPID_PUBLIC_KEY   || import.meta.env.VITE_VAPID_PUBLIC_KEY   || '',
  BOOKMAKER_NAME:     rc.BOOKMAKER_NAME     || import.meta.env.VITE_BOOKMAKER_NAME     || 'Partner',
  BOOKMAKER_LINK:     rc.BOOKMAKER_LINK     || import.meta.env.VITE_BOOKMAKER_LINK     || '#',
  BOOKMAKER_BONUS:    rc.BOOKMAKER_BONUS    || import.meta.env.VITE_BOOKMAKER_BONUS    || 'Welcome Bonus',
  BOOKMAKER_PROMO:    rc.BOOKMAKER_PROMO    || import.meta.env.VITE_BOOKMAKER_PROMO    || '',
  TRAFFIC_SOURCE:     rc.TRAFFIC_SOURCE     || import.meta.env.VITE_TRAFFIC_SOURCE     || '',
  // Comma-separated extra hosts allowed as bookmaker deeplinks (open-redirect allowlist).
  DEEPLINK_HOSTS:     rc.DEEPLINK_HOSTS     || import.meta.env.VITE_DEEPLINK_HOSTS     || '',
};
