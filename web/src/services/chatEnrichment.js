/**
 * Chat Enrichment Service
 * Detects match-related queries and fetches real-time data from API-Football
 * to provide Claude with actual statistics instead of guessing.
 */
import footballApi from '../api/footballApi';

// Common team name patterns (partial matches)
const LEAGUE_KEYWORDS = {
  'premier league': 39,
  'epl': 39,
  'la liga': 140,
  'bundesliga': 78,
  'serie a': 135,
  'ligue 1': 61,
  'champions league': 2,
  'ucl': 2,
  'europa league': 3,
  'eredivisie': 88,
  'primeira liga': 94,
  'championship': 40,
};

// Match query patterns
const MATCH_PATTERNS = [
  /(.+?)\s+(?:vs\.?|versus|against|v\.?|—|-)\s+(.+)/i,
  /(?:матч|match|game|predict|analyse|analyze|прогноз|анализ)\s+(.+?)\s+(?:vs\.?|v\.?|—|-)\s+(.+)/i,
];

const TODAY_KEYWORDS = ['today', 'сегодня', 'tonight', 'вечером', 'сейчас', 'now'];
const TOMORROW_KEYWORDS = ['tomorrow', 'завтра'];
const BEST_BET_KEYWORDS = ['best bet', 'лучшая ставка', 'лучший прогноз', 'top pick', 'value bet', 'рекомендация'];

/**
 * Analyze user message and determine what football data to fetch.
 * Returns enriched context string or null if no enrichment needed.
 */
export async function enrichMessage(message) {
  const lower = message.toLowerCase().trim();

  // 1. Try to detect a specific match query (e.g. "Arsenal vs Chelsea")
  const matchQuery = detectMatchQuery(lower, message);
  if (matchQuery) {
    return await enrichMatchQuery(matchQuery.home, matchQuery.away);
  }

  // 2. Detect "today's matches" / "best bets today" queries
  const isToday = TODAY_KEYWORDS.some(k => lower.includes(k));
  const isTomorrow = TOMORROW_KEYWORDS.some(k => lower.includes(k));
  const isBestBet = BEST_BET_KEYWORDS.some(k => lower.includes(k));

  if (isToday || isTomorrow || isBestBet) {
    return await enrichDayOverview(isTomorrow ? 'tomorrow' : 'today');
  }

  // 3. Detect league-specific queries
  for (const [keyword, leagueId] of Object.entries(LEAGUE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return await enrichLeagueQuery(leagueId, keyword);
    }
  }

  // 4. Detect live match queries
  if (lower.includes('live') || lower.includes('лайв') || lower.includes('сейчас играют')) {
    return await enrichLiveMatches();
  }

  return null;
}

/**
 * Detect if the message is asking about a specific match.
 */
function detectMatchQuery(lower, original) {
  for (const pattern of MATCH_PATTERNS) {
    const match = original.match(pattern);
    if (match) {
      const home = (match[1] || '').trim();
      const away = (match[2] || '').trim();
      if (home.length > 1 && away.length > 1) {
        return { home, away };
      }
    }
  }
  return null;
}

/**
 * Fetch enriched data for a specific match.
 */
