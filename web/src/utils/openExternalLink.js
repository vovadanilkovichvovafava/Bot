/**
 * Open a link in the system browser, even from standalone PWA.
 *
 * Problem: From a standalone PWA, links can open in an in-app WebView
 * where beforeinstallprompt doesn't fire — so bookmaker PWA can't install.
 *
 * Solution:
 * - Android: Use intent:// URL to force Chrome browser
 * - iOS: window.open() from standalone opens Safari
 * - Regular browser: standard window.open with _blank
 */
export function openExternalLink(url) {
  if (!url) return;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  if (isStandalone) {
    const isAndroid = /android/i.test(navigator.userAgent);
    if (isAndroid) {
      // intent:// scheme forces Android to open in Chrome
      const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
    } else {
      // iOS standalone: window.open opens Safari
      window.open(url);
    }
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
