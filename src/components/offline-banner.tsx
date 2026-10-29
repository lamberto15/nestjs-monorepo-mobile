import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** While the phone is offline: a strip at the top saying requests wait. */
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
      style={[styles.banner, { paddingTop: insets.top + Spacing.one }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <ThemedText type="small">{t('errors.offline')}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
});
