/**
 * The account's own data and its lifecycle (backend `auth`, "Your data,
 * your account's deletion, consents"): deletion with a grace period, the
 * data export, consents, two-factor, password, email, avatar. Sensitive
 * calls go through `withStepUp`.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { File } from 'expo-file-system';

import { api } from '@/api/api';
import { unwrap } from '@/api/client';
import { withStepUp } from '@/features/account/step-up';

const keys = {
  account: ['account'] as const,
  exports: ['account', 'exports'] as const,
  consentKinds: ['account', 'consent-kinds'] as const,
  consents: ['account', 'consents'] as const,
  mfa: ['auth', 'mfa'] as const,
  me: ['auth', 'me'] as const,
};

/** A pending deletion (`deletion`), and what the person agreed to. */
export function useAccount() {
  return useQuery({
    queryKey: keys.account,
    queryFn: () => unwrap(api.GET('/v1/account')),
  });
}

/** Deletes the account after the grace period; this device stays signed in to cancel. */
export function useRequestDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password?: string) =>
      withStepUp(() =>
        unwrap(
          api.POST('/v1/account/deletion', {
            body: password ? { password } : {},
          }),
        ),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.account }),
  });
}

export function useCancelDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.DELETE('/v1/account/deletion')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.account }),
  });
}

/** The person's exports, polled while one is still being made. */
export function useExports() {
  return useQuery({
    queryKey: keys.exports,
    queryFn: () => unwrap(api.GET('/v1/account/exports')),
    refetchInterval: (query) =>
      query.state.data?.items.some(
        (item) => item.status === 'queued' || item.status === 'running',
      )
        ? 3000
        : false,
  });
}

export function useRequestExport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      withStepUp(() =>
        unwrap(api.POST('/v1/account/export', { body: { format: 'json' } })),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.exports }),
  });
}

/** What the service asks agreement to (terms, privacy…), each with its current version. */
export function useConsentKinds() {
  return useQuery({
    queryKey: keys.consentKinds,
    queryFn: () => unwrap(api.GET('/v1/account/consent-kinds')),
  });
}

export function useConsents() {
  return useQuery({
    queryKey: keys.consents,
    queryFn: () => unwrap(api.GET('/v1/account/consents')),
  });
}

/** Agree to a kind at its current version, or withdraw (optional kinds only). */
export function useSetConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      version,
      given,
    }: {
      kind: string;
      version: string;
      given: boolean;
    }) =>
      given
        ? unwrap(api.POST('/v1/account/consents', { body: { kind, version } }))
        : unwrap(
            api.DELETE('/v1/account/consents/{kind}', {
              params: { path: { kind } },
            }),
          ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.consents }),
  });
}

export function useMfa() {
  return useQuery({
    queryKey: keys.mfa,
    queryFn: () => unwrap(api.GET('/v1/auth/mfa')),
  });
}

/** Starts two-factor: the secret and its `otpauth://` link for an authenticator app. */
export function useEnrollMfa() {
  return useMutation({
    mutationFn: () => withStepUp(() => unwrap(api.POST('/v1/auth/mfa/enroll'))),
  });
}

/** The first code turns two-factor on and answers the recovery codes, once. */
export function useConfirmMfa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      unwrap(api.POST('/v1/auth/mfa/confirm', { body: { code } })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.mfa });
      void queryClient.invalidateQueries({ queryKey: keys.me });
    },
  });
}

export function useNewRecoveryCodes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      withStepUp(() => unwrap(api.POST('/v1/auth/mfa/recovery-codes'))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.mfa }),
  });
}

export function useDisableMfa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => withStepUp(() => unwrap(api.DELETE('/v1/auth/mfa'))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.mfa });
      void queryClient.invalidateQueries({ queryKey: keys.me });
    },
  });
}

/**
 * Signs out every other session and every token client, this app's
 * included: the caller signs in again with the new password.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword?: string; newPassword: string }) =>
      withStepUp(() => unwrap(api.POST('/v1/auth/password/change', { body }))),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () => unwrap(api.POST('/v1/auth/email/verification')),
  });
}

/** A picture from the phone (PNG, JPEG, WebP or GIF, at most 2 MB). */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uri: string) => {
      const form = new FormData();
      form.append('file', new File(uri));
      return unwrap(
        api.PUT('/v1/account/avatar', {
          body: form as never, // multipart: the typed body is the JSON shape
        }),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.me }),
  });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.DELETE('/v1/account/avatar')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.me }),
  });
}
