import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { unwrap } from '@/api/client';
import { API_URL, publicApi } from '@/api/public-api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

// The sign-in form arrives with the sign-in feature (docs/decisions.md,
// "Roadmap"). Until then this screen proves the app reaches the API.
export default function SignInScreen() {
  const { t } = useTranslation();
  const methods = useQuery({
    queryKey: ['auth', 'methods'],
    queryFn: () => unwrap(publicApi.GET('/v1/auth/methods')),
  });

  const offered = methods.data
    ? (['password', 'passkeys', 'magicLink', 'signUp'] as const)
        .filter((method) => methods.data[method])
        .map((method) => t(`methods.${method}`))
    : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="subtitle">{t('app.name')}</ThemedText>
        {methods.isPending && (
          <ThemedText themeColor="textSecondary">
            {t('server.connecting', { url: API_URL })}
          </ThemedText>
        )}
        {methods.isSuccess && (
          <>
            <ThemedText>{t('server.connected', { url: API_URL })}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {t('server.methods', { methods: offered.join(', ') })}
            </ThemedText>
          </>
        )}
        {methods.isError && (
          <>
            <ThemedText>{t('server.unreachable', { url: API_URL })}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {methods.error.message}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => methods.refetch()}
            >
              <ThemedText type="linkPrimary">{t('server.retry')}</ThemedText>
            </Pressable>
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});
