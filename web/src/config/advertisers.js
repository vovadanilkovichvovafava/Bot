/**
 * Advertisers configuration by region
 * Localized partner bookmaker with region-specific bonuses and currencies
 */

// Base partner link (tracker URL)
const PARTNER_LINK = 'https://siteofficialred.com/KnSQ1M';

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
      bonusButton: 'Bonus 1.500 €',
      bestBets: 'Migliori scommesse',
      useFreeBet: 'Usa la scommessa gratuita e vinci',
      potentialWin: 'Vincita',
      freeBetLabel: 'Scommessa gratuita',
      betAndTakeIt: 'Usalo subito!',
    },
  },
  // Spain - Euro
  ES: {
    name: 'partner',
    bonus: 'Bono hasta 1.500 €',
    bonusShort: '1.500 €',
    bonusAmount: '1.500 €',
    currency: '€',
    minDeposit: '1 €',
    link: PARTNER_LINK,
    locale: 'es',
    texts: {
      freeBet: 'Apuesta gratuita hasta 1.500 €',
      betOnMatch: 'Apuesta en cualquier partido',
      ctaButton: 'Obtener 1.500 €',
      promoTitle: '¡1.500 € apuesta gratuita en este partido!',
      promoCta: 'Realizar apuesta',
      promoCtaFree: 'Realizar apuesta gratuita',
      bonusButton: 'Bono 1.500 €',
      bestBets: 'Mejores apuestas',
      useFreeBet: 'Usa tu apuesta gratuita y gana',
      potentialWin: 'Ganancia',
      freeBetLabel: 'Apuesta gratuita',
      betAndTakeIt: '¡Úsalo ahora!',
    },
  },
  // France - Euro
  FR: {
    name: 'partner',
    bonus: 'Bonus jusqu\'à 1 500 €',
    bonusShort: '1 500 €',
    bonusAmount: '1 500 €',
    currency: '€',
    minDeposit: '1 €',
    link: PARTNER_LINK,
    locale: 'fr',
    texts: {
      freeBet: 'Pari gratuit jusqu\'à 1 500 €',
      betOnMatch: 'Pariez sur n\'importe quel match',
      ctaButton: 'Obtenir 1 500 €',
      promoTitle: '1 500 € pari gratuit sur ce match !',
      promoCta: 'Placer le pari',
      promoCtaFree: 'Placer un pari gratuit',
      bonusButton: 'Bonus 1 500 €',
      bestBets: 'Meilleurs paris',
      useFreeBet: 'Utilisez votre pari gratuit et gagnez',
      potentialWin: 'Gain',
      freeBetLabel: 'Pari gratuit',
      betAndTakeIt: 'Utilisez-le maintenant !',
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
      bonusButton: 'Bonus 6.000 zł',
      bestBets: 'Najlepsze zakłady',
      useFreeBet: 'Użyj darmowego zakładu i wygraj',
      potentialWin: 'Wygrana',
      freeBetLabel: 'Darmowy zakład',
      betAndTakeIt: 'Użyj go teraz!',
    },
  },
  // Default for all other regions - English, Euro
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
      bonusButton: '€1,500 Bonus',
      bestBets: 'Best bets',
      useFreeBet: 'Use your free bet and win',
      potentialWin: 'Win',
      freeBetLabel: 'Free bet',
      betAndTakeIt: 'Use it right now!',
    },
  },
};

// Map countries to their configs
export const ADVERTISERS = {
  IT: ADVERTISERS_CONFIG.IT,
  ES: ADVERTISERS_CONFIG.ES,
  FR: ADVERTISERS_CONFIG.FR,
  PL: ADVERTISERS_CONFIG.PL,
  // All other countries use EUR config (€1,500)
  GB: ADVERTISERS_CONFIG.EUR,
  DE: ADVERTISERS_CONFIG.EUR,
  RU: ADVERTISERS_CONFIG.EUR,
  UA: ADVERTISERS_CONFIG.EUR,
  KZ: ADVERTISERS_CONFIG.EUR,
  BY: ADVERTISERS_CONFIG.EUR,
  PT: ADVERTISERS_CONFIG.EUR,
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
