/**
 * Signing in with tokens (docs/backend-integration.md, "Sign-in methods",
 * "Tenants"): a password, or a provider (GitHub, Google, Microsoft) in the
 * system browser; then the two-factor code when the API asks for it, then
 * the tenant when the person has several. The credentials (or a provider's
 * one-time handoff code and its verifier) stay in this module's memory
 * until the two-factor step is done: never in route params or storage.
 */
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

import { isApiError, unwrap, type GetResponse } from '@/api/client';
import { API_URL, clientWithToken, publicApi } from '@/api/public-api';
import { session, type Tokens } from '@/api/session';
import { getPasskey } from '@/features/auth/passkeys';

export interface Credentials {
  email: string;
  password: string;
}

/** The second factor: a code from the app, or a recovery code. */
export interface SecondFactor {
  code?: string;
  recoveryCode?: string;
}

export type Tenant = GetResponse<'/v1/auth/tenants'>['items'][number];

/** Where the flow goes next. */
export type Step = 'twoFactor' | 'chooseTenant' | 'signedIn';

/** A provider's sign-in, back from the browser: what exchanges it for tokens. */
interface Handoff {
  handoffCode: string;
  codeVerifier: string;
}

type Pending =
  /** Waiting for the two-factor code. */
  | { credentials: Credentials }
  /** A passkey sign-in: its challenge is spent, so the code goes with a new one. */
  | { passkey: { email?: string } }
  | { handoff: Handoff }
  /** Signed in (tokens in the tenant the API chose), choosing a tenant. */
  | { tokens: Tokens; tenants: Tenant[] };

let pending: Pending | null = null;

async function finish(tokens: Tokens): Promise<Step> {
  pending = null;
  await session.start(tokens);
  return 'signedIn';
}

/** Email and password; `second` when the two-factor step asked for it. */
export async function signIn(
  credentials: Credentials,
  second?: SecondFactor,
): Promise<Step> {
  let tokens: Tokens;
  try {
    tokens = await unwrap(
      publicApi.POST('/v1/auth/token', { body: { ...credentials, ...second } }),
    );
  } catch (error) {
    if (isApiError(error) && error.code === 'mfa_required') {
      pending = { credentials };
      return 'twoFactor';
    }
    throw error;
  }
  return withTokens(tokens);
}

/** Signed in: on to the tenant, when there are several. */
async function withTokens(tokens: Tokens): Promise<Step> {
  const { items } = await unwrap(
    clientWithToken(tokens.accessToken).GET('/v1/auth/tenants'),
  );
  if (items.length <= 1) {
    return finish(tokens);
  }
  pending = { tokens, tenants: items };
  return 'chooseTenant';
}

/** The two-factor step: the code for the pending sign-in. */
export async function continueWithSecondFactor(
  second: SecondFactor,
): Promise<Step> {
  if (pending && 'passkey' in pending) {
    const step = await signInWithPasskey(pending.passkey.email, second);
    if (!step) {
      throw new PasskeyCancelled();
    }
    return step;
  }
  if (pending && 'handoff' in pending) {
    return exchange(pending.handoff, second);
  }
  if (!pending || !('credentials' in pending)) {
    throw new Error('No sign-in in progress');
  }
  return signIn(pending.credentials, second);
}

/** Where the browser hands back: the app's own scheme (`<APP_ID>:/auth`), one of the API's `NATIVE_REDIRECT_URIS`. */
export function providerRedirectUri(): string | null {
  const config = Constants.expoConfig;
  const appId = config?.ios?.bundleIdentifier ?? config?.android?.package;
  return appId ? `${appId}:/auth` : null;
}

const base64Url = (base64: string) =>
  base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** PKCE (RFC 7636, S256): a random verifier and its SHA-256 challenge. */
export async function pkce() {
  const bytes = Crypto.getRandomBytes(32);
  const codeVerifier = base64Url(btoa(String.fromCharCode(...bytes)));
  const codeChallenge = base64Url(
    await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.BASE64 },
    ),
  );
  return { codeVerifier, codeChallenge };
}

/**
 * A provider's sign-in (`GET /v1/auth/oidc/{provider}/login`) in the
 * system browser, which hands back a one-time code on the app's scheme;
 * the code and the verifier make the tokens. Null: the person closed the
 * browser.
 */
