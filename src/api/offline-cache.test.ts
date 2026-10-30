import type { PersistedClient } from '@tanstack/query-persist-client-core';

import { cachePersister, type CacheDatabase } from '@/api/offline-cache';

/** The one-row table, in memory. */
function memoryDatabase(): CacheDatabase & {
  row: { owner: string; data: string } | null;
} {
  const db = {
    row: null as { owner: string; data: string } | null,
    async runAsync(sql: string, ...params: string[]) {
      db.row = sql.startsWith('DELETE')
        ? null
        : { owner: params[0], data: params[1] };
    },
    async getFirstAsync<T>() {
      return db.row as T | null;
    },
  };
  return db;
}

const client = (title: string) =>
  ({
    timestamp: 1,
    buster: '',
    clientState: { title },
  }) as never as PersistedClient;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('nothing is saved until the owner is known', async () => {
  const db = memoryDatabase();
  const cache = cachePersister(db);
  cache.persister.persistClient(client('a'));
  await jest.runAllTimersAsync();
  expect(db.row).toBeNull();

  await cache.setOwner('u1:t1');
  cache.persister.persistClient(client('b'));
  await jest.runAllTimersAsync();
  expect(db.row?.owner).toBe('u1:t1');
  expect(await cache.persister.restoreClient()).toEqual(client('b'));
});

test("another person's or tenant's cache is deleted, not kept", async () => {
  const db = memoryDatabase();
  db.row = { owner: 'u1:t1', data: JSON.stringify(client('t1 notes')) };

  const cache = cachePersister(db);
  expect(await cache.setOwner('u1:t2')).toBe(false);
  expect(db.row).toBeNull();
  expect(await cache.persister.restoreClient()).toBeUndefined();
});

test('the same owner keeps their cache', async () => {
  const db = memoryDatabase();
  db.row = { owner: 'u1:t1', data: JSON.stringify(client('mine')) };
  expect(await cachePersister(db).setOwner('u1:t1')).toBe(true);
  expect(db.row?.owner).toBe('u1:t1');
});
