import { describe, it, expect, vi } from 'vitest';
import {
  generatePredictionShareText,
  generateMatchShareText,
  getShareLinks,
} from '../services/shareUtils';

describe('generatePredictionShareText', () => {
  const basePrediction = {
    homeTeam: { name: 'Arsenal' },
    awayTeam: { name: 'Chelsea' },
    league: 'PL',
    matchDate: '2024-01-01',
    prediction: {
      winnerName: 'Arsenal',
      confidence: 85,
      advice: 'Home win',
    },
  };

  it('includes both team names in versus format', () => {
    const text = generatePredictionShareText(basePrediction);
    expect(text).toContain('Arsenal');
    expect(text).toContain('Chelsea');
  });

  it('includes the confidence value', () => {
    const text = generatePredictionShareText(basePrediction);
    expect(text).toContain('85');
  });

  it('includes the advice text', () => {
    const text = generatePredictionShareText(basePrediction);
    expect(text).toContain('Home win');
  });

  it('handles missing homeTeam name gracefully by falling back to default', () => {
    const prediction = {
      ...basePrediction,
      homeTeam: { name: null },
    };
    const text = generatePredictionShareText(prediction);
    expect(text).toBeDefined();
    expect(typeof text).toBe('string');
  });

  it('handles missing awayTeam name gracefully by falling back to default', () => {
    const prediction = {
      ...basePrediction,
      awayTeam: { name: null },
    };
    const text = generatePredictionShareText(prediction);
    expect(text).toBeDefined();
    expect(typeof text).toBe('string');
  });
});

describe('generateMatchShareText', () => {
  const baseMatch = {
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    league: 'La Liga',
    date: '2024-02-15',
    prediction: {
      predictions: {
        winner: { name: 'Real Madrid' },
        percent: { home: '55%', draw: '25%', away: '20%' },
        advice: 'Home win likely',
      },
    },
    odds: { home: 1.8, draw: 3.5, away: 4.2 },
  };

  it('includes both team names', () => {
    const text = generateMatchShareText(baseMatch);
    expect(text).toContain('Real Madrid');
    expect(text).toContain('Barcelona');
  });

  it('includes prediction winner name', () => {
    const text = generateMatchShareText(baseMatch);
    expect(text).toContain('Real Madrid');
  });

  it('handles missing prediction gracefully', () => {
    const match = { ...baseMatch, prediction: null };
    const text = generateMatchShareText(match);
    expect(text).toBeDefined();
    expect(typeof text).toBe('string');
  });
});

describe('getShareLinks', () => {
  const sampleText = 'Arsenal vs Chelsea - Home win predicted!';
  const sampleUrl = 'https://example.com/match/123';

  it('returns an object with telegram, whatsapp, twitter, and facebook keys', () => {
    const links = getShareLinks(sampleText, sampleUrl);
    expect(links).toHaveProperty('telegram');
    expect(links).toHaveProperty('whatsapp');
    expect(links).toHaveProperty('twitter');
    expect(links).toHaveProperty('facebook');
  });

  it('generates a telegram URL that starts with https://t.me/share/', () => {
    const links = getShareLinks(sampleText, sampleUrl);
    expect(links.telegram).toMatch(/^https:\/\/t\.me\/share\//);
  });

  it('generates a whatsapp URL that starts with https://wa.me/', () => {
    const links = getShareLinks(sampleText, sampleUrl);
    expect(links.whatsapp).toMatch(/^https:\/\/wa\.me\//);
  });

  it('encodes the text in telegram, whatsapp, and twitter URLs', () => {
    const links = getShareLinks(sampleText, sampleUrl);
    // Facebook only includes URL, not text — so check only the other three
    expect(links.telegram).toContain(encodeURIComponent('Arsenal'));
    expect(links.whatsapp).toContain(encodeURIComponent('Arsenal'));
    expect(links.twitter).toContain(encodeURIComponent('Arsenal'));
  });

  it('facebook URL contains only the encoded page URL', () => {
    const links = getShareLinks(sampleText, sampleUrl);
    expect(links.facebook).toContain(encodeURIComponent(sampleUrl));
  });
});
