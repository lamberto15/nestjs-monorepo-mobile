import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable } from 'react-native';
import { z } from 'zod';

import { api } from '@/api/api';
import { unwrap } from '@/api/client';
import { session } from '@/api/session';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { finishStepUp } from '@/features/account/step-up';
import { apiErrorMessage, firstError } from '@/features/auth/errors';

/** "Confirm it's you": the password (and a code with two-factor) again, before a sensitive action. */
export default function ReauthenticateScreen() {
  const { t } = useTranslation();
  const how = useQuery({
    queryKey: ['auth', 'reauthenticate'],
    queryFn: () => unwrap(api.GET('/v1/auth/reauthenticate')),
    staleTime: 0,
  });
  const [recovery, setRecovery] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const proved = useRef(false);

  // Closed without proving it (swipe down, back): the waiting action gives up.
  useEffect(() => () => finishStepUp(proved.current), []);

  const methods = how.data?.methods ?? [];
  const withPassword = methods.includes('password');
  const withCode =
    Boolean(how.data?.mfaRequired) ||
    (!withPassword && methods.includes('totp'));

  const form = useForm({
    defaultValues: { password: '', code: '' },
    validators: {
      onSubmit: z.object({
        password: withPassword
          ? z.string().min(1, { error: t('validation.required') })
          : z.string(),
        code: !withCode
          ? z.string()
          : recovery
            ? z
                .string()
                .trim()
                .min(1, { error: t('validation.required') })
            : z.string().regex(/^\d{6}$/, { error: t('validation.code') }),
      }),
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        await session.reauthenticate({
          ...(withPassword && { password: value.password }),
          ...(withCode &&
            (recovery
              ? { recoveryCode: value.code.trim() }
              : { code: value.code })),
        });
        proved.current = true;
        router.back();
      } catch (failed) {
        setError(failed);
      }
    },
  });

  if (!how.data) {
    return (
      <Screen>
        {how.isError ? (
          <ErrorState error={how.error} onRetry={() => how.refetch()} />
        ) : (
          <ActivityIndicator />
        )}
      </Screen>
    );
  }

  if (!withPassword && !withCode) {
    // An account that signs in only by link or provider can't prove it here.
    return (
      <Screen>
        <ThemedText type="subtitle">{t('reauth.title')}</ThemedText>
        <ThemedText>{t('reauth.signInAgain')}</ThemedText>
        <Button
          title={t('account.signOut')}
          onPress={() => session.signOut()}
        />
        <Button
          title={t('sessions.cancel')}
          variant="secondary"
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ThemedText type="subtitle">{t('reauth.title')}</ThemedText>
      <ThemedText themeColor="textSecondary">{t('reauth.hint')}</ThemedText>
      {withPassword && (
        <form.Field name="password">
          {(field) => (
            <TextField
              label={t('signIn.password')}
              value={field.state.value}
              onChangeText={field.handleChange}
              onBlur={field.handleBlur}
              error={firstError(field.state.meta.errors)}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              autoFocus
            />
          )}
        </form.Field>
      )}
      {withCode && (
        <>
          <form.Field name="code">
            {(field) => (
              <TextField
                label={t(
                  recovery ? 'twoFactor.recoveryCode' : 'twoFactor.code',
                )}
                value={field.state.value}
                onChangeText={field.handleChange}
                onBlur={field.handleBlur}
                error={firstError(field.state.meta.errors)}
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
              />
            )}
          </form.Field>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRecovery(!recovery);
              form.setFieldValue('code', '');
            }}
          >
            <ThemedText type="linkPrimary">
              {t(recovery ? 'twoFactor.useCode' : 'twoFactor.useRecovery')}
            </ThemedText>
          </Pressable>
        </>
      )}
      {Boolean(error) && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(error, t)}
        </ThemedText>
      )}
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(submitting) => (
          <Button
            title={t('reauth.confirm')}
            loading={submitting}
            onPress={() => form.handleSubmit()}
          />
        )}
      </form.Subscribe>
      <Button
        title={t('sessions.cancel')}
        variant="secondary"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