async function enrichMatchQuery(homeTeam, awayTeam) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Try to find the fixture today or tomorrow
  let enriched = null;
  try {
    enriched = await footballApi.getMatchEnrichedData(homeTeam, awayTeam, today);
    if (!enriched) {
      enriched = await footballApi.getMatchEnrichedData(homeTeam, awayTeam, tomorrow);
    }
  } catch (e) {
    console.error('Match enrichment failed:', e);
  }

  if (!enriched) {
    // No fixture found — try search for upcoming fixture
    try {
      const results = await footballApi.searchTeam(homeTeam);
      if (results?.length > 0) {
        const teamId = results[0].team.id;
        const season = new Date().getFullYear();
        const fixtures = await footballApi.getFixturesByTeam(teamId, season, 3);
        if (fixtures?.length > 0) {
          const parts = [`Upcoming fixtures for ${results[0].team.name}:`];
          for (const f of fixtures) {
            const date = new Date(f.fixture.date).toLocaleDateString('en-GB');
            parts.push(`- ${f.teams.home.name} vs ${f.teams.away.name} (${date}, ${f.league.name})`);
          }
          return parts.join('\n');
        }
      }
    } catch (_) {}
    return null;
  }

  // Build rich context from enriched data
  const parts = [];
  const fixture = enriched.fixture;

  parts.push(`Match: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
  parts.push(`League: ${fixture.league.name} (${fixture.league.country})`);
  parts.push(`Date: ${new Date(fixture.fixture.date).toLocaleString()}`);
  parts.push(`Status: ${fixture.fixture.status.long}`);

  // Score if live/finished
  if (fixture.goals.home !== null) {
    parts.push(`Score: ${fixture.goals.home} - ${fixture.goals.away}`);
  }

  // Prediction data
  if (enriched.prediction) {
    const pred = enriched.prediction.predictions;
    const cmp = enriched.prediction.comparison;
    if (pred) {
      parts.push('');
      parts.push('--- API Prediction Data ---');
      if (pred.winner?.name) {
        parts.push(`Predicted winner: ${pred.winner.name} (${pred.winner.comment || ''})`);
      }
      if (pred.advice) parts.push(`Advice: ${pred.advice}`);
      if (pred.percent) {
        parts.push(`Win probability: Home ${pred.percent.home}, Draw ${pred.percent.draw}, Away ${pred.percent.away}`);
      }
    }
    if (cmp) {
      parts.push(`Form: Home ${cmp.form?.home || '?'} vs Away ${cmp.form?.away || '?'}`);
      parts.push(`Attack: Home ${cmp.att?.home || '?'} vs Away ${cmp.att?.away || '?'}`);
      parts.push(`Defense: Home ${cmp.def?.home || '?'} vs Away ${cmp.def?.away || '?'}`);
      parts.push(`Overall: Home ${cmp.total?.home || '?'} vs Away ${cmp.total?.away || '?'}`);
    }
  }

  // Odds
  if (enriched.odds?.length > 0) {
    const bookmaker = enriched.odds[0]?.bookmakers?.[0];
    if (bookmaker) {
      const market = bookmaker.bets?.find(b => b.name === 'Match Winner');
      if (market) {
        const home = market.values?.find(v => v.value === 'Home')?.odd;
        const draw = market.values?.find(v => v.value === 'Draw')?.odd;
        const away = market.values?.find(v => v.value === 'Away')?.odd;
        if (home) {
          parts.push('');
          parts.push('--- Bookmaker Odds ---');
          parts.push(`${bookmaker.name}: Home ${home}, Draw ${draw}, Away ${away}`);
        }
      }
    }
  }

  // Match statistics (if live/finished)
  if (enriched.stats?.length >= 2) {
    const homeStats = enriched.stats[0]?.statistics || [];
    const awayStats = enriched.stats[1]?.statistics || [];
    if (homeStats.length > 0) {
      parts.push('');
      parts.push('--- Match Statistics ---');
      for (let i = 0; i < homeStats.length; i++) {
        const h = homeStats[i];
        const a = awayStats[i];
        if (h && a) {
          parts.push(`${h.type}: ${h.value ?? 0} - ${a.value ?? 0}`);
        }
      }
    }
  }

  // Injuries
  if (enriched.injuries?.length > 0) {
    parts.push('');
    parts.push('--- Injuries/Suspensions ---');
    for (const inj of enriched.injuries.slice(0, 10)) {
      parts.push(`${inj.team.name}: ${inj.player.name} (${inj.player.reason || 'injured'})`);
    }
  }

  // Lineups
  if (enriched.lineups?.length >= 2) {
    parts.push('');
    parts.push('--- Lineups ---');
    for (const team of enriched.lineups) {
      parts.push(`${team.team.name} (${team.formation}): ${team.startXI?.map(p => p.player.name).join(', ')}`);
      if (team.coach?.name) parts.push(`Coach: ${team.coach.name}`);
    }
  }

  return parts.join('\n');
}

/**
 * Fetch today's/tomorrow's fixtures overview with predictions.
 */
async function enrichDayOverview(day) {
  const date = day === 'tomorrow'
    ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  try {
    const fixtures = await footballApi.getFixturesByDate(date);
    if (!fixtures?.length) return `No fixtures found for ${day} (${date}).`;

    // Group by league, limit to top leagues
    const topLeagueIds = new Set([39, 140, 78, 135, 61, 2, 3, 88, 94, 40, 71, 253]);
    const topFixtures = fixtures.filter(f => topLeagueIds.has(f.league.id));
    const useFixtures = topFixtures.length > 0 ? topFixtures : fixtures.slice(0, 30);

    const byLeague = {};
    for (const f of useFixtures) {
      const league = f.league.name;
      if (!byLeague[league]) byLeague[league] = [];
      byLeague[league].push(f);
    }

    const parts = [`Football fixtures for ${day} (${date}):`];
    parts.push(`Total: ${fixtures.length} matches (showing top leagues)`);
    parts.push('');

    for (const [league, matches] of Object.entries(byLeague)) {
      parts.push(`--- ${league} ---`);
      for (const f of matches) {
        const time = new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const status = f.fixture.status.short;
        let line = `${time} | ${f.teams.home.name} vs ${f.teams.away.name}`;
        if (['1H', '2H', 'HT', 'ET'].includes(status)) {
          line += ` [LIVE ${f.goals.home}-${f.goals.away}, ${f.fixture.status.elapsed}']`;
        } else if (status === 'FT') {
          line += ` [FT ${f.goals.home}-${f.goals.away}]`;
        }
        parts.push(line);
      }
      parts.push('');
    }

    // Fetch predictions for a few upcoming matches
    const upcoming = useFixtures
      .filter(f => f.fixture.status.short === 'NS')
      .slice(0, 5);

    if (upcoming.length > 0) {
      const predResults = await Promise.allSettled(
        upcoming.map(f => footballApi.getPrediction(f.fixture.id))
      );

      const predsWithData = predResults
        .map((r, i) => ({ fixture: upcoming[i], pred: r.status === 'fulfilled' ? r.value : null }))
        .filter(p => p.pred?.predictions?.winner);

      if (predsWithData.length > 0) {
        parts.push('--- AI Predictions (API-Football) ---');
        for (const { fixture: f, pred } of predsWithData) {
          const p = pred.predictions;
          parts.push(`${f.teams.home.name} vs ${f.teams.away.name}: ${p.winner.name} (${p.advice || ''})`);
          if (p.percent) {
            parts.push(`  Probability: H ${p.percent.home} D ${p.percent.draw} A ${p.percent.away}`);
          }
        }
      }
    }

    return parts.join('\n');
  } catch (e) {
    console.error('Day overview enrichment failed:', e);
    return null;
  }
}

