import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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
    <View style={styles.box} accessibilityLiveRegion="polite">
      <ThemedText themeColor="danger" accessibilityRole="alert">
        {apiErrorMessage(error, t)}
      </ThemedText>
      {onRetry && (
        <Button
          title={t('errors.retry')}
          variant="secondary"
          onPress={onRetry}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: Spacing.two,
  },
});
