import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';

/**
 * While the phone is offline: a small pill under the status bar saying
 * requests wait for the connection.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const online = useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
  );
  if (online) {
    return null;
  }
  return (
    <ThemedView
      type="backgroundSelected"
      style={[styles.pill, { top: insets.top + Spacing.two }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <ThemedText type="smallBold">{t('errors.offline')}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 1,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.three,
  },
});
