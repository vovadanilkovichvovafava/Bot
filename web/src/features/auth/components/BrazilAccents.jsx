/**
 * Brazilian accents for the signup screen.
 *
 * The brief is explicit about restraint: keep the dark, premium look and the
 * green primary button, and let Brazil in only as small touches — a thin
 * green-yellow rule at the top, a faint geometric wash, a little flag on the
 * badge. No giant flags, no footballs, no tropical leaves.
 */

// Bandeira do Brasil — the official trio, used for accents only.
export const BR = {
  green: '#009C3B',
  yellow: '#FFDF00',
  blue: '#002776',
};

/** Thin green→yellow rule pinned to the top of the page. */
export function BrazilTopRule() {
  return (
    <div
      className="absolute inset-x-0 top-0 h-[3px] z-10"
      style={{ background: `linear-gradient(90deg, ${BR.green} 0%, ${BR.green} 45%, ${BR.yellow} 55%, ${BR.yellow} 100%)` }}
    />
  );
}

/**
 * Barely-there diamond lattice — a nod to the flag's rhombus, not a pattern
 * anyone should consciously notice. Sits behind content and never intercepts
 * clicks.
 */
export function BrazilPattern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.05]"
      style={{
        backgroundImage:
          `linear-gradient(135deg, ${BR.green} 25%, transparent 25%),` +
          `linear-gradient(225deg, ${BR.green} 25%, transparent 25%)`,
        backgroundSize: '28px 28px',
        maskImage: 'linear-gradient(to bottom, black, transparent 70%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 70%)',
      }}
    />
  );
}
