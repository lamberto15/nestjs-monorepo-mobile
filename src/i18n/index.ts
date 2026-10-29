// Named `register`: the react-hooks lint takes anything called `use` for React's.
import { use as register } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { deviceLanguage } from '@/api/public-api';
import ar from '@/i18n/locales/ar.json';
import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';
import ms from '@/i18n/locales/ms.json';
import zh from '@/i18n/locales/zh.json';

/**
 * The app's own texts; the API answers in the user's language itself.
 * The backend's languages: en, de, ar (right to left), zh, ms. A new one:
 * `locales/<code>.json` with every key of `en.json` (`pnpm i18n:check`),
 * added to `resources`. A device language like `de-AT` or `zh-Hans-CN`
 * falls back to its base language, then to English.
 */
const resources = {
  en: { translation: en },
  de: { translation: de },
  ar: { translation: ar },
  zh: { translation: zh },
  ms: { translation: ms },
} as const;

void register(initReactI18next).init({
  resources,
  lng: deviceLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React escapes
});
