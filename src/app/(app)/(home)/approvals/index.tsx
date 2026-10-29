import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { ErrorState } from '@/components/error-state';
import { ListRow } from '@/components/list-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useApprovals, type ApprovalScope } from '@/features/approvals/hooks';
import { formatDateTime } from '@/i18n/format';

/** Requests waiting on you, the ones you made, and what you decided. */
export default function ApprovalsScreen() {
  const { t } = useTranslation();
  const [scope, setScope] = useState<ApprovalScope>('toDecide');
  const list = useApprovals(scope);
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <ThemedView style={styles.fill}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ChoiceChips
            accessibilityLabel={t('approvals.title')}
            value={scope}
            onChange={setScope}
            choices={[
              { value: 'toDecide', label: t('approvals.scopes.toDecide') },
              { value: 'mine', label: t('approvals.scopes.mine') },
              { value: 'decided', label: t('approvals.scopes.decided') },
            ]}
          />
        }
        renderItem={({ item }) => (
          <ListRow
            title={item.title}
            subtitle={[
              t(`approvals.status.${item.status}`, {
                defaultValue: item.status,
              }),
              item.requesterName,
              item.dueAt
                ? t('inbox.due', { date: formatDateTime(item.dueAt) })
                : formatDateTime(item.createdAt),
            ]
              .filter(Boolean)
              .join(' · ')}
            onPress={() =>
              router.push({
                pathname: '/approvals/[id]',
                params: { id: item.id },
              })
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
            <ActivityIndicator />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => list.refetch()} />
          ) : (
            <ThemedText themeColor="textSecondary">
              {t('approvals.empty')}
            </ThemedText>
          )
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
});
