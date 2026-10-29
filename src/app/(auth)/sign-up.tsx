import { useForm } from '@tanstack/react-form';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import {
  apiErrorMessage,
  fieldError,
  firstError,
} from '@/features/auth/errors';
import { useAuthMethods, useSignUp } from '@/features/auth/hooks';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const methods = useAuthMethods();
  const signUp = useSignUp();
  const askTenant = Boolean(methods.data?.tenantSignUp);

  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: t('validation.required') }),
    email: z.email({ error: t('validation.email') }),
    // The API's minimum; it also refuses passwords found in breaches.
    password: z.string().min(12, { error: t('validation.passwordLength') }),
    tenantName: z.string(),
  });
  const form = useForm({
    defaultValues: { name: '', email: '', password: '', tenantName: '' },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      const { tenantName, ...rest } = value;
      const created = await signUp
        .mutateAsync({
          ...rest,
          name: rest.name.trim(),
          ...(askTenant &&
            tenantName.trim() && { tenantName: tenantName.trim() }),
        })
        .catch(() => null);
      if (created) {
        router.replace({
          pathname: '/check-email',
          params: { kind: 'signUp', email: value.email },
        });
      }
    },
  });

  const fields = ['name', 'email', 'password', 'tenantName'] as const;
  const general =
    signUp.error && !fields.some((name) => fieldError(signUp.error, name));

  return (
    <Screen>
      <form.Field name="name">
        {(field) => (
          <TextField
            label={t('signUp.name')}
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            error={
              firstError(field.state.meta.errors) ??
              fieldError(signUp.error, 'name')
            }
            autoComplete="name"
            textContentType="name"
          />
        )}
      </form.Field>
      <form.Field name="email">
        {(field) => (
          <TextField
            label={t('signUp.email')}
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            error={
              firstError(field.state.meta.errors) ??
              fieldError(signUp.error, 'email')
            }
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
          />
        )}
      </form.Field>
      <form.Field name="password">
        {(field) => (
          <TextField
            label={t('signUp.password')}
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            error={
              firstError(field.state.meta.errors) ??
              fieldError(signUp.error, 'password')
            }
            placeholder={t('signUp.passwordHint')}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
        )}
      </form.Field>
      {askTenant && (
        <form.Field name="tenantName">
          {(field) => (
            <TextField
              label={t('signUp.tenantName')}
              value={field.state.value}
              onChangeText={field.handleChange}
              onBlur={field.handleBlur}
              error={fieldError(signUp.error, 'tenantName')}
              autoComplete="organization"
              textContentType="organizationName"
            />
          )}
        </form.Field>
      )}

      {general && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(signUp.error, t)}
        </ThemedText>
      )}
      <Button
        title={t('signUp.submit')}
        loading={signUp.isPending}
        onPress={() => form.handleSubmit()}
      />
      <Button
        title={t('signUp.haveAccount')}
        variant="secondary"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
