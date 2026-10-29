import { useSyncExternalStore } from 'react';

import { session } from '@/api/session';

/** `restoring`, `signedIn` or `signedOut`, re-rendering when it changes. */
export function useSessionStatus() {
  return useSyncExternalStore(session.subscribe, session.status);
}
