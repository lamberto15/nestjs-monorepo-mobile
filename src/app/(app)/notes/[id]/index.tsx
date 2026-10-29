import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { apiErrorMessage } from '@/features/auth/errors';
import { useMe } from '@/features/auth/hooks';
import {
  isConflict,
  noteRecord,
  useDeleteNote,
  useNote,
} from '@/features/notes/hooks';
import { Comments } from '@/features/records/comments';
import { TagsEditor, WatchAndFavorite } from '@/features/records/record-addons';
import { formatDateTime } from '@/i18n/format';

export default function NoteScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useNote(id);
  const remove = useDeleteNote(id);
  const me = useMe();
  const record = noteRecord(id);

  if (!query.data) {
    return (
      <Screen>
        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <ActivityIndicator />
        )}
      </Screen>
    );
  }

  const { note, etag } = query.data;
  const confirmDelete = () =>
    Alert.alert(
      t('notes.deleteTitle'),
      t('notes.deleteBody', { title: note.title }),
      [
        { text: t('sessions.cancel'), style: 'cancel' },
        {
          text: t('notes.delete'),
          style: 'destructive',
          onPress: () =>
            remove.mutate(etag, { onSuccess: () => router.back() }),
        },
      ],
    );

  return (
    <Screen>
      <ThemedText type="subtitle">{note.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {[
          note.number,
          t(`notes.statuses.${note.status}`),
          t('notes.updated', { time: formatDateTime(note.updatedAt) }),
        ].join(' · ')}
      </ThemedText>
      <ThemedText>{note.body || t('notes.noBody')}</ThemedText>
      <WatchAndFavorite
        record={record}
        label={note.title}
        watching={note.watching}
      />
      <TagsEditor
        record={record}
        tags={note.tags}
        editable={Boolean(note.can?.update)}
      />

      {remove.error && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {isConflict(remove.error)
            ? t('notes.conflict')
            : apiErrorMessage(remove.error, t)}
        </ThemedText>
      )}
      {note.can?.update && (
        <Button
          title={t('notes.edit')}
          onPress={() =>
            router.push({ pathname: '/notes/[id]/edit', params: { id } })
          }
        />
      )}
      <Button
        title={t('revisions.history')}
        variant="secondary"
        onPress={() =>
          router.push({ pathname: '/notes/[id]/history', params: { id } })
        }
      />
      {note.can?.delete && (
        <Button
          title={t('notes.delete')}
          variant="danger"
          loading={remove.isPending}
          onPress={confirmDelete}
        />
      )}
      {me.data && (
        <View style={styles.comments}>
          <Comments
            record={record}
            userId={me.data.user.id}
            canModerate={Boolean(note.can?.update)}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  comments: {
    marginTop: Spacing.four,
  },
});
