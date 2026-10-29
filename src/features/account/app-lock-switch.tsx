import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { appLock, canLock, useAppLock } from '@/features/account/app-lock';

/** "Lock with Face ID / fingerprint": only on a device that has one enrolled. */
export function AppLockSwitch() {
  const { t } = useTranslation();
  const { enabled } = useAppLock();
  const available = useQuery({
    queryKey: ['app-lock', 'available'],
    queryFn: canLock,
  });
  if (!available.data) {
    return null;
  }
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <ThemedText>{t('lock.title')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('lock.hint')}
        </ThemedText>
      </View>
      <Switch
        accessibilityLabel={t('lock.title')}
        value={enabled}
        onValueChange={async (on) => {
          // Turning it on proves it works first, so nobody locks themselves out.
          if (on && !(await appLock.unlock(t('lock.prompt')))) {
            return;
          }
          await appLock.setEnabled(on);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
