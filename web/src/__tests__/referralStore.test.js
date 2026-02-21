import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReferralLink, getReferredBy, clearReferralCode } from '../services/referralStore';

describe('referralStore', () => {
  let sessionStorageMock;

  beforeEach(() => {
    vi.restoreAllMocks();

    sessionStorageMock = {};
    vi.spyOn(window, 'sessionStorage', 'get').mockReturnValue({
      getItem: vi.fn((key) => sessionStorageMock[key] ?? null),
      setItem: vi.fn((key, value) => {
        sessionStorageMock[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete sessionStorageMock[key];
      }),
    });

    Object.defineProperty(window, 'location', {
      writable: true,
      value: { origin: 'https://example.com', search: '' },
    });
  });

  describe('getReferralLink', () => {
    it('should return a referral link containing the given code', () => {
      const link = getReferralLink('ABC123');
      expect(link).toContain('/register?ref=ABC123');
    });

    it('should use window.location.origin as the base URL', () => {
      const link = getReferralLink('ABC123');
      expect(link).toBe('https://example.com/register?ref=ABC123');
    });

    it('should handle different referral codes correctly', () => {
      const link = getReferralLink('XYZ789');
      expect(link).toBe('https://example.com/register?ref=XYZ789');
    });
  });

  describe('getReferredBy', () => {
    it('should return the ref code from the URL search params', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { origin: 'https://example.com', search: '?ref=ABC123' },
      });

      const result = getReferredBy();
      expect(result).toBe('ABC123');
    });

    it('should store the ref code in sessionStorage when found in URL', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { origin: 'https://example.com', search: '?ref=ABC123' },
      });

      getReferredBy();
      expect(sessionStorage.setItem).toHaveBeenCalledWith('referral_code', 'ABC123');
    });

    it('should return the stored value from sessionStorage when no URL param is present', () => {
      sessionStorageMock['referral_code'] = 'STORED456';

      Object.defineProperty(window, 'location', {
        writable: true,
        value: { origin: 'https://example.com', search: '' },
      });

      const result = getReferredBy();
      expect(result).toBe('STORED456');
    });

    it('should return null when no URL param and no sessionStorage value exist', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { origin: 'https://example.com', search: '' },
      });

      const result = getReferredBy();
      expect(result).toBeNull();
    });

    it('should prefer URL param over sessionStorage value', () => {
      sessionStorageMock['referral_code'] = 'OLD_CODE';

      Object.defineProperty(window, 'location', {
        writable: true,
        value: { origin: 'https://example.com', search: '?ref=NEW_CODE' },
      });

      const result = getReferredBy();
      expect(result).toBe('NEW_CODE');
      expect(sessionStorage.setItem).toHaveBeenCalledWith('referral_code', 'NEW_CODE');
    });
  });

  describe('clearReferralCode', () => {
    it('should remove referral_code from sessionStorage', () => {
      sessionStorageMock['referral_code'] = 'ABC123';

      clearReferralCode();
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('referral_code');
    });

    it('should result in null when getting referral_code after clearing', () => {
      sessionStorageMock['referral_code'] = 'ABC123';

      clearReferralCode();
      expect(sessionStorage.getItem('referral_code')).toBeNull();
    });
  });
});
