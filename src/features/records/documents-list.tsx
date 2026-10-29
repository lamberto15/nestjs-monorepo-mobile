import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { signedLink } from '@/api/signed-link';
import { Button } from '@/components/button';
import { ListRow } from '@/components/list-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { supportedLanguage } from '@/features/account/language';
import { apiErrorMessage } from '@/features/auth/errors';
import { useDocuments, useMakePdf } from '@/features/records/documents';
import type { RecordRef } from '@/features/records/hooks';
import { formatDateTime } from '@/i18n/format';

/** A record's PDFs: make one in your language, open it when it's ready. */
export function Documents({ record }: { record: RecordRef }) {
  const { t, i18n } = useTranslation();
  const documents = useDocuments(record);
  const make = useMakePdf(record);
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

  const error = problem ?? make.error ?? documents.error;
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" accessibilityRole="header">
        {t('documents.title')}
      </ThemedText>
      {documents.data?.items.map((document) => {
        const working =
          document.status === 'queued' || document.status === 'rendering';
        return (
          <ListRow
            key={document.id}
            title={formatDateTime(document.createdAt)}
            subtitle={
              document.status === 'failed'
                ? (document.error ?? t('documents.failed'))
                : t(`documents.status.${document.status}`)
            }
            detail={working ? <ActivityIndicator /> : undefined}
            onPress={
              document.status === 'completed' && document.attachmentId
                ? () => open(document.attachmentId!)
                : undefined
            }
          />
        );
      })}
      <Button
        title={t('documents.make')}
        variant="secondary"
        loading={make.isPending}
        onPress={() =>
          make.mutate(supportedLanguage(i18n.resolvedLanguage) ?? 'en')
        }
      />
      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(error, t)}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
});
