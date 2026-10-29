import { useForm } from '@tanstack/react-form';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import {
  useConfirmMfa,
  useDisableMfa,
  useEnrollMfa,
  useMfa,
  useNewRecoveryCodes,
} from '@/features/account/lifecycle';
import { StepUpCancelled } from '@/features/account/step-up';
import { apiErrorMessage, firstError } from '@/features/auth/errors';

/**
 * Two-factor: turn on (the secret for an authenticator app, then a code),
 * see the recovery codes once, make new ones, turn off.
 */
export default function TwoFactorScreen() {
  const { t } = useTranslation();
  const mfa = useMfa();
  const enroll = useEnrollMfa();
  const confirm = useConfirmMfa();
  const disable = useDisableMfa();
  const newCodes = useNewRecoveryCodes();
  // Shown once, right after they are made.
  const [codes, setCodes] = useState<string[] | null>(null);

  if (!mfa.data) {
    return (
      <Screen>
        {mfa.isError ? (
          <ErrorState error={mfa.error} onRetry={() => mfa.refetch()} />
        ) : (
          <ActivityIndicator />
        )}
      </Screen>
    );
  }

  const shown = (error: unknown) =>
    error && !(error instanceof StepUpCancelled) ? (
      <ThemedText themeColor="danger" accessibilityRole="alert">
        {apiErrorMessage(error, t)}
      </ThemedText>
    ) : null;

  if (codes) {
    return (
      <Screen>
        <ThemedText type="smallBold">{t('mfa.recoveryTitle')}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {t('mfa.recoveryHint')}
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.codes}>
          {codes.map((code) => (
            <ThemedText key={code} style={styles.mono} selectable>
              {code}
            </ThemedText>
          ))}
        </ThemedView>
        <Button
          title={t('mfa.copyCodes')}
          variant="secondary"
          onPress={() => void Clipboard.setStringAsync(codes.join('\n'))}
        />
        <Button title={t('mfa.savedCodes')} onPress={() => setCodes(null)} />
      </Screen>
    );
  }

  if (mfa.data.enabled) {
    return (
      <Screen>
        <ThemedText>{t('mfa.enabled')}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {t('mfa.remaining', { count: mfa.data.remainingRecoveryCodes })}
        </ThemedText>
        {shown(newCodes.error ?? disable.error)}
        <Button
          title={t('mfa.newCodes')}
          variant="secondary"
          loading={newCodes.isPending}
          onPress={() =>
            newCodes.mutate(undefined, {
              onSuccess: (made) => setCodes(made.recoveryCodes),
            })
          }
        />
        <Button
          title={t('mfa.turnOff')}
          variant="danger"
          loading={disable.isPending}
          onPress={() =>
            Alert.alert(t('mfa.turnOffTitle'), t('mfa.turnOffBody'), [
              { text: t('sessions.cancel'), style: 'cancel' },
              {
                text: t('mfa.turnOff'),
                style: 'destructive',
                onPress: () => disable.mutate(),
              },
            ])
          }
        />
      </Screen>
    );
  }

  if (!enroll.data) {
    return (
      <Screen>
        <ThemedText>{t('mfa.offHint')}</ThemedText>
        {shown(enroll.error)}
        <Button
          title={t('mfa.turnOn')}
          loading={enroll.isPending}
          onPress={() => enroll.mutate()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ThemedText>{t('mfa.addHint')}</ThemedText>
      <Button
        title={t('mfa.openApp')}
        onPress={() =>
          void Linking.openURL(enroll.data.uri).catch(() =>
            Alert.alert(t('mfa.noApp')),
          )
        }
      />
      <ThemedText themeColor="textSecondary">{t('mfa.orKey')}</ThemedText>
      <ThemedView type="backgroundElement" style={styles.codes}>
        <ThemedText style={styles.mono} selectable>
          {enroll.data.secret}
        </ThemedText>
      </ThemedView>
      <Button
        title={t('mfa.copyKey')}
        variant="secondary"
        onPress={() => void Clipboard.setStringAsync(enroll.data.secret)}
      />
      <ConfirmCode
        pending={confirm.isPending}
        error={confirm.error}
        onConfirm={(code) =>
          confirm.mutateAsync(code).then((made) => setCodes(made.recoveryCodes))
        }
      />
    </Screen>
  );
}

function ConfirmCode({
  pending,
  error,
  onConfirm,
}: {
  pending: boolean;
  error: unknown;
  onConfirm: (code: string) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { code: '' },
    validators: {
      onSubmit: z.object({
        code: z.string().regex(/^\d{6}$/, { error: t('validation.code') }),
      }),
    },
    onSubmit: async ({ value }) => {
      await onConfirm(value.code).catch(() => null);
    },
  });
  return (
    <View style={styles.confirm}>
      <form.Field name="code">
        {(field) => (
          <TextField
            label={t('mfa.firstCode')}
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            error={
              firstError(field.state.meta.errors) ??
              (error ? apiErrorMessage(error, t) : undefined)
            }
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
          />
        )}
      </form.Field>
      <Button
        title={t('mfa.confirm')}
        loading={pending}
        onPress={() => form.handleSubmit()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  codes: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  mono: {
    fontFamily: Fonts?.mono,
    letterSpacing: 1,
  },
  confirm: {
    gap: Spacing.three,
  },
});
