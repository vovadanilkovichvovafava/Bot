import { describe, it, expect, vi } from 'vitest';
import {
  onlyDigits,
  formatPhone,
  isValidPhone,
  fullPhoneNumber,
  parsePhoneNumber,
  detectCountry,
  getCountryByCode,
  COUNTRIES,
} from '../utils/phoneUtils';

describe('onlyDigits', () => {
  it('strips non-digit characters from a formatted phone string', () => {
    expect(onlyDigits('(123) 456')).toBe('123456');
  });

  it('returns the same string when input is all digits', () => {
    expect(onlyDigits('1234567890')).toBe('1234567890');
  });

  it('returns an empty string when input has no digits', () => {
    expect(onlyDigits('abc-def')).toBe('');
  });

  it('returns an empty string for empty input', () => {
    expect(onlyDigits('')).toBe('');
  });

  it('handles mixed special characters and digits', () => {
    expect(onlyDigits('+1 (555) 123-4567')).toBe('15551234567');
  });
});

describe('formatPhone', () => {
  it('formats 10 digits with a US-style mask', () => {
    expect(formatPhone('1234567890', '(___) ___-____')).toBe('(123) 456-7890');
  });

  it('partially formats when digits are shorter than mask slots', () => {
    const result = formatPhone('123', '(___) ___-____');
    expect(result).toBe('(123');
  });

  it('returns an empty string when digits is empty', () => {
    expect(formatPhone('', '(___) ___-____')).toBe('');
  });

  it('formats with a different mask pattern', () => {
    expect(formatPhone('12345678', '____ ____')).toBe('1234 5678');
  });
});

describe('isValidPhone', () => {
  it('returns true for digits with length >= 6', () => {
    expect(isValidPhone('123456', { minDigits: 6 })).toBe(true);
  });

  it('returns true for digits longer than 6', () => {
    expect(isValidPhone('1234567890', { minDigits: 6 })).toBe(true);
  });

  it('returns false for digits shorter than 6', () => {
    expect(isValidPhone('12345', { minDigits: 6 })).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidPhone('', { minDigits: 6 })).toBe(false);
  });
});

describe('fullPhoneNumber', () => {
  it('concatenates dial code and digits', () => {
    expect(fullPhoneNumber('1234567890', { dial: '+1' })).toBe('+11234567890');
  });

  it('works with a different country dial code', () => {
    expect(fullPhoneNumber('7911123456', { dial: '+44' })).toBe('+447911123456');
  });

  it('handles empty digits with a dial code', () => {
    expect(fullPhoneNumber('', { dial: '+1' })).toBe('+1');
  });
});

describe('parsePhoneNumber', () => {
  it('parses a US number correctly', () => {
    const result = parsePhoneNumber('+11234567890');
    expect(result).toEqual({ countryCode: 'US', localDigits: '1234567890' });
  });

  it('parses a UK number correctly', () => {
    const result = parsePhoneNumber('+447911123456');
    expect(result).toEqual({ countryCode: 'GB', localDigits: '7911123456' });
  });

  it('matches the longest dial code first (IL +972 over AE +971)', () => {
    const result = parsePhoneNumber('+9721234567');
    expect(result).toEqual({ countryCode: 'IL', localDigits: '1234567' });
  });

  it('parses a Czech number with three-digit dial code', () => {
    const result = parsePhoneNumber('+420123456789');
    expect(result).toEqual({ countryCode: 'CZ', localDigits: '123456789' });
  });

  it('returns null countryCode for unrecognized dial code', () => {
    const result = parsePhoneNumber('+9991234567');
    expect(result.countryCode).toBeNull();
    expect(result.localDigits).toBe('9991234567');
  });

  it('returns null countryCode and empty localDigits for null input', () => {
    const result = parsePhoneNumber(null);
    expect(result).toEqual({ countryCode: null, localDigits: '' });
  });

  it('returns null countryCode and empty localDigits for empty string', () => {
    const result = parsePhoneNumber('');
    expect(result).toEqual({ countryCode: null, localDigits: '' });
  });
});

describe('detectCountry', () => {
  it('defaults to US when no timezone or language info is available', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      resolvedOptions: () => ({ timeZone: 'UTC' }),
    }));
    Object.defineProperty(navigator, 'language', {
      value: 'en',
      configurable: true,
    });

    const result = detectCountry();
    expect(result).toBe('US');

    vi.restoreAllMocks();
  });

  it('detects a European country from timezone', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      resolvedOptions: () => ({ timeZone: 'Europe/Berlin' }),
    }));
    Object.defineProperty(navigator, 'language', {
      value: 'de-DE',
      configurable: true,
    });

    const result = detectCountry();
    expect(result).toBe('DE');

    vi.restoreAllMocks();
  });
});

describe('getCountryByCode', () => {
  it('returns the US country object for code "US"', () => {
    const us = getCountryByCode('US');
    expect(us.code).toBe('US');
    expect(us.dial).toBe('+1');
  });

  it('returns the GB country object for code "GB"', () => {
    const gb = getCountryByCode('GB');
    expect(gb.code).toBe('GB');
    expect(gb.dial).toBe('+44');
  });

  it('returns the first country (fallback) for an unknown code', () => {
    const fallback = getCountryByCode('ZZ');
    expect(fallback).toEqual(COUNTRIES[0]);
  });

  it('returns the first country (fallback) for undefined input', () => {
    const fallback = getCountryByCode(undefined);
    expect(fallback).toEqual(COUNTRIES[0]);
  });
});

describe('COUNTRIES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(COUNTRIES)).toBe(true);
    expect(COUNTRIES.length).toBeGreaterThan(0);
  });

  it('contains expected country codes', () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(codes).toContain('US');
    expect(codes).toContain('GB');
    expect(codes).toContain('DE');
    expect(codes).toContain('TR');
    expect(codes).toContain('PL');
    expect(codes).toContain('IT');
    expect(codes).toContain('ES');
    expect(codes).toContain('FR');
    expect(codes).toContain('CZ');
    expect(codes).toContain('IL');
    expect(codes).toContain('AE');
  });

  it('each country has the required properties', () => {
    for (const country of COUNTRIES) {
      expect(country).toHaveProperty('code');
      expect(country).toHaveProperty('dial');
      expect(country).toHaveProperty('flag');
      expect(country).toHaveProperty('mask');
      expect(country).toHaveProperty('digits');
      expect(country).toHaveProperty('minDigits');
      expect(country.dial).toMatch(/^\+\d+$/);
    }
  });
});
