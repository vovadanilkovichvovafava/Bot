/**
 * Advertisers configuration by region
 * Localized partner bookmaker with region-specific bonuses, currencies, and amounts
 */

import { ENV } from './env';

// Base partner link (tracker URL) — configurable via env for multi-domain deployments
const PARTNER_LINK = ENV.OFFER_URL;

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
    bonus: 'Bonus fino a 100 €',
    bonusShort: '100 €',
    bonusAmount: '100 €',
    currency: '€',
    currencyCode: 'EUR',
    minDeposit: '1 €',
    link: PARTNER_LINK,
    locale: 'it',
    // Quick bet amounts for calculators and bet modals
    quickAmounts: [5, 10, 25, 50, 100],
    // Deposit step amounts for ProAccess deposit grid
    depositAmounts: ['50 €', '100 €', '300 €', '500 €'],
    // Bonus amounts shown on deposit grid
    bonusAmounts: ['75 €', '150 €', '450 €', '750 €'],
    // Bonus calculator tiers for ProAccess step 4
    calcTiers: [
      { dep: '€50',  bonus: '€75',   total: '€125',  months: 1 },
      { dep: '€100', bonus: '€150',  total: '€250',  months: 2 },
      { dep: '€300', bonus: '€450',  total: '€750',  months: 5 },
      { dep: '€500', bonus: '€750',  total: '€1.250', months: 8 },
    ],
    calcMaxBonus: '€750',
    calcBonusPercent: '+150%',
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
      bonusDisplay: '€100',
      minAmount: '5 €',
      profitDiff: '+3.50 €',
    },
    // Bonus banner amounts (funnel-2)
    freeBetAmount: 100,
    depositAmount: 50,
    bonusBanner: { deposit: '€50', bonus: '€100', total: '€150' },
    texts: {
      freeBet: 'Scommessa gratuita da 100 euro',
      betOnMatch: 'Scommetti su qualsiasi partita',
      ctaButton: 'Scommessa gratuita da 100 euro',
      promoTitle: 'Scommessa gratuita da 100 euro',
      promoCta: 'Piazza la scommessa',
      promoCtaFree: 'Piazza scommessa gratuita',
      bonusButton: 'Scommessa gratuita da 100 euro',
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
    bonus: 'Bono hasta 100 €',
    bonusShort: '100 €',
    bonusAmount: '100 €',
    currency: '€',
    currencyCode: 'EUR',
    minDeposit: '1 €',
    link: PARTNER_LINK,
    locale: 'es',
    quickAmounts: [5, 10, 25, 50, 100],
    depositAmounts: ['50 €', '100 €', '300 €', '500 €'],
    bonusAmounts: ['75 €', '150 €', '450 €', '750 €'],
    calcTiers: [
      { dep: '€50',  bonus: '€75',   total: '€125',  months: 1 },
      { dep: '€100', bonus: '€150',  total: '€250',  months: 2 },
      { dep: '€300', bonus: '€450',  total: '€750',  months: 5 },
      { dep: '€500', bonus: '€750',  total: '€1.250', months: 8 },
    ],
    calcMaxBonus: '€750',
    calcBonusPercent: '+150%',
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
      bonusDisplay: '€100',
      minAmount: '5 €',
      profitDiff: '+3.50 €',
    },
    freeBetAmount: 100,
    depositAmount: 50,
    bonusBanner: { deposit: '€50', bonus: '€100', total: '€150' },
    texts: {
      freeBet: 'Apuesta gratuita de 100 euros',
      betOnMatch: 'Apuesta en cualquier partido',
      ctaButton: 'Apuesta gratuita de 100 euros',
      promoTitle: 'Apuesta gratuita de 100 euros',
      promoCta: 'Realizar apuesta',
      promoCtaFree: 'Realizar apuesta gratuita',
      bonusButton: 'Apuesta gratuita de 100 euros',
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
    bonus: 'Bonus jusqu\'à 100 €',
    bonusShort: '100 €',
    bonusAmount: '100 €',
    currency: '€',
    currencyCode: 'EUR',
    minDeposit: '1 €',
    link: PARTNER_LINK,
    locale: 'fr',
    quickAmounts: [5, 10, 25, 50, 100],
    depositAmounts: ['50 €', '100 €', '300 €', '500 €'],
    bonusAmounts: ['75 €', '150 €', '450 €', '750 €'],
    calcTiers: [
      { dep: '€50',  bonus: '€75',   total: '€125',  months: 1 },
      { dep: '€100', bonus: '€150',  total: '€250',  months: 2 },
      { dep: '€300', bonus: '€450',  total: '€750',  months: 5 },
      { dep: '€500', bonus: '€750',  total: '€1.250', months: 8 },
    ],
    calcMaxBonus: '€750',
    calcBonusPercent: '+150%',
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
      bonusDisplay: '€100',
      minAmount: '5 €',
      profitDiff: '+3.50 €',
    },
    freeBetAmount: 100,
    depositAmount: 50,
    bonusBanner: { deposit: '€50', bonus: '€100', total: '€150' },
    texts: {
      freeBet: 'Pari gratuit de 100 euros',
      betOnMatch: 'Pariez sur n\'importe quel match',
      ctaButton: 'Pari gratuit de 100 euros',
      promoTitle: 'Pari gratuit de 100 euros',
      promoCta: 'Placer le pari',
      promoCtaFree: 'Placer un pari gratuit',
      bonusButton: 'Pari gratuit de 100 euros',
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
    bonus: 'Bonus bis zu 100 €',
    bonusShort: '100 €',
    bonusAmount: '100 €',
    currency: '€',
    currencyCode: 'EUR',
    minDeposit: '1 €',
    link: PARTNER_LINK,
    locale: 'de',
    quickAmounts: [5, 10, 25, 50, 100],
    depositAmounts: ['50 €', '100 €', '300 €', '500 €'],
    bonusAmounts: ['75 €', '150 €', '450 €', '750 €'],
    calcTiers: [
      { dep: '€50',  bonus: '€75',   total: '€125',  months: 1 },
      { dep: '€100', bonus: '€150',  total: '€250',  months: 2 },
      { dep: '€300', bonus: '€450',  total: '€750',  months: 5 },
      { dep: '€500', bonus: '€750',  total: '€1.250', months: 8 },
    ],
    calcMaxBonus: '€750',
    calcBonusPercent: '+150%',
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
      bonusDisplay: '€100',
      minAmount: '5 €',
      profitDiff: '+3,50 €',
    },
    freeBetAmount: 100,
    depositAmount: 50,
    bonusBanner: { deposit: '€50', bonus: '€100', total: '€150' },
    texts: {
      freeBet: 'Kostenlose Wette 100 Euro',
      betOnMatch: 'Wetten Sie auf jedes Spiel',
      ctaButton: 'Kostenlose Wette 100 Euro',
      promoTitle: 'Kostenlose Wette 100 Euro',
      promoCta: 'Wette platzieren',
      promoCtaFree: 'Gratiswette platzieren',
      bonusButton: 'Kostenlose Wette 100 Euro',
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
    bonus: 'Bonus do 320 zł',
    bonusShort: '320 zł',
    bonusAmount: '320 zł',
    currency: 'zł',
    currencyCode: 'PLN',
    minDeposit: '5 zł',
    link: PARTNER_LINK,
    locale: 'pl',
    // PLN amounts (~4x EUR equivalent)
    quickAmounts: [20, 50, 100, 200, 500],
    depositAmounts: ['200 zł', '400 zł', '1.200 zł', '2.000 zł'],
    bonusAmounts: ['300 zł', '600 zł', '1.800 zł', '3.000 zł'],
    calcTiers: [
      { dep: '200 zł',   bonus: '300 zł',   total: '500 zł',   months: 1 },
      { dep: '400 zł',   bonus: '600 zł',   total: '1.000 zł', months: 2 },
      { dep: '1.200 zł', bonus: '1.800 zł', total: '3.000 zł', months: 5 },
      { dep: '2.000 zł', bonus: '3.000 zł', total: '5.000 zł', months: 8 },
    ],
    calcMaxBonus: '3.000 zł',
    calcBonusPercent: '+150%',
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
      bonusDisplay: '320 zł',
      minAmount: '20 zł',
      profitDiff: '+14 zł',
    },
    freeBetAmount: 320,
    depositAmount: 200,
    bonusBanner: { deposit: '200 zł', bonus: '320 zł', total: '520 zł' },
    texts: {
      freeBet: 'Zakład za darmo 320 złotych',
      betOnMatch: 'Obstawiaj dowolny mecz',
      ctaButton: 'Zakład za darmo 320 złotych',
      promoTitle: 'Zakład za darmo 320 złotych',
      promoCta: 'Postaw zakład',
      promoCtaFree: 'Postaw darmowy zakład',
      bonusButton: 'Zakład za darmo 320 złotych',
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
    bonus: 'Bonus up to €100',
    bonusShort: '€100',
    bonusAmount: '€100',
    currency: '€',
    currencyCode: 'EUR',
    minDeposit: '€1',
    link: PARTNER_LINK,
    locale: 'en',
    quickAmounts: [5, 10, 25, 50, 100],
    depositAmounts: ['€50', '€100', '€300', '€500'],
    bonusAmounts: ['€75', '€150', '€450', '€750'],
    calcTiers: [
      { dep: '€50',  bonus: '€75',   total: '€125',  months: 1 },
      { dep: '€100', bonus: '€150',  total: '€250',  months: 2 },
      { dep: '€300', bonus: '€450',  total: '€750',  months: 5 },
      { dep: '€500', bonus: '€750',  total: '€1,250', months: 8 },
    ],
    calcMaxBonus: '€750',
    calcBonusPercent: '+150%',
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
      bonusDisplay: '€100',
      minAmount: '€5',
      profitDiff: '+€3.50',
    },
    freeBetAmount: 100,
    depositAmount: 50,
    bonusBanner: { deposit: '€50', bonus: '€100', total: '€150' },
    texts: {
      freeBet: 'Free bet of €100',
      betOnMatch: 'Bet on any match',
      ctaButton: 'Free bet of €100',
      promoTitle: 'Free bet of €100',
      promoCta: 'Place bet',
      promoCtaFree: 'Place free bet',
      bonusButton: 'Free bet of €100',
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
