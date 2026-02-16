/**
 * Open a link in the system browser, even from standalone PWA.
 *
 * From standalone PWA, links open in in-app WebView/CCT where
 * beforeinstallprompt doesn't fire — bookmaker PWA can't install.
 *
 * Strategy (based on web research):
 * 1. Standalone Android: window.open(url, '_system') — non-standard
 *    but supported flag that forces system Chrome
 * 2. Standalone iOS: window.open(url, '_system') — forces Safari
 * 3. Fallback: intent:// URL for Android Chrome
 * 4. Regular browser: standard window.open _blank
 *
 * Sources:
 * - codelessgenie.com/blog/ios-pwa-how-to-open-external-link
 * - stefanjudis.com/blog/three-things-to-consider-before-your-pwa
 */
export function openExternalLink(url) {
  if (!url) return;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  if (isStandalone) {
    // '_system' is a non-standard but widely supported target
    // that forces the system browser on both iOS and Android
    const opened = window.open(url, '_system');

    // Fallback: if _system didn't work, try intent:// on Android
    if (!opened) {
      const isAndroid = /android/i.test(navigator.userAgent);
      if (isAndroid) {
        window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      } else {
        // Last resort: plain window.open (opens in-app on iOS but better than nothing)
        window.open(url);
      }
    }
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Copy text to clipboard. Returns true on success.
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}
