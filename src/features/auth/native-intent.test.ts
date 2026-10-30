import { redirectSystemPath } from '@/app/+native-intent';

test("a provider sign-in's return opens no screen; other links pass", () => {
  expect(redirectSystemPath({ path: 'dev.example.app:/auth?code=h1' })).toBe(
    '/',
  );
  expect(redirectSystemPath({ path: '/notes/42' })).toBe('/notes/42');
  expect(redirectSystemPath({ path: 'not a url :://' })).toBe('not a url :://');
});
