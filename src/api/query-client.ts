import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { isApiError } from '@/api/client';
import { session } from '@/api/session';

/**
 * Retries what may pass on a second try: one retry after a 401 (the access
 * token is renewed first), two after a network error or a 5xx; never after
 * another 4xx, which would answer the same.
 */
function retry(failureCount: number, error: unknown) {
  if (isApiError(error) && error.status === 401) {
    session.dropAccessToken();
    return failureCount < 1;
  }
  if (isApiError(error) && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry },
    mutations: { retry: false },
  },
});

// "Window focus" on a phone is the app coming to the foreground: refetch
// stale queries then (TanStack Query's React Native guide). The web build
// keeps the browser's own focus events.
if (Platform.OS !== 'web') {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (state) =>
      setFocused(state === 'active'),
    );
    return () => subscription.remove();
  });
}
