// Country phone data: code, dial code, flag emoji, format pattern, max digits (without code)
const COUNTRIES = [
  { code: 'RU', dial: '+7', flag: '\u{1F1F7}\u{1F1FA}', mask: '(___) ___-__-__', digits: 10 },
  { code: 'UA', dial: '+380', flag: '\u{1F1FA}\u{1F1E6}', mask: '(__) ___-__-__', digits: 9 },
  { code: 'BY', dial: '+375', flag: '\u{1F1E7}\u{1F1FE}', mask: '(__) ___-__-__', digits: 9 },
  { code: 'KZ', dial: '+7', flag: '\u{1F1F0}\u{1F1FF}', mask: '(___) ___-__-__', digits: 10 },
  { code: 'UZ', dial: '+998', flag: '\u{1F1FA}\u{1F1FF}', mask: '(__) ___-__-__', digits: 9 },
  { code: 'GE', dial: '+995', flag: '\u{1F1EC}\u{1F1EA}', mask: '(___) __-__-__', digits: 9 },
  { code: 'AM', dial: '+374', flag: '\u{1F1E6}\u{1F1F2}', mask: '(__) ___-___', digits: 8 },
  { code: 'AZ', dial: '+994', flag: '\u{1F1E6}\u{1F1FF}', mask: '(__) ___-__-__', digits: 9 },
  { code: 'KG', dial: '+996', flag: '\u{1F1F0}\u{1F1EC}', mask: '(___) __-__-__', digits: 9 },
  { code: 'TJ', dial: '+992', flag: '\u{1F1F9}\u{1F1EF}', mask: '(__) ___-__-__', digits: 9 },
  { code: 'MD', dial: '+373', flag: '\u{1F1F2}\u{1F1E9}', mask: '(__) ___-___', digits: 8 },
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

    if (tz.startsWith('Europe/Moscow') || tz.startsWith('Asia/Yekaterinburg') || tz.startsWith('Asia/Novosibirsk') || tz.startsWith('Asia/Krasnoyarsk') || tz.startsWith('Asia/Vladivostok') || tz.startsWith('Europe/Samara') || tz.startsWith('Europe/Volgograd') || lang.startsWith('ru'))
      return 'RU';
    if (tz.startsWith('Europe/Kiev') || tz.startsWith('Europe/Kyiv') || lang.startsWith('uk'))
      return 'UA';
    if (tz.startsWith('Europe/Minsk') || lang.startsWith('be'))
      return 'BY';
    if (tz.startsWith('Asia/Almaty') || tz.startsWith('Asia/Aqtau') || tz.startsWith('Asia/Oral'))
      return 'KZ';
    if (tz.startsWith('Asia/Tashkent'))
      return 'UZ';
    if (tz.startsWith('Asia/Tbilisi'))
      return 'GE';
    if (tz.startsWith('Asia/Yerevan'))
      return 'AM';
    if (tz.startsWith('Asia/Baku'))
      return 'AZ';
    if (tz.startsWith('Asia/Bishkek'))
      return 'KG';
    if (tz.startsWith('Asia/Dushanbe'))
      return 'TJ';
    if (tz.startsWith('Europe/Chisinau'))
      return 'MD';
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

  return 'RU'; // default
}

export function getCountryByCode(code) {
  return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
}

export { COUNTRIES };
