/**
 * Signing in with tokens (docs/backend-integration.md, "Sign-in methods",
 * "Tenants"): password, then the two-factor code when the API asks for it,
 * then the tenant when the person has several. The credentials stay in this
 * module's memory until the two-factor step is done: never in route params
 * or storage.
 */
import { isApiError, unwrap, type GetResponse } from '@/api/client';
import { clientWithToken, publicApi } from '@/api/public-api';
import { session, type Tokens } from '@/api/session';

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

type Pending =
  /** Waiting for the two-factor code. */
  | { credentials: Credentials }
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
export function continueWithSecondFactor(second: SecondFactor): Promise<Step> {
  if (!pending || !('credentials' in pending)) {
    throw new Error('No sign-in in progress');
  }
  return signIn(pending.credentials, second);
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

/** Leaving the flow: forget the credentials. */
export function cancelSignIn() {
  pending = null;
}
