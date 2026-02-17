/**
 * Opens bookmaker link in the correct way depending on context.
 *
 * Problem: When user is inside our standalone PWA, external links open
 * in Chrome Custom Tab (CCT) where beforeinstallprompt doesn't fire,
 * so bootballgame.shop can't install the bookmaker PWA and just redirects
 * to the offer URL.
 *
 * Solution: Route the link through our backend on a DIFFERENT domain
 * (appbot-production-152e.up.railway.app). Since that domain is outside
 * our PWA's scope (sportscoreai.com), Chrome opens it in a real browser
 * tab, not CCT. The backend does a 302 redirect to bootballgame.shop,
 * which then loads in full Chrome where beforeinstallprompt works.
 */

const BACKEND_URL = 'https://appbot-production-152e.up.railway.app/api/v1';

/**
 * Detect if we're running as an installed PWA (standalone mode)
 */
function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * Build redirect URL through our backend.
 * Backend does 302 redirect → opens in full Chrome since different domain.
 */
function buildRedirectUrl(targetUrl) {
  return `${BACKEND_URL}/go?url=${encodeURIComponent(targetUrl)}`;
}

/**
 * Main function: open bookmaker link
 * - If in standalone PWA → route through backend (different domain = full Chrome)
 * - Otherwise → regular target="_blank" behavior (default <a> click)
 */
export function openBookmakerLink(url, event) {
  if (!url) return;

  const standalone = isStandalone();
  console.log('[BookmakerLink] standalone=' + standalone);

  // Only intercept when running as standalone PWA
  if (!standalone) {
    // Regular browser — let the default <a target="_blank"> work
    return;
  }

  // We're in standalone PWA — route through backend to escape PWA scope
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const redirectUrl = buildRedirectUrl(url);
  console.log('[BookmakerLink] Redirecting via backend:', redirectUrl);

  // Open the backend URL — since it's a different domain (outside PWA scope),
  // Chrome will open it in a real browser tab, not Chrome Custom Tab
  window.location.href = redirectUrl;
}
