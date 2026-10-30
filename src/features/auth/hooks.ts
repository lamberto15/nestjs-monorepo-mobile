import { useMutation, useQuery } from '@tanstack/react-query';
import { getCalendars } from 'expo-localization';
import { useTranslation } from 'react-i18next';

import { MAX_AGE_MS } from '@/api/offline-cache';
import { api } from '@/api/api';
import { unwrap } from '@/api/client';
import { publicApi } from '@/api/public-api';
import {
  chooseTenant,
  continueWithSecondFactor,
  signIn,
  signInWithProvider,
  type Credentials,
  type SecondFactor,
} from '@/features/auth/sign-in-flow';

/** What this server offers on its sign-in page (`GET /v1/auth/methods`). */
export function useAuthMethods() {
  return useQuery({
    queryKey: ['auth', 'methods'],
    queryFn: () => unwrap(publicApi.GET('/v1/auth/methods')),
    staleTime: 5 * 60_000,
  });
}

/** The signed-in person, their tenant and what they may do. */
export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => unwrap(api.GET('/v1/auth/me')),
    // Offline, the app still knows whose it is and what they may do.
    meta: { persist: true },
    gcTime: MAX_AGE_MS,
  });
}

export function useSignIn() {
  return useMutation({
    mutationFn: (credentials: Credentials) => signIn(credentials),
  });
}

/** A provider's sign-in in the browser; null: the person closed it. */
export function useProviderSignIn() {
  return useMutation({
    mutationFn: (provider: string) => signInWithProvider(provider),
  });
}

export function useSecondFactor() {
  return useMutation({
    mutationFn: (second: SecondFactor) => continueWithSecondFactor(second),
  });
}

export function useChooseTenant() {
  return useMutation({
    mutationFn: (tenantId: string) => chooseTenant(tenantId),
  });
}

export interface SignUp {
  email: string;
  name: string;
  password: string;
  tenantName?: string;
}

export function useSignUp() {
  const { i18n } = useTranslation();
  return useMutation({
    mutationFn: (body: SignUp) =>
      unwrap(
        publicApi.POST('/v1/auth/sign-up', {
          body: {
            ...body,
            locale: i18n.resolvedLanguage ?? 'en',
            timezone: getCalendars()[0]?.timeZone ?? undefined,
          },
        }),
      ),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      unwrap(publicApi.POST('/v1/auth/password/forgot', { body: { email } })),
  });
}
