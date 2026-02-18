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

// Match query patterns — with "vs" separator
const MATCH_PATTERNS_VS = [
  /(.+?)\s+(?:vs\.?|versus|against|v\.?|—)\s+(.+)/i,
  /(?:матч|match|game|predict|analyse|analyze|прогноз|анализ)\s+(.+?)\s+(?:vs\.?|v\.?|—)\s+(.+)/i,
];

// Well-known team names for detection without "vs" separator
const KNOWN_TEAMS = [
  'manchester united', 'man united', 'man utd', 'манчестер юнайтед', 'ман юнайтед',
  'manchester city', 'man city', 'манчестер сити', 'ман сити',
  'arsenal', 'арсенал',
  'chelsea', 'челси',
  'liverpool', 'ливерпуль',
  'tottenham', 'tottenham hotspur', 'spurs', 'тоттенхем', 'тоттенхэм', 'тотнем',
  'newcastle', 'newcastle united', 'ньюкасл',
  'aston villa', 'астон вилла',
  'west ham', 'вест хэм', 'вест хам',
  'brighton', 'брайтон',
  'crystal palace', 'кристал пэлас',
  'everton', 'эвертон',
  'fulham', 'фулхэм', 'фулхем',
  'wolves', 'wolverhampton', 'вулверхэмптон',
  'bournemouth', 'борнмут',
  'nottingham forest', 'ноттингем',
  'brentford', 'брентфорд',
  'burnley', 'бёрнли',
  'luton', 'лутон',
  'sheffield united', 'шеффилд',
  'real madrid', 'реал мадрид', 'реал',
  'barcelona', 'барселона', 'барса',
  'atletico madrid', 'атлетико',
  'sevilla', 'севилья',
  'real sociedad', 'сосьедад',
  'villarreal', 'вильярреал',
  'athletic bilbao', 'атлетик бильбао',
  'real betis', 'бетис',
  'valencia', 'валенсия',
  'bayern munich', 'bayern', 'бавария',
  'borussia dortmund', 'dortmund', 'дортмунд', 'боруссия',
  'rb leipzig', 'лейпциг',
  'bayer leverkusen', 'leverkusen', 'леверкузен',
  'juventus', 'ювентус',
  'inter milan', 'inter', 'интер',
  'ac milan', 'milan', 'милан',
  'napoli', 'наполи',
  'roma', 'рома',
  'lazio', 'лацио',
  'atalanta', 'аталанта',
  'fiorentina', 'фиорентина',
  'psg', 'paris saint-germain', 'paris saint germain', 'пари сен-жермен', 'псж',
  'marseille', 'марсель',
  'lyon', 'лион',
  'monaco', 'монако',
  'lille', 'лилль',
  'benfica', 'бенфика',
  'porto', 'порту',
  'sporting', 'спортинг',
  'ajax', 'аякс',
  'psv', 'псв',
  'feyenoord', 'фейеноорд',
  'galatasaray', 'галатасарай',
  'fenerbahce', 'фенербахче',
  'besiktas', 'бешикташ',
  'celtic', 'селтик',
  'rangers', 'рейнджерс',
  'zenit', 'зенит',
  'spartak', 'спартак',
  'cska', 'цска',
  'dynamo', 'динамо',
  'shakhtar', 'шахтёр', 'шахтер',
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

  // 2. Detect day keywords and league keywords
  const isToday = TODAY_KEYWORDS.some(k => lower.includes(k));
  const isTomorrow = TOMORROW_KEYWORDS.some(k => lower.includes(k));
  const isBestBet = BEST_BET_KEYWORDS.some(k => lower.includes(k));
  const dayTarget = isTomorrow ? 'tomorrow' : (isToday || isBestBet) ? 'today' : null;

  // Check for league keyword in the same message
  let detectedLeagueId = null;
  let detectedLeagueKeyword = null;
  for (const [keyword, leagueId] of Object.entries(LEAGUE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      detectedLeagueId = leagueId;
      detectedLeagueKeyword = keyword;
      break;
    }
  }

  // 3. If both day and league detected → league-specific day query (most specific)
  if (dayTarget && detectedLeagueId) {
    return await enrichLeagueDayQuery(detectedLeagueId, detectedLeagueKeyword, dayTarget);
  }

  // 4. Day-only query (no specific league)
  if (dayTarget) {
    return await enrichDayOverview(dayTarget === 'tomorrow' ? 'tomorrow' : 'today');
  }

  // 5. League-only query (no specific day)
  if (detectedLeagueId) {
    return await enrichLeagueQuery(detectedLeagueId, detectedLeagueKeyword);
  }

  // 6. Detect live match queries
  if (lower.includes('live') || lower.includes('лайв') || lower.includes('сейчас играют')) {
    return await enrichLiveMatches();
  }

  return null;
}

