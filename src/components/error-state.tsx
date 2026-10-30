import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { apiErrorMessage } from '@/features/auth/errors';

/** A failed load: why (the API's words, or ours), and a way to try again. */
export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ThemedView type="backgroundElement" style={styles.box}>
      <View accessibilityLiveRegion="polite" style={styles.message}>
        <ThemedText
          themeColor="danger"
          accessibilityRole="alert"
          style={styles.text}
        >
          {apiErrorMessage(error, t)}
        </ThemedText>
      </View>
      {onRetry && (
        <Button
          title={t('errors.retry')}
          variant="secondary"
          onPress={onRetry}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
  },
  message: {
    gap: Spacing.two,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
});
