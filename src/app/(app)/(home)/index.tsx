import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { apiErrorMessage } from '@/features/auth/errors';
import { useMe } from '@/features/auth/hooks';
import { canOpen, openTarget } from '@/features/notifications/open-target';
import { useFavorites } from '@/features/records/hooks';
import {
  useClearRecents,
  useDismiss,
  useInbox,
  useRecents,
} from '@/features/work/hooks';
import { formatDateTime } from '@/i18n/format';

/**
 * The starting point: what waits on you, your favorites, what you opened
 * lately; search in the header. A project's own home grows from here.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const me = useMe();
  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/search')}
              hitSlop={Spacing.two}
            >
              <ThemedText type="linkPrimary">{t('search.title')}</ThemedText>
            </Pressable>
          ),
        }}
      />
      {me.data && (
        <ThemedText themeColor="textSecondary">
          {[me.data.user.name, me.data.tenant?.name]
            .filter(Boolean)
            .join(' · ')}
        </ThemedText>
      )}
      {me.isError && (
        <ErrorState error={me.error} onRetry={() => me.refetch()} />
      )}
      <Inbox />
      <View style={styles.links}>
        <ListRow
          title={t('approvals.title')}
          onPress={() => router.push('/approvals')}
        />
        <ListRow
          title={t('acknowledgments.title')}
          onPress={() => router.push('/acknowledgments')}
        />
      </View>
      <Favorites />
      <Recents />
      {__DEV__ && (
        <ListRow
          title="UI catalogue (development)"
          onPress={() => router.push('/catalogue')}
        />
      )}
    </Screen>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" accessibilityRole="header">
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function Inbox() {
  const { t } = useTranslation();
  const inbox = useInbox();
  const dismiss = useDismiss();
  // No realtime event for it: read again whenever Home comes back.
  useFocusEffect(
    useCallback(() => {
      void inbox.refetch();
    }, [inbox]),
  );
  const items = inbox.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <Section title={t('inbox.title')}>
      {inbox.isPending && <ActivityIndicator />}
      {inbox.isError && (
        <ErrorState error={inbox.error} onRetry={() => inbox.refetch()} />
      )}
      {inbox.isSuccess && items.length === 0 && (
        <ThemedText themeColor="textSecondary">{t('inbox.empty')}</ThemedText>
      )}
      {items.map((item) => (
        <ListRow
          key={item.key}
          title={t(`inbox.kinds.${item.kind}`, { defaultValue: item.kind })}
          subtitle={[
            item.subject,
            item.dueAt
              ? t('inbox.due', { date: formatDateTime(item.dueAt) })
              : formatDateTime(item.at),
          ]
            .filter(Boolean)
            .join(' · ')}
          onPress={canOpen(item) ? () => openTarget(item) : undefined}
          detail={
            item.canDismiss ? (
              <Button
                title={t('inbox.dismiss')}
                variant="secondary"
                loading={dismiss.isPending && dismiss.variables === item.key}
                onPress={() => dismiss.mutate(item.key)}
              />
            ) : undefined
          }
        />
      ))}
      {inbox.hasNextPage && (
        <Button
          title={t('inbox.more')}
          variant="secondary"
          loading={inbox.isFetchingNextPage}
          onPress={() => inbox.fetchNextPage()}
        />
      )}
      {dismiss.error && (
        <ThemedText type="small" themeColor="danger">
          {apiErrorMessage(dismiss.error, t)}
        </ThemedText>
      )}
    </Section>
  );
}

function Favorites() {
  const { t } = useTranslation();
  const favorites = useFavorites();
  const items = favorites.data?.items ?? [];
  if (favorites.isSuccess && items.length === 0) {
    return null;
  }
  return (
    <Section title={t('favorites.title')}>
      {favorites.isError && (
        <ErrorState
          error={favorites.error}
          onRetry={() => favorites.refetch()}
        />
      )}
      {items.map((favorite) => {
        // A record by its subject and id; a page or view by its path.
        const target =
          favorite.kind === 'record'
            ? { subject: favorite.subject, recordId: favorite.target }
            : { link: favorite.target };
        return (
          <ListRow
            key={favorite.id}
            title={favorite.label}
            subtitle={favorite.subject}
            onPress={canOpen(target) ? () => openTarget(target) : undefined}
          />
        );
      })}
    </Section>
  );
}

function Recents() {
  const { t } = useTranslation();
  const recents = useRecents();
  const clear = useClearRecents();
  const items = recents.data?.items ?? [];
  if (recents.isSuccess && items.length === 0) {
    return null;
  }
  return (
    <Section title={t('recents.title')}>
      {recents.isError && (
        <ErrorState error={recents.error} onRetry={() => recents.refetch()} />
      )}
      {items.map((recent) => (
        <ListRow
          key={recent.id}
          title={recent.label}
          subtitle={[recent.subject, formatDateTime(recent.viewedAt)].join(
            ' · ',
          )}
          onPress={canOpen(recent) ? () => openTarget(recent) : undefined}
        />
      ))}
      {items.length > 0 && (
        <Button
          title={t('recents.clear')}
          variant="secondary"
          loading={clear.isPending}
          onPress={() => clear.mutate()}
        />
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  links: {
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
