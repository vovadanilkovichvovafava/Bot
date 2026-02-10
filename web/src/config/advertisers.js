/**
 * Advertisers configuration by region
 * Each region can have its own bookmaker partner
 */

export const ADVERTISERS = {
  // CIS countries
  RU: {
    name: '1xBet',
    bonus: '100% up to $100',
    minDeposit: '$10',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
  UA: {
    name: 'Parimatch',
    bonus: '100% up to 3000 UAH',
    minDeposit: '100 UAH',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
  KZ: {
    name: '1xBet',
    bonus: '100% up to 50000 KZT',
    minDeposit: '500 KZT',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
  BY: {
    name: '1xBet',
    bonus: '100% up to 200 BYN',
    minDeposit: '5 BYN',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },

  // Europe
  DE: {
    name: 'Bet365',
    bonus: 'Up to 100 EUR in Bet Credits',
    minDeposit: '10 EUR',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
  GB: {
    name: 'Bet365',
    bonus: 'Up to 50 GBP in Bet Credits',
    minDeposit: '10 GBP',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
  FR: {
    name: 'Unibet',
    bonus: '100 EUR Free Bet',
    minDeposit: '10 EUR',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
  ES: {
    name: 'Betway',
    bonus: 'Up to 100 EUR',
    minDeposit: '10 EUR',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
  IT: {
    name: 'Betway',
    bonus: 'Up to 100 EUR',
    minDeposit: '10 EUR',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
  PT: {
    name: 'Betano',
    bonus: '100% up to 50 EUR',
    minDeposit: '10 EUR',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
  PL: {
    name: 'Fortuna',
    bonus: '100% up to 500 PLN',
    minDeposit: '20 PLN',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },

  // LATAM
  BR: {
    name: 'Betano',
    bonus: '100% up to R$500',
    minDeposit: 'R$20',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
  MX: {
    name: 'Caliente',
    bonus: '100% up to $3000 MXN',
    minDeposit: '$100 MXN',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
  AR: {
    name: 'Betsson',
    bonus: '100% up to $10000 ARS',
    minDeposit: '$500 ARS',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },

  // Asia
  IN: {
    name: '1xBet',
    bonus: '100% up to 10000 INR',
    minDeposit: '100 INR',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
  PH: {
    name: '22Bet',
    bonus: '100% up to 5000 PHP',
    minDeposit: '100 PHP',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },

  // Africa
  NG: {
    name: 'Bet9ja',
    bonus: '100% up to 100000 NGN',
    minDeposit: '100 NGN',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
  KE: {
    name: 'Betway',
    bonus: '50% up to 5000 KES',
    minDeposit: '50 KES',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
  ZA: {
    name: 'Betway',
    bonus: 'R1000 Free Bet',
    minDeposit: 'R10',
    link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
  },
};

// Default fallback for unknown regions
export const DEFAULT_ADVERTISER = {
  name: '1xBet',
  bonus: '100% Welcome Bonus',
  minDeposit: '$10',
  link: 'https://refpa.top/L?tag=your_tag&site=your_site&ad=your_ad',
};

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