/**
 * Fetch data for a specific league query.
 */
async function enrichLeagueQuery(leagueId, keyword) {
  const today = new Date().toISOString().split('T')[0];

  try {
    const fixtures = await footballApi.getFixturesByDate(today);
    const leagueFixtures = fixtures.filter(f => f.league.id === leagueId);

    if (leagueFixtures.length === 0) {
      // Try tomorrow
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const tFixtures = await footballApi.getFixturesByDate(tomorrow);
      const tLeague = tFixtures.filter(f => f.league.id === leagueId);

      if (tLeague.length === 0) {
        return `No ${keyword} fixtures found today or tomorrow.`;
      }

      return buildLeagueContext(tLeague, `${keyword} fixtures for tomorrow`);
    }

    return buildLeagueContext(leagueFixtures, `${keyword} fixtures for today`);
  } catch (e) {
    console.error('League enrichment failed:', e);
    return null;
  }
}

function buildLeagueContext(fixtures, title) {
  const parts = [`${title} (${fixtures.length} matches):`];
  parts.push('');

  for (const f of fixtures) {
    const time = new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const status = f.fixture.status.short;
    let line = `${time} | ${f.teams.home.name} vs ${f.teams.away.name}`;
    if (['1H', '2H', 'HT', 'ET'].includes(status)) {
      line += ` [LIVE ${f.goals.home}-${f.goals.away}, ${f.fixture.status.elapsed}']`;
    } else if (status === 'FT') {
      line += ` [FT ${f.goals.home}-${f.goals.away}]`;
    }
    parts.push(line);
  }

  return parts.join('\n');
}

/**
 * Fetch live matches overview.
 */
async function enrichLiveMatches() {
  try {
    const live = await footballApi.getLiveFixtures();
    if (!live?.length) return 'No live matches right now.';

    const parts = [`Live matches right now (${live.length} total):`];
    parts.push('');

    const byLeague = {};
    for (const f of live) {
      const league = f.league.name;
      if (!byLeague[league]) byLeague[league] = [];
      byLeague[league].push(f);
    }

    for (const [league, matches] of Object.entries(byLeague)) {
      parts.push(`--- ${league} ---`);
      for (const f of matches) {
        const elapsed = f.fixture.status.elapsed;
        const statusShort = f.fixture.status.short;
        let timeStr = `${elapsed}'`;
        if (statusShort === 'HT') timeStr = 'HT';

        parts.push(`${timeStr} | ${f.teams.home.name} ${f.goals.home} - ${f.goals.away} ${f.teams.away.name}`);
      }
      parts.push('');
    }

    return parts.join('\n');
  } catch (e) {
    console.error('Live enrichment failed:', e);
    return null;
  }
}

export default { enrichMessage };
