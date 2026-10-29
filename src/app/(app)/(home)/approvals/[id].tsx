import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { feedback } from '@/components/feedback';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  allowedDecisions,
  COMMENT_REQUIRED,
  useApproval,
  useDecide,
  type Decision,
} from '@/features/approvals/hooks';
import { apiErrorMessage } from '@/features/auth/errors';
import { isConflict } from '@/features/notes/hooks';
import { canOpen, openTarget } from '@/features/notifications/open-target';
import { shownValue } from '@/features/records/revisions';
import { formatDateTime } from '@/i18n/format';

/**
 * One request: what is asked (its payload), its stages and history, and the
 * decisions `can` allows. A reject or a request for changes says why.
 */
export default function ApprovalScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useApproval(id);
  const decide = useDecide(id);
  const [choosing, setChoosing] = useState<Decision | null>(null);
  const [comment, setComment] = useState('');

  if (!query.data) {
    return (
      <Screen>
        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <ActivityIndicator />
        )}
      </Screen>
    );
  }

  const { approval, etag } = query.data;
  const needsComment = choosing ? COMMENT_REQUIRED.includes(choosing) : false;
  const record = {
    subject: approval.subject,
    recordId: approval.recordId,
    link: approval.link,
  };

  return (
    <Screen>
      <ThemedText type="subtitle">{approval.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {[
          t(`approvals.status.${approval.status}`, {
            defaultValue: approval.status,
          }),
          approval.requesterName,
          approval.stageCount > 1
            ? t('approvals.stage', {
                current: approval.currentStage + 1,
                count: approval.stageCount,
                name: approval.stageName ?? '',
              })
            : null,
          approval.dueAt
            ? t('inbox.due', { date: formatDateTime(approval.dueAt) })
            : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </ThemedText>
      {canOpen(record) && (
        <Button
          title={t('approvals.openRecord')}
          variant="secondary"
          onPress={() => openTarget(record)}
        />
      )}
      {Object.keys(approval.payload ?? {}).length > 0 && (
        <ThemedView type="backgroundElement" style={styles.box}>
          {Object.entries(approval.payload ?? {}).map(([key, value]) => (
            <ThemedText key={key} type="small">
              <ThemedText type="smallBold">{key}: </ThemedText>
              {shownValue(value)}
            </ThemedText>
          ))}
        </ThemedView>
      )}

      {decide.error && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {isConflict(decide.error)
            ? t('approvals.conflict')
            : apiErrorMessage(decide.error, t)}
        </ThemedText>
      )}
      {choosing ? (
        <View style={styles.box}>
          <TextField
            label={t(
              needsComment ? 'approvals.commentRequired' : 'approvals.comment',
            )}
            value={comment}
            onChangeText={setComment}
            multiline
            autoFocus
          />
          <View style={styles.row}>
            <Button
              title={t('sessions.cancel')}
              variant="secondary"
              onPress={() => setChoosing(null)}
            />
            <Button
              title={t(`approvals.decisions.${choosing}`)}
              variant={
                choosing === 'reject' || choosing === 'cancel'
                  ? 'danger'
                  : 'primary'
              }
              loading={decide.isPending}
              disabled={needsComment && !comment.trim()}
              onPress={() =>
                decide.mutate(
                  { decision: choosing, comment, etag },
                  {
                    onSuccess: () => {
                      feedback.success();
                      setChoosing(null);
                      setComment('');
                    },
                    // Decided meanwhile: show the request as it is now.
                    onError: (error) => {
                      if (isConflict(error)) {
                        void query.refetch();
                      }
                    },
                  },
                )
              }
            />
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          {allowedDecisions(approval.can).map((decision) => (
            <Button
              key={decision}
              title={t(`approvals.decisions.${decision}`)}
              variant={decision === 'approve' ? 'primary' : 'secondary'}
              onPress={() => {
                decide.reset();
                setChoosing(decision);
              }}
            />
          ))}
        </View>
      )}

      <ThemedText type="smallBold" accessibilityRole="header">
        {t('approvals.history')}
      </ThemedText>
      {approval.timeline.map((event) => (
        <View key={event.id} style={styles.event}>
          <ThemedText type="small">
            {t(`approvals.events.${event.type}`, { defaultValue: event.type })}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {[event.actorName, formatDateTime(event.createdAt)]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
          {typeof event.details?.comment === 'string' &&
          event.details.comment ? (
            <ThemedText type="small">“{event.details.comment}”</ThemedText>
          ) : null}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  event: {
    gap: Spacing.half,
  },
});
