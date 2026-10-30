/**
 * The offline cache: what was already viewed (queries with
 * `meta: { persist: true }`), kept on the device so it opens offline.
 * Encrypted or not at all: an SQLCipher database whose key lives in the
 * secure store. Without SQLCipher (Expo Go, web) `PRAGMA key` is silently
 * ignored, so nothing is kept there. It holds one person in one tenant;
 * signing out and switching tenant delete it.
 */
import {
  persistQueryClient,
  type PersistedClient,
  type Persister,
} from '@tanstack/query-persist-client-core';
import type { Query, QueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE = 'offline-cache.db';
const KEY = 'offline-cache.key';
/** Older than this, a saved cache isn't shown. */
export const MAX_AGE_MS = 7 * 24 * 60 * 60_000;
/** Saves are gathered: a burst of changes is one write. */
const SAVE_AFTER_MS = 1_000;

/** The calls the cache makes, so tests can pass an in-memory database. */
export interface CacheDatabase {
  runAsync(sql: string, ...params: string[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...params: string[]): Promise<T | null>;
}

/** Kept: a successful query that asked to be. */
export const shouldKeep = (query: Query) =>
  query.meta?.persist === true && query.state.status === 'success';

/**
 * Saves into one row tagged with its owner (`userId:tenantId`), once the
 * owner is known; restores that row before (offline, `me` can't load yet).
 */
export function cachePersister(db: CacheDatabase) {
  let owner: string | null = null;
  let latest: PersistedClient | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const persister: Persister = {
    persistClient(client) {
      latest = client;
      timer ??= setTimeout(() => {
        timer = null;
        if (owner && latest) {
          void db
            .runAsync(
              'INSERT OR REPLACE INTO cache (id, owner, data) VALUES (1, ?, ?)',
              owner,
              JSON.stringify(latest),
            )
            .catch(() => undefined); // closed: signed out meanwhile
        }
      }, SAVE_AFTER_MS);
    },
    async restoreClient() {
      const row = await db.getFirstAsync<{ data: string }>(
        'SELECT data FROM cache WHERE id = 1',
      );
      return row ? (JSON.parse(row.data) as PersistedClient) : undefined;
    },
    async removeClient() {
      await db.runAsync('DELETE FROM cache');
    },
  };

  return {
    persister,
    /**
     * Who is signed in. The row of anyone else is deleted: returns false,
     * and the caller drops what was restored from it.
     */
    async setOwner(next: string): Promise<boolean> {
      owner = next;
      const row = await db.getFirstAsync<{ owner: string }>(
        'SELECT owner FROM cache WHERE id = 1',
      );
      if (row && row.owner !== next) {
        await db.runAsync('DELETE FROM cache');
        return false;
      }
      return true;
    },
  };
}

let opening: Promise<SQLite.SQLiteDatabase | null> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  const db = await SQLite.openDatabaseAsync(DATABASE);
  // A row only with SQLCipher; without it the key would be ignored.
  if (!(await db.getFirstAsync('PRAGMA cipher_version'))) {
    await db.closeAsync();
    return null;
  }
  let key = await SecureStore.getItemAsync(KEY);
  if (!key) {
    key = Array.from(Crypto.getRandomBytes(32), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    await SecureStore.setItemAsync(KEY, key);
  }
  try {
    await db.execAsync(`PRAGMA key = "x'${key}'"`);
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS cache (id INTEGER PRIMARY KEY CHECK (id = 1), owner TEXT NOT NULL, data TEXT NOT NULL)',
    );
    return db;
  } catch {
    // Saved under a key that's gone (the secure store was reset): start over.
    await db.closeAsync();
    await SQLite.deleteDatabaseAsync(DATABASE);
    return null;
  }
}

/** The database, or null where it can't be encrypted. */
function database() {
  opening ??= open().catch(() => null);
  return opening;
}

/**
 * Restores the saved cache into `queryClient`, then keeps saving what may
 * be kept. Returns `setOwner` (call it when `me` is known) and `stop`.
 */
export async function startOfflineCache(queryClient: QueryClient) {
  const db = await database();
  if (!db) {
    return null;
  }
  const cache = cachePersister(db);
  const [stop, restored] = persistQueryClient({
    queryClient,
    persister: cache.persister,
    maxAge: MAX_AGE_MS,
    dehydrateOptions: { shouldDehydrateQuery: shouldKeep },
  });
  await restored;
  return { stop, setOwner: cache.setOwner };
}

/** Signing out, or another tenant: the cache and its key go. */
export async function wipeOfflineCache() {
  const db = await opening;
  opening = null;
  if (db) {
    await db.closeAsync();
    await SQLite.deleteDatabaseAsync(DATABASE).catch(() => undefined);
  }
  await SecureStore.deleteItemAsync(KEY);
}
