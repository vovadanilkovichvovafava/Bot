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
 * Load value bets from today's matches (for ValueFinder page).
 * Uses 1X2 market only, includes all leagues.
 */
export async function loadValueBets({
  onProgress = () => {},
  maxMatches = 45,
  batchSize = 5,
} = {}) {
  onProgress({ current: 0, total: 0, phase: 'Loading matches...' });

  const today = new Date().toISOString().split('T')[0];
  const fixtures = await footballApi.getFixturesByDate(today);

  const upcoming = fixtures.filter(f =>
    ['NS', '1H', '2H', 'HT'].includes(f.fixture.status.short)
  );

  const topLeagueMatches = upcoming.filter(f => TOP_LEAGUE_IDS.includes(f.league.id));
  const otherMatches = upcoming.filter(f => !TOP_LEAGUE_IDS.includes(f.league.id));

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


// ---------------------------------------------------------------------------
// EXPRESS-SPECIFIC LOGIC
// ---------------------------------------------------------------------------

// Odds range suitable for express legs
const EXPRESS_MIN_ODD = 1.25;
const EXPRESS_MAX_ODD = 3.0;

/**
 * Extract all suitable bets from a bookmaker's odds for express.
 * Markets: 1X2, Double Chance, Over/Under, Handicap.
 * Filters to odds range 1.25-3.0.
 *
 * Returns array of { type, label, odd, category }
 */
function _extractExpressBets(bookmaker) {
  if (!bookmaker?.bets) return [];

  const candidates = [];

  // 1X2 (Match Winner)
  const mw = bookmaker.bets.find(b => b.name === 'Match Winner');
  if (mw?.values) {
    for (const v of mw.values) {
      const odd = parseFloat(v.odd);
      if (odd >= EXPRESS_MIN_ODD && odd <= EXPRESS_MAX_ODD) {
        candidates.push({
          type: v.value, // "Home", "Draw", "Away"
          label: v.value === 'Home' ? '1' : v.value === 'Away' ? '2' : 'X',
          odd,
          category: 'result',
        });
      }
    }
  }

  // Double Chance
  const dc = bookmaker.bets.find(b => b.name === 'Double Chance');
  if (dc?.values) {
    for (const v of dc.values) {
      const odd = parseFloat(v.odd);
      if (odd >= EXPRESS_MIN_ODD && odd <= EXPRESS_MAX_ODD) {
        candidates.push({
          type: `DC ${v.value}`,
          label: v.value, // "Home/Draw", "Draw/Away", "Home/Away"
          odd,
          category: 'double_chance',
        });
      }
    }
  }

  // Over/Under (Goals)
  const ou = bookmaker.bets.find(b =>
    b.name === 'Goals Over/Under' || b.name === 'Over/Under'
  );
  if (ou?.values) {
    for (const v of ou.values) {
      const odd = parseFloat(v.odd);
      if (odd >= EXPRESS_MIN_ODD && odd <= EXPRESS_MAX_ODD) {
        candidates.push({
          type: v.value, // "Over 2.5", "Under 2.5", etc.
          label: v.value,
          odd,
          category: 'total',
        });
      }
    }
  }

  // Asian Handicap / Handicap
  const hc = bookmaker.bets.find(b =>
    b.name === 'Asian Handicap' || b.name === 'Handicap'
  );
  if (hc?.values) {
    for (const v of hc.values) {
      const odd = parseFloat(v.odd);
      if (odd >= EXPRESS_MIN_ODD && odd <= EXPRESS_MAX_ODD) {
        candidates.push({
          type: v.value, // "Home -1", "Away +1", etc.
          label: v.value,
          odd,
          category: 'handicap',
        });
      }
    }
  }

  return candidates;
}

/**
 * Score a bet candidate for express suitability.
 * Prefers: odds in 1.4-2.2 range (sweet spot), result/total markets,
 * AI confidence as bonus.
 */
function _scoreExpressBet(bet, aiConfidence) {
  let score = 0;

  // Odds sweet spot: 1.4 - 2.2 is ideal for express
  if (bet.odd >= 1.4 && bet.odd <= 2.2) {
    score += 10;
  } else if (bet.odd >= 1.25 && bet.odd < 1.4) {
    score += 6; // very safe but low payout
  } else if (bet.odd > 2.2 && bet.odd <= 2.8) {
    score += 7;
  } else {
    score += 3;
  }

  // Market type preference
  if (bet.category === 'result') score += 5;        // 1X2 — most popular
  if (bet.category === 'total') score += 4;          // Over/Under
  if (bet.category === 'double_chance') score += 3;  // Safer
  if (bet.category === 'handicap') score += 3;

  // AI confidence bonus (0-100)
  if (aiConfidence > 0) {
    score += (aiConfidence / 100) * 5;
  }

  return score;
}

/**
 * Load express-suitable bets from today's top-league matches.
 *
 * Different from loadValueBets():
 * - TOP LEAGUES ONLY
 * - Multiple markets (1X2, Double Chance, Totals, Handicap)
 * - Odds filtered to 1.25-3.0 range
 * - Scored by express suitability, not by value edge
 *
 * Returns array of express-ready bet objects.
 */
export async function loadExpressBets({
  onProgress = () => {},
  batchSize = 5,
} = {}) {
  onProgress({ current: 0, total: 0, phase: 'Loading matches...' });

  const today = new Date().toISOString().split('T')[0];
  const fixtures = await footballApi.getFixturesByDate(today);

  // TOP LEAGUES ONLY — no cups, no women's, no random leagues
  const upcoming = fixtures.filter(f =>
    ['NS'].includes(f.fixture.status.short) &&
    TOP_LEAGUE_IDS.includes(f.league.id)
  );

  if (upcoming.length === 0) {
    return [];
  }

  // Limit to 30 matches max
  const matches = upcoming.slice(0, 30);

  onProgress({ current: 0, total: matches.length, phase: 'Analyzing matches...' });

  const allBets = [];

  for (let i = 0; i < matches.length; i += batchSize) {
    const batch = matches.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(async (fix) => {
        const [pred, odds] = await Promise.allSettled([
          footballApi.getPrediction(fix.fixture.id),
          footballApi.getOdds(fix.fixture.id),
        ]);

        const prediction = pred.status === 'fulfilled' ? pred.value : null;
        const oddsData = odds.status === 'fulfilled' ? odds.value : [];

        const bookmaker = oddsData?.[0]?.bookmakers?.[0];
        if (!bookmaker) return [];

        // Extract all suitable bets from all markets
        const candidates = _extractExpressBets(bookmaker);
        if (candidates.length === 0) return [];

        // Get AI confidence for scoring
        let aiConfidence = 0;
        if (prediction?.predictions?.percent) {
          const homePred = parseInt(prediction.predictions.percent.home) || 0;
          const awayPred = parseInt(prediction.predictions.percent.away) || 0;
          aiConfidence = Math.max(homePred, awayPred); // strongest prediction
        }

        // Score each candidate
        const scored = candidates.map(bet => ({
          ...bet,
          score: _scoreExpressBet(bet, aiConfidence),
          fixture: fix,
          aiConfidence,
          bookmakerName: bookmaker.name,
        }));

        // Pick best bet per match (highest score)
        scored.sort((a, b) => b.score - a.score);
        return [scored[0]]; // only the best one per match
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        allBets.push(...result.value);
      }
    }

    onProgress({
      current: Math.min(i + batchSize, matches.length),
      total: matches.length,
      phase: 'Analyzing matches...',
    });
  }

  // Sort all bets by score
  allBets.sort((a, b) => b.score - a.score);

  return allBets;
}


/**
 * Build express accumulators from express-ready bets.
 *
 * Creates 3 presets:
 * - safe:  3 legs, safest bets (highest score)
 * - value: 5 legs, balanced
 * - risky: 7 legs, more legs = bigger combined odds
 *
 * Rules:
 * - Max 1 bet per match
 * - Max 2 per league for diversity
 * - Max 2 per bet category for variety
 * - Odds 1.25-3.0 per leg (guaranteed by loadExpressBets)
 */
export function buildExpressFromBets(expressBets) {
  if (!expressBets || expressBets.length < 2) return [];

  const presets = [
    { key: 'safe', label: 'Safe Express', description: '3 top-league picks, safer odds', legCount: 3 },
    { key: 'value', label: 'Value Express', description: '5 picks, balanced risk & reward', legCount: 5 },
    { key: 'risky', label: 'Big Express', description: '7 picks, bigger combined odds', legCount: 7 },
  ];

  const expresses = [];

  for (const preset of presets) {
    const legs = _selectDiverseExpressLegs(expressBets, preset.legCount);
    if (legs.length < Math.min(2, preset.legCount)) continue;

    const totalOdds = legs.reduce((acc, leg) => acc * leg.odd, 1);
    const avgConfidence = legs.reduce((acc, leg) => acc + leg.aiConfidence, 0) / legs.length;

    expresses.push({
      key: preset.key,
      label: preset.label,
      description: preset.description,
      legs: legs.map(bet => ({
        fixture_id: bet.fixture.fixture.id,
        home_team: bet.fixture.teams.home.name,
        away_team: bet.fixture.teams.away.name,
        home_logo: bet.fixture.teams.home.logo,
        away_logo: bet.fixture.teams.away.logo,
        league: bet.fixture.league.name,
        league_logo: bet.fixture.league.logo,
        league_id: bet.fixture.league.id,
        match_date: bet.fixture.fixture.date,
        bet_type: bet.label,
        bet_category: bet.category,
        odds: bet.odd,
        confidence: bet.aiConfidence,
        isTopLeague: true,
      })),
      total_odds: Math.round(totalOdds * 100) / 100,
      leg_count: legs.length,
      avg_confidence: Math.round(avgConfidence),
    });
  }

  return expresses;
}


/**
 * Select diverse legs for express:
 * - Max 1 per match
 * - Max 2 per league
 * - Max 2 per bet category (result, total, double_chance, handicap)
 */
function _selectDiverseExpressLegs(bets, targetCount) {
  const selected = [];
  const usedFixtures = new Set();
  const leagueCount = {};
  const categoryCount = {};

  // First pass: strict diversity
  for (const bet of bets) {
    const fid = bet.fixture.fixture.id;
    if (usedFixtures.has(fid)) continue;

    const leagueId = bet.fixture.league.id;
    if ((leagueCount[leagueId] || 0) >= 2) continue;

    const cat = bet.category;
    if ((categoryCount[cat] || 0) >= 2) continue;

    selected.push(bet);
    usedFixtures.add(fid);
    leagueCount[leagueId] = (leagueCount[leagueId] || 0) + 1;
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;

    if (selected.length >= targetCount) break;
  }

  // Second pass: relax category constraint
  if (selected.length < targetCount) {
    for (const bet of bets) {
      const fid = bet.fixture.fixture.id;
      if (usedFixtures.has(fid)) continue;

      const leagueId = bet.fixture.league.id;
      if ((leagueCount[leagueId] || 0) >= 2) continue;

      selected.push(bet);
      usedFixtures.add(fid);
      leagueCount[leagueId] = (leagueCount[leagueId] || 0) + 1;

      if (selected.length >= targetCount) break;
    }
  }

  // Third pass: relax all constraints except 1-per-match
  if (selected.length < targetCount) {
    for (const bet of bets) {
      const fid = bet.fixture.fixture.id;
      if (usedFixtures.has(fid)) continue;
      selected.push(bet);
      usedFixtures.add(fid);
      if (selected.length >= targetCount) break;
    }
  }

  return selected;
}
