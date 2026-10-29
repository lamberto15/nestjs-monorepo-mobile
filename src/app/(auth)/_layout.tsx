import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

/** The signed-out screens: sign-in and what leads from it. */
export default function AuthLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen
        name="two-factor"
        options={{ title: t('twoFactor.title') }}
      />
      <Stack.Screen
        name="choose-tenant"
        options={{ title: t('chooseTenant.title') }}
      />
      <Stack.Screen name="sign-up" options={{ title: t('signUp.title') }} />
      <Stack.Screen
        name="forgot-password"
        options={{ title: t('forgot.title') }}
      />
      <Stack.Screen
        name="check-email"
        options={{ title: t('checkEmail.title'), headerBackVisible: false }}
      />
    </Stack>
  );
}
