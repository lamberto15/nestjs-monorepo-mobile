import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { signedLink } from '@/api/signed-link';
import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { ErrorState } from '@/components/error-state';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAcknowledge, useAcknowledgments } from '@/features/approvals/hooks';
import { apiErrorMessage } from '@/features/auth/errors';
import { formatDateTime } from '@/i18n/format';

/** Documents you were asked to confirm you read: open, then acknowledge. */
export default function AcknowledgmentsScreen() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'pending' | 'acknowledged'>('pending');
  const list = useAcknowledgments(status);
  const acknowledge = useAcknowledge();
  const [problem, setProblem] = useState<unknown>(null);

  async function open(attachmentId: string) {
    setProblem(null);
    try {
      await WebBrowser.openBrowserAsync(
        await signedLink(
          `/v1/attachments/${attachmentId}/download?inline=true`,
        ),
      );
    } catch (error) {
      setProblem(error);
    }
  }

  const items = list.data?.items ?? [];
  const error = problem ?? acknowledge.error;
  return (
    <Screen>
      <ChoiceChips
        accessibilityLabel={t('acknowledgments.title')}
        value={status}
        onChange={setStatus}
        choices={[
          { value: 'pending', label: t('acknowledgments.pending') },
          { value: 'acknowledged', label: t('acknowledgments.done') },
        ]}
      />
      {list.isPending && <ActivityIndicator />}
      {list.isError && (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      )}
      {list.isSuccess && items.length === 0 && (
        <ThemedText themeColor="textSecondary">
          {t('acknowledgments.empty')}
        </ThemedText>
      )}
      {items.map((item) => (
        <ListRow
          key={item.id}
          title={item.document.name}
          subtitle={[
            item.acknowledgedAt
              ? t('acknowledgments.on', {
                  date: formatDateTime(item.acknowledgedAt),
                })
              : item.dueAt
                ? t('inbox.due', { date: formatDateTime(item.dueAt) })
                : null,
            item.overdue && !item.acknowledgedAt
              ? t('acknowledgments.overdue')
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          onPress={() => open(item.attachmentId)}
          detail={
            item.acknowledgedAt ? undefined : (
              <Button
                title={t('acknowledgments.confirm')}
                loading={
                  acknowledge.isPending &&
                  acknowledge.variables === item.attachmentId
                }
                onPress={() => acknowledge.mutate(item.attachmentId)}
              />
            )
          }
        />
      ))}
      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(error, t)}
        </ThemedText>
      )}
    </Screen>
  );
}
