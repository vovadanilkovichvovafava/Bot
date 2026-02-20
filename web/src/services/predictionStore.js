import footballApi from '../api/footballApi';
import api from '../api';

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
 * Push current predictions to the backend (fire-and-forget).
 */
function syncToBackend() {
  try {
    const predictions = getAll();
    api.saveMyPredictions(predictions).catch(() => {});
  } catch {
    // ignore — sync is best-effort
  }
}

/**
 * Load predictions from backend and merge into localStorage.
 * Backend is source of truth — if it has data, it replaces local.
 * If backend is empty but local has data, push local to backend.
 */
export async function loadFromBackend() {
  try {
    const { predictions: remote } = await api.getMyPredictions();
    const local = getAll();

    if (remote && remote.length > 0) {
      // Merge: use remote as base, add any local-only predictions
      const remoteIds = new Set(remote.map(p => p.matchId));
      const localOnly = local.filter(p => !remoteIds.has(p.matchId));
      const merged = [...localOnly, ...remote]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 100);
      saveAll(merged);
      // Push merged result back if we added local-only predictions
      if (localOnly.length > 0) {
        api.saveMyPredictions(merged).catch(() => {});
      }
    } else if (local.length > 0) {
      // Backend empty, push local data
      api.saveMyPredictions(local).catch(() => {});
    }
  } catch {
    // Network error — keep local data as-is
  }
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

  // Debug: uncomment to trace prediction saves
  // console.log('savePrediction: saving entry', entry);

  predictions.unshift(entry);

  // Keep max 100 predictions
  if (predictions.length > 100) predictions.length = 100;

  saveAll(predictions);
  syncToBackend();

  // Also save to predictions DB table for ML verification & learning
  syncToDB(entry);

  return entry;
}

/**
 * Save a prediction to the backend predictions table (for ML tracking).
 * Fires and forgets — doesn't block the UI.
 */
function syncToDB(entry) {
  try {
    const payload = {
      match_id: parseInt(entry.matchId) || 0,
      home_team: entry.homeTeam?.name || 'Home',
      away_team: entry.awayTeam?.name || 'Away',
      league: entry.league || null,
      match_date: entry.matchDate || null,
      bet_type: entry.prediction?.betType || null,
      predicted_odds: entry.odds?.home ? parseFloat(entry.odds.home) : null,
      confidence: entry.prediction?.confidence || null,
      ai_analysis: entry.prediction?.advice || null,
      api_prediction: entry.prediction ? {
        winnerName: entry.prediction.winnerName,
        homePct: entry.prediction.homePct,
        drawPct: entry.prediction.drawPct,
        awayPct: entry.prediction.awayPct,
      } : null,
    };
    api.savePredictionToDB(payload).catch((e) => {
      console.warn('Failed to save prediction to DB:', e);
    });
  } catch {
    // ignore — DB sync is best-effort
  }
}

/**
 * Get all saved predictions, sorted newest first.
 */
export function getPredictions() {
  return getAll();
}

/**
 * Calculate prediction streaks
 */
function calculateStreaks(predictions) {
  // Sort by verification date, most recent first
  const verified = predictions
    .filter(p => p.result && p.verifiedAt)
    .sort((a, b) => new Date(b.verifiedAt) - new Date(a.verifiedAt));

  if (verified.length === 0) {
    return { currentStreak: 0, longestStreak: 0, streakType: null };
  }

  // Calculate current streak (consecutive results from most recent)
  let currentStreak = 0;
  let streakType = verified[0]?.result?.isCorrect ? 'win' : 'loss';

  for (const pred of verified) {
    const isCorrect = pred.result?.isCorrect;
    if ((streakType === 'win' && isCorrect) || (streakType === 'loss' && !isCorrect)) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate longest win streak
  let longestStreak = 0;
  let tempStreak = 0;

  for (const pred of verified) {
    if (pred.result?.isCorrect) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return { currentStreak, longestStreak, streakType };
}

/**
 * Boost raw accuracy to a competitive display range (72-89%).
 * Uses a sigmoid-like mapping so that:
 *  - 0% real   → 0% (no data = no claim)
 *  - 10% real  → ~72%
 *  - 30% real  → ~78%
 *  - 50% real  → ~82%
 *  - 70% real  → ~86%
 *  - 100% real → ~89%
 * Adds slight per-user variance based on total predictions count.
 */
export function boostAccuracy(rawAccuracy, totalPredictions) {
  if (rawAccuracy <= 0) return 0;

  // Base range: 72-89%
  const MIN_DISPLAY = 72;
  const MAX_DISPLAY = 89;

  // Normalize raw accuracy to 0-1
  const normalized = Math.min(rawAccuracy / 100, 1);

  // Sigmoid-like curve: fast ramp then plateau
  const curved = 1 - Math.exp(-2.5 * normalized);

  // Per-user micro-variance based on prediction count (±1.5%)
  const seed = (totalPredictions * 7 + 13) % 30;
  const variance = (seed / 30 - 0.5) * 3; // -1.5 to +1.5

  const boosted = MIN_DISPLAY + curved * (MAX_DISPLAY - MIN_DISPLAY) + variance;

  // Clamp and round to 1 decimal
  return Math.round(Math.min(Math.max(boosted, MIN_DISPLAY), MAX_DISPLAY) * 10) / 10;
}

/**
 * Adjust correct/wrong counts to be consistent with boosted accuracy.
 */
function boostCounts(correct, wrong, boostedAccuracy) {
  const verified = correct + wrong;
  if (verified === 0) return { correct, wrong };

  const targetCorrect = Math.round(verified * boostedAccuracy / 100);
  const adjustedCorrect = Math.max(targetCorrect, correct); // never lower than real
  const adjustedWrong = Math.max(verified - adjustedCorrect, 0);

  return { correct: adjustedCorrect, wrong: adjustedWrong };
}

/**
 * Get prediction stats: total, correct, wrong, pending, accuracy, streaks.
 * Accuracy and win/loss counts are boosted for display purposes.
 */
export function getStats() {
  const all = getAll();
  const verified = all.filter(p => p.result);
  const correct = verified.filter(p => p.result?.isCorrect);
  const wrong = verified.filter(p => !p.result?.isCorrect);
  const pending = all.filter(p => !p.result);
  const streaks = calculateStreaks(all);

  const rawAccuracy = verified.length > 0
    ? Math.round((correct.length / verified.length) * 100 * 10) / 10
    : 0;

  const accuracy = verified.length > 0
    ? boostAccuracy(rawAccuracy, all.length)
    : 0;

  const adjusted = boostCounts(correct.length, wrong.length, accuracy);

  return {
    total: all.length,
    verified: verified.length,
    correct: adjusted.correct,
    wrong: adjusted.wrong,
    pending: pending.length,
    accuracy,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    streakType: streaks.streakType,
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
    syncToBackend();
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
  boostAccuracy,
  verifyPredictions,
  loadFromBackend,
  clearAll,
};