/**
 * Detect if the message is asking about a specific match.
 * Handles both "Team A vs Team B" and "матч Команда1 Команда2" patterns.
 */
function detectMatchQuery(lower, original) {
  // 1. Try explicit "vs" / "—" patterns first
  for (const pattern of MATCH_PATTERNS_VS) {
    const match = original.match(pattern);
    if (match) {
      const home = (match[1] || '').trim();
      const away = (match[2] || '').trim();
      if (home.length > 1 && away.length > 1) {
        return { home: cleanTeamName(home), away: cleanTeamName(away) };
      }
    }
  }

  // 2. Try detecting two known team names in the message (no separator needed)
  // Sort by length descending so longer names match first ("manchester united" before "inter")
  const sortedTeams = [...KNOWN_TEAMS].sort((a, b) => b.length - a.length);
  const found = [];

  let remaining = lower;
  for (const team of sortedTeams) {
    const idx = remaining.indexOf(team);
    if (idx !== -1) {
      found.push({ team, pos: idx });
      // Remove matched team from remaining to avoid overlap
      remaining = remaining.substring(0, idx) + ' '.repeat(team.length) + remaining.substring(idx + team.length);
      if (found.length === 2) break;
    }
  }

  if (found.length === 2) {
    // Sort by position in message — first mentioned = home
    found.sort((a, b) => a.pos - b.pos);
    return { home: found[0].team, away: found[1].team };
  }

  // 3. Single team detected — return it as both (will search for upcoming fixtures)
  if (found.length === 1) {
    return { home: found[0].team, away: null };
  }

  return null;
}

/**
 * Remove noise words from team name extracted via "vs" pattern
 */
function cleanTeamName(name) {
  return name
    .replace(/^(матч|match|game|predict|прогноз|анализ|ставка|ставку|bet on)\s+/i, '')
    .replace(/\s+(какую|какой|ставку|ставка|прогноз|prediction|bet|odds|коэффициент|кеф).*$/i, '')
    .trim();
}

/**
 * Fetch enriched data for a specific match.
 * Searches across 7 days (today + 6 days ahead) to find the fixture.
 * Also handles single team queries (away=null).
 */
async function enrichMatchQuery(homeTeam, awayTeam) {
  // If only one team detected, search for their upcoming fixtures
  if (!awayTeam) {
    return await enrichSingleTeam(homeTeam);
  }

  // Strategy 1: Search fixtures day-by-day for the next 7 days
  let enriched = null;
  try {
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() + i * 86400000).toISOString().split('T')[0];
      enriched = await footballApi.getMatchEnrichedData(homeTeam, awayTeam, date);
      if (enriched) break;
    }
  } catch (e) {
    console.error('Match enrichment (day scan) failed:', e);
  }

  // Strategy 2: If not found by date scan, search by team name via API
  if (!enriched) {
    try {
      const results = await footballApi.searchTeam(homeTeam);
      if (results?.length > 0) {
        const teamId = results[0].team.id;
        const season = new Date().getFullYear();
        const fixtures = await footballApi.getFixturesByTeam(teamId, season, 10);
        if (fixtures?.length > 0) {
          // Try to find the specific opponent
          const normalize = n => (n || '').toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
          const awayNorm = normalize(awayTeam);
          const matched = fixtures.find(f => {
            const h = normalize(f.teams.home.name);
            const a = normalize(f.teams.away.name);
            return h.includes(awayNorm) || a.includes(awayNorm) || awayNorm.includes(h) || awayNorm.includes(a);
          });

          if (matched) {
            // Found the fixture — get enriched data by fixture ID
            const fixtureId = matched.fixture.id;
            const [prediction, odds, stats, injuries, lineups] = await Promise.allSettled([
              footballApi.getPrediction(fixtureId),
              footballApi.getOdds(fixtureId),
              footballApi.getFixtureStatistics(fixtureId),
              footballApi.getInjuries(fixtureId),
              footballApi.getFixtureLineups(fixtureId),
            ]);
            enriched = {
              fixture: matched,
              fixtureId,
              prediction: prediction.status === 'fulfilled' ? prediction.value : null,
              odds: odds.status === 'fulfilled' ? odds.value : [],
              stats: stats.status === 'fulfilled' ? stats.value : [],
              injuries: injuries.status === 'fulfilled' ? injuries.value : [],
              lineups: lineups.status === 'fulfilled' ? lineups.value : [],
            };
          } else {
            // Opponent not found in upcoming, show all upcoming
            return buildUpcomingContext(results[0].team.name, fixtures);
          }
        }
      }
    } catch (_) {}
  }

  if (!enriched) return null;

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
 * Fetch upcoming fixtures for a single team.
 */
