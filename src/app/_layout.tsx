import '@/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { queryClient } from '@/api/query-client';
import { session } from '@/api/session';
import { OfflineBanner } from '@/components/offline-banner';
import { useSessionStatus } from '@/hooks/use-session-status';

SplashScreen.preventAutoHideAsync();
void session.restore();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootNavigator />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const status = useSessionStatus();

  useEffect(() => {
    if (status !== 'restoring') {
      void SplashScreen.hideAsync();
    }
    if (status === 'signedOut') {
      queryClient.clear(); // nothing cached outlives its session
    }
  }, [status]);

  // The splash stays up until the stored session is checked: no flash of
  // the sign-in screen for a signed-in user.
  if (status === 'restoring') {
    return null;
  }

  const signedIn = status === 'signedIn';
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn} redirectTo="/sign-in">
          <Stack.Screen name="(app)" />
          <Stack.Screen
            name="reauthenticate"
            options={{ presentation: 'modal' }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn} redirectTo="/">
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      <OfflineBanner />
    </>
  );
}
