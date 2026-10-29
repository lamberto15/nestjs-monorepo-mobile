/**
 * How a notification event changes the cached list: pure functions over
 * TanStack Query's infinite data (pages of `GET /v1/notifications`), so the
 * realtime handlers and the mutations share them, and tests can call them.
 */
import type { InfiniteData } from '@tanstack/react-query';

import type { GetResponse, NotificationItem } from '@/api/client';

export type NotificationsPage = GetResponse<'/v1/notifications'>;
export type NotificationsData = InfiniteData<NotificationsPage, string | null>;

function mapItems(
  data: NotificationsData,
  change: (items: NotificationItem[]) => NotificationItem[],
): NotificationsData {
  return {
    ...data,
    pages: data.pages.map((page) => ({ ...page, items: change(page.items) })),
  };
}

/** A new notification on top; one already listed (a grouped update) moves there. */
export function addItem(
  data: NotificationsData,
  item: NotificationItem,
): NotificationsData {
  const without = mapItems(data, (items) =>
    items.filter((existing) => existing.id !== item.id),
  );
  const [first, ...rest] = without.pages;
  if (!first) {
    return data;
  }
  return {
    ...without,
    pages: [{ ...first, items: [item, ...first.items] }, ...rest],
  };
}

export function markRead(
  data: NotificationsData,
  id: string,
  readAt: string | null,
): NotificationsData {
  return mapItems(data, (items) =>
    items.map((item) =>
      item.id === id ? { ...item, read: true, readAt } : item,
    ),
  );
}

/** Everything created up to `before` (all, when null) is read. */
export function markAllRead(
  data: NotificationsData,
  before: string | null,
): NotificationsData {
  const now = new Date().toISOString();
  return mapItems(data, (items) =>
    items.map((item) =>
      !item.read && (before === null || item.createdAt <= before)
        ? { ...item, read: true, readAt: now }
        : item,
    ),
  );
}

export function removeItem(
  data: NotificationsData,
  id: string,
): NotificationsData {
  return mapItems(data, (items) => items.filter((item) => item.id !== id));
}
