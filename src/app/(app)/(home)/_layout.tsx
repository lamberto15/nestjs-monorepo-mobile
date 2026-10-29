import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function HomeLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('tabs.home') }} />
      <Stack.Screen name="search" options={{ title: t('search.title') }} />
      <Stack.Screen
        name="approvals/index"
        options={{ title: t('approvals.title') }}
      />
      <Stack.Screen
        name="approvals/[id]"
        options={{ title: t('approvals.request') }}
      />
      <Stack.Screen
        name="acknowledgments"
        options={{ title: t('acknowledgments.title') }}
      />
    </Stack>
  );
}
