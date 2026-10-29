import { deferred, fakeApi, problem, reply } from '@/test/fake-api';

const KEY = 'session.refreshToken';
const tokens = (n: number) => ({
  accessToken: `a${n}`,
  refreshToken: `r${n}`,
  expiresIn: 900,
});

/** A fresh session module (its state is module-level) and secure store. */
async function load(storedRefreshToken: string) {
  jest.resetModules();
  const store =
    require('expo-secure-store') as typeof import('expo-secure-store');
  await store.setItemAsync(KEY, storedRefreshToken);
  const { session } =
    require('@/api/session') as typeof import('@/api/session');
  return { session, store };
}

test('concurrent requests share one refresh and keep the rotated token', async () => {
  const answer = deferred<Response>();
  const { session, store } = await load('r1');
  const calls = fakeApi({
    'POST /v1/auth/token/refresh': () => answer.promise,
  });

  const all = Promise.all([
    session.accessToken(),
    session.accessToken(),
    session.accessToken(),
  ]);
  answer.resolve(reply(tokens(2)));

  expect(await all).toEqual(['a2', 'a2', 'a2']);
  expect(calls).toHaveLength(1);
  expect(calls[0].body).toEqual({ refreshToken: 'r1' });
  expect(await store.getItemAsync(KEY)).toBe('r2');
  expect(session.status()).toBe('signedIn');
});

test('a refused refresh ends the session', async () => {
  const { session, store } = await load('r1');
  fakeApi({
    'POST /v1/auth/token/refresh': () => problem(401, 'invalid_refresh_token'),
  });

  await session.restore();

  expect(session.status()).toBe('signedOut');
  expect(await store.getItemAsync(KEY)).toBeNull();
});

test('offline at launch stays signed in with the stored token', async () => {
  const { session, store } = await load('r1');
  fakeApi({
    'POST /v1/auth/token/refresh': () => {
      throw new TypeError('Network request failed');
    },
  });

  await session.restore();

  expect(session.status()).toBe('signedIn');
  expect(await store.getItemAsync(KEY)).toBe('r1');
});

test('sign-out waits for a refresh in flight and revokes the newest token', async () => {
  const answer = deferred<Response>();
  const { session, store } = await load('r1');
  const calls = fakeApi({
    'POST /v1/auth/token/refresh': () => answer.promise,
    'POST /v1/auth/token/revoke': () => new Response(null, { status: 204 }),
  });

  const request = session.accessToken();
  const signingOut = session.signOut();
  answer.resolve(reply(tokens(2)));
  await request;
  await signingOut;

  const revoke = calls.find((call) => call.path === '/v1/auth/token/revoke');
  expect(revoke?.body).toEqual({ refreshToken: 'r2' });
  expect(session.status()).toBe('signedOut');
  expect(await store.getItemAsync(KEY)).toBeNull();
});

test('switching tenant re-issues the pair there, after a refresh in flight', async () => {
  const answer = deferred<Response>();
  const { session, store } = await load('r1');
  const calls = fakeApi({
    'POST /v1/auth/token/refresh': (call) =>
      (call.body as { tenantId?: string }).tenantId
        ? reply(tokens(3))
        : answer.promise,
  });

  const request = session.accessToken();
  const switching = session.switchTenant('t2');
  answer.resolve(reply(tokens(2)));
  await request;
  await switching;

  expect(calls.map((call) => call.body)).toEqual([
    { refreshToken: 'r1' },
    { refreshToken: 'r2', tenantId: 't2' },
  ]);
  expect(await session.accessToken()).toBe('a3');
  expect(await store.getItemAsync(KEY)).toBe('r3');
});

test('a refused switch (not a member) keeps the session as it was', async () => {
  const { session, store } = await load('r1');
  fakeApi({
    'POST /v1/auth/token/refresh': (call) =>
      (call.body as { tenantId?: string }).tenantId
        ? problem(401, 'unauthorized')
        : reply(tokens(2)),
  });
  await session.restore();

  await expect(session.switchTenant('t9')).rejects.toMatchObject({
    status: 401,
  });

  expect(session.status()).toBe('signedIn');
  expect(await store.getItemAsync(KEY)).toBe('r2');
  expect(await session.accessToken()).toBe('a2');
});

test('a step-up sends the refresh token with the proof and keeps the new pair', async () => {
  const { session, store } = await load('r1');
  const calls = fakeApi({
    'POST /v1/auth/token/refresh': () => reply(tokens(2)),
    'POST /v1/auth/reauthenticate': () =>
      reply({
        authenticatedAt: 'now',
        recentUntil: 'later',
        tokens: tokens(3),
      }),
  });

  await session.reauthenticate({ password: 'pw' });

  const proof = calls.find((call) => call.path === '/v1/auth/reauthenticate');
  expect(proof?.body).toEqual({ password: 'pw', refreshToken: 'r2' });
  expect(proof?.authorization).toBe('Bearer a2');
  expect(await store.getItemAsync(KEY)).toBe('r3');
  expect(await session.accessToken()).toBe('a3');
});

test('a wrong proof keeps the session as it was', async () => {
  const { session, store } = await load('r1');
  fakeApi({
    'POST /v1/auth/token/refresh': () => reply(tokens(2)),
    'POST /v1/auth/reauthenticate': () =>
      problem(403, 'reauthentication_failed'),
  });

  await expect(
    session.reauthenticate({ password: 'no' }),
  ).rejects.toMatchObject({ code: 'reauthentication_failed' });

  expect(session.status()).toBe('signedIn');
  expect(await store.getItemAsync(KEY)).toBe('r2');
});
