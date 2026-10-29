import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/screen';
import { noteRecord, useNote } from '@/features/notes/hooks';
import { Revisions } from '@/features/records/revisions';

/** The note's revisions; restoring one needs its current ETag. */
export default function NoteHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const note = useNote(id);
  return (
    <Screen>
      <Revisions
        record={noteRecord(id)}
        etag={note.data?.etag}
        canRestore={Boolean(note.data?.note.can?.update)}
      />
    </Screen>
  );
}
