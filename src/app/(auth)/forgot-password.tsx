import { useForm } from '@tanstack/react-form';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { apiErrorMessage, firstError } from '@/features/auth/errors';
import { useForgotPassword } from '@/features/auth/hooks';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const forgot = useForgotPassword();

  const form = useForm({
    defaultValues: { email: '' },
    validators: {
      onSubmit: z.object({ email: z.email({ error: t('validation.email') }) }),
    },
    onSubmit: async ({ value }) => {
      // The API answers the same whether the account exists or not.
      const sent = await forgot.mutateAsync(value.email).catch(() => null);
      if (sent) {
        router.replace({
          pathname: '/check-email',
          params: { kind: 'forgot', email: value.email },
        });
      }
    },
  });

  return (
    <Screen>
      <ThemedText themeColor="textSecondary">{t('forgot.hint')}</ThemedText>
      <form.Field name="email">
        {(field) => (
          <TextField
            label={t('forgot.email')}
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            error={firstError(field.state.meta.errors)}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            onSubmitEditing={() => form.handleSubmit()}
          />
        )}
      </form.Field>
      {forgot.error && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(forgot.error, t)}
        </ThemedText>
      )}
      <Button
        title={t('forgot.submit')}
        loading={forgot.isPending}
        onPress={() => form.handleSubmit()}
      />
    </Screen>
  );
}
