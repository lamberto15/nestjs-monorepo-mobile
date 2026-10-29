import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { apiErrorMessage } from '@/features/auth/errors';
import {
  useFavorites,
  useSetTags,
  useTags,
  useToggleFavorite,
  useWatch,
  type RecordRef,
  type Tag,
} from '@/features/records/hooks';

/** Watch the record (its comments and files notify you) and star it. */
export function WatchAndFavorite({
  record,
  label,
  watching,
}: {
  record: RecordRef;
  label: string;
  watching: boolean | undefined;
}) {
  const { t } = useTranslation();
  const watch = useWatch(record);
  const favorites = useFavorites();
  const toggle = useToggleFavorite(record);
  const favorite = favorites.data?.items.find(
    (item) =>
      item.kind === 'record' &&
      item.subject === record.subject &&
      item.target === record.id,
  );
  const error = watch.error ?? toggle.error;
  return (
    <>
      <View style={styles.row}>
        {watching !== undefined && (
          <Button
            title={t(watching ? 'records.unwatch' : 'records.watch')}
            variant="secondary"
            loading={watch.isPending}
            onPress={() => watch.mutate(!watching)}
            style={styles.grow}
          />
        )}
        <Button
          title={t(favorite ? 'records.unstar' : 'records.star')}
          variant="secondary"
          loading={toggle.isPending || favorites.isPending}
          onPress={() => toggle.mutate({ favoriteId: favorite?.id, label })}
          style={styles.grow}
        />
      </View>
      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(error, t)}
        </ThemedText>
      )}
    </>
  );
}

/** The record's tags; with `editable`, chosen from the tenant's tags for its type. */
export function TagsEditor({
  record,
  tags,
  editable,
}: {
  record: RecordRef;
  tags: Pick<Tag, 'id' | 'name'>[];
  editable: boolean;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const all = useTags(record.subject);
  const set = useSetTags(record);
  const chosen = new Set(tags.map((tag) => tag.id));

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="smallBold">{t('records.tags')}</ThemedText>
        {editable && (
          <Button
            title={t(editing ? 'records.done' : 'records.editTags')}
            variant="secondary"
            onPress={() => setEditing(!editing)}
          />
        )}
      </View>
      {!editing &&
        (tags.length ? (
          <ThemedText themeColor="textSecondary">
            {tags.map((tag) => `#${tag.name}`).join('  ')}
          </ThemedText>
        ) : (
          <ThemedText themeColor="textSecondary">
            {t('records.noTags')}
          </ThemedText>
        ))}
      {editing &&
        (all.isPending ? (
          <ActivityIndicator />
        ) : all.data?.items.length ? (
          // Each chip is one tag: tapping adds or removes it.
          <View style={styles.chips}>
            {all.data.items.map((tag) => (
              <ChoiceChips
                key={tag.id}
                accessibilityLabel={tag.name}
                value={chosen.has(tag.id)}
                disabled={set.isPending}
                choices={[{ value: true, label: `#${tag.name}` }]}
                onChange={() => {
                  const next = new Set(chosen);
                  if (next.has(tag.id)) {
                    next.delete(tag.id);
                  } else {
                    next.add(tag.id);
                  }
                  set.mutate([...next]);
                }}
              />
            ))}
          </View>
        ) : (
          <ThemedText themeColor="textSecondary">
            {t('records.noTagsDefined')}
          </ThemedText>
        ))}
      {(set.error ?? all.error) && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(set.error ?? all.error, t)}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  section: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
