import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable } from 'react-native';

import { Button } from '@/components/button';
import { ListRow } from '@/components/list-row';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import {
  useRevokeSession,
  useSessions,
  useSignOutEverywhere,
} from '@/features/account/hooks';
import { apiErrorMessage } from '@/features/auth/errors';
import { formatDateTime } from '@/i18n/format';

/** Browser sessions (this app's sign-in is not one of them), and "sign out everywhere". */
export default function SessionsScreen() {
  const { t } = useTranslation();
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const everywhere = useSignOutEverywhere();

  const confirmEverywhere = () =>
    Alert.alert(t('sessions.everywhereTitle'), t('sessions.everywhereBody'), [
      { text: t('sessions.cancel'), style: 'cancel' },
      {
        text: t('sessions.signOutEverywhere'),
        style: 'destructive',
        onPress: () => everywhere.mutate(),
      },
    ]);

  return (
    <Screen>
      <ThemedText themeColor="textSecondary">{t('sessions.hint')}</ThemedText>
      {sessions.isPending && <ActivityIndicator />}
      {sessions.data?.items.length === 0 && (
        <ThemedText themeColor="textSecondary">{t('sessions.none')}</ThemedText>
      )}
      {sessions.data?.items.map((item) => (
        <ListRow
          key={item.id}
          title={item.device ?? t('sessions.unknownDevice')}
          subtitle={[
            t(`sessions.methods.${item.method}`, { defaultValue: item.method }),
            t('sessions.lastActive', {
              time: formatDateTime(item.lastActiveAt),
            }),
          ].join(' · ')}
          detail={
            item.current ? (
              t('sessions.current')
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={revoke.isPending}
                onPress={() => revoke.mutate(item.id)}
              >
                <ThemedText type="linkPrimary">
                  {t('sessions.signOut')}
                </ThemedText>
              </Pressable>
            )
          }
        />
      ))}
      {sessions.isError && (
        <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
      )}
      {[revoke.error, everywhere.error].map(
        (error, index) =>
          error && (
            <ThemedText
              key={index}
              themeColor="danger"
              accessibilityRole="alert"
            >
              {apiErrorMessage(error, t)}
            </ThemedText>
          ),
      )}
      <Button
        title={t('sessions.signOutEverywhere')}
        variant="secondary"
        loading={everywhere.isPending}
        onPress={confirmEverywhere}
      />
    </Screen>
  );
}
