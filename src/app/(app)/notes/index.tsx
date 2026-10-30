import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useWide } from '@/components/split-view';
import { Spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/hooks';
import { NotesList } from '@/features/notes/notes-list';

export default function NotesScreen() {
  const { t } = useTranslation();
  const me = useMe();
  // Wide: the list is the side column (notes/_layout.tsx); this side waits
  // for a note to be chosen.
  const wide = useWide();
  return (
    <>
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
      {wide ? (
        <ThemedView style={styles.choose}>
          <ThemedText themeColor="textSecondary">
            {t('notes.choose')}
          </ThemedText>
        </ThemedView>
      ) : (
        <NotesList />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  choose: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
});
