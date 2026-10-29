import { createApiClient } from '@/api/client';
import { clientOptions } from '@/api/public-api';
import { session } from '@/api/session';

/** The client for signed-in calls: the session's access token on every request. */
export const api = createApiClient({
  ...clientOptions,
  credentials: { token: () => session.accessToken() },
});
