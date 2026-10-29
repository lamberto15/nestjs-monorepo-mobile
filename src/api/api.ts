import * as Crypto from 'expo-crypto';

import { createApiClient } from '@/api/client';
import { API_URL, deviceLanguage } from '@/api/public-api';
import { session } from '@/api/session';

/** The client for signed-in calls: the session's access token on every request. */
export const api = createApiClient({
  baseUrl: API_URL,
  credentials: { token: () => session.accessToken() },
  language: deviceLanguage,
  idempotencyKey: Crypto.randomUUID,
});
