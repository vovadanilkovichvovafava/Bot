import footballApi from '../api/footballApi';

const STORAGE_KEY = 'pva_predictions';

function getAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(predictions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(predictions));
}

/**
 * Save a prediction after AI Analysis is generated.
 * Extracts the best bet from API-Football data + Claude analysis.
 */
export function savePrediction({
  matchId,
  homeTeam,
  awayTeam,
  league,
  matchDate,
  apiPrediction,
  claudeAnalysis,
  odds,
}) {
  if (!matchId) {
    console.warn('savePrediction: no matchId provided');
    return null;
  }

  const predictions = getAll();

  // Don't duplicate — one prediction per match
  if (predictions.find(p => String(p.matchId) === String(matchId))) {
    console.log('savePrediction: prediction already exists for matchId', matchId);
    return null;
  }

  // Extract prediction info from API-Football
  const pred = apiPrediction?.predictions;
  const winner = pred?.winner;
  const percent = pred?.percent;

  // Determine betType from winner prediction or Claude analysis
  let betType = 'Unknown';
  if (winner?.name) {
    betType = winner.name;
  } else if (percent) {
    const h = parseInt(percent.home) || 0;
    const d = parseInt(percent.draw) || 0;
    const a = parseInt(percent.away) || 0;
    if (h >= d && h >= a) betType = homeTeam?.name || 'Home';
    else if (a >= d && a >= h) betType = awayTeam?.name || 'Away';
    else betType = 'Draw';
  } else if (claudeAnalysis) {
    // Try to extract bet recommendation from Claude's response
    const lower = claudeAnalysis.toLowerCase();
    if (lower.includes(homeTeam?.name?.toLowerCase())) betType = homeTeam.name;
    else if (lower.includes(awayTeam?.name?.toLowerCase())) betType = awayTeam.name;
    else if (lower.includes('draw') || lower.includes('ничья')) betType = 'Draw';
  }

  // Determine confidence from percentages
  let confidence = 0;
  if (percent) {
    const vals = [parseInt(percent.home) || 0, parseInt(percent.draw) || 0, parseInt(percent.away) || 0];
    confidence = Math.max(...vals);
  }

  const entry = {
    id: Date.now().toString(),
    matchId: String(matchId),
    homeTeam: { name: homeTeam?.name || 'Home', logo: homeTeam?.logo || null },
    awayTeam: { name: awayTeam?.name || 'Away', logo: awayTeam?.logo || null },
    league: league || 'Unknown',
    matchDate: matchDate || new Date().toISOString(),
    prediction: {
      betType,
      confidence,
      advice: pred?.advice || '',
      winnerName: winner?.name || betType,
      winnerComment: winner?.comment || '',
      homePct: parseInt(percent?.home) || 0,
      drawPct: parseInt(percent?.draw) || 0,
      awayPct: parseInt(percent?.away) || 0,
    },
    odds: odds || null,
    result: null,
    createdAt: new Date().toISOString(),
    verifiedAt: null,
  };

  console.log('savePrediction: saving entry', entry);

  predictions.unshift(entry);

  // Keep max 100 predictions
  if (predictions.length > 100) predictions.length = 100;

  saveAll(predictions);
  return entry;
}

/**
 * Get all saved predictions, sorted newest first.
 */
export function getPredictions() {
  return getAll();
}

/**
 * Get prediction stats: total, correct, wrong, pending, accuracy.
 */
export function getStats() {
  const all = getAll();
  const verified = all.filter(p => p.result);
  const correct = verified.filter(p => p.result?.isCorrect);
  const wrong = verified.filter(p => !p.result?.isCorrect);
  const pending = all.filter(p => !p.result);

  return {
    total: all.length,
    verified: verified.length,
    correct: correct.length,
    wrong: wrong.length,
    pending: pending.length,
    accuracy: verified.length > 0
      ? Math.round((correct.length / verified.length) * 100 * 10) / 10
      : 0,
  };
}

/**
 * Verify pending predictions by checking actual match results via API-Football.
 * Returns number of newly verified predictions.
 */
export async function verifyPredictions() {
  const predictions = getAll();
  let verifiedCount = 0;

  const pending = predictions.filter(p => !p.result);
  if (pending.length === 0) return 0;

  // Group by date to minimize API calls
  const byDate = {};
  for (const p of pending) {
    const date = p.matchDate.split('T')[0];
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(p);
  }

  for (const [date, preds] of Object.entries(byDate)) {
    // Only verify matches that should be finished (at least 3 hours after match date)
    const matchDay = new Date(date + 'T23:59:59Z');
    if (Date.now() < matchDay.getTime()) continue; // Match day not over yet

    try {
      const fixtures = await footballApi.getFixturesByDate(date);

      for (const pred of preds) {
        const fixture = fixtures.find(f => {
          const homeName = (f.teams.home.name || '').toLowerCase();
          const awayName = (f.teams.away.name || '').toLowerCase();
          const predHome = (pred.homeTeam.name || '').toLowerCase();
          const predAway = (pred.awayTeam.name || '').toLowerCase();
          return (
            (homeName.includes(predHome) || predHome.includes(homeName) ||
             homeName.split(' ').some(w => w.length > 3 && predHome.includes(w))) &&
            (awayName.includes(predAway) || predAway.includes(awayName) ||
             awayName.split(' ').some(w => w.length > 3 && predAway.includes(w)))
          );
        });

        if (!fixture) continue;

        const status = fixture.fixture.status.short;
        // Only verify finished matches
        if (!['FT', 'AET', 'PEN'].includes(status)) continue;

        const homeGoals = fixture.goals.home ?? 0;
        const awayGoals = fixture.goals.away ?? 0;

        // Determine actual result
        let actualResult;
        if (homeGoals > awayGoals) actualResult = pred.homeTeam.name;
        else if (awayGoals > homeGoals) actualResult = pred.awayTeam.name;
        else actualResult = 'Draw';

        // Check if prediction was correct
        const predictedWinner = pred.prediction.winnerName;
        const isCorrect = (
          predictedWinner === actualResult ||
          predictedWinner.toLowerCase() === actualResult.toLowerCase() ||
          // Fuzzy match: check if predicted winner name is part of actual result
          actualResult.toLowerCase().includes(predictedWinner.toLowerCase()) ||
          predictedWinner.toLowerCase().includes(actualResult.toLowerCase())
        );

        // Update prediction entry
        const idx = predictions.findIndex(p => p.id === pred.id);
        if (idx !== -1) {
          predictions[idx].result = {
            homeGoals,
            awayGoals,
            status,
            actualResult,
            isCorrect,
          };
          predictions[idx].verifiedAt = new Date().toISOString();
          verifiedCount++;
        }
      }
    } catch (e) {
      console.error(`Failed to verify predictions for ${date}:`, e);
    }
  }

  if (verifiedCount > 0) {
    saveAll(predictions);
  }

  return verifiedCount;
}

/**
 * Clear all predictions (for debugging).
 */
export function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}

export default {
  savePrediction,
  getPredictions,
  getStats,
  verifyPredictions,
  clearAll,
};
