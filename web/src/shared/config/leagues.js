/**
 * Which leagues to surface first, by visitor country (API-Football league IDs).
 *
 * The home screen used to prioritise one hardcoded European set, so a Brazilian
 * opened the app and saw the Premier League and the Bundesliga instead of the
 * Brasileirão — and a Portuguese user got no Primeira Liga at all, which is very
 * likely what user 477 meant on the 28.07 call ("he couldn't find the leagues").
 *
 * Local competitions come first, then the big European ones everybody follows.
 */

// Recognised everywhere — shown after the visitor's own leagues.
export const GLOBAL_TOP_LEAGUES = [
  2,    // Champions League
  3,    // Europa League
  39,   // Premier League
  140,  // La Liga
  135,  // Serie A (Italy)
  78,   // Bundesliga
  61,   // Ligue 1
];

// Home competitions per country.
export const LEAGUES_BY_COUNTRY = {
  BR: [71, 72, 73, 13],   // Brasileirão A/B, Copa do Brasil, Libertadores
  PT: [94, 96],           // Primeira Liga, Taça de Portugal
  ES: [140, 143],         // La Liga, Copa del Rey
  IT: [135, 137],         // Serie A, Coppa Italia
  DE: [78, 81],           // Bundesliga, DFB Pokal
  FR: [61, 66],           // Ligue 1, Coupe de France
  PL: [106],              // Ekstraklasa
  AR: [128, 13],          // Liga Profesional, Libertadores
  MX: [262],              // Liga MX
  GB: [39, 40, 45],       // Premier League, Championship, FA Cup
  US: [253],              // MLS
};

/**
 * Priority list for a visitor: their own leagues first, then the global ones.
 * Falls back to the global set when the country is unknown.
 */
export function topLeaguesFor(countryCode) {
  const local = LEAGUES_BY_COUNTRY[(countryCode || '').toUpperCase()] || [];
  return [...local, ...GLOBAL_TOP_LEAGUES.filter(id => !local.includes(id))];
}

/**
 * Sort rank for a league — lower is shown earlier. Unlisted leagues sort last.
 */
export function leagueRank(leagueId, priorityList) {
  const i = priorityList.indexOf(leagueId);
  return i === -1 ? priorityList.length : i;
}
