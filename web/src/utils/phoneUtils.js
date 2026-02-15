// Country phone data: code, dial code, flag emoji, format pattern, max digits (without code)
const COUNTRIES = [
  { code: 'US', dial: '+1', flag: '\u{1F1FA}\u{1F1F8}', mask: '(___) ___-____', digits: 10 },
  { code: 'GB', dial: '+44', flag: '\u{1F1EC}\u{1F1E7}', mask: '(____) ______', digits: 10 },
  { code: 'DE', dial: '+49', flag: '\u{1F1E9}\u{1F1EA}', mask: '(___) ________', digits: 11 },
  { code: 'TR', dial: '+90', flag: '\u{1F1F9}\u{1F1F7}', mask: '(___) ___-__-__', digits: 10 },
  { code: 'PL', dial: '+48', flag: '\u{1F1F5}\u{1F1F1}', mask: '(___) ___-___', digits: 9 },
  { code: 'IT', dial: '+39', flag: '\u{1F1EE}\u{1F1F9}', mask: '(___) ___-____', digits: 10 },
  { code: 'ES', dial: '+34', flag: '\u{1F1EA}\u{1F1F8}', mask: '(___) ___-___', digits: 9 },
  { code: 'FR', dial: '+33', flag: '\u{1F1EB}\u{1F1F7}', mask: '(_ __) __-__-__', digits: 9 },
  { code: 'CZ', dial: '+420', flag: '\u{1F1E8}\u{1F1FF}', mask: '(___) ___-___', digits: 9 },
  { code: 'IL', dial: '+972', flag: '\u{1F1EE}\u{1F1F1}', mask: '(__) ___-__-__', digits: 9 },
  { code: 'AE', dial: '+971', flag: '\u{1F1E6}\u{1F1EA}', mask: '(__) ___-____', digits: 9 },
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

// Validate phone number length
export function isValidPhone(digits, country) {
  if (!country) return digits.length >= 7;
  return digits.length === country.digits;
}

// Build full phone number with dial code
export function fullPhoneNumber(digits, country) {
  return country.dial + digits;
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
