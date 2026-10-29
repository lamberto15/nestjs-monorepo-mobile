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

import { ListRow } from '@/components/list-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { apiErrorMessage } from '@/features/auth/errors';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from '@/features/notifications/hooks';
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
            leading={
              <View
                accessibilityLabel={
                  item.read ? undefined : t('notifications.unread')
                }
                style={[
                  styles.dot,
                  {
                    backgroundColor: item.read ? 'transparent' : theme.primary,
                  },
                ]}
              />
            }
            onPress={item.read ? undefined : () => markRead.mutate(item.id)}
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
            <ActivityIndicator />
          ) : list.isError ? (
            <ThemedText themeColor="danger">
              {apiErrorMessage(list.error, t)}
            </ThemedText>
          ) : (
            <ThemedText themeColor="textSecondary">
              {t('notifications.empty')}
            </ThemedText>
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
