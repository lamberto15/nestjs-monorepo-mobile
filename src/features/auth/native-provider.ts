/**
 * A provider in the browser for a signed-in app (backend #974): link it
 * to the account, or step up through it. The API issues a one-time ticket
 * bound to this token session (`POST /v1/auth/identities/{provider}/native`),
 * the browser hands back a code on the app's scheme, and
 * `POST /v1/auth/identities/native/complete` finishes it with the PKCE
 * verifier.
 */
import { api } from '@/api/api';
import { unwrap } from '@/api/client';
import { clientWithToken } from '@/api/public-api';
import { session } from '@/api/session';
import {
  browserHandoff,
  pkce,
  providerRedirectUri,
  type SecondFactor,
} from '@/features/auth/sign-in-flow';

type Purpose = 'link' | 'reauthenticate';

/** The browser round trip; null: the person closed it. */
async function handoff(provider: string, purpose: Purpose) {
  const redirectUri = providerRedirectUri();
  if (!redirectUri) {
    throw new Error('APP_ID is not set: no redirect for a provider');
  }
  const { codeVerifier, codeChallenge } = await pkce();
  const { url } = await unwrap(
    api.POST('/v1/auth/identities/{provider}/native', {
      params: { path: { provider } },
      body: { purpose, redirectUri, codeChallenge },
    }),
  );
  const handoffCode = await browserHandoff(url, redirectUri);
  return handoffCode ? { handoffCode, codeVerifier } : null;
}

/** Connects a provider to the account; null: closed. */
export async function linkProvider(provider: string) {
  const done = await handoff(provider, 'link');
  if (!done) {
    return null;
  }
  const answer = await unwrap(
    api.POST('/v1/auth/identities/native/complete', { body: done }),
  );
  return answer.purpose === 'link' ? answer.identity : null;
}

/**
 * A step-up through a connected provider: the provider authenticates the
 * person again, and the session takes the new tokens (the old pair is
 * revoked). `second`: the two-factor code, when the account has it on.
 * False: closed.
 */
export async function reauthenticateWithProvider(
  provider: string,
  second?: SecondFactor,
): Promise<boolean> {
  const done = await handoff(provider, 'reauthenticate');
  if (!done) {
    return false;
  }
  await session.reauthenticateWith(async (accessToken, refreshToken) => {
    const answer = await unwrap(
      clientWithToken(accessToken).POST('/v1/auth/identities/native/complete', {
        body: { ...done, ...second, ...(refreshToken && { refreshToken }) },
      }),
    );
    if (answer.purpose !== 'reauthenticate') {
      throw new Error('Expected new tokens');
    }
    const { accessToken: access, refreshToken: refresh, expiresIn } = answer;
    return { accessToken: access, refreshToken: refresh, expiresIn };
  });
  return true;
}
