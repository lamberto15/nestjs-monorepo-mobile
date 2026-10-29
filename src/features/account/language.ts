import { changeLanguage } from 'i18next';
import { I18nManager } from 'react-native';

/** The app's languages: the backend's (docs/backend-integration.md, "Languages and time"). */
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ar', name: 'العربية' },
  { code: 'zh', name: '中文' },
  { code: 'ms', name: 'Bahasa Melayu' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

const RIGHT_TO_LEFT: readonly Language[] = ['ar'];

/** The app language a locale tag means (`de-AT` → `de`, `zh-Hans-CN` → `zh`), if supported. */
export function supportedLanguage(tag?: string | null): Language | undefined {
  const base = tag?.split(/[-_]/)[0]?.toLowerCase();
  return LANGUAGES.find((language) => language.code === base)?.code;
}

/**
 * Shows the app's texts in `language` at once. React Native reads the
 * layout direction at launch, so a switch between left-to-right and
 * right-to-left applies on the next start: true when one is needed.
 */
export async function applyLanguage(language: Language): Promise<boolean> {
  await changeLanguage(language);
  const rtl = RIGHT_TO_LEFT.includes(language);
  if (I18nManager.isRTL === rtl) {
    return false;
  }
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  return true;
}
