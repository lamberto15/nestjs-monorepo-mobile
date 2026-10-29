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
      realtime.close();
    };
  }, [queryClient]);
}
