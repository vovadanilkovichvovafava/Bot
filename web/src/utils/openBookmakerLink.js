/**
 * Opens bookmaker link in the correct way depending on context.
 *
 * Problem: When user is inside our standalone PWA, external links open
 * in Chrome Custom Tab (CCT) where beforeinstallprompt doesn't fire,
 * so bootballgame.shop can't install the bookmaker PWA and just redirects
 * to the offer URL.
 *
 * Solution: Use Android Intent URL to force opening in FULL Chrome browser
 * (not CCT), where beforeinstallprompt works normally.
 * This is exactly the approach bootballgame.shop itself uses for in-app browsers.
 */

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
 * Detect Android
 */
function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

/**
 * Detect iOS
 */
function isIOS() {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent);
}

/**
 * Detect Samsung Browser
 */
function isSamsungBrowser() {
  return /SamsungBrowser/i.test(navigator.userAgent);
}

/**
 * Build Android intent URL to open a link in full Chrome browser
 * (not Chrome Custom Tab). Uses component= to force the real Chrome activity.
 */
function buildChromeIntentUrl(url) {
  const parsed = new URL(url);
  // intent:// uses the host+path+search from the URL, with scheme specified separately
  const intentUrl = `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=https;action=android.intent.action.VIEW;component=com.android.chrome/com.google.android.apps.chrome.Main;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.android.chrome')};end;`;
  return intentUrl;
}

/**
 * Build Samsung Browser intent URL
 */
function buildSamsungIntentUrl(url) {
  const parsed = new URL(url);
  return `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=https;package=com.sec.android.app.sbrowser;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.sec.android.app.sbrowser')};end;`;
}

/**
 * Main function: open bookmaker link
 * - If in standalone PWA on Android → use intent URL to open in full Chrome
 * - If in standalone PWA on iOS → window.location.href (Safari will handle it)
 * - Otherwise → regular target="_blank" behavior (default <a> click)
 */
export function openBookmakerLink(url, event) {
  if (!url) return;

  // Only intercept when running as standalone PWA
  if (!isStandalone()) {
    // Regular browser — let the default <a target="_blank"> work
    return;
  }

  // We're in standalone PWA — need special handling
  if (event) {
    event.preventDefault();
  }

  if (isAndroid()) {
    // Android standalone PWA → force open in real Chrome via intent
    const intentUrl = isSamsungBrowser()
      ? buildSamsungIntentUrl(url)
      : buildChromeIntentUrl(url);

    console.log('[BookmakerLink] Opening via intent:', intentUrl);
    window.location.href = intentUrl;
  } else if (isIOS()) {
    // iOS standalone PWA → open in Safari
    // x-safari-https:// scheme or just window.location for iOS
    console.log('[BookmakerLink] iOS standalone, using location.href');
    window.location.href = url;
  } else {
    // Fallback: try window.open
    console.log('[BookmakerLink] Fallback: window.open');
    window.open(url, '_blank');
  }
}
