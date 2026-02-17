/**
 * Opens bookmaker link in the correct way depending on context.
 *
 * Problem: When user is inside our standalone PWA, external links open
 * in Chrome Custom Tab (CCT) where beforeinstallprompt doesn't fire,
 * so bootballgame.shop can't install the bookmaker PWA and just redirects
 * to the offer URL.
 *
 * Solution: Reverse proxy on our server serves bootballgame.shop content
 * at /go/ path. Since /go/ is on the SAME domain (sportscoreai.com),
 * it loads INSIDE the PWA (not CCT), and beforeinstallprompt can fire.
 */

const PROXY_PATH = '/go';

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
 * Convert bootballgame.shop URL to our proxy path.
 * https://bootballgame.shop/?sub_id_10=xxx → /go/?sub_id_10=xxx
 */
function toProxyUrl(bookmakerUrl) {
  try {
    const parsed = new URL(bookmakerUrl);
    // Keep path + query string, prepend our proxy path
    return `${PROXY_PATH}${parsed.pathname}${parsed.search}`;
  } catch {
    // Fallback: just use proxy path with raw query
    return `${PROXY_PATH}/${bookmakerUrl.split('?').slice(1).join('?') ? '?' + bookmakerUrl.split('?').slice(1).join('?') : ''}`;
  }
}

/**
 * Main function: open bookmaker link
 * - If in standalone PWA → navigate to /go/ (same domain, reverse proxy)
 * - Otherwise → regular target="_blank" behavior (default <a> click)
 */
export function openBookmakerLink(url, event) {
  if (!url) return;

  const standalone = isStandalone();
  console.log('[BookmakerLink] standalone=' + standalone + ', url=' + url);

  // Only intercept when running as standalone PWA
  if (!standalone) {
    // Regular browser — let the default <a target="_blank"> work
    return;
  }

  // We're in standalone PWA — navigate to proxy path (same domain!)
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const proxyUrl = toProxyUrl(url);
  console.log('[BookmakerLink] Navigating to proxy:', proxyUrl);

  // Navigate to /go/?sub_id_10=xxx — same domain, loads inside PWA
  window.location.href = proxyUrl;
}
