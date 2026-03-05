/**
 * Value Bet Service — shared logic for finding value bets.
 *
 * Used by both ValueFinder page and Express page.
 * Data source: API-Football (via backend proxy) — reliable, no Fonbet dependency.
 */

import footballApi from '../features/matches/api/footballApi';
import fonbetApi from './fonbetApi';

// Top leagues to prioritize (API-Football league IDs)
export const TOP_LEAGUE_IDS = [
  39,   // Premier League
  140,  // La Liga
  135,  // Serie A
  78,   // Bundesliga
  61,   // Ligue 1
  2,    // Champions League
  3,    // Europa League
  848,  // Conference League
  88,   // Eredivisie
  94,   // Primeira Liga
  203,  // Super Lig
  144,  // Belgian Pro League
  235,  // Russian Premier League
  40,   // Championship
  41,   // League One
  253,  // MLS
  262,  // Liga MX
  71,   // Serie A (Brazil)
  128,  // Primera Division (Argentina)
];

export function impliedProb(odd) {
  return odd > 0 ? (1 / parseFloat(odd)) * 100 : 0;
}

export function valuePct(predicted, odd) {
  return predicted - impliedProb(odd);
}

/**
 * Load value bets from today's matches.
 *
 * @param {object} opts
 * @param {function} opts.onProgress - progress callback({ current, total, phase })
 * @param {number} opts.maxMatches - max matches to analyze (default 45)
 * @param {number} opts.batchSize - parallel batch size (default 5)
 * @returns {Promise<Array>} array of value bet objects sorted by value
 */
export async function loadValueBets({
  onProgress = () => {},
  maxMatches = 45,
  batchSize = 5,
} = {}) {
  onProgress({ current: 0, total: 0, phase: 'Loading matches...' });

  const today = new Date().toISOString().split('T')[0];
  const fixtures = await footballApi.getFixturesByDate(today);

  // Filter to upcoming/live matches only
  const upcoming = fixtures.filter(f =>
    ['NS', '1H', '2H', 'HT'].includes(f.fixture.status.short)
  );

  // Separate top leagues from others
  const topLeagueMatches = upcoming.filter(f => TOP_LEAGUE_IDS.includes(f.league.id));
  const otherMatches = upcoming.filter(f => !TOP_LEAGUE_IDS.includes(f.league.id));

  // Prioritize top leagues, limit total
  const topLimit = Math.min(topLeagueMatches.length, 30);
  const otherLimit = Math.min(otherMatches.length, maxMatches - topLimit);
  const prioritized = [
    ...topLeagueMatches.slice(0, topLimit),
    ...otherMatches.slice(0, otherLimit),
  ];

  onProgress({ current: 0, total: prioritized.length, phase: 'Analyzing matches...' });

  const allResults = [];

  for (let i = 0; i < prioritized.length; i += batchSize) {
    const batch = prioritized.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(async (fix) => {
        const [pred, odds] = await Promise.allSettled([
          footballApi.getPrediction(fix.fixture.id),
          footballApi.getOdds(fix.fixture.id),
        ]);

        const prediction = pred.status === 'fulfilled' ? pred.value : null;
        const oddsData = odds.status === 'fulfilled' ? odds.value : [];

        if (!prediction?.predictions?.percent) return null;

        // Get 1X2 odds
        const bookmaker = oddsData?.[0]?.bookmakers?.[0];
        const market = bookmaker?.bets?.find(b => b.name === 'Match Winner');
        if (!market) return null;

        const homeOdd = market.values?.find(v => v.value === 'Home')?.odd;
        const drawOdd = market.values?.find(v => v.value === 'Draw')?.odd;
        const awayOdd = market.values?.find(v => v.value === 'Away')?.odd;
        if (!homeOdd) return null;

        const homePred = parseInt(prediction.predictions.percent.home);
        const drawPred = parseInt(prediction.predictions.percent.draw);
        const awayPred = parseInt(prediction.predictions.percent.away);

        const homeValue = valuePct(homePred, homeOdd);
        const drawValue = valuePct(drawPred, drawOdd);
        const awayValue = valuePct(awayPred, awayOdd);

        const bets = [
          { type: 'Home', pred: homePred, odd: parseFloat(homeOdd), value: homeValue, team: fix.teams.home.name },
          { type: 'Draw', pred: drawPred, odd: parseFloat(drawOdd), value: drawValue, team: 'Draw' },
          { type: 'Away', pred: awayPred, odd: parseFloat(awayOdd), value: awayValue, team: fix.teams.away.name },
        ];

        const best = bets.reduce((a, b) => a.value > b.value ? a : b);
        const isTopLeague = TOP_LEAGUE_IDS.includes(fix.league.id);

        return {
          fixture: fix,
          prediction,
          bookmaker: bookmaker?.name,
          bets,
          bestBet: best,
          isTopLeague,
        };
      })
    );

    allResults.push(...batchResults);
    onProgress({
      current: Math.min(i + batchSize, prioritized.length),
      total: prioritized.length,
      phase: 'Analyzing matches...',
    });
  }

  const valid = allResults
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
    .filter(v => v.bestBet.value > 0)
    .sort((a, b) => {
      if (a.isTopLeague && !b.isTopLeague) return -1;
      if (!a.isTopLeague && b.isTopLeague) return 1;
      return b.bestBet.value - a.bestBet.value;
    });

  return valid;
}

