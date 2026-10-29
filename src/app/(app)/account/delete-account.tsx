import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import {
  useAccount,
  useCancelDeletion,
  useRequestDeletion,
} from '@/features/account/lifecycle';
import { StepUpCancelled } from '@/features/account/step-up';
import {
  apiErrorMessage,
  fieldError,
  firstError,
} from '@/features/auth/errors';
import { useMe } from '@/features/auth/hooks';
import { formatDateTime } from '@/i18n/format';

/**
 * Deleting the account (an App Store and Google Play requirement): carried
 * out after a grace period, cancellable until then, here or from the mail.
 */
export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const me = useMe();
  const account = useAccount();
  const cancel = useCancelDeletion();

  if (!account.data || !me.data) {
    const error = account.error ?? me.error;
    return (
      <Screen>
        {error ? (
          <ErrorState error={error} onRetry={() => account.refetch()} />
        ) : (
          <ActivityIndicator />
        )}
      </Screen>
    );
  }

  const deletion = account.data.deletion;
  if (deletion) {
    return (
      <Screen>
        <ThemedText>
          {t('deleteAccount.scheduled', {
            date: formatDateTime(deletion.scheduledFor),
          })}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {t('deleteAccount.pendingHint')}
        </ThemedText>
        {cancel.error && (
          <ThemedText themeColor="danger" accessibilityRole="alert">
            {apiErrorMessage(cancel.error, t)}
          </ThemedText>
        )}
        <Button
          title={t('deleteAccount.cancel')}
          loading={cancel.isPending}
          onPress={() => cancel.mutate()}
        />
      </Screen>
    );
  }

  return <RequestDeletion hasPassword={me.data.hasPassword} />;
}

function RequestDeletion({ hasPassword }: { hasPassword: boolean }) {
  const { t } = useTranslation();
  const request = useRequestDeletion();
  const form = useForm({
    defaultValues: { password: '' },
    validators: {
      onSubmit: z.object({
        password: hasPassword
          ? z.string().min(1, { error: t('validation.required') })
          : z.string(),
      }),
    },
    onSubmit: async ({ value }) => {
      await request
        .mutateAsync(hasPassword ? value.password : undefined)
        .catch(() => null);
    },
  });
  const error = request.error instanceof StepUpCancelled ? null : request.error;
  return (
    <Screen>
      <ThemedText>{t('deleteAccount.hint')}</ThemedText>
      <ThemedText themeColor="textSecondary">
        {t('deleteAccount.graceHint')}
      </ThemedText>
      {hasPassword && (
        <form.Field name="password">
          {(field) => (
            <TextField
              label={t('signIn.password')}
              value={field.state.value}
              onChangeText={field.handleChange}
              onBlur={field.handleBlur}
              error={
                firstError(field.state.meta.errors) ??
                fieldError(error, 'password')
              }
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
            />
          )}
        </form.Field>
      )}
      {Boolean(error) && !fieldError(error, 'password') && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(error, t)}
        </ThemedText>
      )}
      <Button
        title={t('deleteAccount.confirm')}
        variant="danger"
        loading={request.isPending}
        onPress={() => form.handleSubmit()}
      />
    </Screen>
  );
}
