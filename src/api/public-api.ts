import * as Crypto from 'expo-crypto';
import { getLocales } from 'expo-localization';

import { createApiClient } from '@/api/client';

const url = process.env.EXPO_PUBLIC_API_URL;
if (!url) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set: copy .env.example to .env (docs/development.md).',
  );
}

/** The API's origin, from `EXPO_PUBLIC_API_URL`. */
export const API_URL = url;

/** The device's language, sent while the user has saved none. */
export const deviceLanguage = getLocales()[0]?.languageTag;

/**
 * The client for calls made without a session: sign-in, sign-up, sign-in
 * options, the token refresh itself. Signed-in calls use `api` (api.ts).
 */
export const publicApi = createApiClient({
  baseUrl: API_URL,
  language: deviceLanguage,
  // React Native has no crypto.randomUUID.
  idempotencyKey: Crypto.randomUUID,
});
