/**
 * Tests for predictionStore.js
 * Covers: boostAccuracy, savePrediction, getPredictions, getStats, clearAll
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing
vi.mock('../api/footballApi', () => ({
  default: {
    getFixturesByDate: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../api', () => ({
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
} from '../services/predictionStore';

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
});
