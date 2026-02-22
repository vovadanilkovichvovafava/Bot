/**
 * Advertisers configuration by region
 * Localized partner bookmaker with region-specific bonuses, currencies, and amounts
 */

// Base partner link (tracker URL)
const PARTNER_LINK = 'https://siteofficialred.com/KnSQ1M';

/**
 * Format amount with currency symbol
 * EUR regions: symbol after number (10 €)
 * PLN: symbol after number (10 zł)
 */
export function formatAmount(amount, currency, { showPlus = false, decimals = 2 } = {}) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const formatted = num % 1 === 0 ? num.toString() : num.toFixed(decimals);
  const prefix = showPlus && num > 0 ? '+' : '';
  // Currency after number for EUR/PLN style
  return `${prefix}${formatted} ${currency}`;
}

// Region-specific configurations
const ADVERTISERS_CONFIG = {
  // Italy - Euro
  IT: {
    name: 'partner',
    bonus: 'Bonus fino a 1.500 €',
    bonusShort: '1.500 €',
    bonusAmount: '1.500 €',
    currency: '€',
    currencyCode: 'EUR',
    minDeposit: '1 €',
    link: PARTNER_LINK,
    locale: 'it',
    // Quick bet amounts for calculators and bet modals
    quickAmounts: [5, 10, 25, 50, 100],
    // Deposit step amounts for BookmakerPromo
    depositAmounts: ['5 €', '20 €', '50 €', '100 €+'],
    // Example profit amounts for BookmakerPromo comparisons
    exampleAmounts: {
      ourOdds: 1.45,
      bet365Odds: 1.38,
      unibetOdds: 1.36,
      williamHillOdds: 1.40,
      ourProfit: '+72.50 €',
      bet365Profit: '+69.00 €',
      williamHillProfit: '+70.00 €',
      monthlyExtra: '+47 €',
      higherOdds: '0.05',
      sixMonthExtra: '+282 €',
      annualExtra: '564 €',
      monthlyBar: '+47 €',
      sixMonthBar: '+282 €',
      annualBar: '+564 €',
      bonusDisplay: '€1.500',
      minAmount: '5 €',
      profitDiff: '+3.50 €',
    },
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
    currencyCode: 'EUR',
    minDeposit: '1 €',
    link: PARTNER_LINK,
    locale: 'es',
    quickAmounts: [5, 10, 25, 50, 100],
    depositAmounts: ['5 €', '20 €', '50 €', '100 €+'],
    exampleAmounts: {
      ourOdds: 1.45,
      bet365Odds: 1.38,
      unibetOdds: 1.36,
      williamHillOdds: 1.40,
      ourProfit: '+72.50 €',
      bet365Profit: '+69.00 €',
      williamHillProfit: '+70.00 €',
      monthlyExtra: '+47 €',
      higherOdds: '0.05',
      sixMonthExtra: '+282 €',
      annualExtra: '564 €',
      monthlyBar: '+47 €',
      sixMonthBar: '+282 €',
      annualBar: '+564 €',
      bonusDisplay: '€1.500',
      minAmount: '5 €',
      profitDiff: '+3.50 €',
    },
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
    currencyCode: 'EUR',
    minDeposit: '1 €',
    link: PARTNER_LINK,
    locale: 'fr',
    quickAmounts: [5, 10, 25, 50, 100],
    depositAmounts: ['5 €', '20 €', '50 €', '100 €+'],
    exampleAmounts: {
      ourOdds: 1.45,
      bet365Odds: 1.38,
      unibetOdds: 1.36,
      williamHillOdds: 1.40,
      ourProfit: '+72.50 €',
      bet365Profit: '+69.00 €',
      williamHillProfit: '+70.00 €',
      monthlyExtra: '+47 €',
      higherOdds: '0.05',
      sixMonthExtra: '+282 €',
      annualExtra: '564 €',
      monthlyBar: '+47 €',
      sixMonthBar: '+282 €',
      annualBar: '+564 €',
      bonusDisplay: '€1.500',
      minAmount: '5 €',
      profitDiff: '+3.50 €',
    },
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
  // Germany - Euro
  DE: {
    name: 'partner',
    bonus: 'Bonus bis zu 1.500 €',
    bonusShort: '1.500 €',
    bonusAmount: '1.500 €',
    currency: '€',
    currencyCode: 'EUR',
    minDeposit: '1 €',
    link: PARTNER_LINK,
    locale: 'de',
    quickAmounts: [5, 10, 25, 50, 100],
    depositAmounts: ['5 €', '20 €', '50 €', '100 €+'],
    exampleAmounts: {
      ourOdds: 1.45,
      bet365Odds: 1.38,
      unibetOdds: 1.36,
      williamHillOdds: 1.40,
      ourProfit: '+72,50 €',
      bet365Profit: '+69,00 €',
      williamHillProfit: '+70,00 €',
      monthlyExtra: '+47 €',
      higherOdds: '0,05',
      sixMonthExtra: '+282 €',
      annualExtra: '564 €',
      monthlyBar: '+47 €',
      sixMonthBar: '+282 €',
      annualBar: '+564 €',
      bonusDisplay: '€1.500',
      minAmount: '5 €',
      profitDiff: '+3,50 €',
    },
    texts: {
      freeBet: 'Gratiswette bis zu 1.500 €',
      betOnMatch: 'Wetten Sie auf jedes Spiel',
      ctaButton: '1.500 € erhalten',
      promoTitle: '1.500 € Gratiswette auf dieses Spiel!',
      promoCta: 'Wette platzieren',
      promoCtaFree: 'Gratiswette platzieren',
      bonusButton: 'Bonus 1.500 €',
      bestBets: 'Beste Wetten',
      useFreeBet: 'Nutze deine Gratiswette und gewinne',
      potentialWin: 'Gewinn',
      freeBetLabel: 'Gratiswette',
      betAndTakeIt: 'Jetzt nutzen!',
    },
  },
  // Poland - PLN (Zloty)
  PL: {
    name: 'partner',
    bonus: 'Bonus do 6.000 zł',
    bonusShort: '6.000 zł',
    bonusAmount: '6.000 zł',
    currency: 'zł',
    currencyCode: 'PLN',
    minDeposit: '5 zł',
    link: PARTNER_LINK,
    locale: 'pl',
    // PLN amounts (~4x EUR equivalent)
    quickAmounts: [20, 50, 100, 200, 500],
    depositAmounts: ['20 zł', '100 zł', '200 zł', '500 zł+'],
    exampleAmounts: {
      ourOdds: 1.45,
      bet365Odds: 1.38,
      unibetOdds: 1.36,
      williamHillOdds: 1.40,
      ourProfit: '+290 zł',
      bet365Profit: '+276 zł',
      williamHillProfit: '+280 zł',
      monthlyExtra: '+188 zł',
      higherOdds: '0,05',
      sixMonthExtra: '+1.128 zł',
      annualExtra: '2.256 zł',
      monthlyBar: '+188 zł',
      sixMonthBar: '+1.128 zł',
      annualBar: '+2.256 zł',
      bonusDisplay: '6.000 zł',
      minAmount: '20 zł',
      profitDiff: '+14 zł',
    },
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
    currencyCode: 'EUR',
    minDeposit: '€1',
    link: PARTNER_LINK,
    locale: 'en',
    quickAmounts: [5, 10, 25, 50, 100],
    depositAmounts: ['€5', '€20', '€50', '€100+'],
    exampleAmounts: {
      ourOdds: 1.45,
      bet365Odds: 1.38,
      unibetOdds: 1.36,
      williamHillOdds: 1.40,
      ourProfit: '+€72.50',
      bet365Profit: '+€69.00',
      williamHillProfit: '+€70.00',
      monthlyExtra: '+€47',
      higherOdds: '0.05',
      sixMonthExtra: '+€282',
      annualExtra: '€564',
      monthlyBar: '+€47',
      sixMonthBar: '+€282',
      annualBar: '+€564',
      bonusDisplay: '€1,500',
      minAmount: '€5',
      profitDiff: '+€3.50',
    },
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
  DE: ADVERTISERS_CONFIG.DE,
  AT: ADVERTISERS_CONFIG.DE,  // Austria → German config
  CH: ADVERTISERS_CONFIG.DE,  // Switzerland → German config
  // All other countries use EUR config
  GB: ADVERTISERS_CONFIG.EUR,
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
