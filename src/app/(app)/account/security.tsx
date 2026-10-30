import { useForm } from '@tanstack/react-form';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert } from 'react-native';
import { z } from 'zod';

import { isApiError } from '@/api/client';
import { session } from '@/api/session';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { AppLockSwitch } from '@/features/account/app-lock-switch';
import {
  useIdentities,
  useUnlinkIdentity,
} from '@/features/account/identities';
import { useChangePassword } from '@/features/account/lifecycle';
import { StepUpCancelled } from '@/features/account/step-up';
import {
  apiErrorMessage,
  fieldError,
  firstError,
} from '@/features/auth/errors';
import {
  useAddPasskey,
  usePasskeys,
  useRemovePasskey,
} from '@/features/account/passkeys';
import { useMe } from '@/features/auth/hooks';
import { PasskeyFailed, passkeysAvailable } from '@/features/auth/passkeys';
import { providerName } from '@/features/auth/providers';
import { formatDateTime } from '@/i18n/format';

/** Two-factor, the app lock, passkeys, linked providers, and the password. */
export default function SecurityScreen() {
  const { t } = useTranslation();
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
  return (
    <Screen>
      <ListRow
        title={t('mfa.title')}
        detail={me.data.mfaEnabled ? t('mfa.on') : t('mfa.off')}
        onPress={() => router.push('/account/two-factor')}
      />
      <AppLockSwitch />
      <Passkeys />
      <LinkedProviders />
      <ChangePassword hasPassword={me.data.hasPassword} />
    </Screen>
  );
}

/** The account's passkeys; adding one makes it on this device. */
function Passkeys() {
  const { t } = useTranslation();
  const passkeys = usePasskeys();
  const add = useAddPasskey();
  const remove = useRemovePasskey();
  const items = passkeys.data?.items ?? [];
  const canAdd = passkeysAvailable();
  if (!items.length && !canAdd) {
    return null; // Expo Go, and none made elsewhere
  }
  const error = [add.error, remove.error].find(
    (e) => e && !(e instanceof StepUpCancelled),
  );
  return (
    <>
      <ThemedText type="smallBold" accessibilityRole="header">
        {t('passkeys.title')}
      </ThemedText>
      {items.map((passkey) => (
        <ListRow
          key={passkey.id}
          title={passkey.name}
          subtitle={[
            passkey.backedUp ? t('passkeys.synced') : null,
            passkey.lastUsedAt
              ? t('passkeys.lastUsed', {
                  time: formatDateTime(passkey.lastUsedAt),
                })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          detail={
            <Button
              title={t('passkeys.remove')}
              variant="secondary"
              loading={remove.isPending && remove.variables === passkey.id}
              onPress={() =>
                Alert.alert(
                  t('passkeys.removeTitle', { name: passkey.name }),
                  undefined,
                  [
                    { text: t('sessions.cancel'), style: 'cancel' },
                    {
                      text: t('passkeys.remove'),
                      style: 'destructive',
                      onPress: () => remove.mutate(passkey.id),
                    },
                  ],
                )
              }
            />
          }
        />
      ))}
      {canAdd && (
        <Button
          title={t('passkeys.add')}
          variant="secondary"
          loading={add.isPending}
          onPress={() => add.mutate()}
        />
      )}
      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {isApiError(error) && error.code === 'last_sign_in_method'
            ? t('identities.last')
            : error instanceof PasskeyFailed
              ? error.reason
              : apiErrorMessage(error, t)}
        </ThemedText>
      )}
    </>
  );
}

/** Providers the account signs in with; disconnecting asks first. */
function LinkedProviders() {
  const { t } = useTranslation();
  const identities = useIdentities();
  const unlink = useUnlinkIdentity();
  const items = identities.data?.items ?? [];
  if (!items.length) {
    return null;
  }
  return (
    <>
      <ThemedText type="smallBold" accessibilityRole="header">
        {t('identities.title')}
      </ThemedText>
      {items.map((identity) => (
        <ListRow
          key={identity.provider}
          title={providerName(identity.provider)}
          subtitle={identity.email ?? undefined}
          detail={
            <Button
              title={t('identities.disconnect')}
              variant="secondary"
              loading={
                unlink.isPending && unlink.variables === identity.provider
              }
              onPress={() =>
                Alert.alert(
                  t('identities.disconnectTitle', {
                    provider: providerName(identity.provider),
                  }),
                  t('identities.disconnectBody'),
                  [
                    { text: t('sessions.cancel'), style: 'cancel' },
                    {
                      text: t('identities.disconnect'),
                      style: 'destructive',
                      onPress: () => unlink.mutate(identity.provider),
                    },
                  ],
                )
              }
            />
          }
        />
      ))}
      {unlink.error && !(unlink.error instanceof StepUpCancelled) && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {isApiError(unlink.error) &&
          unlink.error.code === 'last_sign_in_method'
            ? t('identities.last')
            : apiErrorMessage(unlink.error, t)}
        </ThemedText>
      )}
    </>
  );
}

function ChangePassword({ hasPassword }: { hasPassword: boolean }) {
  const { t } = useTranslation();
  const change = useChangePassword();
  const form = useForm({
    defaultValues: { currentPassword: '', newPassword: '' },
    validators: {
      onSubmit: z.object({
        currentPassword: hasPassword
          ? z.string().min(1, { error: t('validation.required') })
          : z.string(),
        // The API's minimum; it also refuses passwords found in breaches.
        newPassword: z
          .string()
          .min(12, { error: t('validation.passwordLength') }),
      }),
    },
    onSubmit: async ({ value }) => {
      const done = await change
        .mutateAsync({
          ...(hasPassword && { currentPassword: value.currentPassword }),
          newPassword: value.newPassword,
        })
        .then(() => true)
        .catch(() => false);
      if (done) {
        // Every token client is signed out, this app included.
        Alert.alert(t('password.changed'), t('password.signInAgain'), [
          { text: 'OK', onPress: () => void session.signOut() },
        ]);
      }
    },
  });

  const error = change.error instanceof StepUpCancelled ? null : change.error;
  return (
    <>
      <ThemedText type="smallBold">
        {t(hasPassword ? 'password.change' : 'password.set')}
      </ThemedText>
      {hasPassword && (
        <form.Field name="currentPassword">
          {(field) => (
            <TextField
              label={t('password.current')}
              value={field.state.value}
              onChangeText={field.handleChange}
              onBlur={field.handleBlur}
              error={
                firstError(field.state.meta.errors) ??
                fieldError(error, 'currentPassword')
              }
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
            />
          )}
        </form.Field>
      )}
      <form.Field name="newPassword">
        {(field) => (
          <TextField
            label={t('password.new')}
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            error={
              firstError(field.state.meta.errors) ??
              fieldError(error, 'newPassword')
            }
            placeholder={t('signUp.passwordHint')}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
        )}
      </form.Field>
      {Boolean(error) &&
        !fieldError(error, 'currentPassword') &&
        !fieldError(error, 'newPassword') && (
          <ThemedText themeColor="danger" accessibilityRole="alert">
            {apiErrorMessage(error, t)}
          </ThemedText>
        )}
      <Button
        title={t('password.save')}
        loading={change.isPending}
        onPress={() => form.handleSubmit()}
      />
    </>
  );
}
