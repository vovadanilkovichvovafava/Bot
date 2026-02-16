/**
 * Open a link — in standalone PWA returns false so caller can
 * show an iframe overlay instead. In regular browser opens normally.
 *
 * @returns {boolean} true if opened, false if in standalone (use iframe)
 */
export function openExternalLink(url) {
  if (!url) return true;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  if (isStandalone) {
    // In standalone PWA we can't open system browser reliably.
    // Return false so the caller shows an iframe overlay instead.
    return false;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
