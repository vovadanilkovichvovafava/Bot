/**
 * A/B engagement funnels (client-side, no DB migration).
 *
 * Base monetization funnel stays funnel-1 (degressive requests + PRO upsell) —
 * we do NOT change it. This layer only assigns an engagement VARIANT (a/b/c)
 * that toggles our new features (missed-win nudge, share nudge, ...) so we can
 * A/B test what converts best, and carries the variant into share/offer links.
 *
 * Distribution:
 *  - fresh random lead (no ?fv=, nothing saved) -> random a/b/c (~33/33/33)
 *  - friend from a share link (?fv=b) -> inherits the sharer's variant
 *  - persisted in localStorage so it stays stable for the user
 */
const KEY = 'exp_variant';
const VARIANTS = ['a', 'b', 'c'];

// What each variant turns ON. Base (funnel-1) behaviour is identical across all;
// only these engagement adds differ. Tweak here — one place.
const CONFIG = {
  a: { missedWin: false, winsSlider: false }, // funnel 1 — control (base funnel-1)
  b: { missedWin: true, winsSlider: false }, // funnel 2 — "missed win" express nudge
  c: { missedWin: false, winsSlider: true }, // funnel 3 — real big-wins carousel
};

export function getVariant() {
  try {
    // 1) explicit variant from a shared link -> friend inherits sharer's funnel
    const fromUrl = new URLSearchParams(window.location.search).get('fv');
    if (fromUrl && VARIANTS.includes(fromUrl)) {
      localStorage.setItem(KEY, fromUrl);
      return fromUrl;
    }
    // 2) already assigned
    const saved = localStorage.getItem(KEY);
    if (saved && VARIANTS.includes(saved)) return saved;
    // 3) fresh lead -> random 33/33/33
    const v = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
    localStorage.setItem(KEY, v);
    return v;
  } catch {
    return 'a';
  }
}

export function variantConfig() {
  return CONFIG[getVariant()] || CONFIG.a;
}

/** Whether the current variant has a given engagement feature enabled. */
export function hasFeature(name) {
  return !!variantConfig()[name];
}

/** Append the variant to a URL (share links, offer links) so it propagates. */
export function withVariant(url) {
  if (!url) return url;
  try {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}fv=${getVariant()}`;
  } catch {
    return url;
  }
}
