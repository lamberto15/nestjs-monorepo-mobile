import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useUpdateProfile } from '@/features/account/hooks';
import {
  applyLanguage,
  LANGUAGES,
  type Language,
} from '@/features/account/language';
import { apiErrorMessage } from '@/features/auth/errors';

/** The app's language, saved on the account (the API answers in it too). */
export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const update = useUpdateProfile();
  const [restartNeeded, setRestartNeeded] = useState(false);

  async function choose(language: Language) {
    const saved = await update
      .mutateAsync({ locale: language })
      .catch(() => null);
    if (saved && (await applyLanguage(language))) {
      setRestartNeeded(true);
    }
  }

  return (
    <Screen>
      {LANGUAGES.map((language) => (
        <ListRow
          key={language.code}
          title={language.name}
          detail={
            update.isPending && update.variables?.locale === language.code ? (
              <ActivityIndicator />
            ) : i18n.resolvedLanguage === language.code ? (
              '✓'
            ) : undefined
          }
          disabled={update.isPending}
          onPress={() => choose(language.code)}
        />
      ))}
      {restartNeeded && (
        <ThemedText themeColor="textSecondary" accessibilityRole="alert">
          {t('language.restart')}
        </ThemedText>
      )}
      {update.error && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(update.error, t)}
        </ThemedText>
      )}
    </Screen>
  );
}
