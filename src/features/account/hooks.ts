import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/api';
import { unwrap } from '@/api/client';
import { session } from '@/api/session';

const meKey = ['auth', 'me'] as const;
const sessionsKey = ['auth', 'sessions'] as const;
const tenantsKey = ['auth', 'tenants'] as const;

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
 * Where the person is signed in: browser sessions and apps (`kind`), this
 * app's own sign-in marked `current`.
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

/** The person's tenants; `current` is the one the session acts in. */
export function useTenants() {
  return useQuery({
    queryKey: tenantsKey,
    queryFn: () => unwrap(api.GET('/v1/auth/tenants')),
  });
}

/**
 * Acts in another tenant (no password again: the token refresh moves). Every
 * cached answer belonged to the old one, so all queries reset and the
 * mounted screens load again; the realtime socket reconnects with the new
 * token by itself.
 */
export function useSwitchTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) => session.switchTenant(tenantId),
    onSuccess: () => queryClient.resetQueries(),
  });
}

/** Every session and token client, this app included: ends here too. */
export function useSignOutEverywhere() {
  return useMutation({
    mutationFn: () => unwrap(api.POST('/v1/auth/sign-out-everywhere')),
    onSuccess: () => session.signOut(),
  });
}
