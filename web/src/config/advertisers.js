/**
 * Advertisers configuration by region
 * Generic partner bookmaker without brand names
 */

const GENERIC_PARTNER = {
  name: '1win',
  bonus: 'Бонус до 500%',
  minDeposit: '$1',
  link: 'https://1wtmvf.live/?p=m2zy',
};

export const ADVERTISERS = {
  // All regions use the same generic partner
  RU: { ...GENERIC_PARTNER },
  UA: { ...GENERIC_PARTNER },
  KZ: { ...GENERIC_PARTNER },
  BY: { ...GENERIC_PARTNER },
  DE: { ...GENERIC_PARTNER },
  GB: { ...GENERIC_PARTNER },
  FR: { ...GENERIC_PARTNER },
  ES: { ...GENERIC_PARTNER },
  IT: { ...GENERIC_PARTNER },
  PT: { ...GENERIC_PARTNER },
  PL: { ...GENERIC_PARTNER },
  BR: { ...GENERIC_PARTNER },
  MX: { ...GENERIC_PARTNER },
  AR: { ...GENERIC_PARTNER },
  IN: { ...GENERIC_PARTNER },
  PH: { ...GENERIC_PARTNER },
  NG: { ...GENERIC_PARTNER },
  KE: { ...GENERIC_PARTNER },
  ZA: { ...GENERIC_PARTNER },
};

// Default fallback for unknown regions
export const DEFAULT_ADVERTISER = { ...GENERIC_PARTNER };

/**
 * Get advertiser by country code
 */
export function getAdvertiser(countryCode) {
  return ADVERTISERS[countryCode?.toUpperCase()] || DEFAULT_ADVERTISER;
}

/**
 * Get all supported countries
 */
export function getSupportedCountries() {
  return Object.keys(ADVERTISERS);
}
