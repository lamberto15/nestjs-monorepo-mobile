import { createRealtime } from '@/api/client';
import { API_URL } from '@/api/public-api';
import { session } from '@/api/session';

/**
 * A realtime connection (socket.io over WebSocket) acting as the signed-in
 * person: the session's access token is asked on every (re)connection, so a
 * renewed token is used. The caller closes it (on sign-out, the signed-in
 * layout unmounts and does).
 */
export function openRealtime() {
  return createRealtime({
    url: API_URL,
    token: () => session.accessToken(),
  });
}
