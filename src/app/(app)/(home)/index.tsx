import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { apiErrorMessage } from '@/features/auth/errors';
import { useMe } from '@/features/auth/hooks';

/** The starting point of a project's own features. */
export default function HomeScreen() {
  const { t } = useTranslation();
  const me = useMe();
  return (
    <Screen>
      <ThemedText type="subtitle">{t('app.name')}</ThemedText>
      {me.isPending && <ActivityIndicator />}
      {me.data && (
        <>
          <ThemedText>
            {t('home.signedInAs', { name: me.data.user.name })}
          </ThemedText>
          {me.data.tenant && (
            <ThemedText themeColor="textSecondary">
              {t('home.tenant', { name: me.data.tenant.name })}
            </ThemedText>
          )}
        </>
      )}
      {me.isError && (
        <ThemedText themeColor="danger">
          {apiErrorMessage(me.error, t)}
        </ThemedText>
      )}
    </Screen>
  );
}
