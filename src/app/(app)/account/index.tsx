import { useForm } from '@tanstack/react-form';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { z } from 'zod';

import { session } from '@/api/session';
import { AvatarPicker } from '@/features/account/avatar-picker';
import {
  useAccount,
  useResendVerification,
} from '@/features/account/lifecycle';
import { formatDateTime } from '@/i18n/format';
import { Button } from '@/components/button';
import { ListGroup, ListRow } from '@/components/list-row';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useUpdateProfile } from '@/features/account/hooks';
import { useAppearance } from '@/features/account/appearance';
import { LANGUAGES } from '@/features/account/language';
import {
  apiErrorMessage,
  fieldError,
  firstError,
} from '@/features/auth/errors';
import { useMe } from '@/features/auth/hooks';

export default function AccountScreen() {
  const appearance = useAppearance();
  const { t, i18n } = useTranslation();
  const me = useMe();

  if (!me.data) {
    return (
      <Screen>
        {me.isError ? (
          <ErrorState error={me.error} onRetry={() => me.refetch()} />
        ) : (
          <ActivityIndicator />
        )}
      </Screen>
    );
  }

  const language = LANGUAGES.find(
    (item) => item.code === i18n.resolvedLanguage,
  );
  return (
    <Screen>
      <DeletionBanner />
      {!me.data.user.emailVerified && <VerifyEmailBanner />}
      <AvatarPicker
        name={me.data.user.name}
        avatarUrl={me.data.user.avatarUrl ?? null}
      />
      <ProfileForm name={me.data.user.name} email={me.data.user.email} />
      <ListGroup>
        <ListRow
          title={t('account.organization')}
          detail={me.data.tenant?.name}
          onPress={() => router.push('/account/organization')}
        />
        <ListRow
          title={t('account.language')}
          detail={language?.name}
          onPress={() => router.push('/account/language')}
        />
        <ListRow
          title={t('appearance.title')}
          detail={t(`appearance.${appearance}`)}
          onPress={() => router.push('/account/appearance')}
        />
        <ListRow
          title={t('account.notifications')}
          onPress={() => router.push('/account/notification-settings')}
        />
      </ListGroup>
      <ListGroup>
        <ListRow
          title={t('account.security')}
          detail={me.data.mfaEnabled ? t('account.twoFactorOn') : undefined}
          onPress={() => router.push('/account/security')}
        />
        <ListRow
          title={t('account.sessions')}
          onPress={() => router.push('/account/sessions')}
        />
        <ListRow
          title={t('account.yourData')}
          onPress={() => router.push('/account/your-data')}
        />
      </ListGroup>
      <Button
        title={t('account.signOut')}
        variant="secondary"
        onPress={() => session.signOut()}
      />
      <ListRow
        title={t('account.delete')}
        onPress={() => router.push('/account/delete-account')}
      />
    </Screen>
  );
}

/** A deletion is scheduled: when, and a way to cancel it from here. */
function DeletionBanner() {
  const { t } = useTranslation();
  const account = useAccount();
  const deletion = account.data?.deletion;
  if (!deletion) {
    return null;
  }
  return (
    <ListRow
      title={t('deleteAccount.scheduled', {
        date: formatDateTime(deletion.scheduledFor),
      })}
      subtitle={t('deleteAccount.cancelHint')}
      onPress={() => router.push('/account/delete-account')}
    />
  );
}

function VerifyEmailBanner() {
  const { t } = useTranslation();
  const resend = useResendVerification();
  return (
    <ListRow
      title={t('account.unverified')}
      subtitle={
        resend.isSuccess
          ? t('account.verificationSent')
          : resend.error
            ? apiErrorMessage(resend.error, t)
            : t('account.unverifiedHint')
      }
      onPress={resend.isSuccess ? undefined : () => resend.mutate()}
      disabled={resend.isPending}
    />
  );
}

function ProfileForm({ name, email }: { name: string; email: string }) {
  const { t } = useTranslation();
  const update = useUpdateProfile();
  const form = useForm({
    defaultValues: { name },
    validators: {
      onSubmit: z.object({
        name: z
          .string()
          .trim()
          .min(1, { error: t('validation.required') }),
      }),
    },
    onSubmit: async ({ value }) => {
      await update.mutateAsync({ name: value.name.trim() }).catch(() => null);
    },
  });

  return (
    <>
      <ThemedText themeColor="textSecondary">
        {t('account.email', { email })}
      </ThemedText>
      <form.Field name="name">
        {(field) => (
          <TextField
            label={t('account.name')}
            value={field.state.value}
            onChangeText={(value) => {
              field.handleChange(value);
              update.reset();
            }}
            onBlur={field.handleBlur}
            error={
              firstError(field.state.meta.errors) ??
              fieldError(update.error, 'name')
            }
            autoComplete="name"
            textContentType="name"
            returnKeyType="done"
            onSubmitEditing={() => form.handleSubmit()}
          />
        )}
      </form.Field>
      {update.error && !fieldError(update.error, 'name') && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(update.error, t)}
        </ThemedText>
      )}
      {update.isSuccess && (
        <ThemedText themeColor="textSecondary">{t('account.saved')}</ThemedText>
      )}
      <Button
        title={t('account.save')}
        loading={update.isPending}
        onPress={() => form.handleSubmit()}
      />
    </>
  );
}
