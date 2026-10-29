import { Redirect } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { apiErrorMessage } from '@/features/auth/errors';
import { useChooseTenant } from '@/features/auth/hooks';
import { goToStep } from '@/features/auth/navigation';
import { pendingTenants } from '@/features/auth/sign-in-flow';

export default function ChooseTenantScreen() {
  const { t } = useTranslation();
  const choose = useChooseTenant();
  const [tenants] = useState(pendingTenants);

  // Reached without a sign-in in progress (a reload, a deep link).
  if (tenants.length === 0) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Screen>
      <ThemedText themeColor="textSecondary">
        {t('chooseTenant.hint')}
      </ThemedText>
      {tenants.map((tenant) => (
        <Pressable
          key={tenant.id}
          accessibilityRole="button"
          disabled={choose.isPending}
          onPress={async () => {
            const step = await choose.mutateAsync(tenant.id).catch(() => null);
            if (step) {
              goToStep(step, tenant.id);
            }
          }}
        >
          {({ pressed }) => (
            <ThemedView
              type={pressed ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.row}
            >
              <ThemedText>{tenant.name}</ThemedText>
              {tenant.current && (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('chooseTenant.current')}
                </ThemedText>
              )}
            </ThemedView>
          )}
        </Pressable>
      ))}
      {choose.error && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(choose.error, t)}
        </ThemedText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.half,
  },
});
