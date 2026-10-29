import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { getLocales } from 'expo-localization';
import { Platform } from 'react-native';

import { createApiClient, type ApiClientOptions } from '@/api/client';

const url = process.env.EXPO_PUBLIC_API_URL;
if (!url) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set: copy .env.example to .env (docs/development.md).',
  );
}

/** The API's origin, from `EXPO_PUBLIC_API_URL`. */
export const API_URL = url;

/**
 * The web app's origin (`EXPO_PUBLIC_WEB_URL`), where links from the API
 * (a notification's `link`) open; undefined when there is none.
 */
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || undefined;

/** The device's language, sent while the user has saved none. */
export const deviceLanguage = getLocales()[0]?.languageTag;

/**
 * Who calls, for the API's sessions, sign-in log, audit and new-device
 * alerts: `NestJSMobile/1.0.0 (iPhone 17 Pro; iOS 26.5)`. Without it the
 * platform's default goes (Expo Go's `Expo/…`, Android's `okhttp/…`), which
 * the API can only label by its first word. The API reads `iPhone`/`iPad`
 * and `Android` in it as the system.
 */
export const USER_AGENT =
  `${(Constants.expoConfig?.name ?? 'App').replace(/\s+/g, '')}/${
    Constants.expoConfig?.version ?? '0'
  } (${Device.modelName ?? Platform.OS}; ${Device.osName ?? Platform.OS} ${
    Device.osVersion ?? ''
  })`.replace(' )', ')');

/** What every client of the app shares: the API, language, idempotency keys, user agent. */
export const clientOptions: ApiClientOptions = {
  baseUrl: API_URL,
  language: deviceLanguage,
  // React Native has no crypto.randomUUID.
  idempotencyKey: Crypto.randomUUID,
  fetch: (input, init) => {
    const request = new Request(input, init);
    request.headers.set('User-Agent', USER_AGENT);
    return globalThis.fetch(request);
  },
};

/**
 * The client for calls made without a session: sign-in, sign-up, sign-in
 * options, the token refresh itself. Signed-in calls use `api` (api.ts).
 */
export const publicApi = createApiClient(clientOptions);

/**
 * A client acting with tokens the session doesn't hold yet: the sign-in
 * flow reads the person's tenants before it starts the session.
 */
export function clientWithToken(token: string) {
  return createApiClient({ ...clientOptions, credentials: { token } });
}
