/**
 * Tests for predictionStore.js
 * Covers: boostAccuracy, savePrediction, getPredictions, getStats, clearAll
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing
vi.mock('../features/matches/api/footballApi', () => ({
  default: {
    getFixturesByDate: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../shared/api', () => ({
  default: {
    saveMyPredictions: vi.fn(() => Promise.resolve()),
    getMyPredictions: vi.fn(() => Promise.resolve({ predictions: [] })),
    savePredictionToDB: vi.fn(() => Promise.resolve()),
  },
}));

import {
  savePrediction,
  getPredictions,
  getStats,
  boostAccuracy,
  clearAll,
  verifyPredictions,
  loadFromBackend,
} from '../features/predictions/services/predictionStore';

import footballApi from '../features/matches/api/footballApi';
import api from '../shared/api';

// Set up localStorage mock before any tests run
let store = {};
const localStorageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = String(val); }),
  removeItem: vi.fn((key) => { delete store[key]; }),
  clear: vi.fn(() => { store = {}; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

describe('predictionStore', () => {
  beforeEach(() => {
    store = {};
    localStorageMock.getItem.mockImplementation((key) => store[key] ?? null);
    localStorageMock.setItem.mockImplementation((key, val) => { store[key] = String(val); });
    localStorageMock.removeItem.mockImplementation((key) => { delete store[key]; });
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('boostAccuracy', () => {
    it('returns 0 when rawAccuracy is 0', () => {
      expect(boostAccuracy(0, 10)).toBe(0);
    });

    it('returns 0 when rawAccuracy is negative', () => {
      expect(boostAccuracy(-5, 10)).toBe(0);
    });

    it('returns a value in the 72-89 range for positive rawAccuracy', () => {
      const result = boostAccuracy(50, 10);
      expect(result).toBeGreaterThanOrEqual(72);
      expect(result).toBeLessThanOrEqual(89);
    });

    it('boosts low accuracy into competitive range', () => {
      const result = boostAccuracy(10, 5);
      expect(result).toBeGreaterThanOrEqual(72);
    });

    it('caps high accuracy at ~89%', () => {
      const result = boostAccuracy(100, 20);
      expect(result).toBeLessThanOrEqual(89);
    });

    it('higher raw accuracy produces higher boosted accuracy (monotonic)', () => {
      const low = boostAccuracy(20, 10);
      const high = boostAccuracy(80, 10);
      expect(high).toBeGreaterThanOrEqual(low);
    });

    it('adds per-user variance based on totalPredictions', () => {
      const a = boostAccuracy(50, 10);
      const b = boostAccuracy(50, 15);
      expect(a).toBeGreaterThanOrEqual(72);
      expect(b).toBeGreaterThanOrEqual(72);
    });
  });

  describe('savePrediction', () => {
    it('saves a prediction and returns the entry', () => {
      const result = savePrediction({
        matchId: '123',
        homeTeam: { name: 'Arsenal', logo: 'ars.png' },
        awayTeam: { name: 'Chelsea', logo: 'che.png' },
        league: 'Premier League',
        matchDate: '2024-01-15T20:00:00Z',
        apiPrediction: {
          predictions: {
            winner: { name: 'Arsenal', comment: 'Strong home form' },
            percent: { home: '60%', draw: '20%', away: '20%' },
            advice: 'Home win',
          },
        },
        claudeAnalysis: null,
        odds: { home: 1.5, draw: 4.0, away: 6.0 },
      });

      expect(result).not.toBeNull();
      expect(result.matchId).toBe('123');
      expect(result.homeTeam.name).toBe('Arsenal');
      expect(result.awayTeam.name).toBe('Chelsea');
      expect(result.prediction.betType).toBe('Arsenal');
      expect(result.prediction.confidence).toBe(60);
    });

    it('returns null when matchId is missing', () => {
      const result = savePrediction({
        matchId: null,
        homeTeam: { name: 'Arsenal' },
        awayTeam: { name: 'Chelsea' },
      });
      expect(result).toBeNull();
    });

    it('does not duplicate predictions for the same matchId', () => {
      savePrediction({
        matchId: '456',
        homeTeam: { name: 'A' },
        awayTeam: { name: 'B' },
        league: 'Test',
      });

      const second = savePrediction({
        matchId: '456',
        homeTeam: { name: 'A' },
        awayTeam: { name: 'B' },
        league: 'Test',
      });

      expect(second).toBeNull();
    });

    it('determines betType from winner name', () => {
      const result = savePrediction({
        matchId: '789',
        homeTeam: { name: 'Real Madrid' },
        awayTeam: { name: 'Barcelona' },
        apiPrediction: {
          predictions: {
            winner: { name: 'Real Madrid' },
            percent: { home: '55%', draw: '25%', away: '20%' },
          },
        },
      });
      expect(result.prediction.betType).toBe('Real Madrid');
    });

    it('falls back to percentages when winner is not set', () => {
      const result = savePrediction({
        matchId: '1000',
        homeTeam: { name: 'TeamA' },
        awayTeam: { name: 'TeamB' },
        apiPrediction: {
          predictions: {
            winner: {},
            percent: { home: '45%', draw: '10%', away: '45%' },
          },
        },
      });
      // When home == away, home wins (h >= a check is first)
      expect(result.prediction.betType).toBe('TeamA');
    });

    it('uses claude analysis as fallback for betType', () => {
      const result = savePrediction({
        matchId: '1001',
        homeTeam: { name: 'Liverpool' },
        awayTeam: { name: 'Everton' },
        apiPrediction: null,
        claudeAnalysis: 'I think Liverpool will win this derby comfortably.',
      });
      expect(result.prediction.betType).toBe('Liverpool');
    });

    it('defaults betType to Unknown when no data available', () => {
      const result = savePrediction({
        matchId: '1002',
        homeTeam: { name: 'X' },
        awayTeam: { name: 'Y' },
        apiPrediction: null,
        claudeAnalysis: null,
      });
      expect(result.prediction.betType).toBe('Unknown');
    });
  });

  describe('getPredictions', () => {
    it('returns empty array when localStorage is empty', () => {
      expect(getPredictions()).toEqual([]);
    });

    it('returns saved predictions', () => {
      savePrediction({
        matchId: '200',
        homeTeam: { name: 'A' },
        awayTeam: { name: 'B' },
      });
      const predictions = getPredictions();
      expect(predictions.length).toBe(1);
      expect(predictions[0].matchId).toBe('200');
    });
  });

  describe('getStats', () => {
    it('returns zero stats when no predictions exist', () => {
      const stats = getStats();
      expect(stats.total).toBe(0);
      expect(stats.verified).toBe(0);
      expect(stats.correct).toBe(0);
      expect(stats.wrong).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.accuracy).toBe(0);
    });

    it('counts pending predictions correctly', () => {
      savePrediction({
        matchId: '300',
        homeTeam: { name: 'A' },
        awayTeam: { name: 'B' },
      });
      const stats = getStats();
      expect(stats.total).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.verified).toBe(0);
    });

    it('calculates accuracy with verified predictions', () => {
      const predictions = [
        {
          id: '1', matchId: '1', homeTeam: { name: 'A' }, awayTeam: { name: 'B' },
          prediction: { betType: 'A', winnerName: 'A' },
          result: { isCorrect: true }, verifiedAt: '2024-01-01T00:00:00Z', createdAt: '2024-01-01',
        },
        {
          id: '2', matchId: '2', homeTeam: { name: 'C' }, awayTeam: { name: 'D' },
          prediction: { betType: 'C', winnerName: 'C' },
          result: { isCorrect: false }, verifiedAt: '2024-01-02T00:00:00Z', createdAt: '2024-01-02',
        },
      ];
      store['pva_predictions'] = JSON.stringify(predictions);

      const stats = getStats();
      expect(stats.total).toBe(2);
      expect(stats.verified).toBe(2);
      expect(stats.accuracy).toBeGreaterThanOrEqual(72); // boosted
    });
  });

  describe('clearAll', () => {
    it('removes all predictions from localStorage', () => {
      savePrediction({
        matchId: '999',
        homeTeam: { name: 'A' },
        awayTeam: { name: 'B' },
      });
      expect(getPredictions().length).toBe(1);

      clearAll();
      expect(getPredictions()).toEqual([]);
    });
  });

  describe('verifyPredictions', () => {
    const makePending = (overrides = {}) => ({
      id: '1',
      matchId: '100',
      homeTeam: { name: 'Arsenal' },
      awayTeam: { name: 'Chelsea' },
      league: 'PL',
      matchDate: '2024-01-15T20:00:00Z',
      prediction: { betType: 'Arsenal', winnerName: 'Arsenal', confidence: 60 },
      result: null,
      verifiedAt: null,
      createdAt: '2024-01-15',
      ...overrides,
    });

    // Set Date.now to 2024-01-17 (well after the match on 2024-01-15)
    const AFTER_MATCH = new Date('2024-01-17T12:00:00Z').getTime();

    beforeEach(() => {
      vi.spyOn(Date, 'now').mockReturnValue(AFTER_MATCH);
      footballApi.getFixturesByDate.mockReset();
    });

    it('returns 0 when no pending predictions exist', async () => {
      // All predictions already verified — none pending
      store['pva_predictions'] = JSON.stringify([{
        ...makePending(),
        result: { isCorrect: true, homeGoals: 2, awayGoals: 1 },
        verifiedAt: '2024-01-16T00:00:00Z',
      }]);

      const count = await verifyPredictions();
      expect(count).toBe(0);
      expect(footballApi.getFixturesByDate).not.toHaveBeenCalled();
    });

    it('returns 0 when match day has not ended yet', async () => {
      // Match is on 2024-01-20, but Date.now is 2024-01-17
      store['pva_predictions'] = JSON.stringify([
        makePending({ matchDate: '2024-01-20T20:00:00Z' }),
      ]);

      const count = await verifyPredictions();
      expect(count).toBe(0);
      expect(footballApi.getFixturesByDate).not.toHaveBeenCalled();
    });

    it('verifies a correct prediction (home team wins as predicted)', async () => {
      store['pva_predictions'] = JSON.stringify([makePending()]);

      footballApi.getFixturesByDate.mockResolvedValueOnce([{
        fixture: { id: 100, status: { short: 'FT' } },
        teams: { home: { name: 'Arsenal' }, away: { name: 'Chelsea' } },
        goals: { home: 2, away: 1 },
      }]);

      const count = await verifyPredictions();
      expect(count).toBe(1);

      const predictions = JSON.parse(store['pva_predictions']);
      expect(predictions[0].result).not.toBeNull();
      expect(predictions[0].result.isCorrect).toBe(true);
      expect(predictions[0].result.actualResult).toBe('Arsenal');
      expect(predictions[0].result.homeGoals).toBe(2);
      expect(predictions[0].result.awayGoals).toBe(1);
      expect(predictions[0].verifiedAt).not.toBeNull();
    });

    it('verifies a wrong prediction (predicted home but away won)', async () => {
      store['pva_predictions'] = JSON.stringify([makePending()]);

      footballApi.getFixturesByDate.mockResolvedValueOnce([{
        fixture: { id: 100, status: { short: 'FT' } },
        teams: { home: { name: 'Arsenal' }, away: { name: 'Chelsea' } },
        goals: { home: 0, away: 3 },
      }]);

      const count = await verifyPredictions();
      expect(count).toBe(1);

      const predictions = JSON.parse(store['pva_predictions']);
      expect(predictions[0].result.isCorrect).toBe(false);
      expect(predictions[0].result.actualResult).toBe('Chelsea');
    });

    it('handles fixture not found gracefully', async () => {
      store['pva_predictions'] = JSON.stringify([makePending()]);

      // Return fixtures that do not match the prediction teams
      footballApi.getFixturesByDate.mockResolvedValueOnce([{
        fixture: { id: 200, status: { short: 'FT' } },
        teams: { home: { name: 'Liverpool' }, away: { name: 'Everton' } },
        goals: { home: 1, away: 0 },
      }]);

      const count = await verifyPredictions();
      expect(count).toBe(0);

      // Prediction should remain unverified
      const predictions = JSON.parse(store['pva_predictions']);
      expect(predictions[0].result).toBeNull();
    });

    it('handles API error gracefully', async () => {
      store['pva_predictions'] = JSON.stringify([makePending()]);

      footballApi.getFixturesByDate.mockRejectedValueOnce(new Error('Network error'));

      const count = await verifyPredictions();
      expect(count).toBe(0);

      // Prediction should remain unverified
      const predictions = JSON.parse(store['pva_predictions']);
      expect(predictions[0].result).toBeNull();
    });

    it('skips non-finished matches (status not FT/AET/PEN)', async () => {
      store['pva_predictions'] = JSON.stringify([makePending()]);

      footballApi.getFixturesByDate.mockResolvedValueOnce([{
        fixture: { id: 100, status: { short: '1H' } },
        teams: { home: { name: 'Arsenal' }, away: { name: 'Chelsea' } },
        goals: { home: 1, away: 0 },
      }]);

      const count = await verifyPredictions();
      expect(count).toBe(0);

      const predictions = JSON.parse(store['pva_predictions']);
      expect(predictions[0].result).toBeNull();
    });
  });

  describe('loadFromBackend', () => {
    beforeEach(() => {
      api.getMyPredictions.mockReset();
      api.saveMyPredictions.mockReset();
      api.saveMyPredictions.mockResolvedValue();
    });

    const makeEntry = (matchId, createdAt) => ({
      id: matchId,
      matchId,
      homeTeam: { name: `Home${matchId}` },
      awayTeam: { name: `Away${matchId}` },
      league: 'PL',
      matchDate: '2024-01-15T20:00:00Z',
      prediction: { betType: `Home${matchId}`, winnerName: `Home${matchId}`, confidence: 50 },
      result: null,
      verifiedAt: null,
      createdAt: createdAt || '2024-01-15T00:00:00Z',
    });

    it('replaces local with remote when remote has data', async () => {
      const remote = [makeEntry('r1', '2024-01-16'), makeEntry('r2', '2024-01-15')];
      api.getMyPredictions.mockResolvedValueOnce({ predictions: remote });

      // Local is empty
      store['pva_predictions'] = JSON.stringify([]);

      await loadFromBackend();

      const stored = JSON.parse(store['pva_predictions']);
      expect(stored.length).toBe(2);
      expect(stored.map(p => p.matchId)).toContain('r1');
      expect(stored.map(p => p.matchId)).toContain('r2');
    });

    it('pushes local to backend when remote is empty but local has data', async () => {
      api.getMyPredictions.mockResolvedValueOnce({ predictions: [] });

      const local = [makeEntry('l1'), makeEntry('l2')];
      store['pva_predictions'] = JSON.stringify(local);

      await loadFromBackend();

      expect(api.saveMyPredictions).toHaveBeenCalledWith(local);
      // Local data should remain untouched
      const stored = JSON.parse(store['pva_predictions']);
      expect(stored.length).toBe(2);
    });

    it('merges local-only predictions into remote', async () => {
      const remote = [makeEntry('r1', '2024-01-16')];
      api.getMyPredictions.mockResolvedValueOnce({ predictions: remote });

      const local = [makeEntry('l1', '2024-01-17'), makeEntry('r1', '2024-01-14')];
      store['pva_predictions'] = JSON.stringify(local);

      await loadFromBackend();

      const stored = JSON.parse(store['pva_predictions']);
      // Should have l1 (local-only) + r1 (remote version) = 2 entries
      const matchIds = stored.map(p => p.matchId);
      expect(matchIds).toContain('l1');
      expect(matchIds).toContain('r1');
      expect(stored.length).toBe(2);

      // Should push merged result back since there were local-only predictions
      expect(api.saveMyPredictions).toHaveBeenCalled();
    });

    it('handles API error gracefully (keeps local data)', async () => {
      api.getMyPredictions.mockRejectedValueOnce(new Error('Server down'));

      const local = [makeEntry('l1')];
      store['pva_predictions'] = JSON.stringify(local);

      await loadFromBackend();

      // Local data should remain intact
      const stored = JSON.parse(store['pva_predictions']);
      expect(stored.length).toBe(1);
      expect(stored[0].matchId).toBe('l1');
    });
  });

  describe('getStats with streaks', () => {
    it('calculates current win streak correctly', () => {
      const predictions = [
        {
          id: '1', matchId: '1', homeTeam: { name: 'A' }, awayTeam: { name: 'B' },
          prediction: { betType: 'A', winnerName: 'A' },
          result: { isCorrect: true }, verifiedAt: '2024-01-03T00:00:00Z', createdAt: '2024-01-03',
        },
        {
          id: '2', matchId: '2', homeTeam: { name: 'C' }, awayTeam: { name: 'D' },
          prediction: { betType: 'C', winnerName: 'C' },
          result: { isCorrect: true }, verifiedAt: '2024-01-02T00:00:00Z', createdAt: '2024-01-02',
        },
        {
          id: '3', matchId: '3', homeTeam: { name: 'E' }, awayTeam: { name: 'F' },
          prediction: { betType: 'E', winnerName: 'E' },
          result: { isCorrect: false }, verifiedAt: '2024-01-01T00:00:00Z', createdAt: '2024-01-01',
        },
      ];
      store['pva_predictions'] = JSON.stringify(predictions);

      const stats = getStats();
      expect(stats.currentStreak).toBe(2);
      expect(stats.streakType).toBe('win');
    });

    it('calculates longest win streak', () => {
      const predictions = [
        // Most recent: 1 win
        {
          id: '5', matchId: '5', homeTeam: { name: 'I' }, awayTeam: { name: 'J' },
          prediction: { betType: 'I', winnerName: 'I' },
          result: { isCorrect: true }, verifiedAt: '2024-01-05T00:00:00Z', createdAt: '2024-01-05',
        },
        // Then a loss breaks the current streak
        {
          id: '4', matchId: '4', homeTeam: { name: 'G' }, awayTeam: { name: 'H' },
          prediction: { betType: 'G', winnerName: 'G' },
          result: { isCorrect: false }, verifiedAt: '2024-01-04T00:00:00Z', createdAt: '2024-01-04',
        },
        // Earlier: 3 consecutive wins = longest streak
        {
          id: '3', matchId: '3', homeTeam: { name: 'E' }, awayTeam: { name: 'F' },
          prediction: { betType: 'E', winnerName: 'E' },
          result: { isCorrect: true }, verifiedAt: '2024-01-03T00:00:00Z', createdAt: '2024-01-03',
        },
        {
          id: '2', matchId: '2', homeTeam: { name: 'C' }, awayTeam: { name: 'D' },
          prediction: { betType: 'C', winnerName: 'C' },
          result: { isCorrect: true }, verifiedAt: '2024-01-02T00:00:00Z', createdAt: '2024-01-02',
        },
        {
          id: '1', matchId: '1', homeTeam: { name: 'A' }, awayTeam: { name: 'B' },
          prediction: { betType: 'A', winnerName: 'A' },
          result: { isCorrect: true }, verifiedAt: '2024-01-01T00:00:00Z', createdAt: '2024-01-01',
        },
      ];
      store['pva_predictions'] = JSON.stringify(predictions);

      const stats = getStats();
      // Current streak is 1 win (most recent)
      expect(stats.currentStreak).toBe(1);
      expect(stats.streakType).toBe('win');
      // Longest win streak is 3 (the earlier consecutive wins)
      expect(stats.longestStreak).toBe(3);
    });

    it('shows loss streak when recent predictions are wrong', () => {
      const predictions = [
        {
          id: '3', matchId: '3', homeTeam: { name: 'E' }, awayTeam: { name: 'F' },
          prediction: { betType: 'E', winnerName: 'E' },
          result: { isCorrect: false }, verifiedAt: '2024-01-03T00:00:00Z', createdAt: '2024-01-03',
        },
        {
          id: '2', matchId: '2', homeTeam: { name: 'C' }, awayTeam: { name: 'D' },
          prediction: { betType: 'C', winnerName: 'C' },
          result: { isCorrect: false }, verifiedAt: '2024-01-02T00:00:00Z', createdAt: '2024-01-02',
        },
        {
          id: '1', matchId: '1', homeTeam: { name: 'A' }, awayTeam: { name: 'B' },
          prediction: { betType: 'A', winnerName: 'A' },
          result: { isCorrect: true }, verifiedAt: '2024-01-01T00:00:00Z', createdAt: '2024-01-01',
        },
      ];
      store['pva_predictions'] = JSON.stringify(predictions);

      const stats = getStats();
      expect(stats.currentStreak).toBe(2);
      expect(stats.streakType).toBe('loss');
      // Longest WIN streak should be 1 (only the earliest prediction was correct)
      expect(stats.longestStreak).toBe(1);
    });
  });
});
