import { useForm } from '@tanstack/react-form';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { API_URL } from '@/api/public-api';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  apiErrorMessage,
  fieldError,
  firstError,
} from '@/features/auth/errors';
import {
  useAuthMethods,
  usePasskeySignIn,
  useProviderSignIn,
  useSignIn,
} from '@/features/auth/hooks';
import { goToStep } from '@/features/auth/navigation';
import { PasskeyFailed, passkeysAvailable } from '@/features/auth/passkeys';
import { providerName } from '@/features/auth/providers';
import { ProviderSignInError } from '@/features/auth/sign-in-flow';

export default function SignInScreen() {
  const { t } = useTranslation();
  const methods = useAuthMethods();
  const signIn = useSignIn();
  const provider = useProviderSignIn();
  const passkey = usePasskeySignIn();

  const schema = z.object({
    email: z.email({ error: t('validation.email') }),
    password: z.string().min(1, { error: t('validation.required') }),
  });
  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      const step = await signIn.mutateAsync(value).catch(() => null);
      if (step) {
        goToStep(step);
      }
    },
  });

  const failed = signIn.error && !fieldError(signIn.error, 'email');

  return (
    <Screen>
      <ThemedText type="subtitle">{t('app.name')}</ThemedText>

      <form.Field name="email">
        {(field) => (
          <TextField
            label={t('signIn.email')}
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            error={
              firstError(field.state.meta.errors) ??
              fieldError(signIn.error, 'email')
            }
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
          />
        )}
      </form.Field>
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
            returnKeyType="go"
            onSubmitEditing={() => form.handleSubmit()}
          />
        )}
      </form.Field>

      {failed && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(signIn.error, t)}
        </ThemedText>
      )}

      <Button
        title={t('signIn.submit')}
        loading={signIn.isPending}
        onPress={() => form.handleSubmit()}
      />

      {methods.data?.passkeys && passkeysAvailable() && (
        <Button
          title={t('signIn.passkey')}
          variant="secondary"
          loading={passkey.isPending}
          onPress={async () => {
            // The account's passkeys when an email is typed, else the device's.
            const email = form.getFieldValue('email').trim();
            const step = await passkey
              .mutateAsync(
                z.email().safeParse(email).success ? email : undefined,
              )
              .catch(() => null);
            if (step) {
              goToStep(step);
            }
          }}
        />
      )}
      {passkey.error && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {passkey.error instanceof PasskeyFailed
            ? t('signIn.passkeyFailed') +
              (__DEV__ ? ` (${passkey.error.reason})` : '')
            : apiErrorMessage(passkey.error, t)}
        </ThemedText>
      )}
      {(methods.data?.providers ?? []).map((name) => (
        <Button
          key={name}
          title={t('signIn.with', { provider: providerName(name) })}
          variant="secondary"
          loading={provider.isPending && provider.variables === name}
          disabled={provider.isPending}
          onPress={async () => {
            const step = await provider.mutateAsync(name).catch(() => null);
            if (step) {
              goToStep(step);
            }
          }}
        />
      ))}
      {provider.error && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {provider.error instanceof ProviderSignInError
            ? t('signIn.providerFailed')
            : apiErrorMessage(provider.error, t)}
        </ThemedText>
      )}
      <View style={styles.links}>
        <Link href="/forgot-password" asChild>
          <Pressable accessibilityRole="link">
            <ThemedText type="linkPrimary">{t('signIn.forgot')}</ThemedText>
          </Pressable>
        </Link>
        {methods.data?.signUp && (
          <Link href="/sign-up" asChild>
            <Pressable accessibilityRole="link">
              <ThemedText type="linkPrimary">{t('signIn.signUp')}</ThemedText>
            </Pressable>
          </Link>
        )}
      </View>

      {methods.isError ? (
        <View style={styles.server}>
          <ThemedText type="small" themeColor="danger">
            {t('server.unreachable', { url: API_URL })}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => methods.refetch()}
          >
            <ThemedText type="linkPrimary">{t('server.retry')}</ThemedText>
          </Pressable>
        </View>
      ) : (
        methods.isSuccess && (
          <ThemedText type="small" themeColor="textSecondary">
            {t('server.connected', { url: API_URL })}
          </ThemedText>
        )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  server: {
    gap: Spacing.one,
  },
});
