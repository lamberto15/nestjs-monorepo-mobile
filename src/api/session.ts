/**
 * The signed-in session: the backend's token pair (docs/backend-integration.md,
 * "Tokens"). The access token lives in memory and is renewed a minute before
 * its 15 minutes are up; the refresh token lives in the secure store.
 *
 * Refresh tokens rotate and one presented twice revokes its whole family,
 * signing the user out everywhere. So there is at most one refresh in flight
 * (`refreshing`), every caller awaits it, and the new refresh token is stored
 * before the new access token is used.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { isApiError, unwrap } from '@/api/client';
import { publicApi } from '@/api/public-api';

export type SessionStatus = 'restoring' | 'signedIn' | 'signedOut';

/** What `POST /v1/auth/token` and `/token/refresh` answer. */
export interface Tokens {
  accessToken: string;
  refreshToken: string;
  /** Seconds. */
  expiresIn: number;
}

const REFRESH_TOKEN_KEY = 'session.refreshToken';
/** Renew this long before the access token expires. */
const EARLY_MS = 60_000;

// The secure store has no web implementation: on web (a development
// convenience only) the refresh token lives in memory, so a reload signs out.
const memory = new Map<string, string>();
const storage =
  Platform.OS === 'web'
    ? {
        get: async (key: string) => memory.get(key) ?? null,
        set: async (key: string, value: string) => void memory.set(key, value),
        remove: async (key: string) => void memory.delete(key),
      }
    : {
        get: (key: string) => SecureStore.getItemAsync(key),
        set: (key: string, value: string) =>
          SecureStore.setItemAsync(key, value, {
            // Readable in the background after the first unlock (push, refresh).
            keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
          }),
        remove: (key: string) => SecureStore.deleteItemAsync(key),
      };

let status: SessionStatus = 'restoring';
let accessToken: string | null = null;
let expiresAt = 0;
let refreshing: Promise<string> | null = null;
const listeners = new Set<() => void>();

function setStatus(next: SessionStatus) {
  if (status !== next) {
    status = next;
    listeners.forEach((listener) => listener());
  }
}

async function keep(tokens: Tokens) {
  await storage.set(REFRESH_TOKEN_KEY, tokens.refreshToken);
  accessToken = tokens.accessToken;
  expiresAt = Date.now() + tokens.expiresIn * 1000;
  setStatus('signedIn');
}

async function forget() {
  accessToken = null;
  expiresAt = 0;
  await storage.remove(REFRESH_TOKEN_KEY);
  setStatus('signedOut');
}

async function renew(): Promise<string> {
  const refreshToken = await storage.get(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    await forget();
    throw new Error('Not signed in');
  }
  try {
    const tokens = await unwrap(
      publicApi.POST('/v1/auth/token/refresh', { body: { refreshToken } }),
    );
    await keep(tokens);
    return tokens.accessToken;
  } catch (error) {
    // The API refused the token (expired, revoked, reused): the session is
    // over. Anything else (offline, a 5xx) leaves it for the next attempt.
    if (isApiError(error) && error.status >= 400 && error.status < 500) {
      await forget();
    }
    throw error;
  }
}

/** Renews the access token, sharing a refresh already in flight. */
function refresh(): Promise<string> {
  refreshing ??= renew().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * Re-issues the pair in another tenant (`POST /v1/auth/token/refresh
 * { tenantId }`). A tenant the person isn't a member of is refused with the
 * refresh token left unspent, so a refusal keeps the session as it was.
 */
async function moveTo(tenantId: string): Promise<string> {
  const refreshToken = await storage.get(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    await forget();
    throw new Error('Not signed in');
  }
  const tokens = await unwrap(
    publicApi.POST('/v1/auth/token/refresh', {
      body: { refreshToken, tenantId },
    }),
  );
  await keep(tokens);
  return tokens.accessToken;
}

export const session = {
  status: () => status,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** On app start: signed in when a stored refresh token still works. */
  async restore() {
    if (!(await storage.get(REFRESH_TOKEN_KEY))) {
      setStatus('signedOut');
      return;
    }
    try {
      await refresh();
    } catch {
      // Refused: refresh() signed out. Offline: stay signed in with the
      // stored token; the next request renews it.
      if (status === 'restoring') {
        setStatus('signedIn');
      }
    }
  },

  /** Starts a session from a sign-in's tokens. */
  start: keep,

  /** The access token for a request, renewed first when (nearly) expired. */
  async accessToken(): Promise<string> {
    if (accessToken && Date.now() < expiresAt - EARLY_MS) {
      return accessToken;
    }
    return refresh();
  },

  /**
   * Acts in another tenant from now on. Waits for a refresh in flight (the
   * family's current refresh token is the one to present), and takes the
   * refresh slot itself so no other refresh spends the token meanwhile.
   * The caller resets cached data: it belonged to the old tenant.
   */
  async switchTenant(tenantId: string): Promise<void> {
    // Another refresh may start while one is awaited: wait until none runs,
    // then claim the slot in the same tick.
    while (refreshing) {
      await refreshing.catch(() => undefined);
    }
    refreshing = moveTo(tenantId).finally(() => {
      refreshing = null;
    });
    await refreshing;
  },

  /** The API answered 401 to a token we thought valid: renew on next use. */
  dropAccessToken() {
    accessToken = null;
  },

  /** Revokes the refresh token (best effort) and forgets the session. */
  async signOut() {
    await refreshing?.catch(() => undefined);
    const refreshToken = await storage.get(REFRESH_TOKEN_KEY);
    await forget();
    if (refreshToken) {
      await publicApi
        .POST('/v1/auth/token/revoke', { body: { refreshToken } })
        .catch(() => undefined); // already signed out locally; it expires anyway
    }
  },
};
