import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';
import pl from './locales/pl.json';
import ro from './locales/ro.json';
import tr from './locales/tr.json';
import hi from './locales/hi.json';
import zh from './locales/zh.json';
import ar from './locales/ar.json';
import it from './locales/it.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  pt: { translation: pt },
  de: { translation: de },
  fr: { translation: fr },
  ru: { translation: ru },
  pl: { translation: pl },
  ro: { translation: ro },
  tr: { translation: tr },
  hi: { translation: hi },
  zh: { translation: zh },
  ar: { translation: ar },
  it: { translation: it },
};

// GeoIP → language mapping (for auto-detection by country)
const COUNTRY_TO_LANG = {
  RU: 'ru', UA: 'ru', BY: 'ru', KZ: 'ru',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  PT: 'pt', BR: 'pt',
  DE: 'de', AT: 'de', CH: 'de',
  FR: 'fr', BE: 'fr',
  IT: 'it',
  PL: 'pl',
  RO: 'ro', MD: 'ro',
  TR: 'tr',
  IN: 'hi',
  CN: 'zh', TW: 'zh', HK: 'zh',
  SA: 'ar', AE: 'ar', EG: 'ar', MA: 'ar',
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
        if (country && COUNTRY_TO_LANG[country]) {
          const lang = COUNTRY_TO_LANG[country];
          if (i18n.language !== lang) {
            i18n.changeLanguage(lang);
          }
          localStorage.setItem('i18nextLng', lang);
          return;
        }
      } catch { continue; }
    }
  })();
}

i18n
  .use(LanguageDetector) // Auto-detect language from browser/phone
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',

    // Language detection options
    detection: {
      // Order: cached choice first, then browser language
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Cache detected language
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

// After i18n init, try GeoIP detection for better accuracy
detectLanguageFromGeo();

// Set document direction for RTL languages (Arabic)
i18n.on('languageChanged', (lng) => {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  const dir = rtlLanguages.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
});

export default i18n;
