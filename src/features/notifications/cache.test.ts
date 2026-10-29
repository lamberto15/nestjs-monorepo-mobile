import type { NotificationItem } from '@/api/client';
import {
  addItem,
  markAllRead,
  markRead,
  removeItem,
  type NotificationsData,
} from '@/features/notifications/cache';

const item = (
  id: string,
  createdAt: string,
  read = false,
): NotificationItem => ({
  id,
  type: 'test',
  title: id,
  body: '',
  data: {},
  link: null,
  key: null,
  count: 1,
  read,
  readAt: read ? createdAt : null,
  createdAt,
  updatedAt: createdAt,
});

const data = (...pages: NotificationItem[][]): NotificationsData => ({
  pages: pages.map((items) => ({ items, nextCursor: null })),
  pageParams: pages.map((_, index) => (index ? `c${index}` : null)),
});

const ids = (value: NotificationsData) =>
  value.pages.map((page) => page.items.map((entry) => entry.id));

test('a new notification goes on top; a grouped one already listed moves there', () => {
  const start = data(
    [item('b', '2026-01-02'), item('a', '2026-01-01')],
    [item('z', '2025-12-01')],
  );

  expect(ids(addItem(start, item('c', '2026-01-03')))).toEqual([
    ['c', 'b', 'a'],
    ['z'],
  ]);
  expect(ids(addItem(start, item('z', '2026-01-04')))).toEqual([
    ['z', 'b', 'a'],
    [],
  ]);
});

test('read-all marks only what was created up to `before`', () => {
  const start = data([item('new', '2026-01-03'), item('old', '2026-01-01')]);

  const result = markAllRead(start, '2026-01-02');

  expect(result.pages[0].items.map((entry) => entry.read)).toEqual([
    false,
    true,
  ]);
  expect(markAllRead(start, null).pages[0].items.every((e) => e.read)).toBe(
    true,
  );
});

test('read and removed change only their notification', () => {
  const start = data([item('a', '2026-01-02'), item('b', '2026-01-01')]);

  const read = markRead(start, 'b', '2026-01-05');
  expect(read.pages[0].items[1]).toMatchObject({
    read: true,
    readAt: '2026-01-05',
  });
  expect(read.pages[0].items[0].read).toBe(false);

  expect(ids(removeItem(start, 'a'))).toEqual([['b']]);
});
