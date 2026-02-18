// Country phone data: code, dial code, flag emoji, format pattern, max digits, min digits (without code)
const COUNTRIES = [
  { code: 'US', dial: '+1', flag: '\u{1F1FA}\u{1F1F8}', mask: '(___) ___-____', digits: 10, minDigits: 10 },
  { code: 'GB', dial: '+44', flag: '\u{1F1EC}\u{1F1E7}', mask: '(____) ______', digits: 10, minDigits: 7 },
  { code: 'DE', dial: '+49', flag: '\u{1F1E9}\u{1F1EA}', mask: '(___) ________', digits: 11, minDigits: 7 },
  { code: 'TR', dial: '+90', flag: '\u{1F1F9}\u{1F1F7}', mask: '(___) ___-__-__', digits: 10, minDigits: 10 },
  { code: 'PL', dial: '+48', flag: '\u{1F1F5}\u{1F1F1}', mask: '(___) ___-___', digits: 9, minDigits: 9 },
  { code: 'IT', dial: '+39', flag: '\u{1F1EE}\u{1F1F9}', mask: '(___) ___-____', digits: 10, minDigits: 9 },
  { code: 'ES', dial: '+34', flag: '\u{1F1EA}\u{1F1F8}', mask: '(___) ___-___', digits: 9, minDigits: 9 },
  { code: 'FR', dial: '+33', flag: '\u{1F1EB}\u{1F1F7}', mask: '(_ __) __-__-__', digits: 9, minDigits: 9 },
  { code: 'CZ', dial: '+420', flag: '\u{1F1E8}\u{1F1FF}', mask: '(___) ___-___', digits: 9, minDigits: 9 },
  { code: 'IL', dial: '+972', flag: '\u{1F1EE}\u{1F1F1}', mask: '(__) ___-__-__', digits: 9, minDigits: 7 },
  { code: 'AE', dial: '+971', flag: '\u{1F1E6}\u{1F1EA}', mask: '(__) ___-____', digits: 9, minDigits: 7 },
];

// Get only digits from string
export function onlyDigits(str) {
  return str.replace(/\D/g, '');
}

// Format phone number with mask
export function formatPhone(digits, mask) {
  let result = '';
  let digitIdx = 0;
  for (let i = 0; i < mask.length && digitIdx < digits.length; i++) {
    if (mask[i] === '_') {
      result += digits[digitIdx++];
    } else {
      result += mask[i];
    }
  }
  return result;
}

// Validate phone number length (use minDigits for flexible validation)
export function isValidPhone(digits, country) {
  if (!country) return digits.length >= 7;
  const min = country.minDigits || country.digits;
  return digits.length >= min && digits.length <= country.digits;
}

// Build full phone number with dial code
export function fullPhoneNumber(digits, country) {
  return country.dial + digits;
}

// Parse full phone number (e.g. "+11234567890") into { countryCode, localDigits }
// Matches longest dial code first (e.g. +972 before +9)
export function parsePhoneNumber(fullPhone) {
  if (!fullPhone) return { countryCode: null, localDigits: '' };
  const digits = fullPhone.replace(/\D/g, '');
  const withPlus = fullPhone.startsWith('+') ? fullPhone : '+' + fullPhone;

  // Sort countries by dial code length descending to match longest first
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const country of sorted) {
    if (withPlus.startsWith(country.dial)) {
      const local = withPlus.slice(country.dial.length).replace(/\D/g, '');
      return { countryCode: country.code, localDigits: local };
    }
  }

  // No match — return all digits as local
  return { countryCode: null, localDigits: digits };
}

// Try to detect country from timezone/locale
export function detectCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = navigator.language || '';

    if (tz.startsWith('America/') && lang.startsWith('en'))
      return 'US';
    if (tz.startsWith('Europe/London'))
      return 'GB';
    if (tz.startsWith('Europe/Berlin'))
      return 'DE';
    if (tz.startsWith('Europe/Istanbul'))
      return 'TR';
    if (tz.startsWith('Europe/Warsaw'))
      return 'PL';
    if (tz.startsWith('Europe/Rome'))
      return 'IT';
    if (tz.startsWith('Europe/Madrid'))
      return 'ES';
    if (tz.startsWith('Europe/Paris'))
      return 'FR';
    if (tz.startsWith('Europe/Prague'))
      return 'CZ';
    if (tz.startsWith('Asia/Jerusalem') || tz.startsWith('Asia/Tel_Aviv'))
      return 'IL';
    if (tz.startsWith('Asia/Dubai'))
      return 'AE';
  } catch {}

  return 'US'; // default
}

export function getCountryByCode(code) {
  return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
}

export { COUNTRIES };
