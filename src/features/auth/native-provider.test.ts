import { fakeApi, reply } from '@/test/fake-api';

const pair = (name: string) => ({
  accessToken: `a-${name}`,
  refreshToken: `r-${name}`,
  expiresIn: 900,
});

beforeEach(() => {
  jest.resetModules();
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

/** Signed in, with the browser coming back with a handoff code. */
async function load() {
  const WebBrowser = require('expo-web-browser');
  WebBrowser.openAuthSessionAsync = jest.fn(async () => ({
    type: 'success',
    url: 'dev.example.app:/auth?code=h1',
  }));
  const { session } =
    require('@/api/session') as typeof import('@/api/session');
  const provider =
    require('@/features/auth/native-provider') as typeof import('@/features/auth/native-provider');
  return { session, provider };
}

test('link: a ticket for this session, finished with the verifier', async () => {
  const { session, provider } = await load();
  const calls = fakeApi({
    'POST /v1/auth/identities/github/native': () =>
      reply(
        { url: 'https://api.example/v1/auth/oidc/github/login?ticket=t' },
        201,
      ),
    'POST /v1/auth/identities/native/complete': () =>
      reply({
        purpose: 'link',
        identity: { provider: 'github', email: null, createdAt: 'x' },
      }),
  });
  await session.start(pair('one'));

  await expect(provider.linkProvider('github')).resolves.toMatchObject({
    provider: 'github',
  });
  const ticket = calls.find((call) => call.path.endsWith('/github/native'));
  expect(ticket?.authorization).toBe('Bearer a-one');
  expect(ticket?.body).toMatchObject({
    purpose: 'link',
    redirectUri: 'dev.example.app:/auth',
  });
  const complete = calls.find((call) => call.path.endsWith('/native/complete'))
    ?.body as { handoffCode: string; codeVerifier: string };
  expect(complete.handoffCode).toBe('h1');
  const { createHash } = jest.requireActual('crypto');
  expect(
    createHash('sha256').update(complete.codeVerifier).digest('base64url'),
  ).toBe((ticket?.body as { codeChallenge: string }).codeChallenge);
});

test('step-up: the old refresh token goes in, the new pair is kept', async () => {
  const { session, provider } = await load();
  const calls = fakeApi({
    'POST /v1/auth/identities/github/native': () =>
      reply({ url: 'https://api.example/login' }, 201),
    'POST /v1/auth/identities/native/complete': () =>
      reply({ purpose: 'reauthenticate', ...pair('two') }),
  });
  await session.start(pair('one'));

  await expect(
    provider.reauthenticateWithProvider('github', { code: '123456' }),
  ).resolves.toBe(true);
  expect(
    calls.find((call) => call.path.endsWith('/native/complete'))?.body,
  ).toMatchObject({ refreshToken: 'r-one', code: '123456', handoffCode: 'h1' });
  await expect(session.accessToken()).resolves.toBe('a-two');
});
