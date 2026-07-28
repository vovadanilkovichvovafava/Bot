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
