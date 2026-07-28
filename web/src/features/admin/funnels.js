/**
 * Funnel metadata shared across admin screens (A/B dashboard, user search).
 * Kept in one place so a label never drifts between pages.
 */

export const FUNNEL_COLORS = {
  'funnel-1': '#3b82f6',  // blue — degressive + Pro (main)
  'funnel-2': '#22c55e',  // green — all free
  'funnel-3': '#a855f7',  // purple — fixed 7/day
  'funnel-4': '#f97316',  // orange — express-first
  'funnel-5': '#64748b',  // slate — A/B control
  'funnel-6': '#ec4899',  // pink — A/B missed-win modal
  'funnel-7': '#14b8a6',  // teal — A/B wins slider
};

export const FUNNEL_LABELS = {
  'funnel-1': 'Main (Degressive + Pro)',
  'funnel-2': 'All Free (No Pro)',
  'funnel-3': 'Fixed 7/day',
  'funnel-4': 'Express-First',
  'funnel-5': 'A/B · Control',
  'funnel-6': 'Test (Missed-Win)',
  'funnel-7': 'A/B · Wins Slider',
};

export const FUNNEL_DESCRIPTIONS = {
  'funnel-1': 'Limits: 3→2→1/day. Upsell to Pro. Baseline — left untouched.',
  'funnel-2': 'Everything unlocked. No paywall. Bonus banners.',
  'funnel-3': 'Fixed 7 requests/day. No degradation.',
  'funnel-4': 'Express-first UX. All free. Leads with accumulators + bonus ads.',
  'funnel-5': 'funnel-1 base, no extra engagement (A/B control).',
  'funnel-6': 'funnel-1 base + missed-win modal. Carries every new experiment.',
  'funnel-7': 'funnel-1 base + real big-wins carousel (odds ≥5) on home.',
};

/**
 * Funnels no longer handed to new signups (call of 28.07 — only the main funnel
 * and the missed-win test funnel stay live). Kept in the DB and in these maps so
 * historical users still render with a proper label.
 */
export const RETIRED_FUNNELS = new Set([
  'funnel-2', 'funnel-3', 'funnel-4', 'funnel-5', 'funnel-7',
]);

/** Funnels a fresh lead can currently land in. */
export const LIVE_FUNNELS = ['funnel-1', 'funnel-6'];

export function funnelLabel(funnel) {
  return FUNNEL_LABELS[funnel] || funnel || '—';
}

export function funnelColor(funnel) {
  return FUNNEL_COLORS[funnel] || '#64748b';
}
