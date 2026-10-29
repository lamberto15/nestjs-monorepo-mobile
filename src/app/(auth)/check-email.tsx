import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

/** After a sign-up or a password-reset request: the link comes by email. */
export default function CheckEmailScreen() {
  const { t } = useTranslation();
  const { kind, email } = useLocalSearchParams<{
    kind: 'signUp' | 'forgot';
    email: string;
  }>();
  return (
    <Screen>
      <ThemedText>
        {t(kind === 'signUp' ? 'checkEmail.signUp' : 'checkEmail.forgot', {
          email,
        })}
      </ThemedText>
      <Button
        title={t('checkEmail.back')}
        onPress={() => router.dismissTo('/sign-in')}
      />
    </Screen>
  );
}
