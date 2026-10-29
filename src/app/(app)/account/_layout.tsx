import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AccountLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('account.title') }} />
      <Stack.Screen name="language" options={{ title: t('language.title') }} />
      <Stack.Screen
        name="organization"
        options={{ title: t('organization.title') }}
      />
      <Stack.Screen name="sessions" options={{ title: t('sessions.title') }} />
      <Stack.Screen name="security" options={{ title: t('security.title') }} />
      <Stack.Screen name="two-factor" options={{ title: t('mfa.title') }} />
      <Stack.Screen name="your-data" options={{ title: t('yourData.title') }} />
      <Stack.Screen
        name="delete-account"
        options={{ title: t('deleteAccount.title') }}
      />
      <Stack.Screen
        name="notification-settings"
        options={{ title: t('notificationSettings.title') }}
      />
    </Stack>
  );
}
