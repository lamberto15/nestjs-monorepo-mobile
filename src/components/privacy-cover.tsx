import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { appLock, useAppLock } from '@/features/account/app-lock';

/**
 * Covers the app while it isn't in front (the app switcher's snapshot shows
 * no data), and while it is locked (`appLock`): unlock with the face, the
 * fingerprint or the passcode.
 */
export function PrivacyCover() {
  const { t } = useTranslation();
  const { locked } = useAppLock();
  const [away, setAway] = useState(AppState.currentState !== 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setAway(state !== 'active'),
    );
    return () => subscription.remove();
  }, []);

  if (!away && !locked) {
    return null;
  }
  return (
    <ThemedView style={styles.cover} accessibilityViewIsModal>
      <ThemedText type="subtitle">{t('app.name')}</ThemedText>
      {locked && !away && (
        <Button
          title={t('lock.unlock')}
          onPress={() => void appLock.unlock(t('lock.prompt'))}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
  },
});
