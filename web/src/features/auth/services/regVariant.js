/**
 * Register-page A/B variant (pre-registration, client-side).
 *
 * The funnel-5/6/7 system is *post*-registration (assigned by the backend when
 * a user is created), so it cannot gate the register screen itself — the visitor
 * has no account yet. This tiny helper assigns a stable variant on first landing
 * and persists it, so the same visitor always sees the same screen.
 *
 *   'control' — the original register screen (unchanged baseline)
 *   'selling' — a higher-intent selling screen (stronger offer + trust + benefits)
 *
 * Measurement is done purely via analytics_events: every register_* event carries
 * `variant` in its metadata, so conversion can be compared with SQL. No backend
 * change needed.
 */
const KEY = 'reg_ab';
const VARIANTS = ['control', 'selling'];

export function getRegVariant() {
  try {
    // Manual override for QA / screenshots: ?rv=selling  /  ?rv=control
    const forced = new URLSearchParams(window.location.search).get('rv');
    if (forced && VARIANTS.includes(forced)) {
      localStorage.setItem(KEY, forced);
      return forced;
    }
    const saved = localStorage.getItem(KEY);
    if (saved && VARIANTS.includes(saved)) return saved;
    const assigned = Math.random() < 0.5 ? 'control' : 'selling';
    localStorage.setItem(KEY, assigned);
    return assigned;
  } catch {
    return 'control';
  }
}

export default getRegVariant;
