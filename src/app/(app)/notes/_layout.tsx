import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SplitView, useWide } from '@/components/split-view';
import { NotesList } from '@/features/notes/notes-list';

export default function NotesLayout() {
  const { t } = useTranslation();
  const wide = useWide();
  const stack = (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('notes.list') }} />
      <Stack.Screen name="new" options={{ title: t('notes.new') }} />
      <Stack.Screen name="[id]/index" options={{ title: t('notes.note') }} />
      <Stack.Screen name="[id]/edit" options={{ title: t('notes.edit') }} />
      <Stack.Screen
        name="[id]/history"
        options={{ title: t('revisions.history') }}
      />
    </Stack>
  );
  // Wide: the list stays at the side, the note opens beside it.
  return wide ? <SplitView list={<NotesList />}>{stack}</SplitView> : stack;
}
