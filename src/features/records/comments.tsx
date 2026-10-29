import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { apiErrorMessage } from '@/features/auth/errors';
import {
  useAddComment,
  useComments,
  useDeleteComment,
  useEditComment,
  useResolveComment,
  type Comment,
  type RecordRef,
} from '@/features/records/hooks';
import { formatDateTime } from '@/i18n/format';

/**
 * A record's conversation: threads (a top-level comment and its replies),
 * a composer, reply, edit (the author), delete (the author, or whoever may
 * change the record: `canModerate`), resolve and reopen. Kept live by the
 * realtime `record.commented` event for records the person watches.
 */
export function Comments({
  record,
  userId,
  canModerate,
}: {
  record: RecordRef;
  userId: string;
  canModerate: boolean;
}) {
  const { t } = useTranslation();
  const comments = useComments(record);
  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];
  const threads = items.filter((comment) => !comment.parentId);
  const replies = (id: string) =>
    items.filter((comment) => comment.parentId === id);

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" accessibilityRole="header">
        {t('comments.title')}
      </ThemedText>
      {comments.isPending && <ActivityIndicator />}
      {comments.isError && (
        <ErrorState error={comments.error} onRetry={() => comments.refetch()} />
      )}
      {comments.isSuccess && threads.length === 0 && (
        <ThemedText themeColor="textSecondary">
          {t('comments.empty')}
        </ThemedText>
      )}
      {threads.map((thread) => (
        <ThemedView
          key={thread.id}
          type="backgroundElement"
          style={styles.thread}
        >
          <CommentItem
            record={record}
            comment={thread}
            mine={thread.author === `user:${userId}`}
            canModerate={canModerate}
            isThread
          />
          {replies(thread.id).map((reply) => (
            <View key={reply.id} style={styles.reply}>
              <CommentItem
                record={record}
                comment={reply}
                mine={reply.author === `user:${userId}`}
                canModerate={canModerate}
              />
            </View>
          ))}
        </ThemedView>
      ))}
      {comments.hasNextPage && (
        <Button
          title={t('comments.more')}
          variant="secondary"
          loading={comments.isFetchingNextPage}
          onPress={() => comments.fetchNextPage()}
        />
      )}
      <Composer record={record} />
    </View>
  );
}

function CommentItem({
  record,
  comment,
  mine,
  canModerate,
  isThread = false,
}: {
  record: RecordRef;
  comment: Comment;
  mine: boolean;
  canModerate: boolean;
  isThread?: boolean;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'view' | 'edit' | 'reply'>('view');
  const edit = useEditComment(record);
  const remove = useDeleteComment(record);
  const resolve = useResolveComment(record);
  const error = edit.error ?? remove.error ?? resolve.error;

  return (
    <View style={styles.comment}>
      <ThemedText type="small" themeColor="textSecondary">
        {[
          comment.authorName ?? t('comments.someone'),
          formatDateTime(comment.createdAt),
          comment.editedAt ? t('comments.edited') : null,
          comment.resolvedAt ? t('comments.resolved') : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </ThemedText>
      {mode === 'edit' ? (
        <InlineEditor
          initial={comment.body}
          submitTitle={t('comments.save')}
          pending={edit.isPending}
          onCancel={() => setMode('view')}
          onSubmit={(body) =>
            edit.mutate(
              { commentId: comment.id, body },
              { onSuccess: () => setMode('view') },
            )
          }
        />
      ) : (
        <ThemedText selectable>{comment.body}</ThemedText>
      )}
      {mode === 'view' && (
        <View style={styles.actions}>
          {isThread && (
            <Action
              label={t('comments.reply')}
              onPress={() => setMode('reply')}
            />
          )}
          {mine && (
            <Action
              label={t('comments.edit')}
              onPress={() => setMode('edit')}
            />
          )}
          {isThread && (
            <Action
              label={t(
                comment.resolvedAt ? 'comments.reopen' : 'comments.resolve',
              )}
              onPress={() =>
                resolve.mutate({
                  commentId: comment.id,
                  resolved: !comment.resolvedAt,
                })
              }
            />
          )}
          {(mine || canModerate) && (
            <Action
              label={t('comments.delete')}
              onPress={() =>
                Alert.alert(
                  t('comments.deleteTitle'),
                  isThread ? t('comments.deleteThread') : undefined,
                  [
                    { text: t('sessions.cancel'), style: 'cancel' },
                    {
                      text: t('comments.delete'),
                      style: 'destructive',
                      onPress: () => remove.mutate(comment.id),
                    },
                  ],
                )
              }
            />
          )}
        </View>
      )}
      {mode === 'reply' && (
        <Composer
          record={record}
          parentId={comment.id}
          onDone={() => setMode('view')}
        />
      )}
      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(error, t)}
        </ThemedText>
      )}
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={Spacing.one}
    >
      <ThemedText type="linkPrimary">{label}</ThemedText>
    </Pressable>
  );
}

/** A new comment, or a reply to a thread (`parentId`). */
function Composer({
  record,
  parentId,
  onDone,
}: {
  record: RecordRef;
  parentId?: string;
  onDone?: () => void;
}) {
  const { t } = useTranslation();
  const add = useAddComment(record);
  return (
    <>
      <InlineEditor
        initial=""
        label={t(parentId ? 'comments.yourReply' : 'comments.new')}
        submitTitle={t(parentId ? 'comments.sendReply' : 'comments.send')}
        pending={add.isPending}
        onCancel={onDone}
        onSubmit={(body, clear) =>
          add.mutate(
            { body, ...(parentId && { parentId }) },
            {
              onSuccess: () => {
                clear();
                onDone?.();
              },
            },
          )
        }
      />
      {add.error && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(add.error, t)}
        </ThemedText>
      )}
    </>
  );
}

function InlineEditor({
  initial,
  label,
  submitTitle,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: string;
  label?: string;
  submitTitle: string;
  pending: boolean;
  onSubmit: (body: string, clear: () => void) => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const [body, setBody] = useState(initial);
  const empty = body.trim().length === 0;
  return (
    <View style={styles.editor}>
      <TextField
        label={label ?? t('comments.text')}
        value={body}
        onChangeText={setBody}
        multiline
        style={styles.input}
      />
      <View style={styles.editorActions}>
        {onCancel && (
          <Button
            title={t('sessions.cancel')}
            variant="secondary"
            onPress={onCancel}
          />
        )}
        <Button
          title={submitTitle}
          loading={pending}
          disabled={empty}
          onPress={() => onSubmit(body.trim(), () => setBody(''))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  thread: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.three,
  },
  reply: {
    paddingStart: Spacing.three,
    borderStartWidth: 2,
    borderStartColor: '#8888',
  },
  comment: {
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  editor: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
