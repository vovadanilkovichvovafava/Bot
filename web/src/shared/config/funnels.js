/**
 * Which funnel a user is in — single source of truth for gating experiments.
 *
 * Call of 28.07: exactly two funnels stay live — the main one, which we do not
 * touch at all, and the test funnel, which carries every change we try. So any
 * new experiment must be wrapped in `isTestFunnel(user)`; without it a change
 * would leak into the baseline and destroy the comparison.
 */

export const MAIN_FUNNEL = 'funnel-1';
export const TEST_FUNNEL = 'funnel-6';

/** True when this user should see the experimental behaviour. */
export function isTestFunnel(user) {
  return user?.funnel === TEST_FUNNEL;
}

/** True for the untouched baseline (also covers legacy users with no funnel). */
export function isMainFunnel(user) {
  return !user?.funnel || user.funnel === MAIN_FUNNEL;
}

/**
 * Geos where the receipts are shown to EVERYONE, regardless of funnel.
 *
 * Brazil launches without an A/B split, so every Brazilian lands in the main
 * funnel — and the receipts, gated on the test funnel, would never appear there.
 * On a brand-new market with zero trust that proof matters most, so Brazil gets
 * them across the board. Portugal keeps them inside the test funnel only, so its
 * A/B stays clean.
 */
export const RECEIPTS_FOR_ALL_COUNTRIES = ['BR'];

/** Should this visitor see the payout receipts? */
export function showsReceipts(user, countryCode) {
  if (isTestFunnel(user)) return true;
  return RECEIPTS_FOR_ALL_COUNTRIES.includes((countryCode || '').toUpperCase());
}
