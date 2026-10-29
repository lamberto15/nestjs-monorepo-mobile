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
