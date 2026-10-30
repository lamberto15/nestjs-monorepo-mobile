/**
 * The account's passkeys (backend `auth`, "Passkeys"): listed, added on
 * this device, removed. Adding and removing want a recent sign-in
 * (`withStepUp`); removing never takes the last way to sign in (409
 * `last_sign_in_method`).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';

import { api } from '@/api/api';
import { unwrap } from '@/api/client';
import { withStepUp } from '@/features/account/step-up';
import { createPasskey } from '@/features/auth/passkeys';

const key = ['auth', 'passkeys'] as const;

export function usePasskeys() {
  return useQuery({
    queryKey: key,
    queryFn: () => unwrap(api.GET('/v1/auth/passkeys')),
  });
}

/** A new passkey on this device, named after it ("iPhone"); false: cancelled. */
export function useAddPasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      withStepUp(async () => {
        const options = await unwrap(
          api.POST('/v1/auth/passkeys/registration/options'),
        );
        const response = await createPasskey(options as never);
        if (!response) {
          return false;
        }
        await unwrap(
          api.POST('/v1/auth/passkeys', {
            body: {
              name: Device.deviceName ?? Device.modelName ?? 'Phone',
              response: response as never,
            },
          }),
        );
        return true;
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useRemovePasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      withStepUp(() =>
        unwrap(
          api.DELETE('/v1/auth/passkeys/{id}', { params: { path: { id } } }),
        ),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
