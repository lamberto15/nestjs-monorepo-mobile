import * as SecureStore from 'expo-secure-store';

import { signedLink } from '@/api/signed-link';
import { fakeApi, problem, reply } from '@/test/fake-api';

beforeAll(() => SecureStore.setItemAsync('session.refreshToken', 'r1'));

const refresh = () =>
  reply({ accessToken: 'a', refreshToken: 'r2', expiresIn: 900 });

test('the redirect is read, not followed, with the access token sent', async () => {
  const calls = fakeApi({
    'POST /v1/auth/token/refresh': refresh,
    'GET /v1/attachments/f1/download': () =>
      new Response(null, {
        status: 302,
        headers: { Location: 'https://files.test/f1?sig=abc' },
      }),
  });

  await expect(
    signedLink('/v1/attachments/f1/download?rendition=thumb'),
  ).resolves.toBe('https://files.test/f1?sig=abc');

  const download = calls.find((call) => call.path.endsWith('/download'));
  expect(download?.authorization).toBe('Bearer a');
});

test('a refusal is an ApiError (409 while the file is checked)', async () => {
  fakeApi({
    'POST /v1/auth/token/refresh': refresh,
    'GET /v1/attachments/f2/download': () => problem(409, 'attachment_pending'),
  });

  await expect(signedLink('/v1/attachments/f2/download')).rejects.toMatchObject(
    {
      status: 409,
      code: 'attachment_pending',
    },
  );
});
