import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/screen';
import { useCreateNote } from '@/features/notes/hooks';
import { NoteForm } from '@/features/notes/note-form';

export default function NewNoteScreen() {
  const { t } = useTranslation();
  const create = useCreateNote();
  return (
    <Screen>
      <NoteForm
        initial={{ title: '', body: '' }}
        submitTitle={t('notes.create')}
        pending={create.isPending}
        error={create.error}
        onSubmit={async (input) => {
          const note = await create.mutateAsync(input);
          router.replace({ pathname: '/notes/[id]', params: { id: note.id } });
        }}
      />
    </Screen>
  );
}
