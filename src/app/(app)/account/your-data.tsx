import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  useConsentKinds,
  useConsents,
  useExports,
  useRequestExport,
  useSetConsent,
} from '@/features/account/lifecycle';
import { StepUpCancelled } from '@/features/account/step-up';
import { apiErrorMessage } from '@/features/auth/errors';
import { formatDateTime } from '@/i18n/format';

/** A copy of everything the account holds, and what the person agreed to. */
export default function YourDataScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <ThemedText type="smallBold">{t('yourData.exportTitle')}</ThemedText>
      <ThemedText themeColor="textSecondary">
        {t('yourData.exportHint')}
      </ThemedText>
      <Exports />
      <ThemedText type="smallBold">{t('yourData.consentsTitle')}</ThemedText>
      <Consents />
    </Screen>
  );
}

function Exports() {
  const { t } = useTranslation();
  const exports = useExports();
  const request = useRequestExport();
  const running = exports.data?.items.some(
    (item) => item.status === 'queued' || item.status === 'running',
  );
  return (
    <>
      <Button
        title={t('yourData.request')}
        loading={request.isPending}
        disabled={running}
        onPress={() => request.mutate()}
      />
      {request.error && !(request.error instanceof StepUpCancelled) && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(request.error, t)}
        </ThemedText>
      )}
      {exports.isPending && <ActivityIndicator />}
      {exports.isError && (
        <ErrorState error={exports.error} onRetry={() => exports.refetch()} />
      )}
      {exports.data?.items.map((item) => {
        const url = item.status === 'completed' ? item.result?.url : undefined;
        return (
          <ListRow
            key={item.id}
            title={formatDateTime(item.createdAt)}
            subtitle={t(`yourData.status.${item.status}`)}
            detail={
              item.status === 'queued' || item.status === 'running' ? (
                <ActivityIndicator />
              ) : url ? (
                t('yourData.download')
              ) : undefined
            }
            // The link lasts 30 minutes from the answer: refetched before opening.
            onPress={
              url
                ? async () => {
                    const fresh = await exports.refetch();
                    const link = fresh.data?.items.find((x) => x.id === item.id)
                      ?.result?.url;
                    if (link) {
                      void WebBrowser.openBrowserAsync(link);
                    }
                  }
                : undefined
            }
          />
        );
      })}
    </>
  );
}

function Consents() {
  const { t } = useTranslation();
  const kinds = useConsentKinds();
  const consents = useConsents();
  const set = useSetConsent();
  if (!kinds.data || !consents.data) {
    const error = kinds.error ?? consents.error;
    return error ? (
      <ErrorState
        error={error}
        onRetry={() => {
          void kinds.refetch();
          void consents.refetch();
        }}
      />
    ) : (
      <ActivityIndicator />
    );
  }
  return (
    <>
      {kinds.data.items.map((kind) => {
        const given = consents.data.items.find(
          (consent) => consent.kind === kind.kind && !consent.withdrawnAt,
        );
        // An acceptance of an older version is asked for again.
        const current = given?.version === kind.version;
        return (
          <View key={kind.kind} style={styles.consent}>
            <View style={styles.text}>
              <ThemedText>{kind.label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {current
                  ? t('yourData.agreed', {
                      date: formatDateTime(given.acceptedAt),
                    })
                  : given
                    ? t('yourData.newVersion')
                    : kind.description}
              </ThemedText>
            </View>
            <Switch
              accessibilityLabel={kind.label}
              value={current}
              // A required kind can be accepted, not withdrawn.
              disabled={set.isPending || (kind.required && current)}
              onValueChange={(value) =>
                set.mutate({
                  kind: kind.kind,
                  version: kind.version,
                  given: value,
                })
              }
            />
          </View>
        );
      })}
      {set.error && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(set.error, t)}
        </ThemedText>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  consent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
