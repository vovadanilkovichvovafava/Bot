/**
 * Curated FIFA World Cup history for the 48 nations at WC 2026.
 * Used on the national-team detail page when the live API has no
 * tournament-history endpoint.
 *
 * Each entry: { appearances, titles[], runnerUp[], best, note? }
 *   titles    – years the nation won the World Cup
 *   runnerUp  – years they finished runners-up
 *   best      – short label of their best-ever finish
 */

const HISTORY = {
  brazil:        { appearances: 22, titles: [1958, 1962, 1970, 1994, 2002], runnerUp: [1950, 1998], best: 'Champions ×5', note: 'Only nation to play every World Cup.' },
  germany:       { appearances: 20, titles: [1954, 1974, 1990, 2014], runnerUp: [1966, 1982, 1986, 2002], best: 'Champions ×4' },
  argentina:     { appearances: 19, titles: [1978, 1986, 2022], runnerUp: [1930, 1990, 2014], best: 'Champions ×3', note: 'Reigning world champions.' },
  france:        { appearances: 17, titles: [1998, 2018], runnerUp: [2006, 2022], best: 'Champions ×2' },
  uruguay:       { appearances: 15, titles: [1930, 1950], runnerUp: [], best: 'Champions ×2' },
  spain:         { appearances: 17, titles: [2010], runnerUp: [], best: 'Champions 2010' },
  england:       { appearances: 17, titles: [1966], runnerUp: [], best: 'Champions 1966' },
  netherlands:   { appearances: 12, titles: [], runnerUp: [1974, 1978, 2010], best: 'Runners-up ×3' },
  sweden:        { appearances: 13, titles: [], runnerUp: [1958], best: 'Runners-up 1958' },
  croatia:       { appearances: 7, titles: [], runnerUp: [2018], best: 'Runners-up 2018', note: 'Third place in 2022.' },
  'czech republic': { appearances: 10, titles: [], runnerUp: [1934, 1962], best: 'Runners-up (as Czechoslovakia)' },
  hungary:       { appearances: 9, titles: [], runnerUp: [1938, 1954], best: 'Runners-up ×2' },
  austria:       { appearances: 8, titles: [], runnerUp: [], best: 'Third place 1954' },
  portugal:      { appearances: 8, titles: [], runnerUp: [], best: 'Third place 1966' },
  belgium:       { appearances: 14, titles: [], runnerUp: [], best: 'Third place 2018' },
  'south korea': { appearances: 11, titles: [], runnerUp: [], best: 'Fourth place 2002', note: 'Best finish by an Asian nation.' },
  'united states': { appearances: 11, titles: [], runnerUp: [], best: 'Third place 1930' },
  morocco:       { appearances: 6, titles: [], runnerUp: [], best: 'Fourth place 2022', note: 'First African team to reach a semi-final.' },
  poland:        { appearances: 9, titles: [], runnerUp: [], best: 'Third place ×2' },
  turkiye:       { appearances: 2, titles: [], runnerUp: [], best: 'Third place 2002' },
  'türkiye':     { appearances: 2, titles: [], runnerUp: [], best: 'Third place 2002' },
  chile:         { appearances: 9, titles: [], runnerUp: [], best: 'Third place 1962' },
  mexico:        { appearances: 17, titles: [], runnerUp: [], best: 'Quarter-finals ×2 (1970, 1986)', note: 'Co-host of WC 2026.' },
  switzerland:   { appearances: 12, titles: [], runnerUp: [], best: 'Quarter-finals ×3' },
  paraguay:      { appearances: 8, titles: [], runnerUp: [], best: 'Quarter-finals 2010' },
  colombia:      { appearances: 6, titles: [], runnerUp: [], best: 'Quarter-finals 2014' },
  ghana:         { appearances: 4, titles: [], runnerUp: [], best: 'Quarter-finals 2010' },
  senegal:       { appearances: 3, titles: [], runnerUp: [], best: 'Quarter-finals 2002' },
  'ivory coast': { appearances: 3, titles: [], runnerUp: [], best: 'Group stage' },
  japan:         { appearances: 7, titles: [], runnerUp: [], best: 'Round of 16 ×4' },
  ecuador:       { appearances: 4, titles: [], runnerUp: [], best: 'Round of 16 2006' },
  australia:     { appearances: 6, titles: [], runnerUp: [], best: 'Round of 16 ×2' },
  algeria:       { appearances: 4, titles: [], runnerUp: [], best: 'Round of 16 2014' },
  norway:        { appearances: 3, titles: [], runnerUp: [], best: 'Round of 16 1998' },
  'saudi arabia': { appearances: 6, titles: [], runnerUp: [], best: 'Round of 16 1994' },
  iran:          { appearances: 6, titles: [], runnerUp: [], best: 'Group stage' },
  tunisia:       { appearances: 6, titles: [], runnerUp: [], best: 'Group stage' },
  egypt:         { appearances: 3, titles: [], runnerUp: [], best: 'Group stage' },
  'south africa': { appearances: 3, titles: [], runnerUp: [], best: 'Group stage (host 2010)' },
  scotland:      { appearances: 8, titles: [], runnerUp: [], best: 'Group stage' },
  canada:        { appearances: 2, titles: [], runnerUp: [], best: 'Group stage', note: 'Co-host of WC 2026.' },
  qatar:         { appearances: 1, titles: [], runnerUp: [], best: 'Group stage (host 2022)' },
  'new zealand': { appearances: 2, titles: [], runnerUp: [], best: 'Group stage', note: 'Unbeaten at the 2010 World Cup.' },
  haiti:         { appearances: 1, titles: [], runnerUp: [], best: 'Group stage 1974' },
  iraq:          { appearances: 1, titles: [], runnerUp: [], best: 'Group stage 1986' },
  'dr congo':    { appearances: 1, titles: [], runnerUp: [], best: 'Group stage 1974 (as Zaire)' },
  panama:        { appearances: 1, titles: [], runnerUp: [], best: 'Group stage 2018' },
  'bosnia & herzegovina': { appearances: 1, titles: [], runnerUp: [], best: 'Group stage 2014' },
  // Debutants at WC 2026
  uzbekistan:    { appearances: 0, titles: [], runnerUp: [], best: 'Debut', note: 'First World Cup appearance.' },
  'cape verde':  { appearances: 0, titles: [], runnerUp: [], best: 'Debut', note: 'First World Cup appearance.' },
  'curaçao':     { appearances: 0, titles: [], runnerUp: [], best: 'Debut', note: 'First World Cup appearance.' },
  curacao:       { appearances: 0, titles: [], runnerUp: [], best: 'Debut', note: 'First World Cup appearance.' },
  jordan:        { appearances: 0, titles: [], runnerUp: [], best: 'Debut', note: 'First World Cup appearance.' },
};

function key(name) {
  return (name || '').trim().toLowerCase();
}

export function getWCHistory(name) {
  const k = key(name);
  if (HISTORY[k]) return HISTORY[k];
  // loose fallbacks
  if (k.includes('korea')) return HISTORY['south korea'];
  if (k.includes('congo')) return HISTORY['dr congo'];
  if (k.includes('bosnia')) return HISTORY['bosnia & herzegovina'];
  if (k.includes('cape verde') || k.includes('cabo')) return HISTORY['cape verde'];
  if (k.includes('ivory') || k.includes("côte")) return HISTORY['ivory coast'];
  if (k.includes('turk') || k.includes('türk')) return HISTORY['turkiye'];
  if (k.includes('curac') || k.includes('curaç')) return HISTORY['curacao'];
  return null;
}

export default getWCHistory;
