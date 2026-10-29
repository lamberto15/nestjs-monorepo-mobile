import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function NotesLayout() {
  const { t } = useTranslation();
  return (
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
}