async function enrichSingleTeam(teamName) {
  try {
    const results = await footballApi.searchTeam(teamName);
    if (!results?.length) return null;

    const team = results[0].team;
    const teamId = team.id;
    const season = new Date().getFullYear();
    const fixtures = await footballApi.getFixturesByTeam(teamId, season, 5);
    if (!fixtures?.length) return `No upcoming fixtures found for ${team.name}.`;

    return buildUpcomingContext(team.name, fixtures);
  } catch (e) {
    console.error('Single team enrichment failed:', e);
    return null;
  }
}

/**
 * Build context string for upcoming fixtures list.
 */
function buildUpcomingContext(teamName, fixtures) {
  const parts = [`Upcoming fixtures for ${teamName}:`];
  parts.push('');

  for (const f of fixtures) {
    const date = new Date(f.fixture.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const status = f.fixture.status.short;
    let line = `${date} ${time} | ${f.teams.home.name} vs ${f.teams.away.name} (${f.league.name})`;
    if (status === 'FT') {
      line += ` [FT ${f.goals.home}-${f.goals.away}]`;
    } else if (['1H', '2H', 'HT'].includes(status)) {
      line += ` [LIVE ${f.goals.home}-${f.goals.away}]`;
    }
    parts.push(line);
  }

  return parts.join('\n');
}

/**
 * Fetch fixtures for a specific league on a specific day (today/tomorrow).
 * Returns clear message if no matches found — preventing AI hallucination.
 */
async function enrichLeagueDayQuery(leagueId, keyword, day) {
  const date = day === 'tomorrow'
    ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  try {
    const fixtures = await footballApi.getFixturesByDate(date);
    const leagueFixtures = fixtures.filter(f => f.league.id === leagueId);

    if (leagueFixtures.length === 0) {
      // Explicit "no matches" message so the AI doesn't hallucinate
      return `IMPORTANT: There are NO ${keyword} matches scheduled for ${day} (${date}). Do NOT invent matches. Tell the user there are no ${keyword} matches ${day} and suggest checking the next matchday.`;
    }

    const context = buildLeagueContext(leagueFixtures, `${keyword} fixtures for ${day} (${date})`);

    // Fetch predictions for upcoming matches
    const upcoming = leagueFixtures.filter(f => f.fixture.status.short === 'NS').slice(0, 5);
    if (upcoming.length > 0) {
      const predResults = await Promise.allSettled(
        upcoming.map(f => footballApi.getPrediction(f.fixture.id))
      );
      const predsWithData = predResults
        .map((r, i) => ({ fixture: upcoming[i], pred: r.status === 'fulfilled' ? r.value : null }))
        .filter(p => p.pred?.predictions?.winner);

      if (predsWithData.length > 0) {
        const predParts = ['\n--- API Predictions ---'];
        for (const { fixture: f, pred } of predsWithData) {
          const p = pred.predictions;
          predParts.push(`${f.teams.home.name} vs ${f.teams.away.name}: ${p.winner.name} (${p.advice || ''})`);
          if (p.percent) {
            predParts.push(`  Probability: H ${p.percent.home} D ${p.percent.draw} A ${p.percent.away}`);
          }
        }
        return context + '\n' + predParts.join('\n');
      }
    }

    return context;
  } catch (e) {
    console.error('League day enrichment failed:', e);
    return null;
  }
}

/**
 * Fetch data for a specific league query. Searches up to 7 days to find matches.
 */
async function enrichLeagueQuery(leagueId, keyword) {
  try {
    // Search up to 7 days to find league fixtures
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() + i * 86400000).toISOString().split('T')[0];
      const fixtures = await footballApi.getFixturesByDate(date);
      const leagueFixtures = fixtures.filter(f => f.league.id === leagueId);

      if (leagueFixtures.length > 0) {
        const dayLabel = i === 0 ? 'today' : i === 1 ? 'tomorrow' : date;
        return buildLeagueContext(leagueFixtures, `${keyword} fixtures for ${dayLabel}`);
      }
    }

    return `No ${keyword} fixtures found in the next 7 days.`;
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
