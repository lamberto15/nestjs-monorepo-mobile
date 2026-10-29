import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { ErrorState } from '@/components/error-state';
import { ListRow } from '@/components/list-row';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/hooks';
import { useNotes, type NoteStatus } from '@/features/notes/hooks';
import { useDebounced } from '@/hooks/use-debounced';
import { formatDateTime } from '@/i18n/format';

export default function NotesScreen() {
  const { t } = useTranslation();
  const me = useMe();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<NoteStatus | 'all'>('all');
  const query = useDebounced(search.trim());
  const list = useNotes(query, status);
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen
        options={{
          headerRight: () =>
            me.data?.can['Note.create'] ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('notes.new')}
                onPress={() => router.push('/notes/new')}
                hitSlop={Spacing.two}
              >
                <ThemedText type="linkPrimary">{t('notes.add')}</ThemedText>
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        data={items}
        keyExtractor={(note) => note.id}
        ListHeaderComponent={
          <View style={styles.filters}>
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
            <ChoiceChips
              accessibilityLabel={t('notes.status')}
              value={status}
              onChange={setStatus}
              choices={[
                { value: 'all', label: t('notes.statuses.all') },
                { value: 'draft', label: t('notes.statuses.draft') },
                { value: 'published', label: t('notes.statuses.published') },
              ]}
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
            <ActivityIndicator />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => list.refetch()} />
          ) : (
            <ThemedText themeColor="textSecondary">
              {query || status !== 'all'
                ? t('notes.noMatch')
                : t('notes.empty')}
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
  filters: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
});
