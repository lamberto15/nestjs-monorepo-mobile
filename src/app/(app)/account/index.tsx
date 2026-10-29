import { useForm } from '@tanstack/react-form';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { z } from 'zod';

import { session } from '@/api/session';
import { Button } from '@/components/button';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useUpdateProfile } from '@/features/account/hooks';
import { LANGUAGES } from '@/features/account/language';
import {
  apiErrorMessage,
  fieldError,
  firstError,
} from '@/features/auth/errors';
import { useMe } from '@/features/auth/hooks';

export default function AccountScreen() {
  const { t, i18n } = useTranslation();
  const me = useMe();

  if (!me.data) {
    return (
      <Screen>
        {me.isError ? (
          <ThemedText themeColor="danger">
            {apiErrorMessage(me.error, t)}
          </ThemedText>
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
      <ProfileForm name={me.data.user.name} email={me.data.user.email} />
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
        title={t('account.notifications')}
        onPress={() => router.push('/account/notification-settings')}
      />
      <ListRow
        title={t('account.sessions')}
        onPress={() => router.push('/account/sessions')}
      />
      <Button
        title={t('account.signOut')}
        variant="secondary"
        onPress={() => session.signOut()}
      />
    </Screen>
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
