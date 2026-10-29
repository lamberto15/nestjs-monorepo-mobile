import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  View,
} from 'react-native';

import { WEB_URL } from '@/api/public-api';
import { feedback } from '@/components/feedback';

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
import { Attachments } from '@/features/records/attachments-list';
import { Comments } from '@/features/records/comments';
import { CustomFieldsView } from '@/features/records/custom-fields';
import { useListMetadata } from '@/features/records/list';
import { useRecordRecent } from '@/features/work/hooks';
import { usePresence } from '@/features/work/presence';
import { PresenceLine } from '@/features/work/presence-line';
import { TagsEditor, WatchAndFavorite } from '@/features/records/record-addons';
import { formatDateTime } from '@/i18n/format';

export default function NoteScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useNote(id);
  const remove = useDeleteNote(id);
  const me = useMe();
  const record = noteRecord(id);
  // What this record type supports (tags, comments…), and its custom fields.
  const metadata = useListMetadata('Note');
  const capabilities = metadata.data?.capabilities;
  const others = usePresence('Note', id, 'viewing');
  const recordRecent = useRecordRecent();
  const title = query.data?.note.title;
  // Opened: first in "Recently opened" (its title only, never its content).
  useEffect(() => {
    if (title) {
      recordRecent.mutate({ subject: 'Note', recordId: id, label: title });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per note and title
  }, [id, title]);

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
            remove.mutate(etag, {
              onSuccess: () => {
                feedback.success();
                router.back();
              },
            }),
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
      <PresenceLine others={others} />
      <ThemedText>{note.body || t('notes.noBody')}</ThemedText>
      <CustomFieldsView metadata={metadata.data} values={note.custom} />
      {WEB_URL && (
        <Button
          title={t('notes.share')}
          variant="secondary"
          onPress={() => {
            const url = `${WEB_URL}/notes/${encodeURIComponent(id)}`;
            // iOS shares the link; Android, the text with the link in it.
            void Share.share({
              title: note.title,
              message: `${note.title}\n${url}`,
              url,
            });
          }}
        />
      )}
      <WatchAndFavorite
        record={record}
        label={note.title}
        watching={note.watching}
      />
      {capabilities?.tags !== false && (
        <TagsEditor
          record={record}
          tags={note.tags}
          editable={Boolean(note.can?.update)}
        />
      )}

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
      {me.data && capabilities?.attachments && (
        <Attachments
          record={record}
          maxBytes={metadata.data?.attachmentLimits?.maxBytes}
          canChange={Boolean(note.can?.update)}
          userId={me.data.user.id}
        />
      )}
      {me.data && capabilities?.comments !== false && (
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
