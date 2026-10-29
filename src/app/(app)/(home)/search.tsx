import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { canOpen, openTarget } from '@/features/notifications/open-target';
import { groupHits, snippetParts, useSearch } from '@/features/work/hooks';
import { useDebounced } from '@/hooks/use-debounced';

/** Everything you may read, across kinds: notes, and every feature a project adds. */
export default function SearchScreen() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const search = useSearch(q);
  const groups = groupHits(search.data?.items ?? []);

  return (
    <Screen>
      <TextField
        label={t('search.title')}
        value={text}
        onChangeText={setText}
        placeholder={t('search.hint')}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
      {q.length >= 2 && search.isPending && <ActivityIndicator />}
      {search.isError && (
        <ErrorState error={search.error} onRetry={() => search.refetch()} />
      )}
      {search.isSuccess && groups.length === 0 && (
        <ThemedText themeColor="textSecondary">{t('search.none')}</ThemedText>
      )}
      {groups.map((group) => (
        <View key={group.label} style={styles.group}>
          <ThemedText type="smallBold" accessibilityRole="header">
            {group.label}
          </ThemedText>
          {group.hits.map((hit) => {
            const target = {
              subject: hit.subject,
              recordId: hit.id,
              link: hit.link,
            };
            return (
              <ListRow
                key={`${hit.subject}:${hit.id}`}
                title={hit.title}
                subtitle={snippetParts(hit.snippet)
                  .map((part) => part.text)
                  .join('')}
                onPress={canOpen(target) ? () => openTarget(target) : undefined}
              />
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
  },
});
