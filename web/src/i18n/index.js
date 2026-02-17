import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations — only supported languages
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import pl from './locales/pl.json';

const SUPPORTED_LANGS = ['en', 'es', 'fr', 'it', 'pl'];

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  it: { translation: it },
  pl: { translation: pl },
};

// GeoIP → language mapping
// Spain → es, Italy → it, France → fr, Poland → pl
// All other regions → en (fallback)
const COUNTRY_TO_LANG = {
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  FR: 'fr', BE: 'fr',
  IT: 'it',
  PL: 'pl',
};

// Detect language from GeoIP (async, updates after init)
function detectLanguageFromGeo() {
  // Don't override if user manually selected a language
  const manualLang = localStorage.getItem('i18nManualLang');
  if (manualLang) return;

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
    fallbackLng: 'en',

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
