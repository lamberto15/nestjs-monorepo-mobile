import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { apiErrorMessage } from '@/features/auth/errors';
import {
  useExportFor,
  useStartExport,
  useTransfer,
} from '@/features/records/export';
import type { ListQuery } from '@/features/records/list';

/** Export the list as it is filtered now (CSV), then open the file. */
export function ExportButton({
  subject,
  query,
}: {
  subject: string;
  query: ListQuery;
}) {
  const { t } = useTranslation();
  const exporter = useExportFor(subject);
  const start = useStartExport();
  const [id, setId] = useState<string | null>(null);
  const transfer = useTransfer(id);

  if (!exporter.data) {
    return null;
  }
  const status = transfer.data?.status;
  const url = status === 'completed' ? transfer.data?.result?.url : undefined;
  const error =
    start.error ??
    transfer.error ??
    (status === 'failed' ? new Error(transfer.data?.error ?? '') : null);

  return (
    <View style={styles.row}>
      {url ? (
        <Button
          title={t('export.open', { rows: transfer.data?.result?.rows ?? 0 })}
          onPress={() => void WebBrowser.openBrowserAsync(url)}
        />
      ) : (
        <Button
          title={t('export.start')}
          variant="secondary"
          loading={start.isPending}
          disabled={status === 'queued' || status === 'running'}
          onPress={() =>
            start.mutate(
              { name: exporter.data!.name, query },
              { onSuccess: (started) => setId(started.id) },
            )
          }
        />
      )}
      {(status === 'queued' || status === 'running') && (
        <ThemedText type="small" themeColor="textSecondary">
          <ActivityIndicator /> {t('export.working')}
        </ThemedText>
      )}
      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {error instanceof Error && error.message && !('code' in error)
            ? error.message
            : apiErrorMessage(error, t)}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.one,
  },
});
