import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { watchNotifications } from '@/api/client';
import { openRealtime } from '@/api/realtime';
import {
  addItem,
  markAllRead,
  markRead,
  removeItem,
} from '@/features/notifications/cache';
import { notificationKeys, updateList } from '@/features/notifications/hooks';

/**
 * Keeps the notifications cache live while signed in: one realtime
 * connection, closed in the background and on unmount (sign-out). Events
 * sent while disconnected are not replayed, so every (re)connection
 * refetches the list and the count.
 */
export function useRealtimeNotifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const realtime = openRealtime();
    const refetch = () =>
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });

    const stopWatching = watchNotifications(realtime, {
      onItem: (item) => updateList(queryClient, (data) => addItem(data, item)),
      onUnread: (unread, capped) =>
        queryClient.setQueryData(notificationKeys.unread, {
          unread,
          unreadCapped: capped,
        }),
      onRead: ({ id, readAt }) =>
        updateList(queryClient, (data) => markRead(data, id, readAt)),
      onReadAll: ({ before }) =>
        updateList(queryClient, (data) => markAllRead(data, before)),
      onRemoved: (id) =>
        updateList(queryClient, (data) => removeItem(data, id)),
    });
    realtime.socket.on('connect', refetch);
    // A file added or removed on a watched record: its list reloads.
    const stopFiles = realtime.on(
      'record.attachments.changed',
      ({ subject, recordId }) =>
        queryClient.invalidateQueries({
          queryKey: ['records', subject, recordId, 'attachments'],
        }),
    );
    // An approval assigned, decided or applied: lists, detail and inbox reload.
    const reloadApprovals = () => {
      void queryClient.invalidateQueries({ queryKey: ['approvals'] });
      void queryClient.invalidateQueries({ queryKey: ['inbox'] });
    };
    const stopApprovals = [
      realtime.on('approval.assigned', reloadApprovals),
      realtime.on('approval.decided', reloadApprovals),
      realtime.on('approval.applied', reloadApprovals),
    ];
    // A PDF made, or an export ready: their lists reload.
    const stopFiles2 = [
      realtime.on('document.ready', ({ subject, recordId }) =>
        queryClient.invalidateQueries({
          queryKey: ['records', subject, recordId, 'documents'],
        }),
      ),
      realtime.on('document.failed', ({ subject, recordId }) =>
        queryClient.invalidateQueries({
          queryKey: ['records', subject, recordId, 'documents'],
        }),
      ),
      realtime.on('data.export-ready', ({ id }) =>
        queryClient.invalidateQueries({ queryKey: ['transfers', id] }),
      ),
    ];
    // A comment on a watched record: its open conversation reloads.
    const stopComments = realtime.on(
      'record.commented',
      ({ subject, recordId }) =>
        queryClient.invalidateQueries({
          queryKey: ['records', subject, recordId, 'comments'],
        }),
    );

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        realtime.socket.connect();
      } else if (state === 'background') {
        realtime.socket.disconnect();
      }
    });

    return () => {
      appState.remove();
      realtime.socket.off('connect', refetch);
      stopWatching();
      stopComments();
      stopFiles2.forEach((stop) => stop());
      stopApprovals.forEach((stop) => stop());
      stopFiles();
      realtime.close();
    };
  }, [queryClient]);
}
