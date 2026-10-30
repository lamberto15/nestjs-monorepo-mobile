import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ListRow } from '@/components/list-row';
import { SkeletonRows } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useNotes } from '@/features/notes/hooks';
import { useListMetadata, type ListQuery } from '@/features/records/list';
import { ExportButton } from '@/features/records/export-button';
import { ListFilters, ViewsBar } from '@/features/records/list-filters';
import { useDebounced } from '@/hooks/use-debounced';
import { formatDateTime } from '@/i18n/format';

/** The notes, with search, saved views, filters and export: the Notes tab, or its side column on a wide screen. */
export function NotesList() {
  const { t } = useTranslation();
  const metadata = useListMetadata('Note');
  const [search, setSearch] = useState('');
  // Filters and sort: tapped, or a saved view's.
  const [filters, setFilters] = useState<ListQuery>({});
  const [viewId, setViewId] = useState<string | null>(null);
  const q = useDebounced(search.trim());
  const list = useNotes({ ...filters, ...(q && { q }) });
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <ThemedView style={styles.fill}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        data={items}
        keyExtractor={(note) => note.id}
        ListHeaderComponent={
          <View style={styles.filters}>
            {metadata.data?.search !== false && (
              <TextField
                label={t('notes.search')}
                value={search}
                onChangeText={setSearch}
                placeholder={t('notes.searchHint')}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
            )}
            <ViewsBar
              subject="Note"
              query={filters}
              activeId={viewId}
              onApply={(id, query) => {
                setViewId(id);
                setFilters(query);
              }}
            />
            <ExportButton
              subject="Note"
              query={{ ...filters, ...(q && { q }) }}
            />
            <ListFilters
              metadata={metadata.data}
              query={filters}
              onChange={(query) => {
                setViewId(null);
                setFilters(query);
              }}
            />
          </View>
        }
        renderItem={({ item }) => (
          <ListRow
            title={item.title}
            subtitle={[
              item.number,
              t(`notes.statuses.${item.status}`),
              formatDateTime(item.updatedAt),
            ].join(' · ')}
            onPress={() =>
              router.push({ pathname: '/notes/[id]', params: { id: item.id } })
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
            <EmptyState
              title={
                q || Object.keys(filters).length
                  ? t('notes.noMatch')
                  : t('notes.empty')
              }
            />
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
  filters: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
});
