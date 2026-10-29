import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { isConflict, useNote, useUpdateNote } from '@/features/notes/hooks';
import { NoteForm } from '@/features/notes/note-form';

/**
 * Edits the version that was read: its ETag goes as `If-Match`, so if
 * someone else saved meanwhile the API refuses (412) and nothing is
 * overwritten; the person loads their version and edits that.
 */
export default function EditNoteScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useNote(id);
  const update = useUpdateNote(id);

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
  return (
    <Screen>
      {isConflict(update.error) && (
        <>
          <ThemedText themeColor="danger" accessibilityRole="alert">
            {t('notes.conflict')}
          </ThemedText>
          <Button
            title={t('notes.loadLatest')}
            variant="secondary"
            loading={query.isRefetching}
            onPress={async () => {
              await query.refetch();
              update.reset();
            }}
          />
        </>
      )}
      <NoteForm
        // A new version read: the form starts again from it.
        key={etag}
        initial={{
          title: note.title,
          body: note.body ?? '',
          custom: note.custom ?? {},
        }}
        submitTitle={t('notes.save')}
        pending={update.isPending}
        error={update.error}
        onSubmit={async (input) => {
          await update.mutateAsync({ input, etag });
          router.back();
        }}
      />
    </Screen>
  );
}
