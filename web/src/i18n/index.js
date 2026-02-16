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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: SUPPORTED_LANGS,
    fallbackLng: 'en',
    load: 'languageOnly',

    detection: {
      order: ['navigator', 'localStorage', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
