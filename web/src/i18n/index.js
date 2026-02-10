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

const resources = {
  en: { translation: en },
  es: { translation: es },
  pt: { translation: pt },
  de: { translation: de },
  fr: { translation: fr },
  ru: { translation: ru },
};

i18n
  .use(LanguageDetector) // Auto-detect language from browser/phone
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',

    // Language detection options
    detection: {
      // Order of detection methods
      order: ['navigator', 'localStorage', 'htmlTag'],
      // Cache user language
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
