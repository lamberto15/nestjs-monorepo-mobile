import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ListRow } from '@/components/list-row';
import { SkeletonRows } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from '@/features/notifications/hooks';
import { canOpen, openTarget } from '@/features/notifications/open-target';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/i18n/format';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const list = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const newest = items[0]?.createdAt;
  const anyUnread = items.some((item) => !item.read);

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.actions}>
              {anyUnread && newest && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => markAllRead.mutate(newest)}
                  disabled={markAllRead.isPending}
                >
                  <ThemedText type="linkPrimary">
                    {t('notifications.markAllRead')}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          ),
        }}
      />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListRow
            title={item.title}
            subtitle={[item.body, formatDateTime(item.createdAt)]
              .filter(Boolean)
              .join('\n')}
            accessibilityLabel={
              item.read
                ? undefined
                : `${t('notifications.unread')}, ${item.title}, ${item.body}`
            }
            leading={
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: item.read ? 'transparent' : theme.primary,
                  },
                ]}
              />
            }
            onPress={
              item.read && !canOpen({ link: item.link })
                ? undefined
                : () => {
                    if (!item.read) {
                      markRead.mutate(item.id);
                    }
                    openTarget({ link: item.link });
                  }
            }
          />
        )}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) {
            void list.fetchNextPage();
          }
        }}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching && !list.isFetchingNextPage}
            onRefresh={() => void list.refetch()}
          />
        }
        ListEmptyComponent={
          list.isPending ? (
            <SkeletonRows count={5} />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => list.refetch()} />
          ) : (
            <EmptyState title={t('notifications.empty')} />
          )
        }
        ListFooterComponent={
          list.isFetchingNextPage ? <ActivityIndicator /> : undefined
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  dot: {
    width: Spacing.two,
    height: Spacing.two,
    borderRadius: Spacing.one,
  },
});
