import { describe, it, expect, vi } from 'vitest';
import {
  generatePredictionShareText,
  generateMatchShareText,
  getShareLinks,
  sharePrediction,
} from '../features/predictions/services/shareUtils';

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

  it('includes "Prediction:" when winnerName exists', () => {
    const text = generatePredictionShareText(basePrediction);
    expect(text).toContain('Prediction: Arsenal');
  });

  it('falls back to "Home"/"Away" for missing team names', () => {
    const prediction = {
      ...basePrediction,
      homeTeam: { name: null },
      awayTeam: { name: null },
    };
    const text = generatePredictionShareText(prediction);
    expect(text).toContain('Home vs Away');
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

describe('sharePrediction', () => {
  const originalNavigator = { ...navigator };

  beforeEach(() => {
    // Reset navigator.share and navigator.clipboard before each test
    delete navigator.share;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns { success: true, method: "native" } when navigator.share succeeds', async () => {
    navigator.share = vi.fn().mockResolvedValue(undefined);

    const result = await sharePrediction('Test text', 'Test Title');

    expect(navigator.share).toHaveBeenCalledWith({
      title: 'Test Title',
      text: 'Test text',
    });
    expect(result).toEqual({ success: true, method: 'native' });
  });

  it('returns { success: false, method: "cancelled" } when navigator.share throws AbortError', async () => {
    const abortError = new Error('User cancelled');
    abortError.name = 'AbortError';
    navigator.share = vi.fn().mockRejectedValue(abortError);

    const result = await sharePrediction('Test text');

    expect(result).toEqual({ success: false, method: 'cancelled' });
  });

  it('falls back to clipboard when navigator.share is not available', async () => {
    // navigator.share is already deleted in beforeEach
    navigator.clipboard.writeText.mockResolvedValue(undefined);

    const result = await sharePrediction('Test text');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test text');
    expect(result).toEqual({ success: true, method: 'clipboard' });
  });

  it('returns { success: true, method: "clipboard" } when clipboard.writeText succeeds', async () => {
    // navigator.share throws a non-AbortError so it falls through to clipboard
    const genericError = new Error('Not supported');
    genericError.name = 'TypeError';
    navigator.share = vi.fn().mockRejectedValue(genericError);
    navigator.clipboard.writeText.mockResolvedValue(undefined);

    const result = await sharePrediction('Clipboard text');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Clipboard text');
    expect(result).toEqual({ success: true, method: 'clipboard' });
  });

  it('falls back to execCommand when clipboard fails', async () => {
    navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard denied'));

    const mockTextarea = {
      value: '',
      style: {},
      select: vi.fn(),
    };
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockTextarea);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    document.execCommand = vi.fn().mockReturnValue(true);

    const result = await sharePrediction('Fallback text');

    expect(createElementSpy).toHaveBeenCalledWith('textarea');
    expect(mockTextarea.value).toBe('Fallback text');
    expect(mockTextarea.style.position).toBe('fixed');
    expect(mockTextarea.style.opacity).toBe('0');
    expect(appendChildSpy).toHaveBeenCalledWith(mockTextarea);
    expect(mockTextarea.select).toHaveBeenCalled();
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(removeChildSpy).toHaveBeenCalledWith(mockTextarea);
    expect(result).toEqual({ success: true, method: 'clipboard' });

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    delete document.execCommand;
  });

  it('returns { success: false, method: "failed" } when all methods fail', async () => {
    navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard denied'));

    const mockTextarea = {
      value: '',
      style: {},
      select: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockTextarea);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('execCommand failed');
    });

    const result = await sharePrediction('Fail text');

    expect(result).toEqual({ success: false, method: 'failed' });

    delete document.execCommand;
  });
});
