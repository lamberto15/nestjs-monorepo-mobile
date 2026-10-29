import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { ListRow } from '@/components/list-row';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useSwitchTenant, useTenants } from '@/features/account/hooks';
import { apiErrorMessage } from '@/features/auth/errors';

/** The tenants the person belongs to; choosing one acts in it from now on. */
export default function OrganizationScreen() {
  const { t } = useTranslation();
  const tenants = useTenants();
  const switchTenant = useSwitchTenant();

  return (
    <Screen>
      {tenants.isPending && <ActivityIndicator />}
      {tenants.data?.items.map((tenant) => (
        <ListRow
          key={tenant.id}
          title={tenant.name}
          selected={tenant.current}
          detail={
            switchTenant.isPending && switchTenant.variables === tenant.id ? (
              <ActivityIndicator />
            ) : undefined
          }
          disabled={switchTenant.isPending}
          onPress={
            tenant.current
              ? undefined
              : () =>
                  switchTenant.mutate(tenant.id, {
                    onSuccess: () => router.back(),
                  })
          }
        />
      ))}
      {tenants.isError && (
        <ErrorState error={tenants.error} onRetry={() => tenants.refetch()} />
      )}
      {[switchTenant.error].map(
        (error, index) =>
          error && (
            <ThemedText
              key={index}
              themeColor="danger"
              accessibilityRole="alert"
            >
              {apiErrorMessage(error, t)}
            </ThemedText>
          ),
      )}
    </Screen>
  );
}
