import { fakeApi, problem, reply, type Call } from '@/test/fake-api';

const credentials = { email: 'ada@example.com', password: 'fake' };
const tenants = [
  { id: 't1', slug: 'one', name: 'One', current: true, operator: false },
  { id: 't2', slug: 'two', name: 'Two', current: false, operator: false },
];
/** The token pair the fake API issues in a tenant. */
const pair = (tenant: string) => ({
  accessToken: `a-${tenant}`,
  refreshToken: `r-${tenant}`,
  expiresIn: 900,
});

function load() {
  jest.resetModules();
  return {
    flow: require('@/features/auth/sign-in-flow') as typeof import('@/features/auth/sign-in-flow'),
    session: (require('@/api/session') as typeof import('@/api/session'))
      .session,
  };
}

/** `POST /v1/auth/token` for an account with two-factor on. */
function withTwoFactor(call: Call) {
  const body = call.body as { code?: string; tenantId?: string };
  return body.code
    ? reply(pair(body.tenantId ?? 't1'))
    : problem(401, 'mfa_required');
}

test('password, two-factor, then another tenant (by refresh, no code again), then signed in', async () => {
  const { flow, session } = load();
  const calls = fakeApi({
    'POST /v1/auth/token': withTwoFactor,
    'GET /v1/auth/tenants': () => reply({ items: tenants }),
    'POST /v1/auth/token/refresh': (call) =>
      reply(pair((call.body as { tenantId: string }).tenantId)),
  });

  expect(await flow.signIn(credentials)).toBe('twoFactor');
  expect(await flow.continueWithSecondFactor({ code: '123456' })).toBe(
    'chooseTenant',
  );
  expect(flow.pendingTenants().map((tenant) => tenant.id)).toEqual([
    't1',
    't2',
  ]);
  // The tenants are read with the new tokens, before the session holds them.
  expect(
    calls.find((call) => call.path === '/v1/auth/tenants')?.authorization,
  ).toBe('Bearer a-t1');

  expect(await flow.chooseTenant('t2')).toBe('signedIn');

  expect(calls.filter((call) => call.path === '/v1/auth/token')).toHaveLength(
    2,
  );
  expect(
    calls.find((call) => call.path === '/v1/auth/token/refresh')?.body,
  ).toEqual({ refreshToken: 'r-t1', tenantId: 't2' });
  expect(session.status()).toBe('signedIn');
  expect(await session.accessToken()).toBe('a-t2');
  expect(flow.pendingTenants()).toEqual([]);
});

test('the current tenant keeps the first tokens', async () => {
  const { flow, session } = load();
  const calls = fakeApi({
    'POST /v1/auth/token': () => reply(pair('t1')),
    'GET /v1/auth/tenants': () => reply({ items: tenants }),
  });

  expect(await flow.signIn(credentials)).toBe('chooseTenant');
  expect(await flow.chooseTenant('t1')).toBe('signedIn');

  expect(calls.filter((call) => call.path === '/v1/auth/token')).toHaveLength(
    1,
  );
  expect(await session.accessToken()).toBe('a-t1');
});

test('one tenant signs straight in; a refused sign-in is thrown as is', async () => {
  const { flow, session } = load();
  fakeApi({
    'POST /v1/auth/token': (call) =>
      (call.body as { password: string }).password === credentials.password
        ? reply(pair('t1'))
        : problem(401, 'invalid_credentials'),
    'GET /v1/auth/tenants': () => reply({ items: [tenants[0]] }),
  });

  await expect(
    flow.signIn({ ...credentials, password: 'other' }),
  ).rejects.toMatchObject({ code: 'invalid_credentials' });
  expect(session.status()).toBe('restoring');
  expect(await flow.signIn(credentials)).toBe('signedIn');
  expect(session.status()).toBe('signedIn');
});

