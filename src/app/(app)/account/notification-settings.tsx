import { useForm } from '@tanstack/react-form';
import { getCalendars } from 'expo-localization';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useUpdateProfile } from '@/features/account/hooks';
import {
  apiErrorMessage,
  fieldError,
  firstError,
} from '@/features/auth/errors';
import {
  channelValue,
  useNotificationTypes,
  usePreferences,
  useQuietHours,
  useRefreshQuietHours,
  useSavePreferences,
  useSetQuietHours,
  withChannel,
  type EmailChoice,
} from '@/features/notifications/settings';

/** Per notification type, how it reaches the person; and quiet hours for push and SMS. */
export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const types = useNotificationTypes();
  const preferences = usePreferences();
  const save = useSavePreferences();

  if (!types.data || !preferences.data) {
    const error = types.error ?? preferences.error;
    return (
      <Screen>
        {error ? (
          <ErrorState
            error={error}
            onRetry={() => {
              void types.refetch();
              void preferences.refetch();
            }}
          />
        ) : (
          <ActivityIndicator />
        )}
      </Screen>
    );
  }

  const current = save.isPending
    ? (save.variables ?? preferences.data.types)
    : preferences.data.types;
  const emailChoices: { value: EmailChoice; label: string }[] = [
    { value: false, label: t('notificationSettings.email.off') },
    { value: 'immediate', label: t('notificationSettings.email.immediate') },
    { value: 'hourly', label: t('notificationSettings.email.hourly') },
    { value: 'daily', label: t('notificationSettings.email.daily') },
  ];

  return (
    <Screen>
      <ThemedText themeColor="textSecondary">
        {t('notificationSettings.hint')}
      </ThemedText>
      {/* At the top: a refused save reverts the choice, and the reason must be seen. */}
      {save.error && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(save.error, t)}
        </ThemedText>
      )}
      {types.data.items.map((type) => (
        <ThemedView
          key={type.type}
          type="backgroundElement"
          style={styles.card}
        >
          <ThemedText type="smallBold">{type.label}</ThemedText>
          {type.mandatory && (
            <ThemedText type="small" themeColor="textSecondary">
              {t('notificationSettings.mandatory')}
            </ThemedText>
          )}
          <ChoiceChips
            accessibilityLabel={t('notificationSettings.emailLabel', {
              type: type.label,
            })}
            choices={emailChoices.map((choice) => ({
              ...choice,
              disabled: type.mandatory && choice.value === false,
            }))}
            value={channelValue(current, type, 'email') ?? false}
            disabled={save.isPending}
            onChange={(value) =>
              save.mutate(withChannel(current, type.type, 'email', value))
            }
          />
          {(['push', 'sms'] as const)
            .filter((channel) => channel in type.channels)
            .map((channel) => (
              <View key={channel} style={styles.switchRow}>
                <ThemedText type="small">
                  {t(`notificationSettings.${channel}`)}
                </ThemedText>
                <Switch
                  accessibilityLabel={t(`notificationSettings.${channel}`)}
                  value={channelValue(current, type, channel) ?? false}
                  disabled={save.isPending || type.mandatory}
                  onValueChange={(value) =>
                    save.mutate(withChannel(current, type.type, channel, value))
                  }
                />
              </View>
            ))}
        </ThemedView>
      ))}
      <QuietHours />
    </Screen>
  );
}

const time = /^([01]\d|2[0-3]):[0-5]\d$/;

function QuietHours() {
  const quietHours = useQuietHours();
  if (!quietHours.data) {
    return quietHours.error ? (
      <ErrorState
        error={quietHours.error}
        onRetry={() => quietHours.refetch()}
      />
    ) : (
      <ActivityIndicator />
    );
  }
  // Mounted once loaded: the form starts from the saved window.
  return <QuietHoursForm window={quietHours.data.quietHours} />;
}

function QuietHoursForm({
  window,
}: {
  window: { start: string; end: string; timezone: string } | null;
}) {
  const { t } = useTranslation();
  const setQuietHours = useSetQuietHours();
  const updateProfile = useUpdateProfile();
  const refreshQuietHours = useRefreshQuietHours();
  const deviceZone = getCalendars()[0]?.timeZone ?? undefined;

  const form = useForm({
    defaultValues: {
      start: window?.start ?? '22:00',
      end: window?.end ?? '07:00',
    },
    validators: {
      onSubmit: z.object({
        start: z.string().regex(time, { error: t('validation.time') }),
        end: z.string().regex(time, { error: t('validation.time') }),
      }),
    },
    onSubmit: async ({ value }) => {
      await setQuietHours.mutateAsync(value).catch(() => null);
    },
  });

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{t('quietHours.title')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {window ? t('quietHours.on', { ...window }) : t('quietHours.off')}
      </ThemedText>
      <View style={styles.times}>
        {(['start', 'end'] as const).map((name) => (
          <View key={name} style={styles.time}>
            <form.Field name={name}>
              {(field) => (
                <TextField
                  label={t(`quietHours.${name}`)}
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  error={
                    firstError(field.state.meta.errors) ??
                    fieldError(setQuietHours.error, name)
                  }
                  placeholder="HH:MM"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              )}
            </form.Field>
          </View>
        ))}
      </View>
      <Button
        title={t('quietHours.save')}
        loading={setQuietHours.isPending && setQuietHours.variables !== null}
        onPress={() => form.handleSubmit()}
      />
      {window && (
        <Button
          title={t('quietHours.turnOff')}
          variant="secondary"
          loading={setQuietHours.isPending && setQuietHours.variables === null}
          onPress={() => setQuietHours.mutate(null)}
        />
      )}
      {window && deviceZone && deviceZone !== window.timezone && (
        <Button
          title={t('quietHours.useDeviceZone', { zone: deviceZone })}
          variant="secondary"
          loading={updateProfile.isPending}
          onPress={() =>
            updateProfile.mutate(
              { timezone: deviceZone },
              { onSuccess: () => void refreshQuietHours() },
            )
          }
        />
      )}
      {[setQuietHours.error, updateProfile.error].map(
        (error, index) =>
          error &&
          !fieldError(error, 'start') &&
          !fieldError(error, 'end') && (
            <ThemedText
              key={index}
              themeColor="danger"
              accessibilityRole="alert"
            >
              {apiErrorMessage(error, t)}
            </ThemedText>
          ),
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  times: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  time: {
    flex: 1,
  },
});
