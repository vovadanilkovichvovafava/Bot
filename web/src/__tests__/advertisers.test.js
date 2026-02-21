import { describe, it, expect, vi } from 'vitest';
import {
  formatAmount,
  getAdvertiser,
  getSupportedCountries,
  ADVERTISERS,
  DEFAULT_ADVERTISER,
} from '../config/advertisers';

describe('formatAmount', () => {
  it('formats integer amount with currency symbol after number', () => {
    expect(formatAmount(10, '€')).toBe('10 €');
  });

  it('formats decimal amount with two decimal places', () => {
    expect(formatAmount(10.5, '€')).toBe('10.50 €');
  });

  it('prepends plus sign when showPlus option is true and amount is positive', () => {
    expect(formatAmount(10, 'zł', { showPlus: true })).toBe('+10 zł');
  });

  it('does not prepend plus sign for zero even when showPlus is true', () => {
    expect(formatAmount(0, '€', { showPlus: true })).toBe('0 €');
  });

  it('formats negative amounts with minus sign', () => {
    expect(formatAmount(-5, '€')).toBe('-5 €');
  });

  it('handles string input by parsing it as a number', () => {
    expect(formatAmount('10.5', '€')).toBe('10.50 €');
  });

  it('treats NaN input as 0', () => {
    expect(formatAmount('abc', '€')).toBe('0 €');
  });

  it('respects custom decimals option', () => {
    expect(formatAmount(10.123, '€', { decimals: 1 })).toBe('10.1 €');
  });
});

describe('getAdvertiser', () => {
  it('returns Italian config for country code IT', () => {
    const config = getAdvertiser('IT');
    expect(config.currency).toBe('€');
    expect(config.locale).toBe('it');
  });

  it('returns Polish config for country code PL', () => {
    const config = getAdvertiser('PL');
    expect(config.currency).toBe('zł');
    expect(config.locale).toBe('pl');
  });

  it('returns German config for country code DE', () => {
    const config = getAdvertiser('DE');
    expect(config.currency).toBe('€');
    expect(config.locale).toBe('de');
  });

  it('returns DEFAULT_ADVERTISER for unknown country code', () => {
    expect(getAdvertiser('XX')).toEqual(DEFAULT_ADVERTISER);
  });

  it('returns DEFAULT_ADVERTISER for null input', () => {
    expect(getAdvertiser(null)).toEqual(DEFAULT_ADVERTISER);
  });

  it('handles lowercase country code by converting to uppercase internally', () => {
    const configLower = getAdvertiser('it');
    const configUpper = getAdvertiser('IT');
    expect(configLower).toEqual(configUpper);
  });
});

describe('getSupportedCountries', () => {
  it('returns an array of country code strings', () => {
    const countries = getSupportedCountries();
    expect(Array.isArray(countries)).toBe(true);
    expect(countries.length).toBeGreaterThan(0);
    countries.forEach((code) => {
      expect(typeof code).toBe('string');
    });
  });
});

describe('ADVERTISERS', () => {
  it('maps AT and CH to the same config as DE', () => {
    expect(ADVERTISERS.AT).toEqual(ADVERTISERS.DE);
    expect(ADVERTISERS.CH).toEqual(ADVERTISERS.DE);
  });
});

describe('DEFAULT_ADVERTISER', () => {
  it('is a EUR config with euro currency symbol', () => {
    expect(DEFAULT_ADVERTISER.currency).toBe('€');
  });
});