describe('a provider (GitHub) in the browser', () => {
  /** The browser: opens the login URL, comes back on the app's scheme with a code. */
  function browser(back: (loginUrl: URL) => string) {
    const WebBrowser = require('expo-web-browser');
    const opened: URL[] = [];
    WebBrowser.openAuthSessionAsync = jest.fn(async (url: string) => {
      opened.push(new URL(url));
      return { type: 'success', url: back(new URL(url)) };
    });
    return opened;
  }

  beforeEach(() => {
    jest.doMock('expo-constants', () => ({
      expoConfig: { ios: { bundleIdentifier: 'dev.example.app' } },
    }));
    jest.doMock('expo-crypto', () => {
      const { createHash, randomBytes } = jest.requireActual('crypto');
      return {
        CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
        CryptoEncoding: { BASE64: 'base64' },
        getRandomBytes: (n: number) => new Uint8Array(randomBytes(n)),
        digestStringAsync: async (_: string, data: string) =>
          createHash('sha256').update(data).digest('base64'),
      };
    });
  });

  test('PKCE: the code goes back with the verifier of the challenge sent', async () => {
    const { flow } = load();
    const opened = browser(() => 'dev.example.app:/auth?code=h1');
    const calls = fakeApi({
      'POST /v1/auth/token/exchange': (call) =>
        (call.body as { code?: string }).code
          ? reply(pair('t1'))
          : problem(401, 'mfa_required'),
      'GET /v1/auth/tenants': () => reply({ items: [tenants[0]] }),
    });

    expect(await flow.signInWithProvider('github')).toBe('twoFactor');
    const login = opened[0];
    expect(login.pathname).toBe('/v1/auth/oidc/github/login');
    expect(login.searchParams.get('redirectUri')).toBe('dev.example.app:/auth');

    expect(await flow.continueWithSecondFactor({ code: '123456' })).toBe(
      'signedIn',
    );
    const exchanges = calls.filter(
      (call) => call.path === '/v1/auth/token/exchange',
    );
    expect(exchanges).toHaveLength(2);
    const { handoffCode, codeVerifier } = exchanges[1].body as {
      handoffCode: string;
      codeVerifier: string;
    };
    expect(handoffCode).toBe('h1');
    const { createHash } = jest.requireActual('crypto');
    expect(createHash('sha256').update(codeVerifier).digest('base64url')).toBe(
      login.searchParams.get('codeChallenge'),
    );
  });

  test('a wrong two-factor code spends the handoff: start again', async () => {
    const { flow } = load();
    browser(() => 'dev.example.app:/auth?code=h1');
    fakeApi({
      'POST /v1/auth/token/exchange': (call) =>
        (call.body as { code?: string }).code
          ? problem(401, 'invalid_code')
          : problem(401, 'mfa_required'),
    });
    expect(await flow.signInWithProvider('github')).toBe('twoFactor');
    await expect(
      flow.continueWithSecondFactor({ code: '000000' }),
    ).rejects.toMatchObject({ code: 'invalid_code' });
    expect(flow.signInPending()).toBe(false);
  });

  test('refused by the provider, or closed by the person', async () => {
    const { flow } = load();
    browser(() => 'dev.example.app:/auth?error=sign_in_failed');
    await expect(flow.signInWithProvider('github')).rejects.toBeInstanceOf(
      flow.ProviderSignInError,
    );

    const WebBrowser = require('expo-web-browser');
    WebBrowser.openAuthSessionAsync = jest.fn(async () => ({ type: 'cancel' }));
    await expect(flow.signInWithProvider('github')).resolves.toBeNull();
  });
});

describe('a passkey', () => {
  test('with two-factor: the code goes with a second passkey prompt (each challenge works once)', async () => {
    const getPasskey = jest.fn(async (options: { challenge: string }) => ({
      id: 'c1',
      rawId: 'c1',
      type: 'public-key',
      response: { clientDataJSON: options.challenge },
      clientExtensionResults: {},
    }));
    jest.doMock('@/features/auth/passkeys', () => ({ getPasskey }));
    const { flow } = load();
    let challenges = 0;
    const calls = fakeApi({
      'POST /v1/auth/passkeys/sign-in/options': () =>
        reply({ challenge: `ch${(challenges += 1)}` }),
      'POST /v1/auth/passkeys/token': (call) =>
        (call.body as { code?: string }).code
          ? reply(pair('t1'))
          : problem(401, 'mfa_required'),
      'GET /v1/auth/tenants': () => reply({ items: [tenants[0]] }),
    });

    expect(await flow.signInWithPasskey('ada@example.com')).toBe('twoFactor');
    expect(await flow.continueWithSecondFactor({ code: '123456' })).toBe(
      'signedIn',
    );
    // Two prompts, each answering its own challenge.
    expect(getPasskey.mock.calls.map(([options]) => options.challenge)).toEqual(
      ['ch1', 'ch2'],
    );
    const tokens = calls.filter(
      (call) => call.path === '/v1/auth/passkeys/token',
    );
    expect(tokens[1].body).toMatchObject({
      code: '123456',
      response: { response: { clientDataJSON: 'ch2' } },
    });
    expect(
      calls.find((call) => call.path === '/v1/auth/passkeys/sign-in/options')
        ?.body,
    ).toEqual({ email: 'ada@example.com' });
  });

  test('cancelled at the prompt: nothing happens', async () => {
    jest.doMock('@/features/auth/passkeys', () => ({
      getPasskey: async () => null,
    }));
    const { flow } = load();
    fakeApi({
      'POST /v1/auth/passkeys/sign-in/options': () => reply({ challenge: 'c' }),
    });
    await expect(flow.signInWithPasskey()).resolves.toBeNull();
    expect(flow.signInPending()).toBe(false);
  });
});
