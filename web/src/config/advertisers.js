/**
 * Advertisers configuration by region
 * Localized partner bookmaker with region-specific bonuses and currencies
 */

// Base partner link
const PARTNER_LINK = 'https://1wtmvf.live/?p=m2zy';

// Region-specific configurations
const ADVERTISERS_CONFIG = {
  // Italy - Euro
  IT: {
    name: 'partner',
    bonus: 'Bonus fino a 1.500 €',
    bonusShort: '1.500 €',
    bonusAmount: '1.500 €',
    currency: '€',
    minDeposit: '1 €',
    link: PARTNER_LINK,
    locale: 'it',
    texts: {
      freeBet: 'Scommessa gratuita fino a 1.500 €',
      betOnMatch: 'Scommetti su qualsiasi partita',
      ctaButton: 'Ottieni 1.500 €',
      promoTitle: '1.500 € scommessa gratuita su questa partita!',
      promoCta: 'Piazza la scommessa',
      promoCtaFree: 'Piazza scommessa gratuita',
    },
  },
  // Germany - Euro
  DE: {
    name: 'partner',
    bonus: 'Bonus bis zu 1.500 €',
    bonusShort: '1.500 €',
    bonusAmount: '1.500 €',
    currency: '€',
    minDeposit: '1 €',
    link: PARTNER_LINK,
    locale: 'de',
    texts: {
      freeBet: 'Gratiswette bis zu 1.500 €',
      betOnMatch: 'Wette auf jedes Spiel',
      ctaButton: '1.500 € erhalten',
      promoTitle: '1.500 € Gratiswette auf dieses Spiel!',
      promoCta: 'Wette platzieren',
      promoCtaFree: 'Gratiswette platzieren',
    },
  },
  // Poland - PLN (Zloty)
  PL: {
    name: 'partner',
    bonus: 'Bonus do 6.000 zł',
    bonusShort: '6.000 zł',
    bonusAmount: '6.000 zł',
    currency: 'zł',
    minDeposit: '5 zł',
    link: PARTNER_LINK,
    locale: 'pl',
    texts: {
      freeBet: 'Darmowy zakład do 6.000 zł',
      betOnMatch: 'Obstawiaj dowolny mecz',
      ctaButton: 'Odbierz 6.000 zł',
      promoTitle: '6.000 zł darmowy zakład na ten mecz!',
      promoCta: 'Postaw zakład',
      promoCtaFree: 'Postaw darmowy zakład',
    },
  },
  // Russia - RUB (default Russian text)
  RU: {
    name: 'partner',
    bonus: 'Бонус до 500%',
    bonusShort: '500%',
    bonusAmount: '500%',
    currency: '₽',
    minDeposit: '100 ₽',
    link: PARTNER_LINK,
    locale: 'ru',
    texts: {
      freeBet: 'Бесплатная ставка до 1500 €',
      betOnMatch: 'Ставь на любой матч',
      ctaButton: 'Получить бонус',
      promoTitle: '1500 € бесплатная ставка на этот матч!',
      promoCta: 'Сделать ставку',
      promoCtaFree: 'Сделать бесплатную ставку',
    },
  },
  // UK - GBP
  GB: {
    name: 'partner',
    bonus: 'Bonus up to £1,500',
    bonusShort: '£1,500',
    bonusAmount: '£1,500',
    currency: '£',
    minDeposit: '£1',
    link: PARTNER_LINK,
    locale: 'en',
    texts: {
      freeBet: 'Free bet up to £1,500',
      betOnMatch: 'Bet on any match',
      ctaButton: 'Get £1,500',
      promoTitle: '£1,500 free bet on this match!',
      promoCta: 'Place bet',
      promoCtaFree: 'Place free bet',
    },
  },
  // Default for other Euro countries
  EUR: {
    name: 'partner',
    bonus: 'Bonus up to €1,500',
    bonusShort: '€1,500',
    bonusAmount: '€1,500',
    currency: '€',
    minDeposit: '€1',
    link: PARTNER_LINK,
    locale: 'en',
    texts: {
      freeBet: 'Free bet up to €1,500',
      betOnMatch: 'Bet on any match',
      ctaButton: 'Get €1,500',
      promoTitle: '€1,500 free bet on this match!',
      promoCta: 'Place bet',
      promoCtaFree: 'Place free bet',
    },
  },
};

// Map countries to their configs
export const ADVERTISERS = {
  IT: ADVERTISERS_CONFIG.IT,
  DE: ADVERTISERS_CONFIG.DE,
  PL: ADVERTISERS_CONFIG.PL,
  RU: ADVERTISERS_CONFIG.RU,
  GB: ADVERTISERS_CONFIG.GB,
  // Other Euro countries use EUR config
  FR: ADVERTISERS_CONFIG.EUR,
  ES: ADVERTISERS_CONFIG.EUR,
  PT: ADVERTISERS_CONFIG.EUR,
  UA: ADVERTISERS_CONFIG.RU,
  KZ: ADVERTISERS_CONFIG.RU,
  BY: ADVERTISERS_CONFIG.RU,
  // Rest of world uses EUR
  BR: ADVERTISERS_CONFIG.EUR,
  MX: ADVERTISERS_CONFIG.EUR,
  AR: ADVERTISERS_CONFIG.EUR,
  IN: ADVERTISERS_CONFIG.EUR,
  PH: ADVERTISERS_CONFIG.EUR,
  NG: ADVERTISERS_CONFIG.EUR,
  KE: ADVERTISERS_CONFIG.EUR,
  ZA: ADVERTISERS_CONFIG.EUR,
};

// Default fallback for unknown regions
export const DEFAULT_ADVERTISER = ADVERTISERS_CONFIG.EUR;

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