export async function signInWithProvider(
  provider: string,
): Promise<Step | null> {
  const redirectUri = providerRedirectUri();
  if (!redirectUri) {
    throw new Error('APP_ID is not set: no redirect for a provider sign-in');
  }
  const { codeVerifier, codeChallenge } = await pkce();
  const url = `${API_URL}/v1/auth/oidc/${encodeURIComponent(provider)}/login?${new URLSearchParams({ redirectUri, codeChallenge })}`;
  const handoffCode = await browserHandoff(url, redirectUri);
  return handoffCode ? exchange({ handoffCode, codeVerifier }) : null;
}

/**
 * Opens `url` in the system browser until it hands back on `redirectUri`:
 * its one-time code, or null when the person closed it. `?error=` (the
 * provider said no, no such account, an identity already someone else's)
 * is a `ProviderSignInError`.
 */
export async function browserHandoff(
  url: string,
  redirectUri: string,
): Promise<string | null> {
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);
  if (result.type !== 'success') {
    return null;
  }
  const back = new URL(result.url).searchParams;
  const code = back.get('code');
  if (!code) {
    throw new ProviderSignInError(back.get('error') ?? 'sign_in_failed');
  }
  return code;
}

/** The browser came back without a code. */
export class ProviderSignInError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'ProviderSignInError';
  }
}

/**
 * The handoff code for tokens (`POST /v1/auth/token/exchange`). Without the
 * two-factor code the API answers `mfa_required` and the code still works;
 * a wrong one spends it (start again in the browser).
 */
async function exchange(
  handoff: Handoff,
  second?: SecondFactor,
): Promise<Step> {
  let tokens: Tokens;
  try {
    tokens = await unwrap(
      publicApi.POST('/v1/auth/token/exchange', {
        body: { ...handoff, ...second },
      }),
    );
  } catch (error) {
    if (isApiError(error) && error.code === 'mfa_required' && !second) {
      pending = { handoff };
      return 'twoFactor';
    }
    pending = null;
    throw error;
  }
  return withTokens(tokens);
}

/** The tenants to choose from, the one the tokens act in first. */
export function pendingTenants(): Tenant[] {
  const tenants = pending && 'tenants' in pending ? pending.tenants : [];
  return [...tenants].sort((a, b) => Number(b.current) - Number(a.current));
}

/**
 * Continue in a tenant: the current one keeps the tokens; another re-issues
 * them there (`POST /v1/auth/token/refresh { tenantId }`), with no password
 * or code again.
 */
export async function chooseTenant(tenantId: string): Promise<Step> {
  if (!pending || !('tokens' in pending)) {
    throw new Error('No sign-in in progress');
  }
  const { tokens, tenants } = pending;
  if (tenants.find((tenant) => tenant.current)?.id === tenantId) {
    return finish(tokens);
  }
  return finish(
    await unwrap(
      publicApi.POST('/v1/auth/token/refresh', {
        body: { refreshToken: tokens.refreshToken, tenantId },
      }),
    ),
  );
}

/**
 * A passkey sign-in (`/v1/auth/passkeys/sign-in/options`, the device's
 * prompt, `/v1/auth/passkeys/token`): the account's passkeys with an
 * email, the device's for this site without. Null: the person cancelled.
 * With two-factor on the API asks for the code; each challenge works once,
 * so the code goes with a second prompt.
 */
export async function signInWithPasskey(
  email?: string,
  second?: SecondFactor,
): Promise<Step | null> {
  const options = await unwrap(
    publicApi.POST('/v1/auth/passkeys/sign-in/options', {
      body: email ? { email } : {},
    }),
  );
  const response = await getPasskey(options as never);
  if (!response) {
    return null;
  }
  let tokens: Tokens;
  try {
    tokens = await unwrap(
      publicApi.POST('/v1/auth/passkeys/token', {
        body: { response: response as never, ...second },
      }),
    );
  } catch (error) {
    if (isApiError(error) && error.code === 'mfa_required' && !second) {
      pending = { passkey: { email } };
      return 'twoFactor';
    }
    pending = null;
    throw error;
  }
  return withTokens(tokens);
}

/** The second passkey prompt (after the two-factor code) was cancelled. */
export class PasskeyCancelled extends Error {
  constructor() {
    super('Passkey cancelled');
    this.name = 'PasskeyCancelled';
  }
}

/** Whether a sign-in waits for its next step (a provider's spent code leaves none). */
export const signInPending = () => pending !== null;

/** Leaving the flow: forget the credentials. */
export function cancelSignIn() {
  pending = null;
}
