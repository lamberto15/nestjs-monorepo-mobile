import '@/i18n';

import { I18nManager } from 'react-native';

import { applyLanguage, supportedLanguage } from '@/features/account/language';

test('a locale tag maps to its supported base language', () => {
  expect(supportedLanguage('de-AT')).toBe('de');
  expect(supportedLanguage('zh-Hans-CN')).toBe('zh');
  expect(supportedLanguage('ms_SG')).toBe('ms');
  expect(supportedLanguage('fr-FR')).toBeUndefined();
  expect(supportedLanguage(null)).toBeUndefined();
});

test('switching to Arabic forces right to left and asks for a restart; staying left to right does not', async () => {
  const forceRTL = jest.spyOn(I18nManager, 'forceRTL').mockImplementation();
  jest.spyOn(I18nManager, 'allowRTL').mockImplementation();

  expect(I18nManager.isRTL).toBe(false); // the test runtime starts left to right

  expect(await applyLanguage('de')).toBe(false);
  expect(forceRTL).not.toHaveBeenCalled();
  expect(await applyLanguage('ar')).toBe(true);
  expect(forceRTL).toHaveBeenLastCalledWith(true);
});
