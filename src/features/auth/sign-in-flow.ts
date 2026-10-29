/**
 * Signing in with tokens (docs/backend-integration.md, "Sign-in methods",
 * "Tenants"): password, then the two-factor code when the API asks for it,
 * then the tenant when the person has several. The credentials stay in this
 * module's memory for the flow only: never in route params or storage.
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

interface Pending {
  credentials: Credentials;
  /** The account has two-factor on: signing in again needs a fresh code. */
  twoFactor: boolean;
  /** Tokens in the tenant the API chose, while the person picks one. */
  tokens?: Tokens;
  tenants?: Tenant[];
}

let pending: Pending | null = null;

function requestTokens(
  credentials: Credentials,
  second: SecondFactor = {},
  tenantId?: string,
) {
  return unwrap(
    publicApi.POST('/v1/auth/token', {
      body: { ...credentials, ...second, ...(tenantId && { tenantId }) },
    }),
  );
}

async function finish(tokens: Tokens): Promise<Step> {
  pending = null;
  await session.start(tokens);
  return 'signedIn';
}

async function withTokens(
  credentials: Credentials,
  twoFactor: boolean,
  tokens: Tokens,
): Promise<Step> {
  const { items } = await unwrap(
    clientWithToken(tokens.accessToken).GET('/v1/auth/tenants'),
  );
  if (items.length <= 1) {
    return finish(tokens);
  }
  pending = { credentials, twoFactor, tokens, tenants: items };
  return 'chooseTenant';
}

/** Email and password; `second` when the two-factor step asked for it. */
export async function signIn(
  credentials: Credentials,
  second?: SecondFactor,
): Promise<Step> {
  let tokens: Tokens;
  try {
    tokens = await requestTokens(credentials, second);
  } catch (error) {
    if (isApiError(error) && error.code === 'mfa_required') {
      pending = { credentials, twoFactor: true };
      return 'twoFactor';
    }
    throw error;
  }
  return withTokens(credentials, Boolean(second), tokens);
}

/** The two-factor step: the code for the pending sign-in (or tenant switch). */
export function continueWithSecondFactor(
  second: SecondFactor,
  tenantId?: string,
): Promise<Step> {
  if (!pending) {
    throw new Error('No sign-in in progress');
  }
  return tenantId
    ? chooseTenant(tenantId, second)
    : signIn(pending.credentials, second);
}

/** The tenants to choose from, the one the tokens act in first. */
export function pendingTenants(): Tenant[] {
  const tenants = pending?.tenants ?? [];
  return [...tenants].sort((a, b) => Number(b.current) - Number(a.current));
}

/**
 * Continue in a tenant. The current one keeps the tokens; another signs in
 * again with its id (a fresh two-factor code when the account has one), and
 * only then revokes the first tokens, so a wrong code can be retried.
 */
export async function chooseTenant(
  tenantId: string,
  second?: SecondFactor,
): Promise<Step> {
  if (!pending?.tokens || !pending.tenants) {
    throw new Error('No sign-in in progress');
  }
  const { credentials, twoFactor, tokens, tenants } = pending;
  if (tenants.find((tenant) => tenant.current)?.id === tenantId) {
    return finish(tokens);
  }
  if (twoFactor && !second) {
    return 'twoFactor';
  }
  const next = await requestTokens(credentials, second, tenantId);
  await publicApi
    .POST('/v1/auth/token/revoke', {
      body: { refreshToken: tokens.refreshToken },
    })
    .catch(() => undefined); // unused, and it expires anyway
  return finish(next);
}

/** Leaving the flow: forget the credentials. */
export function cancelSignIn() {
  pending = null;
}
