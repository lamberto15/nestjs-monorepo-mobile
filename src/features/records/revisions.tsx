import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { apiErrorMessage } from '@/features/auth/errors';
import {
  useRestoreRevision,
  useRevisions,
  type RecordRef,
  type Revision,
} from '@/features/records/hooks';
import { formatDateTime } from '@/i18n/format';

/** A value as people read it: text as is, anything else as JSON, nothing as "—". */
export function shownValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/** One revision's changes, "field: from → to", one per line. */
export function changeLines(revision: Pick<Revision, 'changes'>): string[] {
  return Object.entries(revision.changes ?? {}).map(
    ([field, change]) =>
      `${field}: ${shownValue(change.from)} → ${shownValue(change.to)}`,
  );
}

/**
 * The record's history, newest first: who changed what, and a way to put an
 * earlier version back (`If-Match` with the record's current ETag).
 */
export function Revisions({
  record,
  etag,
  canRestore,
}: {
  record: RecordRef;
  etag?: string;
  canRestore: boolean;
}) {
  const { t } = useTranslation();
  const revisions = useRevisions(record);
  const restore = useRestoreRevision(record);

  if (!revisions.data) {
    return revisions.isError ? (
      <ErrorState error={revisions.error} onRetry={() => revisions.refetch()} />
    ) : (
      <ActivityIndicator />
    );
  }
  const latest = revisions.data.items[0]?.number;
  return (
    <View style={styles.list}>
      {restore.error && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(restore.error, t)}
        </ThemedText>
      )}
      {revisions.data.items.map((revision) => {
        const lines = changeLines(revision);
        return (
          <ThemedView
            key={revision.id}
            type="backgroundElement"
            style={styles.item}
          >
            <ThemedText type="smallBold">
              {t('revisions.number', { number: revision.number })}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {[revision.changedByName, formatDateTime(revision.changedAt)]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
            <ThemedText type="small">
              {lines.length ? lines.join('\n') : t('revisions.created')}
            </ThemedText>
            {canRestore && revision.number !== latest && (
              <Button
                title={t('revisions.restore')}
                variant="secondary"
                loading={
                  restore.isPending &&
                  restore.variables?.number === revision.number
                }
                onPress={() =>
                  Alert.alert(
                    t('revisions.restoreTitle', { number: revision.number }),
                    t('revisions.restoreBody'),
                    [
                      { text: t('sessions.cancel'), style: 'cancel' },
                      {
                        text: t('revisions.restore'),
                        onPress: () =>
                          restore.mutate({ number: revision.number, etag }),
                      },
                    ],
                  )
                }
              />
            )}
          </ThemedView>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  item: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
});
