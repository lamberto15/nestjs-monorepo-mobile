import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { api } from '@/api/api';
import { unwrap } from '@/api/client';
import {
  markAllRead,
  markRead,
  type NotificationsData,
} from '@/features/notifications/cache';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  unread: ['notifications', 'unread'] as const,
};

const PAGE_SIZE = 20;

/** The person's notifications, newest first, a page at a time. */
export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ pageParam }) =>
      unwrap(
        api.GET('/v1/notifications', {
          params: {
            query: {
              limit: PAGE_SIZE,
              ...(pageParam && { cursor: pageParam }),
            },
          },
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** The badge: `capped` when there are at least 1,000. */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => unwrap(api.GET('/v1/notifications/unread-count')),
  });
}

/** Applies a change to the cached list, if it is loaded. */
export function updateList(
  queryClient: QueryClient,
  change: (data: NotificationsData) => NotificationsData,
) {
  queryClient.setQueryData<NotificationsData>(notificationKeys.list, (data) =>
    data ? change(data) : data,
  );
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        api.POST('/v1/notifications/{id}/read', { params: { path: { id } } }),
      ),
    onSuccess: (item) => {
      updateList(queryClient, (data) => markRead(data, item.id, item.readAt));
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unread });
    },
  });
}

/**
 * Marks read what the list shows: up to its newest item, not what arrives
 * meanwhile (the client README, "The bell icon").
 */
export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (before: string) =>
      unwrap(api.POST('/v1/notifications/read-all', { body: { before } })),
    onSuccess: (_result, before) => {
      updateList(queryClient, (data) => markAllRead(data, before));
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unread });
    },
  });
}
