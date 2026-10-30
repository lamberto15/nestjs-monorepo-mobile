/**
 * The providers linked to the account (GitHub, Google, Microsoft): listed,
 * and disconnected (a step-up first when the sign-in is old; never the
 * last way to sign in: 409 `last_sign_in_method`), and connected from the
 * app through the browser (a step-up first when the sign-in is old).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/api';
import { unwrap } from '@/api/client';
import { withStepUp } from '@/features/account/step-up';
import { linkProvider } from '@/features/auth/native-provider';

const key = ['auth', 'identities'] as const;

export function useIdentities() {
  return useQuery({
    queryKey: key,
    queryFn: () => unwrap(api.GET('/v1/auth/identities')),
  });
}

/** Connects a provider; null: the person closed the browser. */
export function useLinkProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) => withStepUp(() => linkProvider(provider)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useUnlinkIdentity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) =>
      withStepUp(() =>
        unwrap(
          api.DELETE('/v1/auth/identities/{provider}', {
            params: { path: { provider } },
          }),
        ),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
