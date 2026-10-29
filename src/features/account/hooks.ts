import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/api';
import { unwrap } from '@/api/client';
import { session } from '@/api/session';

const meKey = ['auth', 'me'] as const;
const sessionsKey = ['auth', 'sessions'] as const;

/** Name, language or time zone (`PATCH /v1/auth/me`). */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; locale?: string; timezone?: string }) =>
      unwrap(api.PATCH('/v1/auth/me', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meKey }),
  });
}

/**
 * The person's browser sessions. A token client such as this app is not one
 * of them: it never appears here (docs/backend-integration.md, "Account").
 */
export function useSessions() {
  return useQuery({
    queryKey: sessionsKey,
    queryFn: () => unwrap(api.GET('/v1/auth/sessions')),
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        api.DELETE('/v1/auth/sessions/{id}', { params: { path: { id } } }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionsKey }),
  });
}

/** Every session and token client, this app included: ends here too. */
export function useSignOutEverywhere() {
  return useMutation({
    mutationFn: () => unwrap(api.POST('/v1/auth/sign-out-everywhere')),
    onSuccess: () => session.signOut(),
  });
}