/**
 * Load Fonbet odds map for deeplinks (background, never blocks).
 * @returns {Promise<object>} map of lowercase "team1_team2" → fonbet event
 */
export async function loadFonbetMap() {
  try {
    const fbData = await fonbetApi.getTopLeaguesEvents('en');
    if (!fbData?.events) return {};
    const map = {};
    fbData.events.forEach(ev => {
      const key = `${(ev.team1 || '').toLowerCase()}_${(ev.team2 || '').toLowerCase()}`;
      map[key] = ev;
    });
    return map;
  } catch {
    return {};
  }
}

/**
 * Build express accumulators from value bets.
 *
 * Takes the sorted value bets and creates several preset combinations:
 * - safe:  3 legs, highest confidence (top value bets from top leagues)
 * - value: 5 legs, balanced mix of value and diversity
 * - risky: 7 legs, more legs = higher combined odds
 *
 * Rules:
 * - Max 1 bet per match
 * - Diverse leagues preferred
 * - Already sorted by value (from loadValueBets)
 *
 * @param {Array} valueBets - sorted value bets from loadValueBets()
 * @returns {Array} array of express objects
 */
export function buildExpressFromValueBets(valueBets) {
  if (!valueBets || valueBets.length < 2) return [];

  const presets = [
    { key: 'safe', label: 'Safe Express', description: '3 top value bets from top leagues', legCount: 3, topLeagueOnly: true },
    { key: 'value', label: 'Value Express', description: '5 best value bets, diverse leagues', legCount: 5, topLeagueOnly: false },
    { key: 'risky', label: 'Big Express', description: '7 legs for maximum payout', legCount: 7, topLeagueOnly: false },
  ];

  const expresses = [];

  for (const preset of presets) {
    const legs = _selectDiverseLegs(valueBets, preset.legCount, preset.topLeagueOnly);
    if (legs.length < 2) continue;

    const totalOdds = legs.reduce((acc, leg) => acc * leg.bestBet.odd, 1);
    const avgValue = legs.reduce((acc, leg) => acc + leg.bestBet.value, 0) / legs.length;
    const avgConfidence = legs.reduce((acc, leg) => acc + leg.bestBet.pred, 0) / legs.length;

    expresses.push({
      key: preset.key,
      label: preset.label,
      description: preset.description,
      legs: legs.map(vb => ({
        fixture_id: vb.fixture.fixture.id,
        home_team: vb.fixture.teams.home.name,
        away_team: vb.fixture.teams.away.name,
        home_logo: vb.fixture.teams.home.logo,
        away_logo: vb.fixture.teams.away.logo,
        league: vb.fixture.league.name,
        league_logo: vb.fixture.league.logo,
        league_id: vb.fixture.league.id,
        match_date: vb.fixture.fixture.date,
        bet_type: `${vb.bestBet.type} — ${vb.bestBet.team}`,
        odds: vb.bestBet.odd,
        value: vb.bestBet.value,
        confidence: vb.bestBet.pred,
        isTopLeague: vb.isTopLeague,
      })),
      total_odds: Math.round(totalOdds * 100) / 100,
      leg_count: legs.length,
      avg_value: Math.round(avgValue * 10) / 10,
      avg_confidence: Math.round(avgConfidence),
    });
  }

  return expresses;
}

/**
 * Select diverse legs: max 1 per match, spread across leagues.
 */
function _selectDiverseLegs(valueBets, targetCount, topLeagueOnly) {
  const pool = topLeagueOnly
    ? valueBets.filter(vb => vb.isTopLeague)
    : valueBets;

  const selected = [];
  const usedFixtures = new Set();
  const leagueCount = {};

  for (const vb of pool) {
    const fid = vb.fixture.fixture.id;
    if (usedFixtures.has(fid)) continue;

    const leagueId = vb.fixture.league.id;
    const currentLeagueCount = leagueCount[leagueId] || 0;

    // Max 2 per league for diversity
    if (currentLeagueCount >= 2) continue;

    selected.push(vb);
    usedFixtures.add(fid);
    leagueCount[leagueId] = currentLeagueCount + 1;

    if (selected.length >= targetCount) break;
  }

  // Relax league constraint if not enough
  if (selected.length < targetCount) {
    for (const vb of pool) {
      const fid = vb.fixture.fixture.id;
      if (usedFixtures.has(fid)) continue;
      selected.push(vb);
      usedFixtures.add(fid);
      if (selected.length >= targetCount) break;
    }
  }

  return selected;
}
