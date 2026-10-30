import { useForm } from '@tanstack/react-form';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { apiErrorMessage, firstError } from '@/features/auth/errors';
import { useSecondFactor } from '@/features/auth/hooks';
import { goToStep } from '@/features/auth/navigation';
import { signInPending } from '@/features/auth/sign-in-flow';

/** The second factor of a sign-in. */
export default function TwoFactorScreen() {
  const { t } = useTranslation();
  const verify = useSecondFactor();
  const [recovery, setRecovery] = useState(false);

  const schema = z.object({
    value: recovery
      ? z
          .string()
          .trim()
          .min(1, { error: t('validation.required') })
      : z.string().regex(/^\d{6}$/, { error: t('validation.code') }),
  });
  const form = useForm({
    defaultValues: { value: '' },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      const second = recovery
        ? { recoveryCode: value.value.trim() }
        : { code: value.value };
      const step = await verify.mutateAsync(second).catch(() => null);
      if (step && step !== 'twoFactor') {
        goToStep(step);
      }
    },
  });

  return (
    <Screen>
      <ThemedText themeColor="textSecondary">
        {t(recovery ? 'twoFactor.recoveryHint' : 'twoFactor.hint')}
      </ThemedText>
      <form.Field name="value">
        {(field) => (
          <TextField
            label={t(recovery ? 'twoFactor.recoveryCode' : 'twoFactor.code')}
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            error={firstError(field.state.meta.errors)}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            {...(recovery
              ? {}
              : {
                  keyboardType: 'number-pad',
                  autoComplete: 'one-time-code',
                  textContentType: 'oneTimeCode',
                  maxLength: 6,
                })}
            onSubmitEditing={() => form.handleSubmit()}
          />
        )}
      </form.Field>
      {verify.error && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(verify.error, t)}
        </ThemedText>
      )}
      {verify.error && !signInPending() && (
        // A provider's sign-in: a wrong code spent it, so it starts over.
        <Button
          title={t('twoFactor.startAgain')}
          variant="secondary"
          onPress={() => router.dismissTo('/sign-in')}
        />
      )}
      <Button
        title={t('twoFactor.submit')}
        loading={verify.isPending}
        onPress={() => form.handleSubmit()}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setRecovery(!recovery);
          form.reset();
          verify.reset();
        }}
      >
        <ThemedText type="linkPrimary">
          {t(recovery ? 'twoFactor.useCode' : 'twoFactor.useRecovery')}
        </ThemedText>
      </Pressable>
    </Screen>
  );
}
