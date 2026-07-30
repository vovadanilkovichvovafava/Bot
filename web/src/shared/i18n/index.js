import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { countryFromOfferTag } from '../config/geoTag';

// Import translations — supported languages
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import pl from './locales/pl.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import ptBR from './locales/pt-BR.json';

const SUPPORTED_LANGS = ['en', 'es', 'fr', 'it', 'pl', 'de', 'pt', 'pt-BR'];

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  it: { translation: it },
  pl: { translation: pl },
  de: { translation: de },
  pt: { translation: pt },
  // Brazilian Portuguese is NOT interchangeable with the European one: "senha"
  // vs "palavra-passe", "celular" vs "telemóvel", "você" vs "tu". Serving the
  // European file in Brazil immediately reads as a foreign site.
  'pt-BR': { translation: ptBR },
};

// GeoIP → language mapping
// Spain → es, Italy → it, France → fr, Poland → pl
// All other regions → en (fallback)
const COUNTRY_TO_LANG = {
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  FR: 'fr', BE: 'fr',
  IT: 'it',
  PL: 'pl',
  DE: 'de', AT: 'de', CH: 'de',
  PT: 'pt', AO: 'pt', MZ: 'pt',
  BR: 'pt-BR',   // Brazil gets its own variant, not the European one
};

// Detect language from GeoIP (async, updates after init)
function detectLanguageFromGeo() {
  // Don't override if user manually selected a language
  const manualLang = localStorage.getItem('i18nManualLang');
  if (manualLang) return;

  // The link's own ?offer=/?geo= tag wins over GeoIP. The media buyer already
  // told us the geo, and it is known on the first paint — whereas GeoIP is a
  // third-party round trip that can be slow, rate-limited, or reading a VPN
  // exit in another country. Without this, a Brazilian campaign opened from a
  // European IP renders in English.
  const tagged = COUNTRY_TO_LANG[countryFromOfferTag()];
  if (tagged) {
    if (i18n.language !== tagged) i18n.changeLanguage(tagged);
    try { localStorage.setItem('i18nextLng', tagged); } catch {}
    return;
  }

  const GEOIP_SERVICES = [
    { url: 'https://ipapi.co/json/', getCountry: (d) => d.country_code },
    { url: 'https://ip-api.com/json/?fields=countryCode', getCountry: (d) => d.countryCode },
  ];

  (async () => {
    for (const service of GEOIP_SERVICES) {
      try {
        const resp = await fetch(service.url, { signal: AbortSignal.timeout(4000) });
        if (!resp.ok) continue;
        const data = await resp.json();
        const country = service.getCountry(data);
        const lang = country && COUNTRY_TO_LANG[country] ? COUNTRY_TO_LANG[country] : 'en';
        if (i18n.language !== lang) {
          i18n.changeLanguage(lang);
        }
        localStorage.setItem('i18nextLng', lang);
        return;
      } catch { continue; }
    }
  })();
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: SUPPORTED_LANGS,
    // A missing Brazilian key should fall back to European Portuguese before
    // English — a stray "pt" string still reads fine in Brazil, an English one
    // breaks the page.
    fallbackLng: {
      'pt-BR': ['pt', 'en'],
      default: ['en'],
    },
    // Browsers report "pt-br" in any casing; keep it matching our resource key.
    lowerCaseLng: false,
    nonExplicitSupportedLngs: true,

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },
  });

// After i18n init, try GeoIP detection for better accuracy
detectLanguageFromGeo();

export default i18n;
