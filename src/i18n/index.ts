// Named `register`: the react-hooks lint takes anything called `use` for React's.
import { use as register } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { deviceLanguage } from '@/api/public-api';
import en from '@/i18n/locales/en.json';

/**
 * The app's own texts; the API answers in the user's language itself.
 * A new language: `locales/<code>.json` with every key of `en.json`, added
 * to `resources`. The backend ships en, de, ar (right to left), zh, ms.
 */
const resources = { en: { translation: en } } as const;

void register(initReactI18next).init({
  resources,
  lng: deviceLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React escapes
});
